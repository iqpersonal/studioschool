import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Progress from '../../components/ui/Progress';
import { useAuth } from '../../hooks/useAuth';
import { db, firebaseConfig } from '../../services/firebase';
import { UserProfile } from '../../types';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, limit, doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

type Teacher = {
    [key: string]: string;
}

const teacherCsvTemplate = `"SCHOOLYEAR","FIRSTNAME","MIDDLENAME","LASTNAME","USERNAME","PASSWORD"
"2023-2024","Alice","Marie","Johnson","teacher.alice@example.com","password123"
"2023-2024","Bob","","Williams","teacher.bob@example.com","password456"
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

const ImportTeachers: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
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
            setTeachers([]);
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

    const parseCSVLocally = () => {
        if (!fileContent) {
            setError('No file content to parse.');
            addLog('Error: Preview clicked but no file content is loaded.');
            return;
        }
        setIsLoading(true);
        setError('');
        setLogMessages([]); // Reset logs for new action
        addLog(`File size: ${(fileContent.length / 1024).toFixed(2)} KB`);
        addLog('Starting local CSV parsing...');
        setProgress(50);
        try {
            const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');

            const localHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            addLog(`Found headers: ${localHeaders.join(', ')}`);

            const data = lines.slice(1).map(line => {
                const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
                return localHeaders.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {} as Teacher);
            });

            addLog(`Successfully parsed ${data.length} records locally.`);
            setHeaders(localHeaders);
            setTeachers(data);
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

    const getVal = (key: string, record: Teacher) => {
        const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, '');
        const headerKey = Object.keys(record).find(k => k.toLowerCase().replace(/[\s_]+/g, '') === normalizedKey);
        return headerKey ? (record[headerKey] || '').trim() : '';
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
        addLog(`Preparing to import/update ${teachers.length} teachers for school ID: ${currentUserData.schoolId}`);

        let successCount = 0;
        const failedRecords: { record: Teacher; error: string; rowNumber: number }[] = [];

        const secondaryAppName = `importer-app-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);

        for (let i = 0; i < teachers.length; i++) {
            const teacherData = teachers[i];
            const rowNumber = i + 2;

            setProgress(Math.round(((i + 1) / teachers.length) * 100));

            const email = getVal('username', teacherData);
            const password = getVal('password', teacherData);
            const name = [getVal('firstname', teacherData), getVal('middlename', teacherData), getVal('lastname', teacherData)].filter(Boolean).join(' ').trim();

            if (!name) {
                const errorMsg = "Teacher name is missing or could not be found in the row.";
                addLog(`ERROR: Row ${rowNumber}: ${errorMsg}`);
                failedRecords.push({ record: teacherData, error: errorMsg, rowNumber });
                continue;
            }
            if (!email || !isValidEmail(email)) {
                const errorMsg = "Teacher email (username) is missing or invalid.";
                addLog(`ERROR: Row ${rowNumber} (${name}): ${errorMsg}`);
                failedRecords.push({ record: teacherData, error: errorMsg, rowNumber });
                continue;
            }

            try {
                let userId: string | null = null;
                let isUpdate = false;

                // 1. Proactively check for an existing user profile by email (could be any role).
                const q = query(collection(db, 'users'), where('schoolId', '==', currentUserData.schoolId), where('email', '==', email), limit(1));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    userId = querySnapshot.docs[0].id;
                    isUpdate = true;
                    addLog(`INFO: Found existing user by email '${email}'. Profile will be updated.`);
                }

                // 2. Handle auth account creation for new users.
                if (!isUpdate) {
                    if (!password || password.length < 6) {
                        throw new Error("A password of at least 6 characters is required for new teachers.");
                    }
                    addLog(`INFO: Teacher ${i + 1}/${teachers.length} (${name}): Creating auth account for ${email}...`);
                    try {
                        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email!, password);
                        userId = userCredential.user!.uid;
                    } catch (authError: any) {
                        if (authError.code === 'auth/email-already-in-use') {
                            // The auth account exists. Try to sign in with the provided password to "claim" it.
                            addLog(`WARN: Auth account for ${email} already exists. Attempting to verify ownership...`);
                            try {
                                const signInCredential = await signInWithEmailAndPassword(secondaryAuth, email!, password);
                                userId = signInCredential.user!.uid;
                                addLog(`INFO: Ownership verified for ${email}. Checking for existing profile...`);

                                // Check if this user has a profile in ANY school to prevent cross-school data corruption
                                const existingProfileSnap = await getDoc(doc(db, 'users', userId));
                                if (existingProfileSnap.exists()) {
                                    const existingData = existingProfileSnap.data() as UserProfile;
                                    if (existingData.schoolId === currentUserData.schoolId) {
                                        // Profile exists in THIS school. Treat as update.
                                        isUpdate = true;
                                        addLog(`INFO: Found existing profile for ${email} in this school. Updating...`);
                                    } else {
                                        // Profile exists in ANOTHER school.
                                        throw new Error(`User ${email} already belongs to another school (ID: ${existingData.schoolId}). Cannot import.`);
                                    }
                                } else {
                                    // Auth exists, but NO profile exists. This is an orphan account.
                                    // We can proceed to create the profile for this school.
                                    addLog(`INFO: Orphan auth account found for ${email}. Creating new profile...`);
                                }

                            } catch (signInError: any) {
                                if (signInError.code === 'auth/wrong-password') {
                                    throw new Error(`Auth account for ${email} already exists, and the provided password does not match. Cannot claim account.`);
                                }
                                throw signInError; // Rethrow other errors
                            }
                        } else {
                            throw authError;
                        }
                    }
                }

                if (!userId) {
                    throw new Error("Could not determine user ID for this record.");
                }

                // 3. Construct and save the profile data, being careful not to change role on update.
                const profileData: Partial<UserProfile> = {
                    uid: userId,
                    name: name,
                    email: email,
                    schoolId: currentUserData.schoolId,
                };

                if (!isUpdate) {
                    // Only set the role for brand new users.
                    profileData.role = ['teacher'];
                    profileData.status = 'active';
                    profileData.createdAt = serverTimestamp() as Timestamp;
                }

                await setDoc(doc(db, 'users', userId), profileData, { merge: true });
                successCount++;
                addLog(`SUCCESS: ${isUpdate ? 'Updated' : 'Created'} ${name}`);

            } catch (error: any) {
                let errorMsg = error.message || 'An unknown error occurred.';
                if (error.code === 'permission-denied') {
                    errorMsg = "Missing or insufficient permissions.";
                }
                addLog(`ERROR: Row ${rowNumber} (${name}): ${errorMsg}`);
                failedRecords.push({ record: teacherData, error: errorMsg, rowNumber });
            }
        }

        await deleteApp(secondaryApp);

        addLog('--- IMPORT COMPLETE ---');
        addLog(`Successfully processed: ${successCount} / ${teachers.length}`);

        if (failedRecords.length > 0) {
            const failureDetails = failedRecords.map(f => {
                const name = [getVal('firstname', f.record), getVal('middlename', f.record), getVal('lastname', f.record)].filter(Boolean).join(' ').trim() || `Row ${f.rowNumber}`;
                return `[Row ${f.rowNumber}] ${name}: ${f.error}`;
            });

            const finalError = `Import finished with ${failedRecords.length} error(s).\n\nFailed records:\n${failureDetails.join('\n')}`;
            setError(finalError);
            addLog('--- FAILED RECORDS ---');
            failureDetails.forEach(detail => addLog(detail));
        } else {
            addLog(`All ${successCount} records processed successfully!`);
            setTeachers([]);
            setHeaders([]);
            setFile(null);
            setFileContent('');
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        }

        setIsLoading(false);
    };

    const canImport = useMemo(() => teachers.length > 0 && !isLoading, [teachers, isLoading]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm">
                <Link to="/teachers" className="text-muted-foreground hover:text-foreground">Manage Teachers</Link>
                <span>/</span>
                <span className="font-semibold">Import Teachers</span>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Upload Teacher Data</CardTitle>
                            <CardDescription>
                                Select a CSV file with teacher information to bulk-import or update accounts.
                            </CardDescription>
                        </div>
                        <Button variant="link" onClick={() => downloadCSVTemplate(teacherCsvTemplate, 'teacher_template.csv')}>Download Sample Template</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Input type="file" id="csv-upload" accept=".csv, text/csv" onChange={handleFileChange} className="max-w-xs" />
                        <Button onClick={parseCSVLocally} disabled={!file || isLoading}>
                            {isLoading ? 'Parsing...' : 'Preview Data'}
                        </Button>
                    </div>

                    {isLoading && <Progress value={progress} className="mt-4" />}
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

                    {teachers.length > 0 && !isLoading && (
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold">Data Preview ({teachers.length} records)</h3>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {headers.map(header => <TableHead key={header} className="capitalize">{header.replace(/_/g, ' ')}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teachers.slice(0, 5).map((teacher, index) => (
                                            <TableRow key={index}>
                                                {headers.map(header => <TableCell key={header}>{teacher[header]}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button onClick={handleImport} disabled={!canImport}>
                                {isLoading ? `Importing... ${progress}%` : `Confirm and Import ${teachers.length} Teachers`}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ImportTeachers;
