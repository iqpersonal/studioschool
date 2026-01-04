import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, TeacherAssignment, ManagementAssignment } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

// Phase 3D Step 3: Import React Query hooks to replace onSnapshot listeners
import { useStudentsByYear } from '../../hooks/queries/useStudentsByYear';
import { useTeacherAssignments } from '../../hooks/queries/useTeacherAssignments';
import { useManagementAssignments } from '../../hooks/queries/useManagementAssignments';

const GradesAndSections: React.FC = () => {
  const { currentUserData } = useAuth();
  const { selectedAcademicYear } = useAcademicYear();
  const navigate = useNavigate();

  // State for filters
  const [selectedMajor, setSelectedMajor] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [error, setError] = useState<string | null>(null);

  const userRoleData = currentUserData?.role;
  const userRoles = Array.isArray(userRoleData) ? userRoleData : (userRoleData ? [userRoleData] : []);
  const isHeadOfSection = userRoles.includes('head-of-section');

  // TEMPORARY: Test query to check if students exist at all
  useEffect(() => {
    const testQuery = async () => {
      if (!currentUserData?.schoolId) return;
      
      // Try fetching ALL users for this school first
      const testQ = query(
        collection(db, 'users'),
        where('schoolId', '==', currentUserData.schoolId)
      );
      try {
        const snapshot = await getDocs(testQ);
        console.log('TEST: Total USERS in school:', snapshot.size);
        
        // Check how many have student role
        let studentsWithArrayRole = 0;
        let studentsWithStringRole = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (Array.isArray(data.role) && data.role.includes('student')) {
            studentsWithArrayRole++;
          } else if (data.role === 'student') {
            studentsWithStringRole++;
          }
        });
        console.log('TEST: Students with array role:', studentsWithArrayRole);
        console.log('TEST: Students with string role:', studentsWithStringRole);
        console.log('TEST: Total students in school:', studentsWithArrayRole + studentsWithStringRole);
        if (snapshot.size > 0) {
          const firstStudent = snapshot.docs[0].data();
          console.log('TEST: First student fields:', Object.keys(firstStudent));
          console.log('TEST: First student academicYear:', firstStudent.academicYear);
        }
      } catch (error) {
        console.error('TEST: Error fetching students:', error);
      }
    };
    testQuery();
  }, [currentUserData?.schoolId]);

  // Phase 3D Step 3: Replace 3 onSnapshot with React Query hooks
  const studentsQuery = useStudentsByYear({
    schoolId: currentUserData?.schoolId,
    academicYear: selectedAcademicYear,
  });

  const assignmentsQuery = useTeacherAssignments({
    schoolId: currentUserData?.schoolId,
  });

  const managementAssignmentsQuery = useManagementAssignments({
    schoolId: currentUserData?.schoolId,
    userId: isHeadOfSection ? currentUserData?.uid : undefined,
  });

  // Extract data from hooks
  const students = studentsQuery.data || [];
  const assignments = assignmentsQuery.data || [];
  const managementAssignments = managementAssignmentsQuery.data || [];

  // Debug logging
  console.log('GradesAndSections Query Status:', {
    studentsQueryEnabled: studentsQuery.isLoading !== undefined,
    studentsQueryError: studentsQuery.error?.message,
    studentsQueryData: studentsQuery.data,
  });
  console.log('GradesAndSections Debug:', {
    schoolId: currentUserData?.schoolId,
    academicYear: selectedAcademicYear,
    studentsCount: students.length,
    studentsLoading: studentsQuery.isLoading,
    assignmentsCount: assignments.length,
    managementCount: managementAssignments.length
  });

  // Aggregated loading state
  const isLoading = studentsQuery.isLoading || assignmentsQuery.isLoading || managementAssignmentsQuery.isLoading;

  const scopedStudents = useMemo(() => {
    let studentsInScope = students;

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
          {isLoading ? <Loader /> : error ? <p className="text-destructive">{error}</p> : (
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




