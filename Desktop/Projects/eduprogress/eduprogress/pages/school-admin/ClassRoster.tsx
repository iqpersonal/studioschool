import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { UserProfile, TeacherAssignment, ProgressReport } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import AssignTeacherModal from '../../components/assignments/AssignTeacherModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClassRoster: React.FC = () => {
  const { grade, section } = useParams<{ grade: string; section: string }>();
  const navigate = useNavigate();
  const { currentUserData } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [classReports, setClassReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<TeacherAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<TeacherAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const decodedGrade = grade ? decodeURIComponent(grade) : '';
  const decodedSection = section ? decodeURIComponent(section) : '';
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  const fetchClassData = () => {
    if (!currentUserData?.schoolId || !decodedGrade || !decodedSection) {
      setError("Missing required information to fetch class data.");
      setLoading(false);
      return;
    }

    setLoading(true);
    let queriesCompleted = 0;
    const totalQueries = 3;
    const errors: string[] = [];

    const onQueryDone = () => {
      queriesCompleted++;
      if (queriesCompleted === totalQueries) {
        setLoading(false);
        if (errors.length > 0) {
          setError(errors.join(' '));
        }
      }
    };

    const studentRosterQuery = query(collection(db, 'users'),
      where('schoolId', '==', currentUserData.schoolId),
      where('grade', '==', decodedGrade),
      where('section', '==', decodedSection)
    );

    const usersUnsubscribe = onSnapshot(studentRosterQuery,
      (snapshot) => {
        const allUsersInClass = snapshot.docs.map(doc => doc.data() as UserProfile);

        const studentsData = allUsersInClass.filter(u => {
          const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
          return roles.includes('student') && u.status !== 'archived';
        });

        studentsData.sort((a, b) => {
          const nameA = `${a.name || ''} ${a.fatherName || ''} ${a.familyName || ''}`.trim().toLowerCase();
          const nameB = `${b.name || ''} ${b.fatherName || ''} ${b.familyName || ''}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setStudents(studentsData);
        onQueryDone();
      },
      (err) => {
        console.error("Error fetching class roster:", err);
        errors.push("Failed to fetch class roster. Check permissions and database indexes.");
        onQueryDone();
      }
    );

    const assignmentsUnsubscribe = onSnapshot(query(collection(db, 'teacherAssignments'),
      where('schoolId', '==', currentUserData.schoolId),
      where('grade', '==', decodedGrade),
      where('section', '==', decodedSection)
    ),
      (snapshot) => {
        const assignmentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as TeacherAssignment);
        setAssignments(assignmentsData);
        onQueryDone();
      },
      (err) => {
        console.error("Error fetching teacher assignments:", err);
        errors.push("Failed to fetch teacher assignments.");
        onQueryDone();
      }
    );

    const reportsUnsubscribe = onSnapshot(query(collection(db, 'progressReports'),
      where('schoolId', '==', currentUserData.schoolId),
      where('grade', '==', decodedGrade),
      where('section', '==', decodedSection)
    ),
      (snapshot) => {
        const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ProgressReport);
        setClassReports(reportsData);
        onQueryDone();
      },
      (err) => {
        console.error("Error fetching progress reports:", err);
        errors.push("Failed to fetch progress reports.");
        onQueryDone();
      }
    );

    return () => {
      usersUnsubscribe();
      assignmentsUnsubscribe();
      reportsUnsubscribe();
    };
  }

  useEffect(fetchClassData, [currentUserData?.schoolId, decodedGrade, decodedSection]);

  const studentReportStatus = useMemo(() => {
    const statusMap = new Map<string, boolean>();
    classReports.forEach(report => {
      if (report.entries && Object.keys(report.entries).length > 0) {
        statusMap.set(report.studentId, true);
      }
    });
    return statusMap;
  }, [classReports]);

  const handleOpenCreateModal = () => {
    setAssignmentToEdit(null);
    setIsAssignmentModalOpen(true);
  };

  const handleOpenEditModal = (assignment: TeacherAssignment) => {
    setAssignmentToEdit(assignment);
    setIsAssignmentModalOpen(true);
  };


  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'teacherAssignments', assignmentToDelete.id));
    } catch (err) {
      console.error("Error deleting assignment", err);
      alert("Failed to remove assignment.");
    } finally {
      setIsDeleting(false);
      setAssignmentToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-sm">
          <Link to="/grades-sections" className="text-muted-foreground hover:text-foreground">Grades & Sections</Link>
          <span>/</span>
          <span className="font-semibold">Class Roster</span>
        </div>

        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{decodedGrade} - {decodedSection}</h1>
            <p className="text-muted-foreground">Manage students and assigned teachers.</p>
          </div>
          <Button onClick={() => navigate('/grades-sections')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
            Back to Grades & Sections
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Class Roster</CardTitle>
                <CardDescription>
                  {students.length} student(s) in this class.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Loader /> : error ? <p className="text-destructive text-center">{error}</p> : students.length === 0 ? (
                  <p className="text-muted-foreground text-center">No students found in this class.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {students.map((student, index) => {
                      const hasReport = studentReportStatus.get(student.uid);
                      const studentName = `${student.name || ''} ${student.fatherName || ''} ${student.familyName || ''}`.trim();
                      return (
                        <li key={student.uid || index} className="py-3 px-1 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/progress-reports/${encodeURIComponent(decodedGrade)}/${encodeURIComponent(decodedSection)}/${student.uid}/${encodeURIComponent(currentMonth)}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {studentName}
                            </Link>
                            {hasReport && <CheckCircleIcon />}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assigned Teachers</CardTitle>
                    <CardDescription>
                      Teachers for this class.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={handleOpenCreateModal}>Assign Staff</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <Loader size="sm" /> : (
                  <div className="space-y-2">
                    {assignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
                    ) : (
                      assignments.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                          <div>
                            <p className="text-sm font-medium">{assignment.teacherName}</p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.subjectName}
                              {assignment.periodsPerWeek ? ` (${assignment.periodsPerWeek} period(s)/week)` : ''}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(assignment)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => setAssignmentToDelete(assignment)}>Remove</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {currentUserData?.schoolId && (
        <AssignTeacherModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          onSuccess={() => {
            setIsAssignmentModalOpen(false);
          }}
          schoolId={currentUserData.schoolId}
          grade={decodedGrade}
          section={decodedSection}
          assignmentToEdit={assignmentToEdit}
        />
      )}
      {assignmentToDelete && (
        <ConfirmationModal
          isOpen={!!assignmentToDelete}
          onClose={() => setAssignmentToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Remove Assignment?"
          message={<p>Are you sure you want to remove <strong>{assignmentToDelete.teacherName}</strong> from this class for the subject of <strong>{assignmentToDelete.subjectName}</strong>?</p>}
          confirmText="Yes, Remove"
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default ClassRoster;