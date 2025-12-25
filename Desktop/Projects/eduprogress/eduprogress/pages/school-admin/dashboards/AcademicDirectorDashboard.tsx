import React from 'react';
import { Link } from 'react-router-dom';
import { UserProfile } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/Card';

interface AcademicDirectorDashboardProps {
  currentUserData: UserProfile;
}

const AcademicDirectorDashboard: React.FC<AcademicDirectorDashboardProps> = ({ currentUserData }) => {
    const quickActions = [
        { title: 'Manage All Users', path: '/users', description: 'Add, edit, or remove staff and students.' },
        { title: 'Explore Grades & Sections', path: '/grades-sections', description: 'View class rosters and teacher assignments.' },
        { title: 'Review Progress Reports', path: '/progress-reports', description: 'Drill down into student performance data.' },
        { title: 'Management Assignments', path: '/management-assignments', description: 'Assign academic leadership roles.' },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Academic Director Dashboard</CardTitle>
                    <CardDescription>Quick access to key academic management areas.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickActions.map(action => (
                        <Link key={action.path} to={action.path} className="block p-4 border rounded-lg hover:bg-accent transition-colors">
                            <p className="font-semibold text-foreground">{action.title}</p>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                        </Link>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default AcademicDirectorDashboard;
