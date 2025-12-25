import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Progress from '../../components/ui/Progress';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, writeBatch, updateDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Subject, TeacherAssignment } from '../../types';

type AssignmentRecord = {
    [key: string]: string;
}

const assignmentCsvTemplate = `"Teacher_Email","Grade","Section","Subject_Name","Periods_Per_Week","Academic_Year","Major"
"teacher.alice@example.com","Grade 10","A","Mathematics","5","2024-2025","Science"
"teacher.alice@example.com","Grade 10","B","Mathematics","5","2024-2025","Arts"
"teacher.bob@example.com","Grade 11","A","Physics","4","2024-2025","Science"
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

const ImportAssignments: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [logMessages, setLogMessages] = useState<string[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const { currentUserData } = useAuth();
    const { selectedAcademicYear } = useAcademicYear();

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
            setAssignments([]);
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

    const handlePreview = () => {
        if (!fileContent) {
            setError('No file content to parse.');
            addLog('Error: Preview clicked but no file content is loaded.');
            return;
        }
        setIsLoading(true);
        setError('');
        setLogMessages([]);
        addLog('Starting local CSV parsing...');
        setProgress(50);
        try {
            // Remove BOM if present
            const cleanContent = fileContent.replace(/^\uFEFF/, '');
            const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');

            const headerLine = lines[0];

            // Detect delimiter
            let delimiter = ',';
            if (headerLine.includes('\t')) delimiter = '\t';
            else if (headerLine.includes(';')) delimiter = ';';

            addLog(`Detected delimiter: '${delimiter === '\t' ? 'TAB' : delimiter}'`);

            const splitRegex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

            const localHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
            addLog(`Found headers: ${localHeaders.join(', ')}`);

            const data = lines.slice(1).map(line => {
                const values = line.split(splitRegex).map(v => v.trim().replace(/^"|"$/g, ''));
                return localHeaders.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {} as AssignmentRecord);
            });

            addLog(`Successfully parsed ${data.length} records locally.`);
            setHeaders(localHeaders);
            setAssignments(data);
            addLog('Data preview is ready. Please review the table below.');
        } catch (err: any) {
            const errorMessage = `Failed to parse CSV locally: ${err.message}`;
            setError(errorMessage);
            addLog(`FATAL: ${errorMessage}`);
        } finally {
            setProgress(100);
            setIsLoading(false);
        }
    };

    const getVal = (key: string, record: AssignmentRecord) => {
        const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, '');
        const headerKey = Object.keys(record).find(k => k.toLowerCase().replace(/[\s_]+/g, '') === normalizedKey);
        return headerKey ? (record[headerKey] || '').trim() : '';
    };

    const handleImport = async () => {
        if (!currentUserData?.schoolId) {
            addLog("FATAL: Could not identify the current school. Import aborted.");
            setError("Could not identify the current school.");
            return;
        }

        setIsLoading(true);
        setProgress(0);
        addLog(`--- STARTING IMPORT ---`);
        addLog(`Preparing to import ${assignments.length} assignments for school ID: ${currentUserData.schoolId}`);

        let successCount = 0;
        const failedRecords: { record: AssignmentRecord; error: string; rowNumber: number }[] = [];

        try {
            // --- Pre-computation Step ---
            addLog("Fetching existing school data (teachers, subjects, assignments) to validate rows...");
            const schoolId = currentUserData.schoolId;

            const [teachersSnap, subjectsSnap, existingAssignmentsSnap] = await Promise.all([
                getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId))),
                getDocs(query(collection(db, 'subjects'), where('schoolId', '==', schoolId))),
                getDocs(query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId)))
            ]);

            const teacherMap = new Map<string, UserProfile>();
            teachersSnap.forEach(doc => {
                const user = { uid: doc.id, ...doc.data() } as UserProfile;
                if (user.email) teacherMap.set(user.email.toLowerCase(), user);
            });

            const subjectMap = new Map<string, Subject>();
            subjectsSnap.forEach(doc => {
                const subject = { id: doc.id, ...doc.data() } as Subject;
                subjectMap.set(subject.name.toLowerCase(), subject);
            });

            // Map to store existing assignments: Key -> DocID
            // Key: TeacherID|SubjectID|Grade|Section|SchoolID
            // We exclude 'Major' from the uniqueness check to allow updating assignments (e.g. adding Major or Periods)
            const existingAssignmentsMap = new Map<string, string>();
            existingAssignmentsSnap.forEach(doc => {
                const a = doc.data() as TeacherAssignment;
                const key = `${a.teacherId}|${a.subjectId}|${(a.grade || '').trim()}|${(a.section || '').trim()}|${a.schoolId}`;
                existingAssignmentsMap.set(key, doc.id);
            });
            addLog(`Found ${teacherMap.size} teachers, ${subjectMap.size} subjects, and ${existingAssignmentsMap.size} existing assignments.`);

            // --- Processing Step ---
            // Firestore limits batches to 500 operations. We use 400 to be safe.
            const BATCH_SIZE = 400;
            let batch = writeBatch(db);
            let batchOperations = 0;

            for (let i = 0; i < assignments.length; i++) {
                const record = assignments[i];
                const rowNumber = i + 2;
                setProgress(Math.round(((i + 1) / assignments.length) * 100));

                try {
                    const teacherEmail = getVal('teacher_email', record).toLowerCase();
                    const grade = getVal('grade', record).trim();
                    const section = getVal('section', record).trim();
                    const subjectName = getVal('subject_name', record).toLowerCase();
                    const periodsStr = getVal('periods_per_week', record);
                    // Use selected year if not provided in CSV
                    const academicYear = getVal('academic_year', record) || selectedAcademicYear;
                    const major = getVal('major', record).trim();

                    // Validation
                    if (!teacherEmail || !grade || !section || !subjectName) {
                        throw new Error("Missing required fields (Teacher_Email, Grade, Section, Subject_Name).");
                    }
                    const teacher = teacherMap.get(teacherEmail);
                    if (!teacher) {
                        throw new Error(`Teacher with email '${teacherEmail}' not found. Please create the teacher account first.`);
                    }
                    const subject = subjectMap.get(subjectName);
                    if (!subject) {
                        throw new Error(`Subject with name '${subjectName}' not found. Please add this subject in School Settings.`);
                    }

                    const periodsParsed = periodsStr ? parseInt(periodsStr, 10) : undefined;

                    const assignmentData: any = {
                        teacherId: teacher.uid,
                        teacherName: teacher.name,
                        subjectId: subject.id,
                        subjectName: subject.name,
                        grade,
                        section,
                        schoolId,
                        // Handle NaN safely
                        periodsPerWeek: (periodsParsed !== undefined && !isNaN(periodsParsed)) ? periodsParsed : null, // Use null to clear if needed, or undefined to skip? Firestore handles null.
                        major: major || null,
                    };

                    // Remove undefined/null keys if we want to avoid overwriting with null? 
                    // Actually, for upsert, we probably want to overwrite.
                    // But let's clean up undefined.
                    Object.keys(assignmentData).forEach(key => assignmentData[key] === undefined && delete assignmentData[key]);


                    const assignmentKey = `${teacher.uid}|${subject.id}|${grade}|${section}|${schoolId}`;

                    if (existingAssignmentsMap.has(assignmentKey)) {
                        // UPDATE existing
                        const docId = existingAssignmentsMap.get(assignmentKey)!;
                        const docRef = doc(db, 'teacherAssignments', docId);
                        batch.update(docRef, assignmentData);
                        addLog(`INFO: Row ${rowNumber}: Updating existing assignment for ${teacher.name} -> ${subject.name}.`);
                    } else {
                        // CREATE new
                        const docRef = doc(collection(db, 'teacherAssignments'));
                        batch.set(docRef, assignmentData);
                        // Add to map to handle duplicates WITHIN the same CSV file
                        existingAssignmentsMap.set(assignmentKey, docRef.id);
                    }

                    batchOperations++;
                    successCount++;

                    // Commit batch if limit reached
                    if (batchOperations >= BATCH_SIZE) {
                        addLog(`Committing batch of ${batchOperations} assignments...`);
                        try {
                            await batch.commit();
                            batch = writeBatch(db); // Reset batch
                            batchOperations = 0;
                        } catch (batchErr: any) {
                            throw new Error(`Batch commit failed: ${batchErr.message}. Records in this batch were not saved.`);
                        }
                    }

                } catch (err: any) {
                    failedRecords.push({ record, error: err.message, rowNumber });
                    addLog(`ERROR: Row ${rowNumber}: ${err.message}`);
                }
            }

            // Commit remaining operations
            if (batchOperations > 0) {
                addLog(`Committing final batch of ${batchOperations} assignments...`);
                try {
                    await batch.commit();
                } catch (batchErr: any) {
                    // Since we can't rollback successful batches, we log this failure as a major error for the last chunk.
                    const msg = `Final batch commit failed: ${batchErr.message}`;
                    addLog(`FATAL: ${msg}`);
                    setError(msg);
                    // Deduct the pending count from success since they failed
                    successCount -= batchOperations;
                }
            }

        } catch (err: any) {
            const errorMessage = `A fatal system error occurred: ${err.message}`;
            setError(errorMessage);
            addLog(`FATAL: ${errorMessage}`);
        }

        addLog('--- IMPORT COMPLETE ---');
        addLog(`Successfully imported: ${successCount} records.`);

        if (failedRecords.length > 0) {
            const failureDetails = failedRecords.map(f => `[Row ${f.rowNumber}] ${getVal('teacher_email', f.record)}: ${f.error}`);
            const finalError = `Import completed with ${failedRecords.length} skipped records.\n\nFailure Details:\n${failureDetails.join('\n')}`;
            if (!error) setError(finalError); // Only set if not already set by a fatal error
            addLog('--- SKIPPED RECORDS ---');
            failureDetails.forEach(detail => addLog(detail));
        } else if (successCount > 0) {
            addLog(`All valid records processed successfully!`);
            setAssignments([]);
            setHeaders([]);
            setFile(null);
            setFileContent('');
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } else {
            addLog('No new assignments were imported.');
        }

        setIsLoading(false);
    };

    const canImport = useMemo(() => assignments.length > 0 && !isLoading, [assignments, isLoading]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm">
                <Link to="/grades-sections" className="text-muted-foreground hover:text-foreground">Grades & Sections</Link>
                <span>/</span>
                <span className="font-semibold">Import Assignments</span>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Upload Teacher Assignments</CardTitle>
                            <CardDescription>
                                Select a CSV file to bulk-assign teachers to classes and subjects.
                            </CardDescription>
                            <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200 inline-block">
                                <strong>Prerequisites:</strong> Teachers and Subjects must be created in the system before importing assignments.
                                The importer matches them by <strong>Email</strong> and <strong>Subject Name</strong>.
                            </p>
                        </div>
                        <Button variant="link" onClick={() => downloadCSVTemplate(assignmentCsvTemplate, 'assignment_template.csv')}>Download Sample Template</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Input type="file" id="csv-upload" accept=".csv, text/csv" onChange={handleFileChange} className="max-w-xs" />
                        <Button onClick={handlePreview} disabled={!file || isLoading}>
                            {isLoading ? 'Parsing...' : 'Preview Data'}
                        </Button>
                    </div>

                    {isLoading && <Progress value={progress} className="mt-4" />}
                    {error && (
                        <div className="mt-2 p-3 bg-destructive/10 border border-destructive/50 text-destructive text-sm rounded-md max-h-60 overflow-y-auto">
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

                    {assignments.length > 0 && !isLoading && (
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold">Data Preview ({assignments.length} records)</h3>
                            <p className="text-sm text-muted-foreground">Showing the first 5 records. Please verify the columns before importing.</p>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {headers.map(header => <TableHead key={header} className="capitalize">{header.replace(/_/g, ' ')}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignments.slice(0, 5).map((assignment, index) => (
                                            <TableRow key={index}>
                                                {headers.map(header => <TableCell key={header}>{assignment[header]}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button onClick={handleImport} disabled={!canImport}>
                                {isLoading ? `Importing... ${progress}%` : `Confirm and Import ${assignments.length} Assignments`}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ImportAssignments;