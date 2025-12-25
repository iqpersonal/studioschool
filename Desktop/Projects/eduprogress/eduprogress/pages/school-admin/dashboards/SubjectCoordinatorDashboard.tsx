import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserProfile, ManagementAssignment } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/Card';
import Loader from '../../../components/ui/Loader';

interface SubjectCoordinatorDashboardProps {
    currentUserData: UserProfile;
}

const SubjectCoordinatorDashboard: React.FC<SubjectCoordinatorDashboardProps> = ({ currentUserData }) => {
    const [assignments, setAssignments] = useState<ManagementAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUserData.schoolId) {
            setError("Could not determine your school.");
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'managementAssignments'),
            where('schoolId', '==', currentUserData.schoolId),
            where('userId', '==', currentUserData.uid),
            where('role', '==', 'subject-coordinator')
        );

        const unsubAssignments = onSnapshot(q, snap => {
            const data = snap.docs.map(doc => doc.data() as ManagementAssignment);
            setAssignments(data);
            setLoading(false);
        }, err => {
            console.error("Error fetching SC assignments:", err);
            setError("Could not load your assigned subjects.");
            setLoading(false);
        });

        return () => unsubAssignments();
    }, [currentUserData.schoolId, currentUserData.uid]);

    if (loading) return <Loader />;
    if (error) return <div className="text-center p-8 text-destructive">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>My Coordinated Subjects</CardTitle>
                        <CardDescription>You are assigned as Subject Coordinator for the following areas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {assignments.length > 0 ? assignments.map(a => (
                            <div key={`${a.subjectId}-${a.grade}`} className="p-3 bg-secondary/50 rounded-md">
                                <p className="font-medium">{a.subjectName}</p>
                                <p className="text-sm text-muted-foreground">{a.major} / {a.group} / {a.grade}</p>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">You have not been assigned to coordinate any subjects yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <Link to="/grades-sections" className="block p-4 border rounded-lg hover:bg-accent"><p className="font-semibold">Explore Assigned Grades</p></Link>
                        <Link to="/progress-reports" className="block p-4 border rounded-lg hover:bg-accent"><p className="font-semibold">Review Progress Reports</p></Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SubjectCoordinatorDashboard;
