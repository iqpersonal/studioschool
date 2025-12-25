import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { db, functions } from '../../services/firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp, documentId, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { UserProfile, TeacherAssignment, ProgressReport, ProgressReportEntry, Subject, School, ManagementAssignment } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  ACADEMIC_PERFORMANCE_MATH,
  ACADEMIC_PERFORMANCE_ENGLISH,
  ACADEMIC_PERFORMANCE_GENERAL,
  HOMEWORK_EFFORT_OPTIONS,
  PARTICIPATION_OPTIONS,
  CONDUCT_OPTIONS
} from '../../constants';
import { sortSubjectsForPrint } from '../../utils/subjectUtils';

const MagicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const SmallSpinner = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const StudentReportForm: React.FC = () => {
  const { grade, section, studentId, month } = useParams<{ grade: string; section: string; studentId: string; month: string }>();
  const navigate = useNavigate();
  const { currentUserData } = useAuth();
  const { selectedAcademicYear } = useAcademicYear();

  const [student, setStudent] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<Partial<ProgressReport>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState<{ [key: string]: boolean }>({});
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const decodedGrade = decodeURIComponent(grade!);
  const decodedSection = decodeURIComponent(section!);
  const decodedMonth = decodeURIComponent(month!);

  const userRoleData = currentUserData?.role;
  const userRoles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);
  const isManager = userRoles.some(r => ['school-admin', 'academic-director', 'head-of-section', 'subject-coordinator'].includes(r));
  const isTeacher = userRoles.includes('teacher');
  const isTeacherOnly = isTeacher && !isManager;
  const isSubjectCoordinator = userRoles.includes('subject-coordinator');

  const currentMonth = decodedMonth;
  const currentYear = selectedAcademicYear;

  useEffect(() => {
    if (!currentUserData || !studentId || !decodedGrade || !decodedSection || !selectedAcademicYear) {
      setError("Missing required data to load report.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const studentPromise = getDoc(doc(db, 'users', studentId));
        const schoolPromise = getDoc(doc(db, 'schools', currentUserData.schoolId));
        const [studentDoc, schoolDoc] = await Promise.all([studentPromise, schoolPromise]);

        if (!studentDoc.exists()) throw new Error("Student not found.");
        const studentData = { uid: studentDoc.id, ...studentDoc.data() } as UserProfile;
        setStudent(studentData);

        if (schoolDoc.exists()) setSchool({ id: schoolDoc.id, ...schoolDoc.data() } as School);

        const assignmentsQuery = query(collection(db, 'teacherAssignments'),
          where('schoolId', '==', currentUserData.schoolId),
          where('grade', '==', decodedGrade),
          where('section', '==', decodedSection));

        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const allClassAssignments = assignmentsSnapshot.docs.map(doc => doc.data() as TeacherAssignment);

        let subjectsToDisplayIds: string[] = [];

        if (isSubjectCoordinator) {
          const mgmtAssignmentsSnapshot = await getDocs(query(collection(db, 'managementAssignments'),
            where('schoolId', '==', currentUserData.schoolId),
            where('userId', '==', currentUserData.uid),
            where('role', '==', 'subject-coordinator'),
            where('grade', '==', decodedGrade)));

          const coordinatorSubjectIds = new Set<string>();
          mgmtAssignmentsSnapshot.forEach(doc => {
            const assignment = doc.data() as ManagementAssignment;
            const majorMatch = !assignment.major || assignment.major === studentData.major;
            const groupMatch = !assignment.group || assignment.group === studentData.group;
            if (assignment.subjectId && majorMatch && groupMatch) {
              coordinatorSubjectIds.add(assignment.subjectId);
            }
          });
          subjectsToDisplayIds = Array.from(coordinatorSubjectIds);

        } else if (isTeacherOnly) {
          const currentTeacherAssignments = allClassAssignments.filter(a => a.teacherId === currentUserData.uid);
          const currentTeacherSubjectIds = new Set<string>(
            currentTeacherAssignments.map(a => a.subjectId)
          );
          setTeacherSubjectIds(currentTeacherSubjectIds);
          subjectsToDisplayIds = Array.from(currentTeacherSubjectIds);
        } else {
          const subjectIds: string[] = allClassAssignments.map(a => a.subjectId);
          subjectsToDisplayIds = [...new Set(subjectIds)];
        }

        let subjectsData: Subject[] = [];
        if (subjectsToDisplayIds.length > 0) {
          const subjectsSnapshot = await getDocs(query(collection(db, 'subjects'),
            where('schoolId', '==', currentUserData.schoolId),
            where(documentId(), 'in', subjectsToDisplayIds)));
          subjectsData = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Subject);
        }

        subjectsData.sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(subjectsData);

        const reportQuery = await getDocs(query(collection(db, 'progressReports'),
          where('schoolId', '==', currentUserData.schoolId),
          where('studentId', '==', studentId),
          where('month', '==', decodedMonth),
          where('academicYear', '==', selectedAcademicYear),
          limit(1)));

        if (!reportQuery.empty) {
          const reportDoc = reportQuery.docs[0];
          setReport({ id: reportDoc.id, ...reportDoc.data() } as ProgressReport);
        } else {
          setReport({
            schoolId: currentUserData.schoolId,
            studentId,
            academicYear: selectedAcademicYear,
            grade: decodedGrade,
            section: decodedSection,
            month: decodedMonth,
            entries: {},
          });
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId, decodedGrade, decodedSection, decodedMonth, currentUserData, isTeacherOnly, isSubjectCoordinator, selectedAcademicYear]);

  const handleInputChange = (subjectId: string, field: keyof ProgressReportEntry, value: string) => {
    setReport(prev => {
      const newEntries = { ...(prev?.entries || {}) };
      if (!newEntries[subjectId]) {
        const subject = subjects.find(s => s.id === subjectId);
        newEntries[subjectId] = { subjectName: subject?.name || '', academicPerformance: '', homeworkEffort: '', inClassParticipation: '', conduct: '', notes: '' };
      }
      newEntries[subjectId] = { ...newEntries[subjectId], [field]: value };
      return { ...prev, entries: newEntries };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveStatus(null);
    try {
      const isNewReport = !report.id;
      const docId = report.id || doc(collection(db, 'progressReports')).id;
      const docRef = doc(db, 'progressReports', docId);

      // Destructure to avoid including the potentially undefined 'id' from state
      const { id, ...reportData } = report;

      const dataToSave: any = {
        ...reportData,
        updatedAt: serverTimestamp(),
      };

      if (isNewReport) {
        dataToSave.createdAt = serverTimestamp();
      }

      // Using set with merge will create the doc if it doesn't exist, or update it if it does.
      await setDoc(docRef, dataToSave, { merge: true });

      if (isNewReport) {
        setReport(prev => ({ ...prev, id: docId }));
      }

      setSaveStatus({ message: 'Progress saved successfully!', type: 'success' });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: any) {
      console.error(err);
      const errorMessage = "Failed to save progress. Please try again.";
      setError(errorMessage);
      setSaveStatus({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAiSuggest = async (subjectId: string, subjectName: string) => {
    setAiLoading(prev => ({ ...prev, [subjectId]: true }));
    setError(null);

    const entry = report.entries?.[subjectId];
    if (!entry || !entry.academicPerformance || !entry.homeworkEffort || !entry.inClassParticipation || !entry.conduct) {
      setError(`Please fill in all four fields for ${subjectName} before using the AI suggestion.`);
      setAiLoading(prev => ({ ...prev, [subjectId]: false }));
      setTimeout(() => setError(null), 5000); // Clear error after 5s
      return;
    }

    try {
      const generateAIContent = httpsCallable(functions, 'generateAIContent');

      const studentFirstName = student?.name?.split(' ')[0] || 'the student';

      const result = await generateAIContent({
        studentName: studentFirstName,
        grade: decodedGrade,
        subject: subjectName,
        performanceMetrics: {
          academicPerformance: entry.academicPerformance,
          homeworkEffort: entry.homeworkEffort,
          inClassParticipation: entry.inClassParticipation,
          conduct: entry.conduct
        }
      });

      const data = result.data as any;
      const note = data.text;
      handleInputChange(subjectId, 'notes', note);

    } catch (err: any) {
      const errorMessage = `AI Suggestion Failed: ${err.message}`;
      console.error(errorMessage);
      setError(errorMessage);
    } finally {
      setAiLoading(prev => ({ ...prev, [subjectId]: false }));
    }
  };


  const handlePrint = () => {
    window.print();
  };

  const getAcademicPerformanceOptions = (subjectName: string) => {
    const lowerSubName = subjectName.toLowerCase();
    if (lowerSubName.includes('math')) return ACADEMIC_PERFORMANCE_MATH;
    if (lowerSubName.includes('english') || lowerSubName.includes('language')) return ACADEMIC_PERFORMANCE_ENGLISH;
    return ACADEMIC_PERFORMANCE_GENERAL;
  };

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



  const canEditAnySubject = isManager || isTeacher;

  const studentFullName = `${student?.name || ''} ${student?.fatherName || ''} ${student?.familyName || ''}`.trim();


  if (loading) return <Loader />;

  return (
    <>
      <style>{`
        .print-only { display: none; }
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .print-hidden { 
            display: none !important; 
          }
          .print-only { 
            display: block; 
            font-size: 10pt;
            color: #000;
          }
           .print-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            border-bottom: 2px solid #000;
            padding-bottom: 1rem;
            margin-bottom: 0.5rem;
          }
          .print-header h1 {
            font-size: 1.5rem;
            font-weight: bold;
            text-align: center;
            margin: 0;
          }
          .print-header img {
            max-height: 60px;
            max-width: 150px;
            object-fit: contain;
          }
          .report-title {
              text-align: center;
              margin-bottom: 1rem;
          }
          .report-title h2 {
              font-size: 1.75rem;
              font-weight: bold;
              margin: 0;
          }
          .print-student-details {
            display: flex;
            justify-content: space-between;
            border: 1px solid #ccc;
            padding: 0.75rem;
            margin-bottom: 1rem;
            border-radius: 4px;
          }
          .print-student-details p {
              margin: 0;
              padding: 2px 0;
          }
          .details-right {
              text-align: right;
          }
          .rubric-section { 
            display: flex; 
            justify-content: space-between; 
            border: 1px solid #ccc; 
            padding: 0.5rem; 
            margin-bottom: 1rem; 
            border-radius: 4px; 
            background-color: #f9f9f9; 
          }
          .rubric-item { text-align: center; font-size: 9pt; }
          .rubric-title { font-weight: bold; display: block; }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
            page-break-inside: auto;
          }
          .print-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .print-table th, .print-table td {
            border: 1px solid #ccc;
            padding: 6px;
            text-align: center;
            vertical-align: top;
          }
          .print-table th {
             background-color: #f2f2f2 !important;
          }
          .print-table .notes-cell {
            text-align: left;
            word-break: break-word;
          }
          .font-medium { font-weight: 500; }
          .no-subjects { text-align: center; padding: 1rem; color: #666; }
          .print-button-container { position: fixed; top: 1rem; right: 1rem; padding: 1rem; background: white; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .bg-good { background-color: #e6fffa !important; }
          .bg-good-light { background-color: #f0fff4 !important; }
          .bg-ok { background-color: #ebf8ff !important; }
          .bg-attention { background-color: #fefceb !important; }
          .bg-warning { background-color: #fffaf0 !important; }
          .bg-danger { background-color: #fff5f5 !important; }
          @media print { .print-button-container { display: none; } }
        }
      `}</style>

      {/* On-Screen UI */}
      <div className="space-y-6 print-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Progress Report</h1>
            <p className="text-muted-foreground">For {studentFullName} - {decodedGrade} {decodedSection}</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isTeacherOnly && <Button variant="outline" onClick={handlePrint}>Print / Save as PDF</Button>}
            {canEditAnySubject && <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Progress'}</Button>}
          </div>
        </div>
        {error && <p className="text-destructive text-sm p-2 bg-destructive/10 rounded-md">{error}</p>}
        {saveStatus && (
          <div className={`p-3 rounded-md text-sm ${saveStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {saveStatus.message}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Performance - {currentMonth} ({currentYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Subject</th>
                    <th className="p-2 min-w-[180px]">Academic Performance</th>
                    <th className="p-2 min-w-[180px]">Homework Effort</th>
                    <th className="p-2 min-w-[180px]">In Class Participation</th>
                    <th className="p-2 min-w-[180px]">Conduct</th>
                    <th className="p-2 min-w-[250px]">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => {
                    const entry: Partial<ProgressReportEntry> = report.entries?.[subject.id] || {};
                    const options = getAcademicPerformanceOptions(subject.name);
                    const canEditThisSubject = isManager || (isTeacher && teacherSubjectIds.has(subject.id));
                    return (
                      <tr key={subject.id} className="border-b align-top">
                        <td className="p-2 font-medium">{subject.name}</td>
                        <td className="p-2">
                          <Select value={entry.academicPerformance || ''} onChange={e => handleInputChange(subject.id, 'academicPerformance', e.target.value)} disabled={!canEditThisSubject}>
                            <option value="">-- Select --</option>
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select value={entry.homeworkEffort || ''} onChange={e => handleInputChange(subject.id, 'homeworkEffort', e.target.value)} disabled={!canEditThisSubject}>
                            <option value="">-- Select --</option>
                            {HOMEWORK_EFFORT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select value={entry.inClassParticipation || ''} onChange={e => handleInputChange(subject.id, 'inClassParticipation', e.target.value)} disabled={!canEditThisSubject}>
                            <option value="">-- Select --</option>
                            {PARTICIPATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </Select>
                        </td>
                        <td className="p-2">
                          <Select value={entry.conduct || ''} onChange={e => handleInputChange(subject.id, 'conduct', e.target.value)} disabled={!canEditThisSubject}>
                            <option value="">-- Select --</option>
                            {CONDUCT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </Select>
                        </td>
                        <td className="p-2">
                          <div className="relative">
                            <Textarea value={entry.notes || ''} onChange={e => handleInputChange(subject.id, 'notes', e.target.value)} disabled={!canEditThisSubject} rows={3} className={canEditThisSubject ? 'pr-10' : ''} />
                            {canEditThisSubject && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => handleAiSuggest(subject.id, subject.name)}
                                disabled={aiLoading[subject.id]}
                                aria-label="Suggest with AI"
                              >
                                {aiLoading[subject.id] ? <SmallSpinner /> : <MagicIcon />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {subjects.length === 0 && <p className="text-center text-muted-foreground p-4">
                {isTeacherOnly ? 'You have not been assigned to teach any subjects for this class.' : 'No subjects are assigned to this class.'}
              </p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print-Only UI */}
      <div className="print-only">
        <header className="print-header">
          {school?.logoURL && <img src={school.logoURL} alt={`${school.name} Logo`} />}
          <h1>{school?.name}</h1>
        </header>
        <div className="report-title">
          <h2>Progress Report</h2>
        </div>
        <div className="print-student-details">
          <div className="details-left">
            <p><strong>Student Name:</strong> {studentFullName}</p>
            <p><strong>Class:</strong> {decodedGrade} {decodedSection}</p>
          </div>
          <div className="details-right">
            <p><strong>Student ID:</strong> {student?.studentIdNumber || 'N/A'}</p>
            <p><strong>Month:</strong> {currentMonth} ({currentYear})</p>
          </div>
        </div>

        <div className="rubric-header" style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Evaluation Rubric</div>
        <div className="rubric-section">
          <div className="rubric-item"><span className="rubric-title">Outstanding Performance</span>(90 - 100)</div>
          <div className="rubric-item"><span className="rubric-title">Strong Achievement</span>(80 - 89)</div>
          <div className="rubric-item"><span className="rubric-title">Consistent Achievement</span>(70 - 79)</div>
          <div className="rubric-item"><span className="rubric-title">Needs Improvement</span>(60 - 69)</div>
          <div className="rubric-item"><span className="rubric-title">Danger of Failing</span>(&lt; 60)</div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Academic Performance</th>
              <th>Homework Effort</th>
              <th>In Class Participation</th>
              <th>Conduct</th>
              <th className="notes-cell">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortSubjectsForPrint(subjects).map(subject => {
              const entry: Partial<ProgressReportEntry> = report.entries?.[subject.id] || {};
              return (
                <tr key={subject.id}>
                  <td className="font-medium">{subject.name}</td>
                  <td className={getPerformanceClass(entry.academicPerformance)}>{entry.academicPerformance || '-'}</td>
                  <td className={getPerformanceClass(entry.homeworkEffort)}>{entry.homeworkEffort || '-'}</td>
                  <td className={getPerformanceClass(entry.inClassParticipation)}>{entry.inClassParticipation || '-'}</td>
                  <td className={getPerformanceClass(entry.conduct)}>{entry.conduct || '-'}</td>
                  <td className="notes-cell">{entry.notes || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {subjects.length === 0 && (
          <p className="text-center p-4">No subjects have been assigned to this class yet.</p>
        )}
      </div>
    </>
  );
};

export default StudentReportForm;