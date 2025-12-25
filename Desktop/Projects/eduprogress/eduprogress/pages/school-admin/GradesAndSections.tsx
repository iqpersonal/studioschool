import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserProfile, TeacherAssignment, ManagementAssignment } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const GradesAndSections: React.FC = () => {
  const { currentUserData } = useAuth();
  const { selectedAcademicYear } = useAcademicYear();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [managementAssignments, setManagementAssignments] = useState<ManagementAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // State for filters
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const userRoleData = currentUserData?.role;
  const userRoles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);
  const isHeadOfSection = userRoles.includes('head-of-section');


  useEffect(() => {
    if (!currentUserData?.schoolId || !selectedAcademicYear) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const schoolId = currentUserData.schoolId;

    setLoading(true);
    let queriesCompleted = 0;
    const totalQueries = isHeadOfSection ? 3 : 2;
    const unsubscribes: (() => void)[] = [];

    const onQueryDone = () => {
      queriesCompleted++;
      if (queriesCompleted >= totalQueries) {
        setLoading(false);
      }
    };

    const usersQueryRef = query(collection(db, 'users'),
      where('schoolId', '==', schoolId),
      where('academicYear', '==', selectedAcademicYear)
    );

    const usersUnsubscribe = onSnapshot(usersQueryRef,
      (snapshot) => {
        const allUsers = snapshot.docs.map(doc => doc.data() as UserProfile);
        const studentsData = allUsers.filter(u => {
          const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
          return roles.includes('student') && u.status !== 'archived';
        });
        setStudents(studentsData);
        onQueryDone();
      },
      (err) => {
        console.error("Error fetching students for grades/sections:", err);
        setError("Failed to load student data. Check permissions and database indexes.");
        onQueryDone();
      }
    );
    unsubscribes.push(usersUnsubscribe);

    const assignmentsUnsubscribe = onSnapshot(query(collection(db, 'teacherAssignments'),
      where('schoolId', '==', schoolId)
    ),
      (snapshot) => {
        const assignmentsData = snapshot.docs.map(doc => doc.data() as TeacherAssignment);
        setAssignments(assignmentsData);
        onQueryDone();
      },
      (err) => {
        console.error("Error fetching assignments:", err);
        setError("Failed to load teacher assignment data.");
        onQueryDone();
      }
    );
    unsubscribes.push(assignmentsUnsubscribe);

    if (isHeadOfSection) {
      const managementAssignmentsUnsubscribe = onSnapshot(query(collection(db, 'managementAssignments'),
        where('schoolId', '==', schoolId),
        where('userId', '==', currentUserData.uid)
      ),
        (snapshot) => {
          const assignmentsData = snapshot.docs.map(doc => doc.data() as ManagementAssignment);
          setManagementAssignments(assignmentsData);
          onQueryDone();
        },
        (err) => {
          console.error("Error fetching management assignments:", err);
          setError(prev => `${prev || ''} Failed to load your assigned scopes.`);
          onQueryDone();
        }
      );
      unsubscribes.push(managementAssignmentsUnsubscribe);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUserData, isHeadOfSection, selectedAcademicYear]);

  const scopedStudents = useMemo(() => {
    let studentsInScope = students; // Already filtered by academic year from useEffect

    // If the user has the 'head-of-section' role, their view is ALWAYS scoped by their assignments.
    if (userRoles.includes('head-of-section') && managementAssignments.length > 0) {
      const normalize = (str: string | undefined | null) => (str || '').trim().toLowerCase();

      const assignedScopes = new Set(
        managementAssignments.map(a =>
          `${normalize(a.major)}|${normalize(a.group)}|${normalize(a.grade)}`
        )
      );
      studentsInScope = students.filter(student => {
        const studentScope = `${normalize(student.major)}|${normalize(student.group)}|${normalize(student.grade)}`;
        return assignedScopes.has(studentScope);
      });
    }

    return studentsInScope;
  }, [students, managementAssignments, userRoles]);

  const majorOptions = useMemo(() => {
    const majors = scopedStudents
      .map(s => s.major)
      .filter((major): major is string => typeof major === 'string' && major.trim() !== '');
    return Array.from(new Set(majors)).sort((a: string, b: string) => a.localeCompare(b));
  }, [scopedStudents]);

  const groupOptions = useMemo(() => {
    const groups = scopedStudents
      .filter(s => !selectedMajor || s.major === selectedMajor)
      .map(s => s.group)
      .filter((group): group is string => typeof group === 'string' && group.trim() !== '');
    return Array.from(new Set(groups)).sort((a: string, b: string) => a.localeCompare(b));
  }, [scopedStudents, selectedMajor]);

  const gradeOptions = useMemo(() => {
    const grades = scopedStudents
      .filter(s =>
        (!selectedMajor || s.major === selectedMajor) &&
        (!selectedGroup || s.group === selectedGroup)
      )
      .map(s => s.grade)
      .filter((grade): grade is string => typeof grade === 'string' && grade.trim() !== '');
    return Array.from(new Set(grades)).sort((a: string, b: string) => a.localeCompare(b));
  }, [scopedStudents, selectedMajor, selectedGroup]);

  const sectionOptions = useMemo(() => {
    const sections = scopedStudents
      .filter(s =>
        (!selectedMajor || s.major === selectedMajor) &&
        (!selectedGroup || s.group === selectedGroup) &&
        (!selectedGrade || s.grade === selectedGrade)
      )
      .map(s => s.section)
      .filter((section): section is string => typeof section === 'string' && section.trim() !== '');
    return Array.from(new Set(sections)).sort((a: string, b: string) => a.localeCompare(b));
  }, [scopedStudents, selectedMajor, selectedGroup, selectedGrade]);

  // Reset child filters when a parent filter changes
  useEffect(() => { setSelectedGroup(''); }, [selectedMajor]);
  useEffect(() => { setSelectedGrade(''); }, [selectedGroup]);
  useEffect(() => { setSelectedSection(''); }, [selectedGrade]);

  const filteredStudents = useMemo(() => {
    return scopedStudents.filter(student => {
      const majorMatch = !selectedMajor || student.major === selectedMajor;
      const groupMatch = !selectedGroup || student.group === selectedGroup;
      const gradeMatch = !selectedGrade || student.grade === selectedGrade;
      const sectionMatch = !selectedSection || student.section === selectedSection;
      return majorMatch && groupMatch && gradeMatch && sectionMatch;
    });
  }, [scopedStudents, selectedMajor, selectedGroup, selectedGrade, selectedSection]);


  const combinedGradeSections = useMemo(() => {
    const assignmentsByClass = new Map<string, TeacherAssignment[]>();
    assignments.forEach(assignment => {
      const key = `${assignment.grade}|${assignment.section}`;
      const existing = assignmentsByClass.get(key) || [];
      assignmentsByClass.set(key, [...existing, assignment]);
    });

    const combinations = new Map<string, { grade: string; section: string; teachers: TeacherAssignment[] }>();
    filteredStudents.forEach(student => {
      const grade = student.grade?.trim();
      const section = student.section?.trim();
      if (grade && section) {
        const key = `${grade}|${section}`;
        if (!combinations.has(key)) {
          const teachers = assignmentsByClass.get(key) || [];
          teachers.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
          combinations.set(key, { grade, section, teachers });
        }
      }
    });
    return Array.from(combinations.values()).sort((a, b) =>
      `${a.grade} ${a.section}`.localeCompare(`${b.grade} ${b.section}`, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [filteredStudents, assignments]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Grades & Sections Explorer ({selectedAcademicYear})</h1>
        <Button onClick={() => navigate('/import-assignments')}>Import Assignments</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filter & View Combinations</CardTitle>
          <CardDescription>
            Click a card to view the class roster for that grade and section combination.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Select value={selectedMajor} onChange={e => setSelectedMajor(e.target.value)}>
              <option value="">All Majors</option>
              {majorOptions.map(major => <option key={major} value={major}>{major}</option>)}
            </Select>
            <Select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
              <option value="">All Groups</option>
              {groupOptions.map(group => <option key={group} value={group}>{group}</option>)}
            </Select>
            <Select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
              <option value="">All Grades</option>
              {gradeOptions.map(grade => <option key={grade} value={grade}>{grade}</option>)}
            </Select>
            <Select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
              <option value="">All Sections</option>
              {sectionOptions.map(section => <option key={section} value={section}>{section}</option>)}
            </Select>
          </div>
          {loading ? <Loader /> : error ? <p className="text-destructive">{error}</p> : (
            combinedGradeSections.length === 0 ? (
              <div className="text-center py-10 border rounded-lg bg-secondary/50">
                <h3 className="text-lg font-semibold">No Combinations Found</h3>
                <p className="text-sm text-muted-foreground">No "Grade Section" pairings match your current filter selections.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {combinedGradeSections.map(({ grade, section, teachers }, index) => (
                  <Link
                    key={index}
                    to={`/class-roster/${encodeURIComponent(grade)}/${encodeURIComponent(section)}`}
                    className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
                  >
                    <Card className="flex flex-col p-3 h-40 hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-center">{grade}</p>
                        <p className="text-sm text-muted-foreground text-center">{section}</p>
                      </div>
                      <div className="border-t pt-2 mt-2 text-xs">
                        <div className="max-h-20 overflow-y-auto text-center space-y-1">
                          {teachers.length > 0 ? (
                            teachers.map((t, i) => (
                              <p key={i} className="font-medium truncate" title={t.teacherName}>
                                {t.teacherName}
                              </p>
                            ))
                          ) : (
                            <p className="text-muted-foreground italic pt-2">No teachers assigned</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GradesAndSections;