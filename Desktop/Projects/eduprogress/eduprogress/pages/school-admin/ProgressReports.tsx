import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import { UserProfile, TeacherAssignment, ProgressReport, Subject, School, ManagementAssignment, StudentAssessmentGrade, AssessmentStructure } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Checkbox from '../../components/ui/Checkbox';
import { sortSubjectsForPrint } from '../../utils/subjectUtils';
import Label from '../../components/ui/Label';

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-green-600 shrink-0">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ProgressReports: React.FC = () => {
  const { currentUserData } = useAuth();
  const { selectedAcademicYear } = useAcademicYear();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data for populating dropdowns and filtering
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [allStudentsInSchool, setAllStudentsInSchool] = useState<UserProfile[]>([]);
  const [managementAssignments, setManagementAssignments] = useState<ManagementAssignment[]>([]);

  // Data for the selected class view
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('default', { month: 'long' }));
  const [classRoster, setClassRoster] = useState<UserProfile[]>([]);
  const [classReports, setClassReports] = useState<ProgressReport[]>([]);
  const [reportStatus, setReportStatus] = useState<Map<string, boolean>>(new Map());

  // State for report generation
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const userRoleData = currentUserData?.role;
  const userRoles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);
  const isManager = userRoles.some(r => ['school-admin', 'academic-director', 'head-of-section', 'subject-coordinator'].includes(r));
  const isTeacher = userRoles.includes('teacher');
  const isTeacherOnly = isTeacher && !isManager;
  const isSubjectCoordinator = userRoles.includes('subject-coordinator');

  // Effect to fetch all necessary data for dropdowns and client-side filtering
  useEffect(() => {
    if (!currentUserData?.schoolId) {
      setLoading(false);
      return;
    };
    setLoading(true);
    setError(null);

    const schoolId = currentUserData.schoolId;
    const unsubscribes: (() => void)[] = [];

    const queriesToRun = [];

    // All roles (teacher, admin, etc.) now need the student list for the selected year.
    if (selectedAcademicYear) {
      queriesToRun.push(
        new Promise<void>((resolve, reject) => {
          const q = query(
            collection(db, 'users'),
            where('schoolId', '==', schoolId),
            where('academicYear', '==', selectedAcademicYear)
          );
          const unsub = onSnapshot(q, snapshot => {
            const allUsers = snapshot.docs.map(doc => doc.data() as UserProfile);
            const studentData = allUsers.filter(u => {
              const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
              return roles.includes('student') && u.status !== 'archived';
            });
            setAllStudentsInSchool(studentData);
            resolve();
          }, err => reject(err));
          unsubscribes.push(unsub);
        })
      );
    } else {
      setAllStudentsInSchool([]); // Clear students if no year
    }


    // Teachers still need their assignments to know which classes to show.
    if (isTeacher) {
      queriesToRun.push(
        new Promise<void>((resolve, reject) => {
          const q = query(
            collection(db, 'teacherAssignments'),
            where('schoolId', '==', schoolId),
            where('teacherId', '==', currentUserData.uid)
          );
          const unsub = onSnapshot(q, snapshot => {
            const assignments = snapshot.docs.map(doc => doc.data() as TeacherAssignment);
            assignments.sort((a, b) => `${a.grade} ${a.section}`.localeCompare(`${b.grade} ${b.section}`));
            setTeacherAssignments(assignments);
            resolve();
          }, err => reject(err));
          unsubscribes.push(unsub);
        })
      );
    }

    // HOS & SC need their management scope.
    if (isManager) {
      queriesToRun.push(
        new Promise<void>((resolve, reject) => {
          const q = query(
            collection(db, 'managementAssignments'),
            where('schoolId', '==', schoolId),
            where('userId', '==', currentUserData.uid)
          );
          const unsub = onSnapshot(q, snap => {
            setManagementAssignments(snap.docs.map(doc => doc.data() as ManagementAssignment));
            resolve();
          }, err => reject(err));
          unsubscribes.push(unsub);
        })
      );
    }

    Promise.all(queriesToRun)
      .catch(err => {
        console.error(err);
        setError("Failed to load initial data. You may not have the required permissions.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUserData, isTeacher, isManager, selectedAcademicYear]);

  // Effect to filter the roster and fetch reports when a class is selected
  useEffect(() => {
    if (!selectedGrade || !selectedSection || !currentUserData?.schoolId || !selectedAcademicYear) {
      setClassRoster([]);
      setClassReports([]);
      setSelectedStudents(new Set());
      return;
    }

    const schoolId = currentUserData.schoolId;

    // Roster is now filtered from `allStudentsInSchool` which is already year-specific
    const roster = allStudentsInSchool.filter(student =>
      (student.grade || '').trim() === (selectedGrade || '').trim() &&
      (student.section || '').trim() === (selectedSection || '').trim() &&
      (!selectedMajor || (student.major || '').trim() === selectedMajor.trim())
    );
    roster.sort((a, b) => {
      const nameA = `${a.name || ''} ${a.fatherName || ''} ${a.familyName || ''}`.trim().toLowerCase();
      const nameB = `${b.name || ''} ${b.fatherName || ''} ${b.familyName || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
    setClassRoster(roster);
    setSelectedStudents(new Set()); // Reset selections
    setError(null); // Clear previous errors

    // Fetch reports for this class (still a query)
    const q = query(
      collection(db, 'progressReports'),
      where('schoolId', '==', schoolId),
      where('grade', '==', selectedGrade),
      where('section', '==', selectedSection),
      where('academicYear', '==', selectedAcademicYear),
      where('month', '==', selectedMonth)
    );

    const unsubReports = onSnapshot(q, reportSnapshot => {
      const reportData = reportSnapshot.docs.map(doc => doc.data() as ProgressReport);
      setClassReports(reportData);
    }, err => {
      console.error("Failed to load progress reports:", err);
      setError("Could not load reports for this class.");
    });

    return () => unsubReports();
  }, [selectedGrade, selectedSection, currentUserData?.schoolId, allStudentsInSchool, selectedAcademicYear, selectedMonth, selectedMajor]);

  // Effect to calculate which students have reports entered based on user role
  useEffect(() => {
    const statusMap = new Map<string, boolean>();
    if (classRoster.length === 0 || !selectedGrade || !selectedSection) {
      setReportStatus(statusMap);
      return;
    }

    let coordinatorSubjectIds: Set<string> | null = null;
    if (isSubjectCoordinator) {
      const firstStudent = classRoster.length > 0 ? classRoster[0] : null;
      coordinatorSubjectIds = new Set<string>();
      managementAssignments
        .filter(a => a.role === 'subject-coordinator' && a.grade === selectedGrade)
        .forEach(a => {
          const majorMatch = !a.major || !firstStudent || a.major === firstStudent.major;
          const groupMatch = !a.group || !firstStudent || a.group === firstStudent.group;
          if (a.subjectId && majorMatch && groupMatch) {
            coordinatorSubjectIds!.add(a.subjectId);
          }
        });
    }

    const teacherSubjectIdsForClass = isTeacher
      ? new Set(teacherAssignments.filter(a => a.grade === selectedGrade && a.section === selectedSection).map(a => a.subjectId))
      : null;

    classRoster.forEach(student => {
      const report = classReports.find(r => r.studentId === student.uid && r.month === selectedMonth);
      let isComplete = false;
      if (report?.entries) {
        if (isSubjectCoordinator && coordinatorSubjectIds) {
          isComplete = Object.keys(report.entries).some(subjectId => coordinatorSubjectIds!.has(subjectId));
        } else if (isTeacher && teacherSubjectIdsForClass) {
          isComplete = Object.keys(report.entries).some(subjectId => teacherSubjectIdsForClass.has(subjectId));
        } else if (isManager) {
          isComplete = Object.keys(report.entries).length > 0;
        }
      }
      statusMap.set(student.uid, isComplete);
    });
    setReportStatus(statusMap);
  }, [classRoster, classReports, teacherAssignments, managementAssignments, isTeacher, isSubjectCoordinator, isManager, selectedGrade, selectedSection, selectedMonth]);

  const scopedStudents = useMemo(() => {
    let studentsInScope = allStudentsInSchool;

    // Only School Admin (super-admin or school-admin) sees everything.
    const isSchoolAdmin = userRoles.includes('school-admin') || userRoles.includes('super-admin');

    if (isSchoolAdmin) {
      return allStudentsInSchool;
    }

    // If not admin, we build a set of allowed scopes.
    const allowedScopes = new Set<string>();
    const normalize = (str: string | undefined | null) => (str || '').trim().toLowerCase();

    // 1. Add Teacher Assignments
    if (isTeacher) {
      teacherAssignments.forEach(a => {
        allowedScopes.add(`class:${normalize(a.grade)}|${normalize(a.section)}`);
      });
    }

    // 2. Add Management Assignments (Head of Section / Academic Director)
    const isManagerRole = userRoles.includes('head-of-section') || userRoles.includes('academic-director');
    if (isManagerRole && managementAssignments.length > 0) {
      managementAssignments.forEach(a => {
        allowedScopes.add(`hos:${normalize(a.major)}|${normalize(a.group)}|${normalize(a.grade)}`);
      });
    }

    // If we have any restrictions (i.e. not admin, and we are teacher or manager), we filter.
    if (allowedScopes.size > 0) {
      studentsInScope = allStudentsInSchool.filter(student => {
        const grade = normalize(student.grade);
        const section = normalize(student.section);
        const major = normalize(student.major);
        const group = normalize(student.group);

        // Check Teacher Access (Class level)
        const classKey = `class:${grade}|${section}`;
        if (allowedScopes.has(classKey)) return true;

        // Check Management Access (Major/Group/Grade level)
        const hosKey = `hos:${major}|${group}|${grade}`;
        if (allowedScopes.has(hosKey)) return true;

        return false;
      });
    } else if (isTeacher || isManagerRole) {
      // If they are a teacher/manager but have NO assignments, they should see nothing.
      return [];
    }

    return studentsInScope;
  }, [userRoles, allStudentsInSchool, managementAssignments, teacherAssignments, isTeacher]);

  const majorOptions = useMemo(() => {
    const majors = scopedStudents
      .map(s => s.major)
      .filter((major): major is string => typeof major === 'string' && major.trim() !== '');
    return Array.from(new Set(majors)).sort((a: string, b: string) => a.localeCompare(b));
  }, [scopedStudents]);

  const availableClasses = useMemo(() => {
    if (!selectedMajor) return []; // Mandatory Major Selection

    const normalize = (str: string | undefined | null) => (str || '').trim().toLowerCase();
    const classMap = new Map<string, { grade: string, section: string }>();

    if (isManager) {
      scopedStudents.forEach(s => {
        if (s.grade && s.section && (!selectedMajor || s.major === selectedMajor)) {
          const key = `${normalize(s.grade)}|${normalize(s.section)}`;
          if (!classMap.has(key)) {
            classMap.set(key, { grade: s.grade.trim(), section: s.section.trim() });
          }
        }
      });
    }

    if (isTeacher) {
      teacherAssignments.forEach(a => {
        if (a.grade && a.section) {
          if (a.major && a.major !== selectedMajor) return;
          const key = `${normalize(a.grade)}|${normalize(a.section)}`;
          if (!classMap.has(key)) {
            classMap.set(key, { grade: a.grade.trim(), section: a.section.trim() });
          }
        }
      });
    }

    const classesToDisplay = Array.from(classMap.values());

    return classesToDisplay.sort((a, b) =>
      `${a.grade} ${a.section}`.localeCompare(`${b.grade} ${b.section}`, undefined as any, { numeric: true, sensitivity: 'base' })
    );
  }, [isTeacher, isManager, teacherAssignments, scopedStudents, selectedMajor]);

  const gradeOptions = useMemo(() => {
    const grades = new Set(availableClasses.map(c => c.grade));
    return Array.from(grades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [availableClasses]);

  const sectionOptions = useMemo(() => {
    if (!selectedGrade) return [];
    const sections = new Set(availableClasses.filter(c => c.grade === selectedGrade).map(c => c.section));
    return Array.from(sections).sort();
  }, [availableClasses, selectedGrade]);

  // Reset dependent selections when major changes
  useEffect(() => {
    setSelectedGrade('');
    setSelectedSection('');
  }, [selectedMajor]);

  // Reset section when grade changes
  useEffect(() => {
    setSelectedSection('');
  }, [selectedGrade]);


  const handleSelectStudent = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(classRoster.map(s => s.uid)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const generateReportHTML = (students: UserProfile[], reports: { [studentId: string]: ProgressReport }, subjects: Subject[], school: School | null, grade: string, section: string, month: string): string => {
    let pagesHTML = '';

    const getPerformanceClass = (value?: string): string => {
      if (!value) return '';
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes('outstanding') || lowerValue.includes('consistently completed') || lowerValue.includes('highly engaged') || lowerValue.includes('respectful')) return 'bg-good';
      if (lowerValue.includes('strong')) return 'bg-good-light';
      if (lowerValue.includes('consistent achievement')) return 'bg-ok';
      if (lowerValue.includes('showing improvement') || lowerValue.includes('partially completed') || lowerValue.includes('sometimes engaged')) return 'bg-attention';
      if (lowerValue.includes('major effort required') || lowerValue.includes('uncooperative')) return 'bg-warning';
      if (lowerValue.includes('danger of failing') || lowerValue.includes('not completed') || lowerValue.includes('rarely engaged') || lowerValue.includes('disruptive')) return 'bg-danger';
      return '';
    };


    for (const student of students) {
      const studentFullName = `${student.name || ''} ${student.fatherName || ''} ${student.familyName || ''}`.trim();
      const studentReport = reports[student.uid];
      const currentYear = student?.academicYear || new Date().getFullYear().toString();

      pagesHTML += `
            <div class="report-page">
                <header class="print-header">
                    ${school?.logoURL ? `<img src="${school.logoURL}" alt="${school.name} Logo" style="max-height: 80px; max-width: 200px; object-fit: contain;" />` : ''}
                    <div class="header-text">
                        <h1>${school?.name || ''}</h1>
                        <p class="report-subtitle">Monthly Student Progress Report</p>
                    </div>
                </header>
                
                <div class="print-student-details">
                    <div class="details-row">
                        <div class="detail-item"><strong>Student Name:</strong> ${studentFullName}</div>
                        <div class="detail-item"><strong>Student ID:</strong> ${student?.studentIdNumber || 'N/A'}</div>
                    </div>
                    <div class="details-row">
                        <div class="detail-item"><strong>Class:</strong> ${grade} ${section}</div>
                        <div class="detail-item"><strong>Month:</strong> ${month} (${currentYear})</div>
                    </div>
                </div>

                <div class="rubric-header">Evaluation Rubric</div>
                <div class="rubric-section">
                    <div class="rubric-item"><span class="rubric-title">Outstanding</span>(90-100)</div>
                    <div class="rubric-item"><span class="rubric-title">Strong</span>(80-89)</div>
                    <div class="rubric-item"><span class="rubric-title">Consistent</span>(70-79)</div>
                    <div class="rubric-item"><span class="rubric-title">Needs Improvement</span>(60-69)</div>
                    <div class="rubric-item"><span class="rubric-title">Failing</span>(&lt;60)</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 20%;">Subject</th>
                            <th style="width: 15%;">Performance</th>
                            <th style="width: 15%;">Homework</th>
                            <th style="width: 15%;">Participation</th>
                            <th style="width: 15%;">Conduct</th>
                            <th style="width: 20%;">Teacher's Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortSubjectsForPrint(subjects).map(subject => {
        const entry = studentReport?.entries?.[subject.id];
        return `
                                <tr class="align-top">
                                    <td class="font-medium subject-name">${subject.name}</td>
                                    <td class="${getPerformanceClass(entry?.academicPerformance)}">${entry?.academicPerformance || '-'}</td>
                                    <td class="${getPerformanceClass(entry?.homeworkEffort)}">${entry?.homeworkEffort || '-'}</td>
                                    <td class="${getPerformanceClass(entry?.inClassParticipation)}">${entry?.inClassParticipation || '-'}</td>
                                    <td class="${getPerformanceClass(entry?.conduct)}">${entry?.conduct || '-'}</td>
                                    <td class="notes-cell">${entry?.notes || '-'}</td>
                                </tr>
                            `;
      }).join('')}
                    </tbody>
                </table>
                ${subjects.length === 0 ? '<p class="no-subjects">No subjects have been assigned to this class yet.</p>' : ''}

                    <div class="footer-section">
                    ${studentReport?.generalComment ? `
                    <div class="general-comments">
                        <h3>Class Teacher's Remarks:</h3>
                        <p>${studentReport.generalComment}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    return `
        <html>
            <head>
                <title>Class Progress Report - ${grade} ${section}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-print-color-adjust: exact; color-adjust: exact; margin: 0; background: #fff; }
                    .report-page { 
                        page-break-after: always; 
                        padding: 40px; 
                        max-width: 210mm; 
                        margin: 0 auto; 
                        box-sizing: border-box;
                        min-height: 297mm;
                    }
                    .report-page:last-child { page-break-after: auto; }
                    
                    @media print {
                        thead { display: table-header-group; }
                        tr { page-break-inside: avoid; }
                    }
                    
                    .print-header { 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        gap: 20px; 
                        border-bottom: 3px double #333; 
                        padding-bottom: 20px; 
                        margin-bottom: 20px; 
                    }
                    .header-text { text-align: center; }
                    .print-header h1 { font-size: 24pt; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                    .report-subtitle { font-size: 14pt; margin: 5px 0 0; color: #555; }
                    
                    .print-student-details { 
                        display: flex; 
                        justify-content: space-between; 
                        background: #f8f9fa; 
                        border: 1px solid #ddd; 
                        padding: 15px; 
                        border-radius: 6px; 
                        margin-bottom: 20px; 
                    }
                    .details-row { display: flex; flex-direction: column; gap: 5px; }
                    .detail-item { font-size: 11pt; }
                    
                    .attendance-section {
                        margin-bottom: 20px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        padding: 10px 15px;
                    }
                    .attendance-section h3 { margin: 0 0 10px 0; font-size: 11pt; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    .attendance-grid { display: flex; gap: 30px; }
                    .att-item { font-size: 10pt; }

                    .rubric-header { text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 11pt; background: #333; color: white; padding: 5px; border-radius: 4px; }
                    .rubric-section { display: flex; justify-content: space-between; border: 1px solid #ddd; padding: 10px; margin-bottom: 20px; border-radius: 4px; background-color: #f9f9f9; font-size: 9pt; }
                    .rubric-item { text-align: center; flex: 1; border-right: 1px solid #eee; }
                    .rubric-item:last-child { border-right: none; }
                    .rubric-title { font-weight: bold; display: block; margin-bottom: 2px; color: #333; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: center; vertical-align: middle; }
                    th { background-color: #f1f1f1; font-weight: 600; text-transform: uppercase; font-size: 9pt; }
                    .subject-name { text-align: left; font-weight: 600; }
                    .notes-cell { text-align: left; font-size: 9pt; }
                    
                    .footer-section { margin-top: 40px; page-break-inside: avoid; }
                    .general-comments { border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 40px; min-height: 60px; }
                    .general-comments h3 { margin: 0 0 10px 0; font-size: 11pt; color: #333; }
                    .general-comments p { margin: 0; font-style: italic; color: #555; }
                    
                    .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
                    .signature-line { text-align: center; width: 200px; }
                    .line { border-top: 1px solid #000; margin-bottom: 5px; }
                    .label { font-size: 10pt; font-weight: 600; }

                    .bg-good { background-color: #d1fae5 !important; }
                    .bg-good-light { background-color: #ecfdf5 !important; }
                    .bg-ok { background-color: #f3f4f6 !important; }
                    .bg-attention { background-color: #fef3c7 !important; }
                    .bg-warning { background-color: #fffbeb !important; }
                    .bg-danger { background-color: #fee2e2 !important; }
                    
                    @media print { 
                        .print-button-container { display: none; } 
                        body { background: white; }
                        .report-page { box-shadow: none; margin: 0; width: 100%; max-width: none; padding: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="print-button-container">
                    <button onclick="window.print()" style="padding: 0.5rem 1rem; border: 1px solid #ccc; border-radius: 4px; background: #f0f0f0; cursor: pointer;">
                        Print / Save as PDF
                    </button>
                </div>
                ${pagesHTML}
            </body>
        </html>
    `;
  };

  const handleGenerateReport = async () => {
    if (!currentUserData?.schoolId) return;
    setGenerating(true);
    setError(null);
    try {
      const grade = selectedGrade;
      const section = selectedSection;
      const studentIds = Array.from(selectedStudents);

      const schoolDoc = await getDoc(doc(db, 'schools', currentUserData.schoolId));
      const school = schoolDoc.exists() ? { id: schoolDoc.id, ...schoolDoc.data() } as School : null;

      const reports: { [studentId: string]: ProgressReport } = {};
      const reportBatches: Promise<any>[] = [];
      for (let i = 0; i < studentIds.length; i += 30) {
        const batchIds = studentIds.slice(i, i + 30);
        const q = query(
          collection(db, 'progressReports'),
          where('schoolId', '==', currentUserData.schoolId),
          where('studentId', 'in', batchIds),
          where('grade', '==', grade),
          where('section', '==', section),
          where('academicYear', '==', selectedAcademicYear),
          where('month', '==', selectedMonth)
        );
        reportBatches.push(getDocs(q));
      }
      const reportSnapshots = await Promise.all(reportBatches);
      reportSnapshots.forEach(snapshot => {
        snapshot.forEach((doc: any) => {
          const report = doc.data() as ProgressReport;
          reports[report.studentId] = report;
        });
      });

      const attendanceBatches: Promise<any>[] = [];
      for (let i = 0; i < studentIds.length; i += 30) {
        const batchIds = studentIds.slice(i, i + 30);
        const q = query(
          collection(db, 'attendance'),
          where('schoolId', '==', currentUserData.schoolId),
          where('studentId', 'in', batchIds),
          where('month', '==', selectedMonth)
        );
        attendanceBatches.push(getDocs(q));
      }

      const attendanceSnapshots = await Promise.all(attendanceBatches);
      const attendanceMap: { [studentId: string]: { present: number, absent: number, late: number } } = {};

      attendanceSnapshots.forEach(snap => {
        snap.forEach((doc: any) => {
          const att = doc.data();
          if (!attendanceMap[att.studentId]) attendanceMap[att.studentId] = { present: 0, absent: 0, late: 0 };
          if (att.status === 'Present') attendanceMap[att.studentId].present++;
          else if (att.status === 'Absent') attendanceMap[att.studentId].absent++;
          else if (att.status === 'Late') attendanceMap[att.studentId].late++;
        });
      });

      // Merge attendance into reports
      studentIds.forEach(sid => {
        if (reports[sid]) {
          reports[sid].attendanceSummary = attendanceMap[sid] || { present: 0, absent: 0, late: 0 };
        }
      });

      const assignmentsQuery = query(
        collection(db, 'teacherAssignments'),
        where('schoolId', '==', currentUserData.schoolId),
        where('grade', '==', grade),
        where('section', '==', section)
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);

      const allSubjectIdsForClass = [...new Set(assignmentsSnapshot.docs.map(doc => (doc.data() as TeacherAssignment).subjectId))];
      let subjectIdsToReport = allSubjectIdsForClass;

      if (isSubjectCoordinator) {
        const firstStudent = classRoster.length > 0 ? classRoster[0] : null;
        const coordinatorSubjectIds = new Set<string>();
        managementAssignments
          .filter(a => a.role === 'subject-coordinator' && a.grade === grade)
          .forEach(a => {
            const majorMatch = !a.major || !firstStudent || a.major === firstStudent.major;
            const groupMatch = !a.group || !firstStudent || a.group === firstStudent.group;
            if (a.subjectId && majorMatch && groupMatch) {
              coordinatorSubjectIds.add(a.subjectId);
            }
          });
        subjectIdsToReport = allSubjectIdsForClass.filter(id => coordinatorSubjectIds.has(id));
      }

      // AUTOMATION LOGIC
      if (school?.useAssessmentAverages) {
        // Fetch all assessment structures for this grade/year
        const structuresQuery = query(
          collection(db, 'assessmentStructures'),
          where('schoolId', '==', currentUserData.schoolId),
          where('academicYear', '==', selectedAcademicYear),
          where('grade', '==', grade)
        );
        const structuresSnap = await getDocs(structuresQuery);

        const structures = structuresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentStructure));

        const studentGradesMap: { [studentId: string]: { [subjectId: string]: number } } = {};

        for (const struct of structures) {
          if (!subjectIdsToReport.includes(struct.subjectId)) continue;

          const gradesQuery = query(
            collection(db, 'studentAssessmentGrades'),
            where('schoolId', '==', currentUserData.schoolId),
            where('assessmentStructureId', '==', struct.id)
          );
          const gradesSnap = await getDocs(gradesQuery);

          gradesSnap.forEach(doc => {
            const g = doc.data() as StudentAssessmentGrade;
            if (!selectedStudents.has(g.studentId)) return;

            // Calculate Weighted Average
            let totalWeightedScore = 0;
            let totalPossibleWeight = 0;

            struct.assessments.forEach(main => {
              let mainScoreSum = 0;
              let mainMaxSum = 0;

              main.subAssessments.forEach(sub => {
                const score = g.scores?.[main.id]?.[sub.id];
                if (score !== undefined) {
                  mainScoreSum += score;
                  mainMaxSum += sub.maxScore;
                }
              });

              if (mainMaxSum > 0) {
                const mainPercentage = (mainScoreSum / mainMaxSum);
                totalWeightedScore += mainPercentage * main.weightage;
                totalPossibleWeight += main.weightage;
              }
            });

            if (totalPossibleWeight > 0) {
              const finalPercentage = (totalWeightedScore / totalPossibleWeight) * 100;

              if (!studentGradesMap[g.studentId]) studentGradesMap[g.studentId] = {};
              studentGradesMap[g.studentId][struct.subjectId] = finalPercentage;
            }
          });
        }

        // Map percentage to rubric
        const getRubric = (percentage: number) => {
          if (percentage >= 90) return "Outstanding Performance";
          if (percentage >= 80) return "Strong Achievement";
          if (percentage >= 70) return "Consistent Achievement";
          if (percentage >= 60) return "Needs Improvement";
          return "Danger of Failing";
        };

        // Override/Fill reports
        Object.keys(reports).forEach(studentId => {
          if (studentGradesMap[studentId]) {
            Object.keys(studentGradesMap[studentId]).forEach(subjectId => {
              const percentage = studentGradesMap[studentId][subjectId];
              const rubric = getRubric(percentage);

              if (!reports[studentId].entries) reports[studentId].entries = {};
              if (!reports[studentId].entries[subjectId]) {
                reports[studentId].entries[subjectId] = {
                  subjectName: subjects.find(s => s.id === subjectId)?.name || '',
                  academicPerformance: rubric,
                  homeworkEffort: '', // Leave empty or default?
                  inClassParticipation: '',
                  conduct: '',
                  notes: ''
                };
              } else {
                reports[studentId].entries[subjectId].academicPerformance = rubric;
              }
            });
          }
        });
      }

      let subjects: Subject[] = [];
      if (subjectIdsToReport.length > 0) {
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('schoolId', '==', currentUserData.schoolId),
          where(documentId(), 'in', subjectIdsToReport)
        );
        const subjectsSnapshot = await getDocs(subjectsQuery);
        subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }) as Subject);
        subjects.sort((a, b) => a.name.localeCompare(b.name));
      }

      const studentsToReport = classRoster.filter(s => selectedStudents.has(s.uid));
      const reportHTML = generateReportHTML(studentsToReport, reports, subjects, school, grade, section, selectedMonth);

      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
      } else {
        throw new Error("Could not open a new window. Please disable your pop-up blocker.");
      }

    } catch (e: any) {
      let errorMessage = "An error occurred during report generation.";
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else if (e && typeof e === 'object' && 'message' in e) {
        errorMessage = String((e as any).message);
      }
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loader />;
  if (error && !selectedGrade) return <p className="text-destructive p-4">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Progress Reports ({selectedAcademicYear})</h1>
      <Card>
        <CardHeader>
          <CardTitle>Select Your Class & Month</CardTitle>
          <CardDescription>
            Choose a class and month to begin entering progress report data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg">
            <div className="flex-grow">
              <Label>Major</Label>
              <Select value={selectedMajor} onChange={e => setSelectedMajor(e.target.value)} className="w-full">
                <option value="">-- Select Major --</option>
                {majorOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div className="flex-grow">
              <Label>Grade</Label>
              <Select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="w-full"
                disabled={!selectedMajor}
              >
                <option value="">-- Select Grade --</option>
                {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
            <div className="flex-grow">
              <Label>Section</Label>
              <Select
                value={selectedSection}
                onChange={e => setSelectedSection(e.target.value)}
                className="w-full"
                disabled={!selectedGrade}
              >
                <option value="">-- Select Section --</option>
                {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Label>Month</Label>
              <Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full">
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
          </div>
        </CardContent>

        {selectedGrade && selectedSection && (
          <>
            <CardHeader className="border-t border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Student Roster</CardTitle>
                  <CardDescription>Select students to generate a report, or click an individual to enter data.</CardDescription>
                </div>
                {!isTeacherOnly && (
                  <Button onClick={handleGenerateReport} disabled={selectedStudents.size === 0 || generating}>
                    {generating ? 'Generating...' : `Generate Report for ${selectedStudents.size} Student(s)`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error && <p className="text-destructive p-2 mb-4 text-center">{error}</p>}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={classRoster.length > 0 && selectedStudents.size === classRoster.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          aria-label="Select all students"
                          disabled={classRoster.length === 0 || isTeacherOnly}
                        />
                      </TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classRoster.length === 0 && <TableRow><TableCell colSpan={3} className="text-center">No students in this class for the selected academic year.</TableCell></TableRow>}
                    {classRoster.map(student => {
                      return (
                        <TableRow key={student.uid}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.has(student.uid)}
                              onChange={(e) => handleSelectStudent(student.uid, e.target.checked)}
                              aria-label={`Select ${student.name}`}
                              disabled={isTeacherOnly}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <span>{`${student.name || ''} ${student.fatherName || ''} ${student.familyName || ''}`.trim()}</span>
                              {reportStatus.get(student.uid) && <CheckCircleIcon />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/progress-reports/${encodeURIComponent(selectedGrade)}/${encodeURIComponent(selectedSection)}/${student.uid}/${encodeURIComponent(selectedMonth)}`)}>
                              {isTeacherOnly ? 'Enter Grades' : 'View/Edit Report'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default ProgressReports;
