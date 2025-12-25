import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Bell, AlertCircle } from 'lucide-react';

interface Notice {
    id: string;
    title: string;
    content: string;
    date: any;
    targetAudience: 'all' | 'teachers' | 'students';
    priority: 'normal' | 'high';
}

const NoticeWidget: React.FC = () => {
    const { currentUserData } = useAuth();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUserData?.schoolId) return;

        const userRoles = Array.isArray(currentUserData.role) ? currentUserData.role : [currentUserData.role];
        const isTeacher = userRoles.includes('teacher');
        const isStudent = userRoles.includes('student');

        const q = query(
            collection(db, 'notices'),
            where('schoolId', '==', currentUserData.schoolId),
            orderBy('date', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, snapshot => {
            const allNotices = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notice));

            // Client-side filtering based on audience
            const relevantNotices = allNotices.filter(notice => {
                if (notice.targetAudience === 'all') return true;
                if (notice.targetAudience === 'teachers' && isTeacher) return true;
                if (notice.targetAudience === 'students' && isStudent) return true;
                // School Admins see everything
                if (userRoles.includes('school-admin') || userRoles.includes('super-admin')) return true;
                return false;
            });

            setNotices(relevantNotices);
            setLoading(false);
        }, error => {
            console.error("Error fetching notices for widget:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserData]);

    if (loading || notices.length === 0) return null;

    return (
        <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50/30">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    School Announcements
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {notices.map(notice => (
                        <div key={notice.id} className="border-b last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    {notice.priority === 'high' && (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    {notice.title}
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                    {notice.date?.toDate().toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{notice.content}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default NoticeWidget;
