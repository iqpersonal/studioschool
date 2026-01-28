import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    limit
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import {
    UserProfile,
    AssessmentStructure,
    StudentAssessmentGrade,
    TeacherAssignment
} from '../../types';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription
} from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import { generateProgressReportPDF, getCategoryFromScore, ProgressReportSubject } from '../../utils/exportGrades';
import { AlertCircle, CheckCircle, Download } from 'lucide-react';

const GenerateProgressReport: React.FC = () => {
    const { currentUserData } = useAuth();
    const { selectedAcademicYear } = useAcademicYear();

    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [showMyClassesOnly, setShowMyClassesOnly] = useState(false);

    // Determine if user has teacher role
    const isTeacherRole = useMemo(() => {
        const roles = Array.isArray(currentUserData?.role)
            ? currentUserData.role
            : currentUserData?.role
              ? [currentUserData.role]
              : [];
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
    const [hierarchy, setHierarchy] = useState<{
        [major: string]: { [grade: string]: Set<string> };
    }>({});
    const [isHierarchyLoaded, setIsHierarchyLoaded] = useState(false);

    // Students and selection
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
        new Set()
    );
    const [schoolName, setSchoolName] = useState('School');

    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch teacher assignments
    useEffect(() => {
        if (!currentUserData?.schoolId) return;

        const roles = Array.isArray(currentUserData?.role)
            ? currentUserData.role
            : currentUserData?.role
              ? [currentUserData.role]
              : [];
        const isTeacher = roles.includes('teacher') && !roles.includes('school-admin');

        let q = query(
            collection(db, 'teacherAssignments'),
            where('schoolId', '==', currentUserData.schoolId)
        );

        if (isTeacher) {
            q = query(
                q,
                where('teacherId', '==', currentUserData.uid)
            );
        }

        getDocs(q).then(snap => {
            const data = snap.docs.map(
                doc => ({ id: doc.id, ...doc.data() } as TeacherAssignment)
            );
            setAssignments(data);
        });

        // Fetch school name
        const schoolRef = doc(db, 'schools', currentUserData.schoolId);
        getDoc(schoolRef).then(snap => {
            if (snap.exists()) {
                setSchoolName(snap.data().name || 'School');
            }
        });
    }, [currentUserData]);

    // Fetch hierarchy
    useEffect(() => {
        if (!currentUserData?.schoolId || !selectedAcademicYear) return;

        const fetchHierarchy = async () => {
            try {
                const studentsSnap = await getDocs(
                    query(
                        collection(db, 'users'),
                        where('schoolId', '==', currentUserData.schoolId),
                        where('academicYear', '==', selectedAcademicYear),
                        where('role', '==', 'student')
                    )
                );

                const newHierarchy: {
                    [major: string]: { [grade: string]: Set<string> };
                } = {};

                studentsSnap.forEach(doc => {
                    const data = doc.data() as UserProfile;
                    const major = data.major || 'Unassigned';
                    const grade = data.grade;
                    const section = data.section;

                    if (grade && section) {
                        if (!newHierarchy[major]) newHierarchy[major] = {};
                        if (!newHierarchy[major][grade])
                            newHierarchy[major][grade] = new Set();
                        newHierarchy[major][grade].add(section);
                    }
                });

                setHierarchy(newHierarchy);
                setIsHierarchyLoaded(true);
            } catch (err) {
                console.error('Failed to fetch hierarchy', err);
            }
        };

        fetchHierarchy();
    }, [currentUserData?.schoolId, selectedAcademicYear]);

    // Filter assignments based on toggle
    const filteredAssignments = useMemo(() => {
        if (showMyClassesOnly && currentUserData?.uid) {
            return assignments.filter(a => a.teacherId === currentUserData.uid);
        }
        return assignments;
    }, [assignments, showMyClassesOnly, currentUserData?.uid]);

    // Derived options
    const majorOptions = useMemo(() => {
        if (!isHierarchyLoaded) return [];
        let majors = Object.keys(hierarchy);

        if (showMyClassesOnly && filteredAssignments.length > 0) {
            majors = majors.filter(major => {
                return filteredAssignments.some(
                    a =>
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
                return filteredAssignments.some(
                    a =>
                        a.grade === grade &&
                        hierarchy[selectedMajor][grade]?.has(a.section)
                );
            });
        }

        return grades.sort();
    }, [hierarchy, selectedMajor, showMyClassesOnly, filteredAssignments]);

    const sectionOptions = useMemo(() => {
        if (!selectedMajor || !selectedGrade || !hierarchy[selectedMajor]?.[selectedGrade])
            return [];
        let sections = Array.from(hierarchy[selectedMajor][selectedGrade]);

        if (showMyClassesOnly) {
            sections = sections.filter(section =>
                filteredAssignments.some(
                    a => a.grade === selectedGrade && a.section === section
                )
            );
        }

        return sections.sort();
    }, [hierarchy, selectedMajor, selectedGrade, showMyClassesOnly, filteredAssignments]);

    // Reset dependent states
    useEffect(() => {
        setSelectedGrade('');
        setSelectedSection('');
        setSelectedSubjectId('');
        setStudents([]);
        setSelectedStudents(new Set());
    }, [selectedMajor]);

    useEffect(() => {
        setSelectedSection('');
        setSelectedSubjectId('');
        setStudents([]);
        setSelectedStudents(new Set());
    }, [selectedGrade]);

    useEffect(() => {
        setSelectedSubjectId('');
        setStudents([]);
        setSelectedStudents(new Set());
    }, [selectedSection]);

    // Fetch students when grade and section change
    useEffect(() => {
        if (!selectedGrade || !selectedSection || !currentUserData?.schoolId || !selectedAcademicYear)
            return;

        setLoading(true);
        setError(null);

        const fetchStudents = async () => {
            try {
                const studentsQueryString = getDocs(
                    query(
                        collection(db, 'users'),
                        where('schoolId', '==', currentUserData.schoolId),
                        where('academicYear', '==', selectedAcademicYear),
                        where('role', '==', 'student')
                    )
                );

                const studentsQueryArray = getDocs(
                    query(
                        collection(db, 'users'),
                        where('schoolId', '==', currentUserData.schoolId),
                        where('academicYear', '==', selectedAcademicYear),
                        where('role', 'array-contains', 'student')
                    )
                );

                const [studentsSnapString, studentsSnapArray] = await Promise.all([
                    studentsQueryString,
                    studentsQueryArray
                ]);

                const allStudentDocs = [
                    ...studentsSnapString.docs,
                    ...studentsSnapArray.docs
                ];

                const uniqueStudents = new Map<string, UserProfile>();
                allStudentDocs.forEach(doc => {
                    if (!uniqueStudents.has(doc.id)) {
                        uniqueStudents.set(doc.id, {
                            uid: doc.id,
                            ...doc.data()
                        } as UserProfile);
                    }
                });

                const classStudents = Array.from(uniqueStudents.values())
                    .filter(
                        s =>
                            s.grade === selectedGrade &&
                            s.section === selectedSection
                    )
                    .sort((a, b) => a.name.localeCompare(b.name));

                setStudents(classStudents);
                setSelectedStudents(new Set());
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to load students.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [selectedGrade, selectedSection, currentUserData?.schoolId, selectedAcademicYear]);

    // Toggle student selection
    const toggleStudentSelection = (studentId: string) => {
        const newSelection = new Set(selectedStudents);
        if (newSelection.has(studentId)) {
            newSelection.delete(studentId);
        } else {
            newSelection.add(studentId);
        }
        setSelectedStudents(newSelection);
    };

    // Toggle all students
    const toggleAllStudents = () => {
        if (selectedStudents.size === students.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(students.map(s => s.uid)));
        }
    };

    // Generate progress reports
    const handleGenerateReports = async () => {
        if (selectedStudents.size === 0) {
            setError('Please select at least one student');
            return;
        }

        setGenerating(true);
        setError(null);
        setSuccessMessage(null);

        try {
            let generatedCount = 0;
            let errorCount = 0;

            for (const studentId of Array.from(selectedStudents)) {
                try {
                    const student = students.find(s => s.uid === studentId);
                    if (!student) continue;

                    // Fetch all assessment structures for this grade
                    const structuresSnap = await getDocs(
                        query(
                            collection(db, 'assessmentStructures'),
                            where('schoolId', '==', currentUserData!.schoolId),
                            where('academicYear', '==', selectedAcademicYear),
                            where('grade', '==', selectedGrade)
                        )
                    );

                    const subjectData: ProgressReportSubject[] = [];
                    let totalAverage = 0;

                    // Process each subject
                    for (const structDoc of structuresSnap.docs) {
                        const struct = {
                            id: structDoc.id,
                            ...structDoc.data()
                        } as AssessmentStructure;

                        // Fetch grades for this student in this structure
                        const gradesSnap = await getDocs(
                            query(
                                collection(db, 'studentAssessmentGrades'),
                                where('schoolId', '==', currentUserData!.schoolId),
                                where('academicYear', '==', selectedAcademicYear),
                                where('assessmentStructureId', '==', struct.id),
                                where('studentId', '==', studentId)
                            )
                        );

                        if (gradesSnap.empty) {
                            // No grades yet for this subject
                            subjectData.push({
                                subjectName: struct.subjectName,
                                average: 0,
                                percentage: '0%',
                                category: 'Not Graded',
                                categoryColor: { r: 128, g: 128, b: 128 }
                            });
                        } else {
                            const gradeRecord = gradesSnap.docs[0].data() as StudentAssessmentGrade;

                            // Calculate average
                            let totalMarks = 0;
                            let totalMaxScore = 0;

                            struct.assessments.forEach(assessment => {
                                assessment.subAssessments.forEach(subAssessment => {
                                    const score =
                                        gradeRecord.scores?.[assessment.id]?.[
                                        subAssessment.id
                                        ] ?? 0;
                                    totalMarks += score;
                                    totalMaxScore += subAssessment.maxScore;
                                });
                            });

                            const average =
                                totalMaxScore === 0
                                    ? 0
                                    : (totalMarks / totalMaxScore) * 100;

                            const categoryData = getCategoryFromScore(average);

                            subjectData.push({
                                subjectName: struct.subjectName,
                                average: Math.round(average * 100) / 100,
                                percentage:
                                    Math.round(average * 100) / 100 + '%',
                                category: categoryData.category,
                                categoryColor: categoryData.color
                            });

                            totalAverage += average;
                        }
                    }

                    // Calculate overall average
                    const overallAverage =
                        subjectData.length > 0
                            ? totalAverage / subjectData.length
                            : 0;

                    const overallCategoryData = getCategoryFromScore(
                        overallAverage
                    );

                    // Generate PDF
                    generateProgressReportPDF({
                        schoolName,
                        studentName:
                            [student.name, student.fatherName, student.familyName]
                                .filter(Boolean)
                                .join(' ')
                                .trim() || 'N/A',
                        grade: selectedGrade,
                        section: selectedSection,
                        generatedDate: new Date().toLocaleDateString(),
                        subjects: subjectData,
                        overallAverage: Math.round(overallAverage * 100) / 100,
                        overallPercentage:
                            Math.round(overallAverage * 100) / 100 + '%',
                        overallCategory: overallCategoryData.category
                    });

                    generatedCount++;
                } catch (studentError) {
                    console.error(`Error generating report for student:`, studentError);
                    errorCount++;
                }
            }

            setSuccessMessage(
                `Successfully generated ${generatedCount} report(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
            );
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to generate reports.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Generate Progress Reports</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Select Class</CardTitle>
                    <CardDescription>
                        Filter by Grade, Section to select students
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>Major</Label>
                        <Select
                            value={selectedMajor}
                            onChange={e => setSelectedMajor(e.target.value)}
                        >
                            <option value="">-- Select Major --</option>
                            {majorOptions.map(m => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>Grade</Label>
                        <Select
                            value={selectedGrade}
                            onChange={e => setSelectedGrade(e.target.value)}
                            disabled={!selectedMajor}
                        >
                            <option value="">-- Select Grade --</option>
                            {gradeOptions.map(g => (
                                <option key={g} value={g}>
                                    {g}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>Section</Label>
                        <Select
                            value={selectedSection}
                            onChange={e => setSelectedSection(e.target.value)}
                            disabled={!selectedGrade}
                        >
                            <option value="">-- Select Section --</option>
                            {sectionOptions.map(s => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {successMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-green-700">{successMessage}</p>
                </div>
            )}

            {students.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Select Students</CardTitle>
                            <CardDescription>
                                Choose students to generate progress reports for
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleGenerateReports}
                            disabled={
                                selectedStudents.size === 0 || generating
                            }
                            className="flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Generate Report(s) ({selectedStudents.size})
                                </>
                            )}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.size === students.length && students.length > 0}
                                        onChange={toggleAllStudents}
                                        className="w-4 h-4"
                                    />
                                    <label className="flex-1 font-medium cursor-pointer">
                                        Select All ({students.length})
                                    </label>
                                </div>

                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {students.map(student => (
                                        <div
                                            key={student.uid}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.has(
                                                    student.uid
                                                )}
                                                onChange={() =>
                                                    toggleStudentSelection(
                                                        student.uid
                                                    )
                                                }
                                                className="w-4 h-4"
                                            />
                                            <label className="flex-1 cursor-pointer">
                                                {student.name}{' '}
                                                {student.fatherName ||
                                                    ''}{' '}
                                                {student.familyName ||
                                                    ''}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default GenerateProgressReport;
