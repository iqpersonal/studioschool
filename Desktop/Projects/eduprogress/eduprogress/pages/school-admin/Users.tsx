import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db, functions } from '../../services/firebase';
import { collection, query, where, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { useUsersPaginated } from '../../hooks/queries/useUsersPaginated';
import { useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { UserProfile } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import CreateEditUserModal from '../../components/users/CreateEditUserModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import CreateEditStudentModal from '../../components/students/CreateEditStudentModal';
import ResetPasswordModal from '../../components/users/ResetPasswordModal';
import { formatRole } from '../../utils/formatters';

const STAFF_ROLES: UserProfile['role'] = ['teacher', 'head-of-section', 'subject-coordinator', 'academic-director', 'school-admin'];
const MANAGEMENT_ROLES = ['head-of-section', 'subject-coordinator', 'academic-director'];

const getRoles = (user: UserProfile): string[] => {
    const role = user.role as any;
    if (Array.isArray(role)) return role;
    if (typeof role === 'string') {
        try {
            return role.trim().startsWith('[') ? JSON.parse(role) : [role];
        } catch {
            return [role];
        }
    }
    return [];
};

const Users: React.FC = () => {
    const { currentUserData } = useAuth();
    const { selectedAcademicYear } = useAcademicYear();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // === STAFF STATE ===
    const [staffFilterRole, setStaffFilterRole] = useState('');
    const [staffSearchTerm, setStaffSearchTerm] = useState('');
    const [staffCurrentPage, setStaffCurrentPage] = useState(1);
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [selectedStaffUser, setSelectedStaffUser] = useState<UserProfile | null>(null);
    const [staffUserToDelete, setStaffUserToDelete] = useState<UserProfile | null>(null);
    const [isDeletingStaff, setIsDeletingStaff] = useState(false);
    const [userToResetPassword, setUserToResetPassword] = useState<UserProfile | null>(null);

    // === STUDENT STATE ===
    const [selectedMajor, setSelectedMajor] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isGeneratingAccounts, setIsGeneratingAccounts] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<UserProfile | 'all' | null>(null);
    const [isDeletingStudent, setIsDeletingStudent] = useState(false);

    // === PAGINATED STAFF HOOK ===
    const { 
        data: staffUsers = [], 
        totalRecords: staffTotalRecords, 
        currentPage: staffPageNum, 
        pageSize: staffPageSize, 
        totalPages: staffTotalPages, 
        hasNextPage: staffHasNext, 
        hasPrevPage: staffHasPrev,
        isLoading: staffLoading, 
        isError: staffError 
    } = useUsersPaginated(
        currentUserData?.schoolId || '',
        staffCurrentPage,
        staffSearchTerm,
        staffFilterRole
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setStaffCurrentPage(1);
    }, [staffSearchTerm, staffFilterRole]);

    // === FETCH NON-PAGINATED STUDENTS (for filtering) ===
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [studentsFetching, setStudentsFetching] = useState(false);
    const [studentsError, setStudentsError] = useState(false);

    useEffect(() => {
        if (!currentUserData?.schoolId) return;

        const fetchStudents = async () => {
            setStudentsFetching(true);
            setStudentsError(false);  // Reset error state before fetching
            try {
                const snapshot = await getDocs(
                    query(
                        collection(db, 'users'),
                        where('schoolId', '==', currentUserData.schoolId)
                    )
                );
                const students = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as any))
                    .filter(user => {
                        // Filter archived users in JavaScript (avoids composite index requirement)
                        if (user.status === 'archived') return false;
                        const roles = getRoles(user);
                        const isStudent = roles.includes('student');
                        const matchesYear = !selectedAcademicYear || user.academicYear === selectedAcademicYear;
                        return isStudent && matchesYear;
                    })
                    .sort((a, b) => a.name.localeCompare(b.name));
                setAllStudents(students);
            } catch (err) {
                console.error('Error fetching students:', err);  // Add logging for debugging
                setStudentsError(true);
            } finally {
                setStudentsFetching(false);
            }
        };

        fetchStudents();
    }, [currentUserData?.schoolId, selectedAcademicYear]);

    // === FILTERING ===
    const majorOptions = useMemo(() => Array.from(new Set(allStudents.map(s => s.major).filter(Boolean as any))).sort(), [allStudents]);
    const groupOptions = useMemo(() => Array.from(new Set(allStudents.filter(s => !selectedMajor || s.major === selectedMajor).map(s => s.group).filter(Boolean as any))).sort(), [allStudents, selectedMajor]);
    const gradeOptions = useMemo(() => Array.from(new Set(allStudents.filter(s => (!selectedMajor || s.major === selectedMajor) && (!selectedGroup || s.group === selectedGroup)).map(s => s.grade).filter(Boolean as any))).sort(), [allStudents, selectedMajor, selectedGroup]);
    const sectionOptions = useMemo(() => Array.from(new Set(allStudents.filter(s => (!selectedMajor || s.major === selectedMajor) && (!selectedGroup || s.group === selectedGroup) && (!selectedGrade || s.grade === selectedGrade)).map(s => s.section).filter(Boolean as any))).sort(), [allStudents, selectedMajor, selectedGroup, selectedGrade]);

    useEffect(() => { setSelectedGroup(''); }, [selectedMajor]);
    useEffect(() => { setSelectedGrade(''); }, [selectedGroup]);
    useEffect(() => { setSelectedSection(''); }, [selectedGrade]);

    const filteredStudents = useMemo(() => {
        return allStudents.filter(student =>
            (!selectedMajor || student.major === selectedMajor) &&
            (!selectedGroup || student.group === selectedGroup) &&
            (!selectedGrade || student.grade === selectedGrade) &&
            (!selectedSection || student.section === selectedSection)
        );
    }, [allStudents, selectedMajor, selectedGroup, selectedGrade, selectedSection]);

    // === STAFF HANDLERS ===
    const handleCreateStaff = () => {
        setSelectedStaffUser(null);
        setIsStaffModalOpen(true);
    };

    const handleEditStaff = (user: UserProfile) => {
        setSelectedStaffUser(user);
        setIsStaffModalOpen(true);
    };

    const handleDeleteStaff = (user: UserProfile) => {
        setStaffUserToDelete(user);
    };

    const handleConfirmDeleteStaff = async () => {
        if (!staffUserToDelete) return;
        setIsDeletingStaff(true);
        try {
            await updateDoc(doc(db, 'users', staffUserToDelete.uid), { status: 'archived' });
            queryClient.invalidateQueries({ queryKey: ['usersPaginated'] });
        } catch (err: any) {
            alert('Failed to archive user.');
        } finally {
            setIsDeletingStaff(false);
            setStaffUserToDelete(null);
        }
    };

    // === STUDENT LOGIC ===
    const handleCreateStudent = () => {
        setSelectedStudent(null);
        setIsStudentModalOpen(true);
    };

    const handleEditStudent = (student: UserProfile) => {
        setSelectedStudent(student);
        setIsStudentModalOpen(true);
    };

    const handleDeleteStudent = (student: UserProfile) => {
        setStudentToDelete(student);
    };

    const handleDeleteAllStudents = () => {
        if (filteredStudents.length === 0) {
            alert("There are no students to archive in the current view.");
            return;
        }
        setStudentToDelete('all');
    };

    const handleConfirmDeleteStudent = async () => {
        setIsDeletingStudent(true);
        if (studentToDelete === 'all') {
            try {
                const batch = writeBatch(db);
                filteredStudents.forEach(student => {
                    const docRef = doc(db, 'users', student.uid);
                    batch.update(docRef, { status: 'archived' });
                });
                await batch.commit();
                queryClient.invalidateQueries({ queryKey: ['usersPaginated'] });
            } catch (err: any) {
                alert('Failed to archive all filtered students. You may need permissions to perform batch writes.');
                console.error("Error archiving filtered students: ", err);
            }
        } else if (studentToDelete) {
            try {
                await updateDoc(doc(db, 'users', studentToDelete.uid), { status: 'archived' });
                queryClient.invalidateQueries({ queryKey: ['usersPaginated'] });
            } catch (err: any) {
                alert('Failed to archive student.');
            }
        }
        setIsDeletingStudent(false);
        setStudentToDelete(null);
    };

    const getStudentConfirmationContent = () => {
        if (!studentToDelete) return { title: '', message: '' };
        if (studentToDelete === 'all') {
            return {
                title: 'Archive Filtered Students?',
                message: <p>Are you sure you want to archive all <strong>{filteredStudents.length}</strong> students matching the current filters? They will be hidden from view but not permanently deleted.</p>,
                confirmText: 'Archive All Filtered'
            };
        }
        return {
            title: 'Archive Student?',
            message: <p>Are you sure you want to archive <strong>{studentToDelete.name}</strong>? They will be hidden from view but not permanently deleted.</p>,
            confirmText: 'Archive Student'
        };
    };

    const handleGenerateParentAccounts = async () => {
        if (!currentUserData?.schoolId) return;
        const confirm = window.confirm("This will generate login accounts for all parents based on their Family Username. Continue?");
        if (!confirm) return;

        setIsGeneratingAccounts(true);
        try {
            const snapshot = await getDocs(query(collection(db, 'users'), where('schoolId', '==', currentUserData.schoolId)));
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            const students = allUsers.filter(user => {
                        // Filter archived users in JavaScript (avoids composite index requirement)
                        if (user.status === 'archived') return false;
                        const roles = getRoles(user);
                return roles.includes('student');
            });
            const families = new Map();

            students.forEach(student => {
                if (student.familyUsername && student.familyPassword) {
                    if (!families.has(student.familyUsername)) {
                        families.set(student.familyUsername, {
                            username: student.familyUsername,
                            password: student.familyPassword,
                            name: student.familyName || "Family of " + student.familyUsername,
                            email: student.familyUsername + "@parent.eduprogress.com",
                            schoolId: currentUserData.schoolId
                        });
                    }
                }
            });

            const familiesArray = Array.from(families.values());
            console.log("Sending families to Cloud Function...");

            const generateParentAccounts = httpsCallable(functions, 'generateParentAccounts');
            const result = await generateParentAccounts({ families: familiesArray });
            const data = result.data as any;

            if (data.success === false) {
                alert("Server Error: " + (data.error || "Unknown error"));
                return;
            }

            const { created, skipped, errors, debugLogs } = data;
            let message = "Process Complete:\n" + "- Students Scanned: " + allUsers.length + "\n" + "- Families Found: " + families.size + "\n" + "- Accounts Created: " + (created || 0) + "\n" + "- Skipped (Existing): " + (skipped || 0) + "\n" + "- Errors: " + ((errors && errors.length) || 0);
            if (debugLogs && debugLogs.length > 0) {
                message += "\n\nSample Errors:\n" + debugLogs.slice(0, 3).join("\n");
            }
            alert(message);
        } catch (error) {
            console.error("Error generating parent accounts:", error);
            alert("An error occurred while generating parent accounts: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsGeneratingAccounts(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>

                <Tabs defaultValue="staff">
                    <TabsList>
                        <TabsTrigger value="staff">Staff</TabsTrigger>
                        <TabsTrigger value="students">Students</TabsTrigger>
                    </TabsList>

                    {/* STAFF TAB */}
                    <TabsContent value="staff">
                        <Card className="mt-4">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>School Staff Directory</CardTitle>
                                        <CardDescription>A list of all teachers and administrative staff. (Showing {staffUsers.length} of {staffTotalRecords})</CardDescription>
                                    </div>
                                    <Button onClick={handleCreateStaff}>Create Staff User</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                                    <Input placeholder="Search by name or email..." value={staffSearchTerm} onChange={(e) => setStaffSearchTerm(e.target.value)} className="max-w-sm" />
                                    <Select value={staffFilterRole} onChange={e => setStaffFilterRole(e.target.value)} className="w-full sm:w-auto">
                                        <option value="">All Roles</option>
                                        {STAFF_ROLES.map(role => <option key={role} value={role}>{formatRole(role)}</option>)}
                                    </Select>
                                </div>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role(s)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {staffLoading ? (<TableRow><TableCell colSpan={4} className="text-center">Loading users...</TableCell></TableRow>) :
                                                staffError ? (<TableRow><TableCell colSpan={4} className="text-center text-destructive">Failed to fetch users.</TableCell></TableRow>) :
                                                    staffUsers.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center">No users found.</TableCell></TableRow>) : (
                                                        staffUsers.map(user => {
                                                            const userRoles = getRoles(user);
                                                            const isManager = userRoles.some(r => MANAGEMENT_ROLES.includes(r));
                                                            return (
                                                                <TableRow key={user.uid}>
                                                                    <TableCell className="font-medium">{user.name}</TableCell>
                                                                    <TableCell>{user.email || 'N/A'}</TableCell>
                                                                    <TableCell>{userRoles.map(formatRole).join(', ') || 'N/A'}</TableCell>
                                                                    <TableCell className="text-right space-x-2">
                                                                        {isManager && <Button variant="outline" size="sm" onClick={() => navigate('/management-assignments', { state: { teacherId: user.uid } })}>Manage Assignments</Button>}
                                                                        <Button variant="outline" size="sm" onClick={() => setUserToResetPassword(user)} disabled={!user.email}>Reset Password</Button>
                                                                        <Button variant="outline" size="sm" onClick={() => handleEditStaff(user)}>Edit</Button>
                                                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteStaff(user)}>Delete</Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })
                                                    )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* PAGINATION CONTROLS */}
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Page {staffPageNum} of {staffTotalPages} ({staffTotalRecords} total)
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setStaffCurrentPage(p => Math.max(1, p - 1))} disabled={!staffHasPrev || staffLoading}>
                                            Previous
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setStaffCurrentPage(p => p + 1)} disabled={!staffHasNext || staffLoading}>
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* STUDENTS TAB */}
                    <TabsContent value="students">
                        <Card className="mt-4">
                            <CardHeader>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                        <CardTitle>Student Roster ({selectedAcademicYear})</CardTitle>
                                        <CardDescription>A detailed list of all student profiles for the selected academic year.</CardDescription>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button variant="outline" onClick={handleGenerateParentAccounts}>Generate Parent Accounts</Button>
                                        <Button variant="outline" onClick={() => navigate('/import')}>Import Students</Button>
                                        <Button onClick={handleCreateStudent}>Create Student</Button>
                                        <Button variant="destructive" onClick={handleDeleteAllStudents} disabled={studentsFetching || filteredStudents.length === 0}>Delete Filtered Students</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <Select value={selectedMajor} onChange={e => setSelectedMajor(e.target.value)}><option value="">All Majors</option>{majorOptions.map(o => <option key={o} value={o}>{o}</option>)}</Select>
                                    <Select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}><option value="">All Groups</option>{groupOptions.map(o => <option key={o} value={o}>{o}</option>)}</Select>
                                    <Select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}><option value="">All Grades</option>{gradeOptions.map(o => <option key={o} value={o}>{o}</option>)}</Select>
                                    <Select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}><option value="">All Sections</option>{sectionOptions.map(o => <option key={o} value={o}>{o}</option>)}</Select>
                                </div>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>Grade</TableHead><TableHead>Section</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {studentsFetching ? (<TableRow><TableCell colSpan={6} className="text-center">Loading students...</TableCell></TableRow>) :
                                                studentsError ? (<TableRow><TableCell colSpan={6} className="text-center text-destructive">Failed to fetch students.</TableCell></TableRow>) :
                                                    filteredStudents.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center">No students found for the selected academic year and filters.</TableCell></TableRow>) : (
                                                        filteredStudents.map(student => (
                                                            <TableRow key={student.uid}>
                                                                <TableCell>{student.studentIdNumber || 'N/A'}</TableCell>
                                                                <TableCell className="font-medium"><Link to={`/students/${student.uid}`} className="hover:underline text-primary">{student.name}</Link></TableCell>
                                                                <TableCell>{student.grade || 'N/A'}</TableCell>
                                                                <TableCell>{student.section || 'N/A'}</TableCell>
                                                                <TableCell>{student.email || 'N/A'}</TableCell>
                                                                <TableCell className="text-right space-x-2">
                                                                    <Button variant="outline" size="sm" onClick={() => setUserToResetPassword(student)} disabled={!student.email}>Reset Password</Button>
                                                                    <Button variant="outline" size="sm" onClick={() => navigate(`/students/${student.uid}`)}>View</Button>
                                                                    <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>Edit</Button>
                                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(student)}>Delete</Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* MODALS */}
            {isStaffModalOpen && (
                <CreateEditUserModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} schoolId={currentUserData?.schoolId!} user={selectedStaffUser} />
            )}
            {staffUserToDelete && (
                <ConfirmationModal isOpen={!!staffUserToDelete} onClose={() => setStaffUserToDelete(null)} onConfirm={handleConfirmDeleteStaff} title="Archive User?" message={<p>Are you sure you want to archive <strong>{staffUserToDelete.name}</strong>? They will be hidden from view but not permanently deleted.</p>} confirmText="Archive User" loading={isDeletingStaff} />
            )}

            <ResetPasswordModal
                isOpen={!!userToResetPassword}
                onClose={() => setUserToResetPassword(null)}
                user={userToResetPassword}
            />

            {isStudentModalOpen && (
                <CreateEditStudentModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} schoolId={currentUserData?.schoolId!} student={selectedStudent} />
            )}
            <ConfirmationModal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)} onConfirm={handleConfirmDeleteStudent} title={getStudentConfirmationContent().title} message={getStudentConfirmationContent().message} confirmText={getStudentConfirmationContent().confirmText} loading={isDeletingStudent} />
        </>
    );
};

export default Users;





