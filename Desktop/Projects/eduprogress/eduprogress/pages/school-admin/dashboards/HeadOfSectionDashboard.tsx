import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserProfile, ManagementAssignment, TeacherAssignment } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/Card';
import Loader from '../../../components/ui/Loader';

interface HeadOfSectionDashboardProps {
    currentUserData: UserProfile;
}

const StudentIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75zm-.75 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.75 0h.008v.015h-.008V9.75z" /></svg>);
const TeacherIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>);
const SectionsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" /></svg>);

const HeadOfSectionDashboard: React.FC<HeadOfSectionDashboardProps> = ({ currentUserData }) => {
    const [managementAssignments, setManagementAssignments] = useState<ManagementAssignment[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [allTeacherAssignments, setAllTeacherAssignments] = useState<TeacherAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUserData.schoolId) {
            setError("Could not determine your school.");
            setLoading(false);
            return;
        }
        const schoolId = currentUserData.schoolId;
        const unsubscribes: (() => void)[] = [];
        let queriesCompleted = 0;
        const totalQueries = 3;

        const onQueryDone = () => {
            queriesCompleted++;
            if (queriesCompleted === totalQueries) setLoading(false);
        };

        const handleError = (err: Error, context: string) => {
            console.error(`Error fetching ${context}:`, err);
            setError(prev => `${prev ? prev + ' ' : ''}Could not load ${context}.`);
            onQueryDone();
        };

        // Fetch HOS's own management assignments
        const mgmtQuery = query(collection(db, 'managementAssignments'),
            where('schoolId', '==', schoolId),
            where('userId', '==', currentUserData.uid),
            where('role', '==', 'head-of-section')
        );
        const unsubMgmt = onSnapshot(mgmtQuery, snap => {
            setManagementAssignments(snap.docs.map(doc => doc.data() as ManagementAssignment));
            onQueryDone();
        }, err => handleError(err, 'your assignments'));
        unsubscribes.push(unsubMgmt);

        // Fetch all students in the school
        const studentsQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        const unsubStudents = onSnapshot(studentsQuery, snap => {
            const allUsers = snap.docs.map(doc => doc.data() as UserProfile);
            const students = allUsers.filter(u => {
                const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
                return roles.includes('student');
            });
            setAllStudents(students);
            onQueryDone();
        }, err => handleError(err, 'student data'));
        unsubscribes.push(unsubStudents);

        // Fetch all teacher assignments in the school
        const teachersQuery = query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId));
        const unsubTeachers = onSnapshot(teachersQuery, snap => {
            setAllTeacherAssignments(snap.docs.map(doc => doc.data() as TeacherAssignment));
            onQueryDone();
        }, err => handleError(err, 'teacher assignments'));
        unsubscribes.push(unsubTeachers);

        return () => unsubscribes.forEach(unsub => unsub());
    }, [currentUserData.schoolId, currentUserData.uid]);

    const { scopedStats, classCards } = useMemo(() => {
        if (managementAssignments.length === 0) {
            return { scopedStats: { studentCount: 0, sectionCount: 0, teacherCount: 0 }, classCards: [] };
        }

        const normalize = (str: string | undefined | null) => (str || '').trim().toLowerCase();

        const assignedScopes = new Set(
            managementAssignments.map(a => `${normalize(a.major)}|${normalize(a.group)}|${normalize(a.grade)}`)
        );

        const scopedStudents = allStudents.filter(student => {
            const studentScope = `${normalize(student.major)}|${normalize(student.group)}|${normalize(student.grade)}`;
            return assignedScopes.has(studentScope);
        });

        const uniqueScopedSections = new Map<string, { grade: string, section: string }>();
        scopedStudents.forEach(s => {
            if (s.grade && s.section) {
                uniqueScopedSections.set(`${s.grade}|${s.section}`, { grade: s.grade, section: s.section });
            }
        });

        const scopedSectionKeys = new Set(Array.from(uniqueScopedSections.keys()).map(k => `${normalize(k.split('|')[0])}|${normalize(k.split('|')[1])}`));

        const scopedTeacherAssignments = allTeacherAssignments.filter(ta => {
            const key = `${normalize(ta.grade)}|${normalize(ta.section)}`;
            return scopedSectionKeys.has(key);
        });

        const uniqueTeachers = new Set(scopedTeacherAssignments.map(ta => ta.teacherId));

        const stats = {
            studentCount: scopedStudents.length,
            sectionCount: uniqueScopedSections.size,
            teacherCount: uniqueTeachers.size,
        };

        const cards = Array.from(uniqueScopedSections.values()).map(({ grade, section }) => {
            const studentCount = scopedStudents.filter(s => s.grade === grade && s.section === section).length;
            const teacherCount = new Set(allTeacherAssignments.filter(ta => ta.grade === grade && ta.section === section).map(t => t.teacherId)).size;
            return { grade, section, studentCount, teacherCount };
        }).sort((a, b) => `${a.grade} ${a.section}`.localeCompare(`${b.grade} ${b.section}`));

        return { scopedStats: stats, classCards: cards };
    }, [managementAssignments, allStudents, allTeacherAssignments]);

    if (loading) return <Loader />;
    if (error) return <div className="text-center p-8 text-destructive">{error}</div>;

    if (managementAssignments.length === 0 && !loading) {
        return (
            <Card>
                <CardHeader><CardTitle>Head of Section Dashboard</CardTitle></CardHeader>
                <CardContent className="text-center py-8">
                    <p className="font-semibold">No Assignments Found</p>
                    <p className="text-sm text-muted-foreground mt-1">You have not been assigned to manage any grades yet. Please contact your school administrator.</p>
                </CardContent>
            </Card>
        );
    }

    const statCards = [
        { title: 'Managed Students', value: scopedStats.studentCount, icon: <StudentIcon /> },
        { title: 'Managed Sections', value: scopedStats.sectionCount, icon: <SectionsIcon /> },
        { title: 'Assigned Teachers', value: scopedStats.teacherCount, icon: <TeacherIcon /> },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                {statCards.map((stat, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            {stat.icon}
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stat.value}</div></CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>My Sections</CardTitle>
                        <CardDescription>Select a class to view its roster and teacher assignments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {classCards.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {classCards.map(({ grade, section, studentCount, teacherCount }) => (
                                    <Link
                                        key={`${grade}-${section}`}
                                        to={`/class-roster/${encodeURIComponent(grade)}/${encodeURIComponent(section)}`}
                                        className="block p-4 border rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <p className="font-semibold text-foreground truncate">{grade}</p>
                                        <p className="text-sm text-muted-foreground truncate">{section}</p>
                                        <div className="border-t mt-3 pt-2 text-xs space-y-1 text-muted-foreground">
                                            <p>{studentCount} Student{studentCount !== 1 && 's'}</p>
                                            <p>{teacherCount} Teacher{teacherCount !== 1 && 's'}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No students found in your assigned sections yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Jump to common tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link to="/progress-reports" className="block p-4 border rounded-lg hover:bg-accent transition-colors">
                            <p className="font-semibold">Manage Progress Reports</p>
                            <p className="text-sm text-muted-foreground">Review and monitor report completion.</p>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default HeadOfSectionDashboard;