import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import NoticeWidget from '../../components/dashboard/NoticeWidget';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard: React.FC = () => {
    const { currentUserData } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome, {currentUserData?.name}</h1>
                <p className="text-muted-foreground">Here is your student dashboard.</p>
            </div>

            <NoticeWidget />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/student/grades')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Grades</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">View Results</div>
                        <p className="text-xs text-muted-foreground">Check your latest assessment scores</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/student/attendance')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Attendance</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Check Attendance</div>
                        <p className="text-xs text-muted-foreground">View your presence record</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/student/timetable')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Timetable</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">View Schedule</div>
                        <p className="text-xs text-muted-foreground">See your upcoming classes</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default StudentDashboard;
