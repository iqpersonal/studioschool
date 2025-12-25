import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { Subject, AssessmentStructure, MainAssessment, SubAssessment } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';

const AssessmentSetup: React.FC = () => {
    const { currentUserData } = useAuth();
    const { selectedAcademicYear } = useAcademicYear();

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [grades, setGrades] = useState<string[]>([]);

    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    const [structure, setStructure] = useState<Partial<AssessmentStructure>>({ assessments: [] });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUserData?.schoolId) return;

        // Fetch subjects
        getDocs(query(collection(db, 'subjects'), where('schoolId', '==', currentUserData.schoolId)))
            .then(snap => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
                setSubjects(data.sort((a, b) => a.name.localeCompare(b.name)));
            });

        // Fetch grades
        const standardGrades = ['KG 1', 'KG 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
        setGrades(standardGrades);

    }, [currentUserData?.schoolId]);

    useEffect(() => {
        if (!currentUserData?.schoolId || !selectedAcademicYear || !selectedGrade || !selectedSubjectId) {
            setStructure({ assessments: [] });
            return;
        }

        setStructure({ assessments: [] }); // Reset structure to avoid stale data
        setLoading(true);
        setError(null); // Reset error state
        getDocs(query(collection(db, 'assessmentStructures'),
            where('schoolId', '==', currentUserData.schoolId),
            where('academicYear', '==', selectedAcademicYear),
            where('grade', '==', selectedGrade),
            where('subjectId', '==', selectedSubjectId),
            limit(1)
        ))
            .then(snap => {
                if (!snap.empty) {
                    setStructure({ id: snap.docs[0].id, ...snap.docs[0].data() } as AssessmentStructure);
                } else {
                    setStructure({ assessments: [] });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message || "Failed to load assessment structure.");
                setLoading(false);
            });

    }, [currentUserData?.schoolId, selectedAcademicYear, selectedGrade, selectedSubjectId]);

    const addMainAssessment = () => {
        const newMain: MainAssessment = {
            id: Date.now().toString(),
            name: '',
            weightage: 0,
            subAssessments: []
        };
        setStructure(prev => ({
            ...prev,
            assessments: [...(prev.assessments || []), newMain]
        }));
    };

    const updateMainAssessment = (index: number, field: keyof MainAssessment, value: string | number) => {
        setStructure(prev => {
            const newAssessments = [...(prev.assessments || [])];
            // @ts-ignore - dynamic assignment
            newAssessments[index] = { ...newAssessments[index], [field]: value };
            return { ...prev, assessments: newAssessments };
        });
    };

    const removeMainAssessment = (index: number) => {
        setStructure(prev => {
            const newAssessments = [...(prev.assessments || [])];
            newAssessments.splice(index, 1);
            return { ...prev, assessments: newAssessments };
        });
    };

    const addSubAssessment = (mainIndex: number) => {
        const newSub: SubAssessment = {
            id: Date.now().toString(),
            name: '',
            maxScore: 10
        };
        setStructure(prev => {
            const newAssessments = [...(prev.assessments || [])];
            newAssessments[mainIndex] = {
                ...newAssessments[mainIndex],
                subAssessments: [...newAssessments[mainIndex].subAssessments, newSub]
            };
            return { ...prev, assessments: newAssessments };
        });
    };

    const updateSubAssessment = (mainIndex: number, subIndex: number, field: keyof SubAssessment, value: string | number) => {
        setStructure(prev => {
            const newAssessments = [...(prev.assessments || [])];
            const newSubs = [...newAssessments[mainIndex].subAssessments];
            newSubs[subIndex] = { ...newSubs[subIndex], [field]: value };
            newAssessments[mainIndex] = { ...newAssessments[mainIndex], subAssessments: newSubs };
            return { ...prev, assessments: newAssessments };
        });
    };

    const removeSubAssessment = (mainIndex: number, subIndex: number) => {
        setStructure(prev => {
            const newAssessments = [...(prev.assessments || [])];
            const newSubs = [...newAssessments[mainIndex].subAssessments];
            newSubs.splice(subIndex, 1);
            newAssessments[mainIndex] = { ...newAssessments[mainIndex], subAssessments: newSubs };
            return { ...prev, assessments: newAssessments };
        });
    };

    const handleSave = async () => {
        console.log("handleSave called");
        setError(null);

        if (!currentUserData?.schoolId || !selectedAcademicYear || !selectedGrade || !selectedSubjectId) {
            const msg = "Missing required fields. Please ensure Grade and Subject are selected.";
            console.error(msg, {
                schoolId: currentUserData?.schoolId,
                year: selectedAcademicYear,
                grade: selectedGrade,
                subject: selectedSubjectId
            });
            setError(msg);
            return;
        }

        // Validation
        const totalWeightage = structure.assessments?.reduce((sum, a) => sum + Number(a.weightage), 0) || 0;
        console.log("Total Weightage:", totalWeightage);

        if (totalWeightage !== 100) {
            const msg = `Total weightage must be 100%. Current total: ${totalWeightage}%`;
            setError(msg);
            alert(msg); // Keep alert for immediate feedback too
            return;
        }

        setSaving(true);
        try {
            const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name || '';
            const dataToSave = {
                schoolId: currentUserData.schoolId,
                academicYear: selectedAcademicYear,
                grade: selectedGrade,
                subjectId: selectedSubjectId,
                subjectName,
                assessments: structure.assessments,
                updatedAt: serverTimestamp()
            };

            console.log("Attempting to save data:", dataToSave);

            if (structure.id) {
                await updateDoc(doc(db, 'assessmentStructures', structure.id), dataToSave);
                console.log("Update successful");
            } else {
                await addDoc(collection(db, 'assessmentStructures'), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                console.log("Create successful");
            }
            alert('Assessment structure saved successfully!');
        } catch (err: any) {
            console.error("Save failed:", err);
            setError(`Failed to save: ${err.message || err}`);
            alert(`Failed to save: ${err.message || err}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Assessment Setup</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Select Context</CardTitle>
                    <CardDescription>Choose the grade and subject to configure assessments for.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/3">
                        <Label>Grade</Label>
                        <Select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                            <option value="">-- Select Grade --</option>
                            {grades.map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                    </div>
                    <div className="w-full sm:w-1/3">
                        <Label>Subject</Label>
                        <Select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                            <option value="">-- Select Subject --</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">
                    <p className="font-medium">Error</p>
                    <p>{error}</p>
                </div>
            )}

            {selectedGrade && selectedSubjectId && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Structure Configuration</CardTitle>
                            <CardDescription>Define main assessments and their sub-components.</CardDescription>
                        </div>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Structure'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader /> : (
                            <div className="space-y-6">
                                {structure.assessments?.map((main, mIndex) => (
                                    <div key={main.id} className="border rounded-lg p-4 bg-secondary/10">
                                        <div className="flex items-end gap-4 mb-4">
                                            <div className="flex-grow">
                                                <Label>Main Assessment Name</Label>
                                                <Input
                                                    value={main.name}
                                                    onChange={e => updateMainAssessment(mIndex, 'name', e.target.value)}
                                                    placeholder="e.g. Quiz, Midterm"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <Label>Weightage (%)</Label>
                                                <Input
                                                    type="number"
                                                    value={main.weightage}
                                                    onChange={e => updateMainAssessment(mIndex, 'weightage', Number(e.target.value))}
                                                />
                                            </div>
                                            <Button variant="destructive" size="icon" onClick={() => removeMainAssessment(mIndex)}>
                                                <span className="sr-only">Delete</span>
                                                &times;
                                            </Button>
                                        </div>

                                        <div className="pl-6 border-l-2 border-primary/20 space-y-3">
                                            {main.subAssessments.map((sub, sIndex) => (
                                                <div key={sub.id} className="flex items-center gap-3">
                                                    <Input
                                                        value={sub.name}
                                                        onChange={e => updateSubAssessment(mIndex, sIndex, 'name', e.target.value)}
                                                        placeholder="Sub-assessment Name"
                                                        className="flex-grow"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-muted-foreground whitespace-nowrap">Max Score:</span>
                                                        <Input
                                                            type="number"
                                                            value={sub.maxScore}
                                                            onChange={e => updateSubAssessment(mIndex, sIndex, 'maxScore', Number(e.target.value))}
                                                            className="w-20"
                                                        />
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => removeSubAssessment(mIndex, sIndex)} className="text-destructive hover:text-destructive">
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button variant="outline" size="sm" onClick={() => addSubAssessment(mIndex)}>
                                                + Add Sub-Assessment
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <Button onClick={addMainAssessment} className="w-full border-dashed border-2" variant="ghost">
                                    + Add Main Assessment Category
                                </Button>

                                <div className="flex justify-end pt-4 border-t">
                                    <p className={`font-bold ${(structure.assessments?.reduce((sum, a) => sum + Number(a.weightage), 0) || 0) !== 100 ? 'text-destructive' : 'text-green-600'}`}>
                                        Total Weightage: {structure.assessments?.reduce((sum, a) => sum + Number(a.weightage), 0) || 0}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AssessmentSetup;
