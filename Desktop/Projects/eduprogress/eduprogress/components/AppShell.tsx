import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './layout/Layout';
import { useAuth } from '../hooks/useAuth';
import ErrorBoundary from './ErrorBoundary';

// Super Admin Pages
import Dashboard from '../pages/Dashboard';
import Schools from '../pages/Schools';
import Modules from '../pages/Modules';
import Subscriptions from '../pages/Subscriptions';
import AiUsage from '../pages/AiUsage';
import AuditLogsSuperAdmin from '../pages/AuditLogs';
import Support from '../pages/Support';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';

// School Admin Pages
import MySchool from '../pages/school-admin/MySchool';
import SchoolSettings from '../pages/school-admin/SchoolSettings';
import Users from '../pages/school-admin/Users';
import ImportStudents from '../pages/school-admin/ImportStudents';
import ImportTeachers from '../pages/school-admin/ImportTeachers';
import StudentDetails from '../pages/school-admin/StudentDetails';
import GradesAndSections from '../pages/school-admin/GradesAndSections';
import ClassRoster from '../pages/school-admin/ClassRoster';
import ProgressReports from '../pages/school-admin/ProgressReports';
import StudentReportForm from '../pages/school-admin/StudentReportForm';
import TimetableManagement from '../pages/school-admin/TimetableManagement';
import SubjectAllocation from '../pages/school-admin/SubjectAllocation';
import TeacherAssignmentsReport from '../pages/school-admin/TeacherAssignmentsReport';
import TeacherWorkloadReport from '../pages/school-admin/TeacherWorkloadReport';
import ManagementAssignments from '../pages/school-admin/ManagementAssignments';
import ImportAssignments from '../pages/school-admin/ImportAssignments';
import AssessmentSetup from '../pages/school-admin/AssessmentSetup';
import AssessmentGradeEntry from '../pages/school-admin/AssessmentGradeEntry';
import Attendance from '../pages/school-admin/Attendance';
import AuditLogs from '../pages/school-admin/AuditLogs';
import NoticeBoard from '../pages/school-admin/NoticeBoard';
import ExamManagement from '../pages/school-admin/ExamManagement';
import InventoryDashboard from '../pages/school-admin/InventoryDashboard';

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import MyGrades from '../pages/student/MyGrades';
import MyAttendance from '../pages/student/MyAttendance';
import MyTimetable from '../pages/student/MyTimetable';

// Parent Pages
import ParentDashboard from '../pages/parent/ParentDashboard';

// Library Pages
import LibraryDashboard from '../pages/library/LibraryDashboard';

// Finance Pages
import FinanceDashboard from '../pages/finance/FinanceDashboard';

// Teacher Pages
import LessonPlanner from '../pages/teachers/LessonPlanner';

import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const AppShell: React.FC = () => {
    const { currentUserData } = useAuth();
    const userRoleData = currentUserData?.role;

    const isBrokenRole = typeof (userRoleData as any) === 'string' && (userRoleData as any).startsWith('[') && (userRoleData as any).includes('school-admin');

    const fixAccount = async () => {
        if (!currentUserData?.uid) return;
        try {
            await updateDoc(doc(db, 'users', currentUserData.uid), {
                role: ['school-admin']
            });
            window.location.reload();
        } catch (error) {
            alert('Failed to fix account: ' + error);
        }
    };

    if (isBrokenRole) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Account Configuration Error</h1>
                    <p className="mb-6 text-gray-600">
                        We detected an issue with your account permissions format. This prevents you from accessing the dashboard.
                    </p>
                    <button
                        onClick={fixAccount}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Fix My Account
                    </button>
                </div>
            </div>
        );
    }

    const roles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);

    return (
        <Layout>
            <Routes>
                {/* Super Admin Routes - Wrapped with per-page ErrorBoundary */}
                {roles.includes('super-admin') && (
                    <>
                        <Route path="/" element={<ErrorBoundary scope="dashboard"><Dashboard /></ErrorBoundary>} />
                        <Route path="/schools" element={<ErrorBoundary scope="schools"><Schools /></ErrorBoundary>} />
                        <Route path="/modules" element={<ErrorBoundary scope="modules"><Modules /></ErrorBoundary>} />
                        <Route path="/subscriptions" element={<ErrorBoundary scope="subscriptions"><Subscriptions /></ErrorBoundary>} />
                        <Route path="/ai-usage" element={<ErrorBoundary scope="aiusage"><AiUsage /></ErrorBoundary>} />
                        <Route path="/audit-logs-global" element={<ErrorBoundary scope="audit-logs-global"><AuditLogsSuperAdmin /></ErrorBoundary>} />
                        <Route path="/support" element={<ErrorBoundary scope="support"><Support /></ErrorBoundary>} />
                        <Route path="/settings" element={<ErrorBoundary scope="settings"><Settings /></ErrorBoundary>} />
                        <Route path="/profile" element={<ErrorBoundary scope="profile"><Profile /></ErrorBoundary>} />
                    </>
                )}

                {/* School Admin / Management Routes - Wrapped for critical pages */}
                {roles.some(r => ['school-admin', 'academic-director', 'head-of-section', 'subject-coordinator'].includes(r)) && (
                    <>
                        <Route path="/" element={<ErrorBoundary scope="my-school"><MySchool /></ErrorBoundary>} />
                        <Route path="/students/:studentId" element={<ErrorBoundary scope="student-details"><StudentDetails /></ErrorBoundary>} />
                        <Route path="/grades-sections" element={<ErrorBoundary scope="grades-sections"><GradesAndSections /></ErrorBoundary>} />
                        <Route path="/class-roster/:grade/:section" element={<ErrorBoundary scope="class-roster"><ClassRoster /></ErrorBoundary>} />
                        <Route path="/timetable" element={<ErrorBoundary scope="timetable"><TimetableManagement /></ErrorBoundary>} />
                        <Route path="/subject-allocation" element={<ErrorBoundary scope="subject-allocation"><SubjectAllocation /></ErrorBoundary>} />
                        <Route path="/teacher-assignments-report" element={<ErrorBoundary scope="teacher-assignments"><TeacherAssignmentsReport /></ErrorBoundary>} />
                        <Route path="/teacher-workload-report" element={<ErrorBoundary scope="teacher-workload"><TeacherWorkloadReport /></ErrorBoundary>} />
                        <Route path="/progress-reports" element={<ErrorBoundary scope="progress-reports"><ProgressReports /></ErrorBoundary>} />
                        <Route path="/progress-reports/:grade/:section/:studentId/:month" element={<ErrorBoundary scope="student-report-form"><StudentReportForm /></ErrorBoundary>} />
                        <Route path="/users" element={<ErrorBoundary scope="users"><Users /></ErrorBoundary>} />
                        <Route path="/management-assignments" element={<ErrorBoundary scope="assignments"><ManagementAssignments /></ErrorBoundary>} />
                        <Route path="/import" element={<ErrorBoundary scope="import-students"><ImportStudents /></ErrorBoundary>} />
                        <Route path="/import-teachers" element={<ErrorBoundary scope="import-teachers"><ImportTeachers /></ErrorBoundary>} />
                        <Route path="/import-assignments" element={<ErrorBoundary scope="import-assignments"><ImportAssignments /></ErrorBoundary>} />
                        <Route path="/school-settings" element={<ErrorBoundary scope="school-settings"><SchoolSettings /></ErrorBoundary>} />
                        <Route path="/school-admin/assessment-setup" element={<ErrorBoundary scope="assessment-setup"><AssessmentSetup /></ErrorBoundary>} />
                        <Route path="/school-admin/assessment-grades" element={<ErrorBoundary scope="assessment-grades"><AssessmentGradeEntry /></ErrorBoundary>} />
                        <Route path="/attendance" element={<ErrorBoundary scope="attendance"><Attendance /></ErrorBoundary>} />
                        <Route path="/audit-logs" element={<ErrorBoundary scope="audit-logs"><AuditLogs /></ErrorBoundary>} />
                        <Route path="/notice-board" element={<ErrorBoundary scope="notice-board"><NoticeBoard /></ErrorBoundary>} />
                        <Route path="/exams" element={<ErrorBoundary scope="exams"><ExamManagement /></ErrorBoundary>} />
                        <Route path="/inventory" element={<ErrorBoundary scope="inventory"><InventoryDashboard /></ErrorBoundary>} />
                    </>
                )}

                {/* Library Routes */}
                {(roles.includes('school-admin') || roles.includes('librarian')) && (
                    <Route path="/library" element={<ErrorBoundary scope="library"><LibraryDashboard /></ErrorBoundary>} />
                )}

                {/* Finance Routes */}
                {(roles.includes('school-admin') || roles.includes('finance')) && (
                    <Route path="/finance" element={<ErrorBoundary scope="finance"><FinanceDashboard /></ErrorBoundary>} />
                )}

                {/* Teacher Routes */}
                {roles.includes('teacher') && (
                    <>
                        <Route path="/" element={<ErrorBoundary scope="teacher-school"><MySchool /></ErrorBoundary>} />
                        <Route path="/progress-reports" element={<ErrorBoundary scope="teacher-progress"><ProgressReports /></ErrorBoundary>} />
                        <Route path="/progress-reports/:grade/:section/:studentId/:month" element={<ErrorBoundary scope="teacher-report"><StudentReportForm /></ErrorBoundary>} />
                        <Route path="/school-admin/assessment-grades" element={<ErrorBoundary scope="teacher-grades"><AssessmentGradeEntry /></ErrorBoundary>} />
                        <Route path="/attendance" element={<ErrorBoundary scope="teacher-attendance"><Attendance /></ErrorBoundary>} />
                        <Route path="/teacher/lesson-planner" element={<ErrorBoundary scope="lesson-planner"><LessonPlanner /></ErrorBoundary>} />
                    </>
                )}

                {/* Student Routes */}
                {roles.includes('student') && (
                    <>
                        <Route path="/" element={<ErrorBoundary scope="student-dashboard"><StudentDashboard /></ErrorBoundary>} />
                        <Route path="/student/grades" element={<ErrorBoundary scope="student-grades"><MyGrades /></ErrorBoundary>} />
                        <Route path="/student/attendance" element={<ErrorBoundary scope="student-attendance"><MyAttendance /></ErrorBoundary>} />
                        <Route path="/student/timetable" element={<ErrorBoundary scope="student-timetable"><MyTimetable /></ErrorBoundary>} />
                    </>
                )}

                {/* Parent Routes */}
                {roles.includes('parent') && (
                    <>
                        <Route path="/" element={<ErrorBoundary scope="parent-dashboard"><ParentDashboard /></ErrorBoundary>} />
                    </>
                )}

                {/* Fallback Route */}
                <Route path="*" element={
                    roles.includes('super-admin') ? <Dashboard /> :
                        roles.includes('student') ? <StudentDashboard /> :
                            roles.includes('parent') ? <ParentDashboard /> :
                                roles.includes('librarian') ? <LibraryDashboard /> :
                                    roles.includes('finance') ? <FinanceDashboard /> :
                                        (roles.length > 0 ? <MySchool /> : <div className="p-8 text-center">Access Denied</div>)
                } />
            </Routes>
        </Layout>
    );
};

export default AppShell;
