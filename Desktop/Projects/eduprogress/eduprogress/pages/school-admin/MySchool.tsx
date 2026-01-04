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
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Bell, BookOpen, GraduationCap, Calendar, Plus } from 'lucide-react';

const slideIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// --- Custom Dashboard Illustration ---
const SchoolDashboardIllustration = () => (
    <div className="relative w-full h-full min-h-[160px] flex items-center justify-center overflow-hidden">
        {/* Background Gradients */}
        <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -right-20 -top-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl opacity-60"
        />
        <motion.div
            animate={{ rotate: -360, scale: [1, 1.2, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 bottom-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl opacity-60"
        />

        <div className="relative z-10 flex gap-6 mt-4">
            {/* Book/Binder Graphic */}
            <motion.div
                initial={{ rotate: -10, y: 20, opacity: 0 }}
                animate={{ rotate: -5, y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-24 h-32 bg-emerald-700 rounded-r-lg rounded-l-sm shadow-xl flex flex-col items-center justify-center relative border-l-4 border-emerald-900"
            >
                {/* Book Spine Details */}
                <div className="absolute left-1 top-4 h-2 w-full bg-emerald-800/50" />
                <div className="absolute left-1 bottom-4 h-2 w-full bg-emerald-800/50" />
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-emerald-100" />
                </div>
            </motion.div>

            {/* Students Stats Card */}
            <motion.div
                initial={{ rotate: 5, y: 40, opacity: 0 }}
                animate={{ rotate: 5, y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-36 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-2xl flex flex-col justify-between"
            >
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                        <GraduationCap className="w-3 h-3 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">Attendance</span>
                </div>
                <div className="flex items-end gap-1 h-12">
                    {[60, 80, 40, 90, 75].map((h, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 0.6 + (i * 0.1), duration: 0.5 }}
                            className="flex-1 bg-indigo-500 rounded-t-sm opacity-80"
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    </div>
);


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
        <motion.div
            initial="hidden"
            animate="visible"
            variants={slideIn}
            className="space-y-8"
        >
            {/* Header Banner */}
            <motion.div
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white shadow-xl dark:border dark:border-white/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                <div className="grid md:grid-cols-[1fr_300px] items-center">
                    <div className="p-8 relative z-10">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                            Welcome, {currentUserData?.name} 👋
                        </h1>
                        <p className="text-emerald-100/80 text-lg mb-6 max-w-xl">
                            Here's your dashboard for <span className="font-semibold text-white">{school.name}</span>. Manage your staff, students, and academic progress.
                        </p>
                        <div className="flex gap-3">
                            {isManager && (
                                <Button size="lg" onClick={() => navigate('/school-settings')} className="bg-white text-emerald-900 hover:bg-emerald-50 border-none shadow-md">
                                    <Settings className="w-4 h-4 mr-2" />
                                    School Settings
                                </Button>
                            )}
                            <Button size="lg" variant="outline" className="bg-transparent text-white border-white/20 hover:bg-white/10">
                                <Bell className="w-4 h-4 mr-2" />
                                Notices
                            </Button>
                        </div>
                    </div>

                    {/* Illustration Area */}
                    <div className="h-full hidden md:block relative">
                        <div className="absolute inset-0 bg-gradient-to-l from-emerald-900/10 to-transparent" />
                        <SchoolDashboardIllustration />
                    </div>
                </div>
            </motion.div>

            <NoticeWidget />

            {views.length > 1 ? (
                <Tabs defaultValue={views[0].value}>
                    <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-xl border dark:border-slate-800">
                        {views.map(view => (
                            <TabsTrigger
                                key={view.value}
                                value={view.value}
                                className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-900 dark:data-[state=active]:bg-emerald-900/30 dark:data-[state=active]:text-emerald-300 rounded-lg px-4 py-2"
                            >
                                {view.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <AnimatePresence mode="wait">
                        {views.map(view => (
                            <TabsContent key={view.value} value={view.value} className="mt-6 focus:outline-none">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {view.component}
                                </motion.div>
                            </TabsContent>
                        ))}
                    </AnimatePresence>
                </Tabs>
            ) : views.length === 1 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {views[0].component}
                </motion.div>
            ) : (
                <div className="p-8 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed">
                    Your dashboard is being configured.
                </div>
            )}
        </motion.div>
    );
};

export default MySchool;
