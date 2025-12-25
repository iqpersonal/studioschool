import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where, doc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import {
    Major, Grade, Section, Subject, UserProfile, SubjectAllocation as SubjectAllocationType
} from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Select from '../../components/ui/Select';
import Label from '../../components/ui/Label';
import Input from '../../components/ui/Input';

const SubjectAllocation: React.FC = () => {
    const { currentUserData } = useAuth();
    const schoolId = currentUserData?.schoolId;

    // Data State
    const [majors, setMajors] = useState<Major[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<UserProfile[]>([]);
    const [allocations, setAllocations] = useState<SubjectAllocationType[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filter State
    const [selectedMajorId, setSelectedMajorId] = useState('');
    const [selectedGradeId, setSelectedGradeId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');

    // Fetch Data
    useEffect(() => {
        if (!schoolId) return;

        const fetchData = async () => {
            try {
                const [
                    majSnap, grdSnap, secSnap, subSnap, userSnap, allocSnap
                ] = await Promise.all([
                    getDocs(query(collection(db, 'majors'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'grades'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'sections'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'subjects'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', 'array-contains', 'teacher'))),
                    getDocs(query(collection(db, 'subjectAllocations'), where('schoolId', '==', schoolId)))
                ]);

                setMajors(majSnap.docs.map(d => ({ id: d.id, ...d.data() } as Major)));
                setGrades(grdSnap.docs.map(d => ({ id: d.id, ...d.data() } as Grade)));
                setSections(secSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section)));
                setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
                setTeachers(userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
                setAllocations(allocSnap.docs.map(d => ({ id: d.id, ...d.data() } as SubjectAllocationType)));

                setLoading(false);
            } catch (err) {
                console.error("Error fetching allocation data:", err);
                setLoading(false);
            }
        };

        fetchData();
    }, [schoolId]);

    // Derived State
    const filteredGrades = useMemo(() => {
        return grades; // In real app, filter by major if linked
    }, [grades, selectedMajorId]);

    const currentAllocations = useMemo(() => {
        if (!selectedGradeId || !selectedSectionId) return [];
        return allocations.filter(a => a.gradeId === selectedGradeId && a.sectionId === selectedSectionId);
    }, [allocations, selectedGradeId, selectedSectionId]);

    // Handlers
    const handleAllocationChange = (subjectId: string, field: 'teacherId' | 'periodsPerWeek', value: any) => {
        setAllocations(prev => {
            const existingIndex = prev.findIndex(a =>
                a.gradeId === selectedGradeId &&
                a.sectionId === selectedSectionId &&
                a.subjectId === subjectId
            );

            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], [field]: value };
                return updated;
            } else {
                // Create new temporary allocation
                return [...prev, {
                    id: `temp-${Date.now()}-${subjectId}`, // Temp ID
                    schoolId: schoolId!,
                    gradeId: selectedGradeId,
                    sectionId: selectedSectionId,
                    subjectId,
                    teacherId: field === 'teacherId' ? value : '',
                    periodsPerWeek: field === 'periodsPerWeek' ? Number(value) : 0
                }];
            }
        });
    };

    const handleSave = async () => {
        if (!selectedGradeId || !selectedSectionId) return;
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const currentClassAllocations = allocations.filter(a => a.gradeId === selectedGradeId && a.sectionId === selectedSectionId);

            for (const alloc of currentClassAllocations) {
                if (alloc.id.startsWith('temp-')) {
                    const newRef = doc(collection(db, 'subjectAllocations'));
                    const { id, ...data } = alloc;
                    batch.set(newRef, data);
                } else {
                    const ref = doc(db, 'subjectAllocations', alloc.id);
                    batch.update(ref, { teacherId: alloc.teacherId, periodsPerWeek: alloc.periodsPerWeek });
                }
            }

            await batch.commit();

            // Refresh allocations to get real IDs
            const snap = await getDocs(query(collection(db, 'subjectAllocations'), where('schoolId', '==', schoolId)));
            setAllocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as SubjectAllocationType)));

            alert('Allocations saved successfully!');
        } catch (err) {
            console.error("Error saving allocations:", err);
            alert("Failed to save allocations.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Subject Allocation</h1>
                <Button onClick={handleSave} disabled={saving || !selectedGradeId || !selectedSectionId}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <Card>
                <CardHeader><CardTitle>Select Class</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Major</Label>
                        <Select value={selectedMajorId} onChange={e => setSelectedMajorId(e.target.value)}>
                            <option value="">Select Major</option>
                            {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Grade</Label>
                        <Select value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)} disabled={!selectedMajorId}>
                            <option value="">Select Grade</option>
                            {filteredGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Section</Label>
                        <Select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} disabled={!selectedGradeId}>
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {selectedGradeId && selectedSectionId ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Allocate Subjects</CardTitle>
                        <CardDescription>Assign teachers and target periods per week for each subject.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="p-3 text-left font-medium">Subject</th>
                                        <th className="p-3 text-left font-medium">Teacher</th>
                                        <th className="p-3 text-left font-medium w-32">Periods / Week</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.map(subject => {
                                        const alloc = currentAllocations.find(a => a.subjectId === subject.id) || { teacherId: '', periodsPerWeek: 0 };
                                        return (
                                            <tr key={subject.id} className="border-b last:border-0 hover:bg-muted/20">
                                                <td className="p-3 font-medium">{subject.name}</td>
                                                <td className="p-3">
                                                    <Select
                                                        value={alloc.teacherId}
                                                        onChange={e => handleAllocationChange(subject.id, 'teacherId', e.target.value)}
                                                        className="w-full md:w-64"
                                                    >
                                                        <option value="">Select Teacher</option>
                                                        {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
                                                    </Select>
                                                </td>
                                                <td className="p-3">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={alloc.periodsPerWeek}
                                                        onChange={e => handleAllocationChange(subject.id, 'periodsPerWeek', e.target.value)}
                                                        className="w-20"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center p-10 text-muted-foreground">
                    Please select Major, Grade, and Section to manage allocations.
                </div>
            )}
        </div>
    );
};

export default SubjectAllocation;
