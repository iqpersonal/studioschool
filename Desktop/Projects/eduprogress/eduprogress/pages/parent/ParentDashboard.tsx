import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import NoticeWidget from '../../components/dashboard/NoticeWidget';
import { User, BookOpen, Calendar } from 'lucide-react';

const ParentDashboard: React.FC = () => {
    const { currentUserData } = useAuth();
    const [children, setChildren] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUserData?.schoolId || !currentUserData?.familyUsername) return;

        const fetchChildren = async () => {
            try {
                // Find students linked to this family account
                // We assume the student profile has 'familyUsername' matching the parent's username
                const q = query(
                    collection(db, 'users'),
                    where('schoolId', '==', currentUserData.schoolId),
                    where('familyUsername', '==', currentUserData.familyUsername),
                    where('role', 'array-contains', 'student')
                );
                const snapshot = await getDocs(q);

                const childrenData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
                setChildren(childrenData);
            } catch (error) {
                console.error("Error fetching children:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChildren();
    }, [currentUserData]);

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome, {currentUserData?.name || 'Parent'}</h1>
                <p className="text-muted-foreground">Track your children's progress here.</p>
            </div>

            <NoticeWidget />

            <h2 className="text-xl font-semibold mt-6 mb-4">My Children</h2>

            {children.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No children found linked to this account. Please contact the school administration.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {children.map(child => (
                        <Card key={child.uid} className="hover:shadow-lg transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <User className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>{child.name}</CardTitle>
                                        <CardDescription>{child.grade} - {child.section}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center justify-between text-sm p-2 bg-secondary/50 rounded-md">
                                        <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Academic Performance</span>
                                        <span className="font-semibold">View</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm p-2 bg-secondary/50 rounded-md">
                                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Attendance</span>
                                        <span className="font-semibold">Check</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParentDashboard;
