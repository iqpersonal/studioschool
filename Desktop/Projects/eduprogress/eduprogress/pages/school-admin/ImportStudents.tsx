import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Progress from '../../components/ui/Progress';
import { useAuth } from '../../hooks/useAuth';
import { db, firebaseConfig } from '../../services/firebase';
import { UserProfile } from '../../types';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

type Student = {
    [key: string]: string;
}

const studentCsvTemplate = `"Academic_Year","E_Major_Desc","E_Group_Desc","E_Class_Desc","E_Section_Name","E_Child_Name","E_Father_Name","E_Family_Name","Student_Email","UserName","Password","Father_Email","Family_UserName","Family_Password","FatherPhone1","FatherPhone2","MotherPhone1","Open Balance","Total Tution Fees","Total Tution Fees (+VAT)","Tution Fees Balance","Transportion","Other","TOTAL_Balance"
"2023-2024","Science","A","Grade 10","A","John Doe","Michael Doe","Doe","student1@example.com","student1@example.com","password123","father1@example.com","family1","familypass","123456789","","","0","5000","5250","250","500","0","750"
"2023-2024","Arts","B","Grade 11","B","Jane Smith","Robert Smith","Smith","student2@example.com","student2@example.com","password456","father2@example.com","family2","familypass","987654321","","","100","6000","6300","1000","0","50","1150"
`;

const downloadCSVTemplate = (content: string, filename: string) => {
    // Add BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
};

const isValidEmail = (email: string) => {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const BATCH_SIZE = 100; // Process 100 records per API call

const ImportStudents: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [logMessages, setLogMessages] = useState<string[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const { currentUserData } = useAuth();

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logMessages]);

    const userRoles = useMemo(() => {
        const roles = currentUserData?.role;
        return Array.isArray(roles) ? roles : (roles ? [roles] : []);
    }, [currentUserData?.role]);


    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogMessages(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            setLogMessages([]);
            setStudents([]);
            setHeaders([]);
            addLog(`File selected: ${selectedFile.name}`);
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setFileContent(content);
                addLog(`File content loaded (${(content.length / 1024).toFixed(2)} KB).`);
            };
            reader.readAsText(selectedFile);
        }
    };

    const parseCSVLocally = (csvContent: string): { headers: string[], data: Student[] } => {
        addLog('Starting local CSV parsing...');
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            throw new Error('CSV file must have a header row and at least one data row.');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        addLog(`Found headers: ${headers.join(', ')}`);

        const data = lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));

            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
            }, {} as Student);
        });

        addLog(`Successfully parsed ${data.length} records locally.`);
        return { headers, data };
    };

    const handlePreview = () => {
        if (!fileContent) {
            setError('No file content to parse.');
            addLog('Error: Preview clicked but no file content is loaded.');
            return;
        }
        setIsLoading(true);
        setError('');
        setLogMessages([]); // Reset logs for new action
        addLog(`File size: ${(fileContent.length / 1024).toFixed(2)} KB`);
        setProgress(50);
        try {
            const { headers, data } = parseCSVLocally(fileContent);
            setHeaders(headers);
            setStudents(data);
            addLog('Data preview is ready.');
        } catch (err: any) {
            const errorMessage = `Failed to parse CSV locally: ${err.message}`;
            setError(errorMessage);
            addLog(`FATAL: ${errorMessage}`);
        } finally {
            setProgress(100);
            setIsLoading(false);
            addLog('Local parsing finished.');
        }
    };

    const processCSVWithAI = async () => {
        if (!fileContent) {
            setError('Please select a CSV file first.');
            addLog('Error: AI processing attempted with no file.');
            return;
        }

        addLog('Starting AI-powered data correction (in batches)...');
        setIsLoading(true);
        setError('');

        const key = process.env.API_KEY;
        if (!key) {
            const msg = 'ERROR: Gemini API Key is not configured for this application.';
            addLog(msg);
            setError(msg);
            setIsLoading(false);
            return;
        }
        addLog("API Key is available.");

        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
            const headerLine = lines[0];
            const dataLines = lines.slice(1);
            const totalBatches = Math.ceil(dataLines.length / BATCH_SIZE);
            let allParsedData: Student[] = [];
            const batchErrors: { batch: number, message: string }[] = [];

            for (let i = 0; i < totalBatches; i++) {
                const start = i * BATCH_SIZE;
                const end = start + BATCH_SIZE;
                const batchLines = dataLines.slice(start, end);
                const batchContent = [headerLine, ...batchLines].join('\n');

                addLog(`Processing batch ${i + 1} of ${totalBatches}...`);
                setProgress(Math.round(((i + 1) / totalBatches) * 100));

                const prompt = `Parse the following CSV data into a clean JSON array of objects. The keys should be the headers. Ensure all values are strings. Output ONLY the valid JSON array, nothing else. \n\n${batchContent}`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { thinkingConfig: { thinkingBudget: 0 } }
                });

                const text = response.text.trim();
                const jsonArrayString = text.startsWith('```json') ? text.substring(7, text.length - 3).trim() : text;

                try {
                    const parsedBatch = JSON.parse(jsonArrayString);
                    if (Array.isArray(parsedBatch)) {
                        allParsedData = [...allParsedData, ...parsedBatch];
                        addLog(`Batch ${i + 1} processed successfully. Total records so far: ${allParsedData.length}`);
                    } else {
                        throw new Error("AI did not return a valid array for this batch.");
                    }
                } catch (e) {
                    const errorMsg = (e as Error).message;
                    addLog(`Error parsing AI response for batch ${i + 1}. Skipping batch. Error: ${errorMsg}`);
                    batchErrors.push({ batch: i + 1, message: errorMsg });
                }
            }

            if (batchErrors.length > 0) {
                const errorSummary = `AI processing finished with errors in ${batchErrors.length} batch(es).\nSome data may be missing from the preview.\n\nDetails:\n${batchErrors.map(e => ` - Batch ${e.batch}: ${e.message}`).join('\n')}`;
                setError(errorSummary);
            }

            if (allParsedData.length > 0) {
                setHeaders(Object.keys(allParsedData[0]));
                setStudents(allParsedData);
                addLog(`AI processing complete. Total records: ${allParsedData.length}. ${batchErrors.length} batch(es) failed.`);
            } else {
                throw new Error("AI processing resulted in no valid data. Please try local parsing or check the file format.");
            }

        } catch (err: any) {
            const errorMessage = `An error occurred during AI processing: ${err.message}`;
            console.error(err);
            setError(errorMessage);
            addLog(`FATAL: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            setProgress(100);
        }
    };


    const handleImport = async () => {
        if (!currentUserData?.schoolId) {
            addLog("FATAL: Could not identify the current school. Import aborted.");
            setError("Could not identify the current school. Please refresh and try again.");
            return;
        }

        setIsLoading(true);
        setProgress(0);
        addLog(`--- STARTING IMPORT ---`);
        addLog(`Preparing to import/update ${students.length} students for school ID: ${currentUserData.schoolId}`);

        let successCount = 0;
        const failedRecords: { record: Student; error: string; rowNumber: number }[] = [];

        const secondaryAppName = `importer-app-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);

        for (let i = 0; i < students.length; i++) {
            const studentData = students[i];
            const rowNumber = i + 2;

            setProgress(Math.round(((i + 1) / students.length) * 100));

            const getVal = (key: string) => {
                const normalizedKey = key.toLowerCase().replace(/[\s_()+\-]/g, '');
                const headerKey = Object.keys(studentData).find(k => k.toLowerCase().replace(/[\s_()+\-]/g, '') === normalizedKey);
                return headerKey ? (studentData[headerKey] || '').trim() : '';
            };

            const email = getVal('student_email') || getVal('email');
            const password = getVal('password');
            const name = getVal('e_child_name') || getVal('name') || `${getVal('first_name')} ${getVal('last_name')}`.trim();
            const studentIdNumber = getVal('username') || getVal('studentIdNumber') || getVal('student_id');

            if (!name) {
                const errorMsg = "Student name is missing or could not be found in the row.";
                addLog(`ERROR: Row ${rowNumber}: ${errorMsg}`);
                failedRecords.push({ record: studentData, error: errorMsg, rowNumber });
                continue;
            }

            try {
                let userId: string | null = null;
                let isUpdate = false;

                // 1. Proactively check for an existing student profile by ID first, then by email.
                if (studentIdNumber) {
                    const q = query(collection(db, 'users'), where('schoolId', '==', currentUserData.schoolId), where('studentIdNumber', '==', studentIdNumber), limit(1));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        userId = querySnapshot.docs[0].id;
                        isUpdate = true;
                        addLog(`INFO: Found existing student by ID '${studentIdNumber}'. Profile will be updated.`);
                    }
                }
                if (!userId && email && isValidEmail(email)) {
                    const q = query(collection(db, 'users'), where('schoolId', '==', currentUserData.schoolId), where('email', '==', email), limit(1));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        userId = querySnapshot.docs[0].id;
                        isUpdate = true;
                        addLog(`INFO: Found existing student by email '${email}'. Profile will be updated.`);
                    }
                }

                // 2. Handle auth account creation for new users.
                const hasLoginDetails = email && isValidEmail(email) && password && password.length >= 6;
                const userEmail: string | null = email || null;

                if (!isUpdate && hasLoginDetails) {
                    addLog(`INFO: Student ${i + 1}/${students.length} (${name}): Creating new auth account for ${userEmail}...`);
                    try {
                        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userEmail!, password);
                        userId = userCredential.user!.uid;
                    } catch (authError: any) {
                        if (authError.code === 'auth/email-already-in-use') {
                            throw new Error(`Auth account for ${userEmail} already exists, but no matching student profile was found. Please resolve this manually.`);
                        }
                        throw authError;
                    }
                } else if (!userId) {
                    // This is a new user without login, or login details were invalid.
                    addLog(`INFO: Student ${i + 1}/${students.length} (${name}): No existing profile found. Creating a new one.`);
                    userId = doc(collection(db, 'users')).id;
                }

                // 3. Construct profile data from CSV
                const safeParseFloat = (val: string) => {
                    const parsed = parseFloat(val.replace(/,/g, ''));
                    return isNaN(parsed) ? 0 : parsed;
                };

                const profileData: Partial<UserProfile> = {
                    uid: userId!,
                    name,
                    email: userEmail,
                    schoolId: currentUserData.schoolId,
                    grade: getVal('e_class_desc') || getVal('grade') || '',
                    section: getVal('e_section_name') || getVal('section') || '',
                    studentIdNumber,
                    academicYear: (() => {
                      const ay = getVal('academic_year');
                      if (!ay) return undefined;
                      // Convert "2025-2026" format to "25-26"
                      const match = ay.match(/(\d{2})(\d{2})-(\d{2})(\d{2})/);
                      if (match) {
                        return `${match[1]}${match[2]}-${match[3]}${match[4]}`;
                      }
                      return ay; // Return as-is if format doesn't match
                    })(),
                    major: getVal('e_major_desc'),
                    group: getVal('e_group_desc'),
                    fatherName: getVal('e_father_name'),
                    familyName: getVal('e_family_name'),
                    fatherEmail: getVal('father_email'),
                    familyUsername: getVal('family_username'),
                    familyPassword: getVal('family_password'),
                    fatherPhone1: getVal('fatherphone1'),
                    fatherPhone2: getVal('fatherphone2'),
                    motherPhone1: getVal('motherphone1'),
                    openBalance: safeParseFloat(getVal('open_balance')),
                    totalTuitionFees: safeParseFloat(getVal('total_tution_fees')),
                    totalTuitionFeesVat: safeParseFloat(getVal('totaltutionfeesvat')),
                    tuitionFeesBalance: safeParseFloat(getVal('tution_fees_balance')),
                    transportation: safeParseFloat(getVal('transportion')),
                    otherFees: safeParseFloat(getVal('other')),
                    totalBalance: safeParseFloat(getVal('total_balance')),
                };

                // Set role and createdAt only for new records to avoid changing existing roles.
                if (!isUpdate) {
                    profileData.role = ['student'];
                    profileData.status = 'active';
                    profileData.createdAt = serverTimestamp() as Timestamp;
                }

                // Use set with merge: true to handle both create and update atomically.
                await setDoc(doc(db, 'users', userId!), profileData, { merge: true });
                successCount++;
                addLog(`SUCCESS: ${isUpdate ? 'Updated' : 'Created'} ${name}`);

            } catch (error: any) {
                let errorMsg = error.message || 'An unknown error occurred.';
                if (error.code === 'permission-denied') {
                    errorMsg = "Missing or insufficient permissions.";
                }
                addLog(`ERROR: Row ${rowNumber} (${name}): ${errorMsg}`);
                failedRecords.push({ record: studentData, error: errorMsg, rowNumber });
            }
        }

        await deleteApp(secondaryApp);

        addLog('--- IMPORT COMPLETE ---');
        addLog(`Successfully processed: ${successCount} / ${students.length}`);

        if (failedRecords.length > 0) {
            const failureDetails = failedRecords.map(f => {
                const studentName = getVal('e_child_name', f.record) || getVal('name', f.record) || `Row ${f.rowNumber}`;
                return `[Row ${f.rowNumber}] ${studentName}: ${f.error}`;
            });

            const finalError = `Import finished with ${failedRecords.length} error(s).\n\nFailed records:\n${failureDetails.join('\n')}`;
            setError(finalError);
            addLog('--- FAILED RECORDS ---');
            failureDetails.forEach(detail => addLog(detail));
        } else {
            addLog(`All ${successCount} records processed successfully!`);
            setStudents([]);
            setHeaders([]);
            setFile(null);
            setFileContent('');
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        }

        setIsLoading(false);
    };

    // Helper function to get value from a record object, case-insensitively
    const getVal = (key: string, record: Student) => {
        const normalizedKey = key.toLowerCase().replace(/[\s_()+\-]/g, '');
        const headerKey = Object.keys(record).find(k => k.toLowerCase().replace(/[\s_()+\-]/g, '') === normalizedKey);
        return headerKey ? (record[headerKey] || '').trim() : '';
    };

    const canImport = useMemo(() => students.length > 0 && !isLoading, [students, isLoading]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm">
                <Link to="/students" className="text-muted-foreground hover:text-foreground">Manage Students</Link>
                <span>/</span>
                <span className="font-semibold">Import Students</span>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Upload Student Data</CardTitle>
                            <CardDescription>
                                Select a CSV file. Use "Preview Data" for a fast local parse. If the data looks incorrect, use "Fix with AI".
                            </CardDescription>
                        </div>
                        <Button variant="link" onClick={() => downloadCSVTemplate(studentCsvTemplate, 'student_template.csv')}>Download Sample Template</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Input type="file" id="csv-upload" accept=".csv, text/csv" onChange={handleFileChange} className="max-w-xs" />
                        <div className="flex items-center gap-2">
                            <Button onClick={handlePreview} disabled={!file || isLoading}>
                                {isLoading ? 'Working...' : 'Preview Data'}
                            </Button>
                            {userRoles.includes('super-admin') && (
                                <Button variant="outline" onClick={processCSVWithAI} disabled={!file || isLoading}>
                                    {isLoading ? 'Fixing...' : 'Fix with AI'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {(isLoading) && <Progress value={progress} className="mt-4" />}
                    {error && (
                        <div className="mt-2 p-3 bg-destructive/10 border border-destructive/50 text-destructive text-sm rounded-md">
                            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
                        </div>
                    )}

                    {logMessages.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <h4 className="text-md font-semibold">Live Log</h4>
                            <div ref={logContainerRef} className="p-3 bg-secondary rounded-md border max-h-60 overflow-y-auto">
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                    {logMessages.join('\n')}
                                </pre>
                            </div>
                        </div>
                    )}

                    {students.length > 0 && !isLoading && (
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold">Data Preview ({students.length} records)</h3>
                            <p className="text-sm text-muted-foreground">Showing the first 5 records. Please verify the columns are mapped correctly before importing.</p>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {headers.map(header => <TableHead key={header} className="capitalize">{header.replace(/_/g, ' ')}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.slice(0, 5).map((student, index) => (
                                            <TableRow key={index}>
                                                {headers.map(header => <TableCell key={header}>{student[header]}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button onClick={handleImport} disabled={!canImport}>
                                {isLoading ? `Importing... ${progress}%` : `Confirm and Import ${students.length} Students`}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ImportStudents;

