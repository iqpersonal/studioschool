import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, doc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { ManagementAssignment, UserProfile } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import ManagementAssignmentModal from '../../components/assignments/ManagementAssignmentModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { formatRole } from '../../utils/formatters';

const WarningIcon = ({ title }: { title: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <title>{title}</title>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const ManagementAssignments: React.FC = () => {
    const { currentUserData } = useAuth();
    const location = useLocation();
    const preselectedTeacherId = location.state?.teacherId;

    const [assignments, setAssignments] = useState<ManagementAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [assignmentToEdit, setAssignmentToEdit] = useState<ManagementAssignment | null>(null);
    const [assignmentToDelete, setAssignmentToDelete] = useState<ManagementAssignment | null>(null);

    const [filterByUser, setFilterByUser] = useState(preselectedTeacherId || '');
    const [managers, setManagers] = useState<UserProfile[]>([]);

    useEffect(() => {
        if (!currentUserData?.schoolId) return;
        const schoolId = currentUserData.schoolId;

        const assignmentsQuery = query(collection(db, 'managementAssignments'), where('schoolId', '==', schoolId));
        const unsubAssignments = onSnapshot(assignmentsQuery, snap => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ManagementAssignment);
            setAssignments(data);
            setLoading(false);
        }, err => {
            setError("Failed to load assignments.");
            setLoading(false);
            console.error(err);
        });

        const managersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        const unsubManagers = onSnapshot(managersQuery, snap => {
            const users = snap.docs.map(doc => doc.data() as UserProfile);
            const managerRoles = ['head-of-section', 'academic-director', 'subject-coordinator'];
            const managerUsers = users.filter(u => {
                if (u.status === 'archived') return false;
                const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
                return roles.some(r => managerRoles.includes(r));
            });
            managerUsers.sort((a, b) => a.name.localeCompare(b.name));
            setManagers(managerUsers);
        });

        return () => {
            unsubAssignments();
            unsubManagers();
        };
    }, [currentUserData?.schoolId]);

    const handleCreate = () => {
        setAssignmentToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (assignment: ManagementAssignment) => {
        setAssignmentToEdit(assignment);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!assignmentToDelete) return;
        await deleteDoc(doc(db, 'managementAssignments', assignmentToDelete.id));
        setAssignmentToDelete(null);
    };

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => !filterByUser || a.userId === filterByUser);
    }, [assignments, filterByUser]);

    const assignmentsByRole = useMemo(() => {
        const grouped = new Map<string, ManagementAssignment[]>();
        filteredAssignments.forEach(assignment => {
            const role = assignment.role;
            if (!grouped.has(role)) {
                grouped.set(role, []);
            }
            grouped.get(role)!.push(assignment);
        });
        return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredAssignments]);

    const assignmentsByStaffAndRole = useMemo(() => {
        const grouped = new Map<string, Map<string, ManagementAssignment[]>>();
        filteredAssignments.forEach(assignment => {
            const staffName = assignment.userName;
            const role = assignment.role;

            if (!grouped.has(staffName)) {
                grouped.set(staffName, new Map<string, ManagementAssignment[]>());
            }

            const staffGroup = grouped.get(staffName)!;

            if (!staffGroup.has(role)) {
                staffGroup.set(role, []);
            }

            staffGroup.get(role)!.push(assignment);
        });

        return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredAssignments]);


    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Management Assignments</h1>
                        <p className="text-muted-foreground">Assign academic leaders to their areas of responsibility.</p>
                    </div>
                    <Button onClick={handleCreate}>Create Assignment</Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Assignments</CardTitle>
                        <CardDescription>
                            A complete record of all academic management assignments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="flex items-center gap-4 mb-4">
                            <select value={filterByUser} onChange={e => setFilterByUser(e.target.value)} className="flex h-10 w-full max-w-sm items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="">Filter by Staff Member...</option>
                                {managers.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                            </select>
                            {filterByUser && <Button variant="ghost" onClick={() => setFilterByUser('')}>Clear Filter</Button>}
                        </div>

                        {loading ? <Loader /> : error ? <p className="text-destructive">{error}</p> : (
                            <Tabs defaultValue="all">
                                <TabsList>
                                    <TabsTrigger value="all">All Assignments</TabsTrigger>
                                    <TabsTrigger value="by-role">Group by Role</TabsTrigger>
                                    <TabsTrigger value="by-staff">Group by Staff</TabsTrigger>
                                </TabsList>

                                <TabsContent value="all" className="mt-4">
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Staff Member</TableHead>
                                                    <TableHead>Role</TableHead>
                                                    <TableHead>Scope</TableHead>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredAssignments.length === 0 ? (
                                                    <TableRow><TableCell colSpan={5} className="text-center">No assignments found.</TableCell></TableRow>
                                                ) : (
                                                    filteredAssignments.map(a => {
                                                        const userExists = managers.some(m => m.uid === a.userId);
                                                        return (
                                                            <TableRow key={a.id}>
                                                                <TableCell className="font-medium">
                                                                    {userExists ? a.userName : (
                                                                        <div className="flex items-center gap-2 text-destructive/90">
                                                                            <WarningIcon title="User account deleted" />
                                                                            <span>{a.userName} [Deleted]</span>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="capitalize">{formatRole(a.role)}</TableCell>
                                                                <TableCell>{`${a.major} / ${a.group} / ${a.grade}`}</TableCell>
                                                                <TableCell>{a.subjectName || 'N/A'}</TableCell>
                                                                <TableCell className="text-right space-x-2">
                                                                    <Button variant="outline" size="sm" onClick={() => handleEdit(a)}>Edit</Button>
                                                                    <Button variant="destructive" size="sm" onClick={() => setAssignmentToDelete(a)}>Delete</Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="by-role" className="mt-4">
                                    <div className="space-y-6">
                                        {assignmentsByRole.map(([role, assignmentsInRole]) => (
                                            <div key={role}>
                                                <h3 className="text-lg font-semibold mb-2">{formatRole(role)} ({assignmentsInRole.length})</h3>
                                                <div className="rounded-md border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Staff Member</TableHead>
                                                                <TableHead>Scope</TableHead>
                                                                <TableHead>Subject</TableHead>
                                                                <TableHead className="text-right">Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {assignmentsInRole.map(a => {
                                                                const userExists = managers.some(m => m.uid === a.userId);
                                                                return (
                                                                    <TableRow key={a.id}>
                                                                        <TableCell className="font-medium">
                                                                            {userExists ? a.userName : (
                                                                                <div className="flex items-center gap-2 text-destructive/90">
                                                                                    <WarningIcon title="User account deleted" />
                                                                                    <span>{a.userName} [Deleted]</span>
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>{`${a.major} / ${a.group} / ${a.grade}`}</TableCell>
                                                                        <TableCell>{a.subjectName || 'N/A'}</TableCell>
                                                                        <TableCell className="text-right space-x-2">
                                                                            <Button variant="outline" size="sm" onClick={() => handleEdit(a)}>Edit</Button>
                                                                            <Button variant="destructive" size="sm" onClick={() => setAssignmentToDelete(a)}>Delete</Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                                <TabsContent value="by-staff" className="mt-4">
                                    <div className="space-y-6">
                                        {assignmentsByStaffAndRole.map(([staffName, rolesMap]) => {
                                            const user = managers.find(m => m.name === staffName);
                                            const allRoles = user ? (Array.isArray(user.role) ? user.role : [user.role]).map(formatRole).join(', ') : '';

                                            return (
                                                <Card key={staffName} className="overflow-hidden">
                                                    <CardHeader className="bg-muted/50">
                                                        <CardTitle>{staffName}</CardTitle>
                                                        {allRoles && <CardDescription>{allRoles}</CardDescription>}
                                                    </CardHeader>
                                                    <CardContent className="p-4 md:p-6 space-y-4">
                                                        {Array.from(rolesMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([role, assignmentsInRole]) => (
                                                            <div key={role}>
                                                                <h4 className="font-semibold text-md mb-2 text-primary">{formatRole(role)} ({assignmentsInRole.length} assignment(s))</h4>
                                                                <div className="rounded-md border">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Scope</TableHead>
                                                                                <TableHead>Subject</TableHead>
                                                                                <TableHead className="text-right">Actions</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {assignmentsInRole.map(a => (
                                                                                <TableRow key={a.id}>
                                                                                    <TableCell>{`${a.major} / ${a.group} / ${a.grade}`}</TableCell>
                                                                                    <TableCell>{a.subjectName || 'N/A'}</TableCell>
                                                                                    <TableCell className="text-right space-x-2">
                                                                                        <Button variant="outline" size="sm" onClick={() => handleEdit(a)}>Edit</Button>
                                                                                        <Button variant="destructive" size="sm" onClick={() => setAssignmentToDelete(a)}>Delete</Button>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>
            </div>

            {isModalOpen && currentUserData?.schoolId && (
                <ManagementAssignmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    schoolId={currentUserData.schoolId}
                    assignmentToEdit={assignmentToEdit}
                    managers={managers}
                    existingAssignments={assignments}
                />
            )}

            {assignmentToDelete && (
                <ConfirmationModal
                    isOpen={!!assignmentToDelete}
                    onClose={() => setAssignmentToDelete(null)}
                    onConfirm={handleDelete}
                    title="Delete Assignment?"
                    message={<p>Are you sure you want to delete this assignment for <strong>{assignmentToDelete.userName}</strong>?</p>}
                    confirmText="Delete"
                />
            )}
        </>
    );
};

export default ManagementAssignments;
