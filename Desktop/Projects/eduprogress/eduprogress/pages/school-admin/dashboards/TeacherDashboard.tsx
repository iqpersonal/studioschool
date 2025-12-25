import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TeacherAssignment } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/Card';

interface TeacherDashboardProps {
  teacherAssignments: TeacherAssignment[];
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacherAssignments }) => {
    const uniqueClasses = useMemo(() => {
        const classMap = new Map<string, { grade: string, section: string }>();
        teacherAssignments.forEach(a => {
            const key = `${a.grade}|${a.section}`;
            if (!classMap.has(key)) {
                classMap.set(key, { grade: a.grade, section: a.section });
            }
        });
        return Array.from(classMap.values()).sort((a, b) => `${a.grade} ${a.section}`.localeCompare(`${b.grade} ${b.section}`));
    }, [teacherAssignments]);

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>My Classes</CardTitle>
                    <CardDescription>An overview of your assigned classes. Select one to manage progress reports.</CardDescription>
                </CardHeader>
                <CardContent>
                   {uniqueClasses.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {uniqueClasses.map(c => (
                            <Link key={`${c.grade}-${c.section}`} to="/progress-reports" className="block p-4 border rounded-lg text-center hover:bg-accent transition-colors">
                                <p className="font-semibold">{c.grade}</p>
                                <p className="text-sm text-muted-foreground">{c.section}</p>
                            </Link>
                        ))}
                    </div>
                   ) : (
                     <p className="text-sm text-muted-foreground text-center py-4">You have not been assigned to any classes yet.</p>
                   )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Link to="/progress-reports" className="block p-3 -mx-3 rounded-lg font-medium text-primary hover:bg-secondary transition-colors">
                        Manage Progress Reports
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherDashboard;
