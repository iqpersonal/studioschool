import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, setDoc, writeBatch, serverTimestamp, limit } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { Subject, AssessmentStructure, StudentAssessmentGrade, UserProfile, TeacherAssignment } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import { exportToExcel, exportToPDF } from '../../utils/exportGrades';
import { Download } from 'lucide-react';

const AssessmentGradeEntry: React.FC = () => {
    const { currentUserData } = useAuth();
    const { selectedAcademicYear } = useAcademicYear();

    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [showMyClassesOnly, setShowMyClassesOnly] = useState(false);

    // Determine if user has teacher role
    const isTeacherRole = useMemo(() => {
        const roles = Array.isArray(currentUserData?.role) ? currentUserData.role : (currentUserData?.role ? [currentUserData.role] : []);
        return roles.includes('teacher');
    }, [currentUserData]);

    // Initialize showMyClassesOnly based on role
    useEffect(() => {
        if (isTeacherRole) {
            setShowMyClassesOnly(true);
        }
    }, [isTeacherRole]);

    // Cascaded Filter States
    const [selectedMajor, setSelectedMajor] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // Hierarchy Data
    const [hierarchy, setHierarchy] = useState<{ [major: string]: { [grade: string]: Set<string> } }>({});
    const [isHierarchyLoaded, setIsHierarchyLoaded] = useState(false);

    // Assessment Filter States
    const [selectedMainAssessmentId, setSelectedMainAssessmentId] = useState('');
    const [selectedSubAssessmentId, setSelectedSubAssessmentId] = useState('');

    const [structure, setStructure] = useState<AssessmentStructure | null>(null);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [grades, setGrades] = useState<{ [studentId: string]: StudentAssessmentGrade }>({});

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch teacher assignments
    useEffect(() => {
        if (!currentUserData?.schoolId) return;

        const roles = Array.isArray(currentUserData?.role) ? currentUserData.role : (currentUserData?.role ? [currentUserData.role] : []);
        const isTeacher = roles.includes('teacher') && !roles.includes('school-admin');

        let q = query(collection(db, 'teacherAssignments'), where('schoolId', '==', currentUserData.schoolId));

        if (isTeacher) {
            q = query(q, where('teacherId', '==', currentUserData.uid));
        }

        getDocs(q).then(snap => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherAssignment));
            setAssignments(data);
        });
    }, [currentUserData]);

    // Fetch all students to build Major -> Grade -> Section hierarchy
    useEffect(() => {
        if (!currentUserData?.schoolId || !selectedAcademicYear) return;

        const fetchHierarchy = async () => {
            try {
                // We need to fetch all students to know the structure
                // Optimization: In a real large-scale app, this should be a dedicated metadata collection or aggregated on the server.
                // For now, we fetch students with minimal fields if possible (client SDK doesn't support projection well, so we fetch docs)
                const studentsSnap = await getDocs(query(collection(db, 'users'),
                    where('schoolId', '==', currentUserData.schoolId),
                    where('academicYear', '==', selectedAcademicYear),
                    where('role', '==', 'student')
                ));

                const newHierarchy: { [major: string]: { [grade: string]: Set<string> } } = {};

                studentsSnap.forEach(doc => {
                    const data = doc.data() as UserProfile;
                    const major = data.major || 'Unassigned';
                    const grade = data.grade;
                    const section = data.section;

                    if (grade && section) {
                        if (!newHierarchy[major]) newHierarchy[major] = {};
                        if (!newHierarchy[major][grade]) newHierarchy[major][grade] = new Set();
                        newHierarchy[major][grade].add(section);
                    }
                });

                setHierarchy(newHierarchy);
                setIsHierarchyLoaded(true);
            } catch (err) {
                console.error("Failed to fetch hierarchy", err);
            }
        };

        fetchHierarchy();
    }, [currentUserData?.schoolId, selectedAcademicYear]);

    // Filter assignments based on "My Classes Only" toggle
    const filteredAssignments = useMemo(() => {
        if (showMyClassesOnly && currentUserData?.uid) {
            return assignments.filter(a => a.teacherId === currentUserData.uid);
        }
        return assignments;
    }, [assignments, showMyClassesOnly, currentUserData?.uid]);

    // Derived Options for Filters
    const majorOptions = useMemo(() => {
        if (!isHierarchyLoaded) return [];
        let majors = Object.keys(hierarchy);

        // If "My Classes Only" is checked, filter majors that contain assigned classes
        if (showMyClassesOnly && filteredAssignments.length > 0) {
            majors = majors.filter(major => {
                // Check if any assignment (grade/section) exists in this major
                return filteredAssignments.some(a =>
                    hierarchy[major]?.[a.grade]?.has(a.section)
                );
            });
        } else if (showMyClassesOnly && filteredAssignments.length === 0) {
            return [];
        }

        return majors.sort();
    }, [hierarchy, isHierarchyLoaded, showMyClassesOnly, filteredAssignments]);

    const gradeOptions = useMemo(() => {
        if (!selectedMajor || !hierarchy[selectedMajor]) return [];
        let grades = Object.keys(hierarchy[selectedMajor]);

        if (showMyClassesOnly) {
            grades = grades.filter(grade => {
                // Check if any assignment matches this grade AND exists in this major (via section check)
                // An assignment has (grade, section). We need to verify that (grade, section) is valid for the selectedMajor.
                return filteredAssignments.some(a =>
                    a.grade === grade && hierarchy[selectedMajor][grade]?.has(a.section)
                );
            });
        }

        return grades.sort();
    }, [hierarchy, selectedMajor, showMyClassesOnly, filteredAssignments]);

    const sectionOptions = useMemo(() => {
        if (!selectedMajor || !selectedGrade || !hierarchy[selectedMajor]?.[selectedGrade]) return [];
        let sections = Array.from(hierarchy[selectedMajor][selectedGrade]);

        if (showMyClassesOnly) {
            sections = sections.filter(section =>
                filteredAssignments.some(a => a.grade === selectedGrade && a.section === section)
            );
        }

        return sections.sort();
    }, [hierarchy, selectedMajor, selectedGrade, showMyClassesOnly, filteredAssignments]);

    const subjectOptions = useMemo(() => {
        if (!selectedGrade || !selectedSection) return [];
        // Filter assignments for grade/section, then map to unique subjects
        // Note: A teacher might have multiple assignments for same subject in same class (unlikely but possible), or different subjects.
        return filteredAssignments
            .filter(a => a.grade === selectedGrade && a.section === selectedSection)
            .map(a => ({ id: a.subjectId, name: a.subjectName }))
            .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i); // Unique by ID
    }, [filteredAssignments, selectedGrade, selectedSection]);

    // Reset dependent filters when parent filter changes
    useEffect(() => { setSelectedGrade(''); setSelectedSection(''); setSelectedSubjectId(''); }, [selectedMajor]);
    useEffect(() => { setSelectedSection(''); setSelectedSubjectId(''); }, [selectedGrade]);
    useEffect(() => { setSelectedSubjectId(''); }, [selectedSection]);

    // Reset assessment filters when context changes
    useEffect(() => {
        setSelectedMainAssessmentId('');
        setSelectedSubAssessmentId('');
        setStructure(null);
        setStudents([]);
        setGrades({});
    }, [selectedGrade, selectedSection, selectedSubjectId]);


    // Load Data
    useEffect(() => {
        if (!selectedGrade || !selectedSection || !selectedSubjectId || !currentUserData?.schoolId || !selectedAcademicYear) return;

        setLoading(true);
        setError(null);

        const fetchData = async () => {
            try {
                // 1. Fetch Structure
                const structureSnap = await getDocs(query(collection(db, 'assessmentStructures'),
                    where('schoolId', '==', currentUserData.schoolId),
                    where('academicYear', '==', selectedAcademicYear),
                    where('grade', '==', selectedGrade),
                    where('subjectId', '==', selectedSubjectId),
                    limit(1)
                ));

                if (structureSnap.empty) {
                    throw new Error("No assessment structure defined for this subject and grade.");
                }
                const structData = { id: structureSnap.docs[0].id, ...structureSnap.docs[0].data() } as AssessmentStructure;
                setStructure(structData);

                // 2. Fetch Students
                // FIX: Handle both string 'student' and array ['student'] formats for role
                // This is necessary because some student records have role as "student" (string) and others as ["student"] (array)
                const studentsQueryString = getDocs(query(collection(db, 'users'),
                    where('schoolId', '==', currentUserData.schoolId),
                    where('academicYear', '==', selectedAcademicYear),
                    where('role', '==', 'student')
                ));

                const studentsQueryArray = getDocs(query(collection(db, 'users'),
                    where('schoolId', '==', currentUserData.schoolId),
                    where('academicYear', '==', selectedAcademicYear),
                    where('role', 'array-contains', 'student')
                ));

                const [studentsSnapString, studentsSnapArray] = await Promise.all([studentsQueryString, studentsQueryArray]);

                const allStudentDocs = [...studentsSnapString.docs, ...studentsSnapArray.docs];

                // Deduplicate by UID using a Map
                const uniqueStudents = new Map<string, UserProfile>();
                allStudentDocs.forEach(doc => {
                    if (!uniqueStudents.has(doc.id)) {
                        uniqueStudents.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
                    }
                });

                const classStudents = Array.from(uniqueStudents.values())
                    .filter(s => s.grade === selectedGrade && s.section === selectedSection)
                    .sort((a, b) => a.name.localeCompare(b.name));

                setStudents(classStudents);

                // 3. Fetch Existing Grades
                const gradesSnap = await getDocs(query(collection(db, 'studentAssessmentGrades'),
                    where('schoolId', '==', currentUserData.schoolId),
                    where('academicYear', '==', selectedAcademicYear),
                    where('assessmentStructureId', '==', structData.id)
                ));

                const gradesMap: { [studentId: string]: StudentAssessmentGrade } = {};
                gradesSnap.forEach(doc => {
                    const g = { id: doc.id, ...doc.data() } as StudentAssessmentGrade;
                    gradesMap[g.studentId] = g;
                });
                setGrades(gradesMap);

            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to load data.");
                setStructure(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedGrade, selectedSection, selectedSubjectId, currentUserData?.schoolId, selectedAcademicYear]);

    const handleScoreChange = (studentId: string, mainId: string, subId: string, value: string) => {
        const numValue = value === '' ? -1 : Number(value);

        // Validate max score
        // const max = structure?.assessments.find(a => a.id === mainId)?.subAssessments.find(s => s.id === subId)?.maxScore || 100;
        // if (numValue > max) {
        //     alert(`Max score is ${max}`);
        //     return;
        // }

        setGrades(prev => {
            const studentGrade = prev[studentId] || {
                id: '',
                schoolId: currentUserData!.schoolId!,
                studentId,
                assessmentStructureId: structure!.id,
                academicYear: selectedAcademicYear!,
                grade: structure!.grade,
                subjectId: structure!.subjectId,
                scores: {},
                createdAt: serverTimestamp() as unknown as any,
                updatedAt: serverTimestamp() as unknown as any
            };

            const newScores = { ...studentGrade.scores };
            if (!newScores[mainId]) newScores[mainId] = {};

            if (value === '') {
                delete newScores[mainId][subId];
            } else {
                newScores[mainId][subId] = numValue;
            }

            return { ...prev, [studentId]: { ...studentGrade, scores: newScores } };
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentIndex: number, mainId: string, subId: string, maxScore: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = parseFloat((e.target as HTMLInputElement).value);
            if (val > maxScore) {
                // Invalid value, don't move focus
                return;
            }

            const nextStudentIndex = studentIndex + 1;
            if (nextStudentIndex < students.length) {
                const nextStudentId = students[nextStudentIndex].uid;
                const nextInputId = `grade-${nextStudentId}-${mainId}-${subId}`;
                const nextInput = document.getElementById(nextInputId);
                if (nextInput) {
                    nextInput.focus();
                }
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);

            Object.values(grades).forEach((gradeRecord: StudentAssessmentGrade) => {
                const docRef = gradeRecord.id
                    ? doc(db, 'studentAssessmentGrades', gradeRecord.id)
                    : doc(collection(db, 'studentAssessmentGrades'));

                batch.set(docRef, {
                    ...gradeRecord,
                    updatedAt: serverTimestamp(),
                    createdAt: gradeRecord.createdAt || serverTimestamp()
                }, { merge: true });
            });

            await batch.commit();
            alert('Grades saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save grades.');
        } finally {
            setSaving(false);
        }
    };

    // Filter structure for display based on selected assessment filters
    const filteredAssessments = useMemo(() => {
        if (!structure) return [];
        let assessments = structure.assessments;

        if (selectedMainAssessmentId) {
            assessments = assessments.filter(a => a.id === selectedMainAssessmentId);
        }

        // If sub assessment is selected, we need to map the main assessments to only include that sub assessment
        if (selectedSubAssessmentId) {
            assessments = assessments.map(main => ({
                ...main,
                subAssessments: main.subAssessments.filter(sub => sub.id === selectedSubAssessmentId)
            })).filter(main => main.subAssessments.length > 0);
        }

        return assessments;
    }, [structure, selectedMainAssessmentId, selectedSubAssessmentId]);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessment Grades</h1>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Select Context</CardTitle>
                        <CardDescription>Filter by Grade, Section, and Subject to enter marks.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Label>Major</Label>
                        <Select value={selectedMajor} onChange={e => setSelectedMajor(e.target.value)}>
                            <option value="">-- Select Major --</option>
                            {majorOptions.map(m => <option key={m} value={m}>{m}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>Grade</Label>
                        <Select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} disabled={!selectedMajor}>
                            <option value="">-- Select Grade --</option>
                            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>Section</Label>
                        <Select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedGrade}>
                            <option value="">-- Select Section --</option>
                            {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </div>
                    <div>
                        <Label>Subject</Label>
                        <Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedSection}>
                            <option value="">-- Select Subject --</option>
                            {subjectOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {error && <p className="text-destructive font-medium">{error}</p>}

            {structure && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Assessment</CardTitle>
                        <CardDescription>Choose which assessment to grade.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Main Assessment</Label>
                            <Select value={selectedMainAssessmentId} onChange={e => { setSelectedMainAssessmentId(e.target.value); setSelectedSubAssessmentId(''); }}>
                                <option value="">-- All Main Assessments --</option>
                                {structure.assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </Select>
                        </div>
                        <div>
                            <Label>Sub Assessment</Label>
                            <Select value={selectedSubAssessmentId} onChange={e => setSelectedSubAssessmentId(e.target.value)} disabled={!selectedMainAssessmentId}>
                                <option value="">-- All Sub Assessments --</option>
                                {structure.assessments
                                    .find(a => a.id === selectedMainAssessmentId)
                                    ?.subAssessments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                }
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            )}

            {structure && students.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{structure.subjectName} - Grade Entry</CardTitle>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Grades'}
                        </Button>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="border p-2 text-left min-w-[150px] bg-muted">Student</th>
                                    {filteredAssessments.map(main => (
                                        <th key={main.id} colSpan={main.subAssessments.length} className="border p-2 text-center bg-muted/50">
                                            {main.name} ({main.weightage}%)
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    <th className="border p-2 bg-muted"></th>
                                    {filteredAssessments.map(main => (
                                        main.subAssessments.map(sub => (
                                            <th key={sub.id} className="border p-2 text-center min-w-[80px] bg-muted/30">
                                                {sub.name} <br /> <span className="text-xs text-muted-foreground">(/ {sub.maxScore})</span>
                                            </th>
                                        ))
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.uid}>
                                        <td className="border p-2 font-medium">
                                            {student.name} {student.fatherName || ''} {student.familyName || ''}
                                        </td>
                                        {filteredAssessments.map(main => (
                                            main.subAssessments.map(sub => {
                                                const val = grades[student.uid]?.scores?.[main.id]?.[sub.id];
                                                const isInvalid = val !== undefined && val > sub.maxScore;
                                                return (
                                                    <td key={sub.id} className="border p-2 text-center">
                                                        <Input
                                                            id={`grade-${student.uid}-${main.id}-${sub.id}`}
                                                            type="number"
                                                            className={`w-16 h-8 text-center mx-auto [&::-webkit-inner-spin-button]:appearance-none ${isInvalid ? 'border-red-500 text-red-500 focus-visible:ring-red-500' : ''}`}
                                                            value={val !== undefined ? val : ''}
                                                            onChange={e => handleScoreChange(student.uid, main.id, sub.id, e.target.value)}
                                                            onKeyDown={e => handleKeyDown(e, students.indexOf(student), main.id, sub.id, sub.maxScore)}
                                                        />
                                                    </td>
                                                );
                                            })
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent >
                </Card >
            )}
        </div >
    );
};

export default AssessmentGradeEntry;




