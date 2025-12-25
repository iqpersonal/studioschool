import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { useMySchool } from '../../hooks/queries/useMySchool';
import Button from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Loader from '../../components/ui/Loader';
import ManagerDashboard from './dashboards/ManagerDashboard';
import TeacherDashboard from './dashboards/TeacherDashboard';
import HeadOfSectionDashboard from './dashboards/HeadOfSectionDashboard';
import AcademicDirectorDashboard from './dashboards/AcademicDirectorDashboard';
import SubjectCoordinatorDashboard from './dashboards/SubjectCoordinatorDashboard';
import NoticeWidget from '../../components/dashboard/NoticeWidget';

const MySchool: React.FC = () => {
    const { currentUserData } = useAuth();
    const { selectedAcademicYear } = useAcademicYear();
    const navigate = useNavigate();

    const userRoleData = currentUserData?.role;
    const userRoles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);

    const isSchoolAdmin = userRoles.includes('school-admin');
    const isAcademicDirector = userRoles.includes('academic-director');
    const isHeadOfSection = userRoles.includes('head-of-section');
    const isSubjectCoordinator = userRoles.includes('subject-coordinator');
    const isTeacher = userRoles.includes('teacher');
    const isGeneralManager = isSchoolAdmin || isAcademicDirector;
    const isManager = isGeneralManager || isHeadOfSection || isSubjectCoordinator;

    // Use React Query hook - REPLACES 3 onSnapshot LISTENERS
    const { school, stats, teacherAssignments, isLoading, isError, error } = useMySchool(
        currentUserData?.schoolId,
        selectedAcademicYear,
        userRoles,
        currentUserData?.uid
    );

    if (!currentUserData?.schoolId) {
        return <div className="text-center p-8 text-destructive">Could not determine your associated school.</div>;
    }

    if (isLoading) return <Loader />;
    if (isError) return <div className="text-center p-8 text-destructive">Error: {error?.message || "Failed to load school data"}</div>;
    if (!school) return <div className="text-center p-8">No school information available.</div>;

    const views = [];
    if (isHeadOfSection) {
        views.push({
            value: 'hos',
            label: 'Head of Section View',
            component: <HeadOfSectionDashboard currentUserData={currentUserData!} />
        });
    }
    if (isSubjectCoordinator) {
        views.push({
            value: 'sc',
            label: 'Subject Coordinator View',
            component: <SubjectCoordinatorDashboard currentUserData={currentUserData!} />
        });
    }
    if (isAcademicDirector) {
        views.push({
            value: 'ad',
            label: 'Academic Director View',
            component: <AcademicDirectorDashboard currentUserData={currentUserData!} />
        });
    }
    if (isSchoolAdmin) {
        views.push({
            value: 'management',
            label: 'School Admin View',
            component: <ManagerDashboard stats={stats} school={school} />
        });
    }
    if (isTeacher) {
        views.push({
            value: 'teaching',
            label: 'Teacher View',
            component: <TeacherDashboard teacherAssignments={teacherAssignments} />
        });
    }

    if (views.length === 0 && isManager) {
        views.push({
            value: 'management',
            label: 'Management View',
            component: <ManagerDashboard stats={stats} school={school} />
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome, {currentUserData?.name}</h1>
                    <p className="text-muted-foreground">Your dashboard for {school.name}.</p>
                </div>
                {isManager && <Button variant="outline" onClick={() => navigate('/school-settings')}>School Settings</Button>}
            </div>

            <NoticeWidget />

            {views.length > 1 ? (
                <Tabs defaultValue={views[0].value}>
                    <TabsList>
                        {views.map(view => (
                            <TabsTrigger key={view.value} value={view.value}>{view.label}</TabsTrigger>
                        ))}
                    </TabsList>
                    {views.map(view => (
                        <TabsContent key={view.value} value={view.value} className="mt-4">
                            {view.component}
                        </TabsContent>
                    ))}
                </Tabs>
            ) : views.length === 1 ? (
                views[0].component
            ) : (
                <p>Your dashboard is being configured.</p>
            )}
        </div>
    );
};

export default MySchool;
