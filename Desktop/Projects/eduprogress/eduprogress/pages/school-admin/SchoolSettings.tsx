import React, { useState, useMemo } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc, addDoc, deleteDoc, collection } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { useSchoolProfile } from '../../hooks/queries/useSchoolProfile';
import { useSchoolTimetable } from '../../hooks/queries/useSchoolTimetable';
import { useSubjects } from '../../hooks/queries/useSubjects';
import { Subject, School, SchoolDivision, TimeSlot, Room, Major, Group } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import SubjectModal from '../../components/subjects/SubjectModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import ImageUpload from '../../components/ui/ImageUpload';
import DivisionModal from '../../components/timetable/DivisionModal';
import TimeSlotModal from '../../components/timetable/TimeSlotModal';

// School Profile Tab using React Query
const SchoolProfileTab: React.FC<{ schoolId: string }> = ({ schoolId }) => {
    const [school, setSchool] = useState<Partial<School>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    
    // Replace onSnapshot with React Query hook
    const { school: fetchedSchool, academicYears, isLoading } = useSchoolProfile(schoolId);

    React.useEffect(() => {
        if (fetchedSchool) {
            setSchool(fetchedSchool);
        }
    }, [fetchedSchool]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSchool(prev => ({ ...prev, [id]: value }));
    };

    const handleLogoUpload = (url: string) => {
        setSchool(prev => ({ ...prev, logoURL: url }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const { id, createdAt, ...updateData } = school;
            await updateDoc(doc(db, 'schools', schoolId), updateData);
            alert('School profile updated successfully!');
        } catch (err) {
            console.error("Error saving school profile:", err);
            setError("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) return <Loader />;
    if (error) return <p className="text-destructive">{error}</p>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>School Profile</CardTitle>
                <CardDescription>
                    Manage your school's general information and branding.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">School Name</Label>
                        <Input id="name" value={school.name || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" value={school.address || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactEmail">Contact Email</Label>
                            <Input id="contactEmail" type="email" value={school.contactEmail || ''} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactPhone">Contact Phone</Label>
                            <Input id="contactPhone" type="tel" value={school.contactPhone || ''} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="activeAcademicYear">Active Academic Year</Label>
                        <Input
                            id="activeAcademicYear"
                            value={school.activeAcademicYear || ''}
                            onChange={handleInputChange}
                            placeholder="e.g., 2024-2025"
                            list="academic-years-list"
                        />
                        <datalist id="academic-years-list">
                            {academicYears.map(year => (
                                <option key={year} value={year} />
                            ))}
                        </datalist>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Input
                            id="useAssessmentAverages"
                            type="checkbox"
                            checked={school.useAssessmentAverages || false}
                            onChange={e => setSchool(prev => ({ ...prev, useAssessmentAverages: e.target.checked }))}
                            className="h-4 w-4"
                        />
                        <Label htmlFor="useAssessmentAverages">Use Assessment Averages for Progress Reports</Label>
                    </div>
                </div>
                <div className="space-y-4 border-t pt-6">
                    <ImageUpload onUploadComplete={handleLogoUpload} folder="school_logos" onUploadStateChange={setIsUploadingLogo} />
                    {isUploadingLogo && <p className="text-xs text-muted-foreground text-center">Uploading logo...</p>}
                    <div className="space-y-2">
                        <Label htmlFor="logoURL">Or enter existing logo URL</Label>
                        <Input id="logoURL" value={school.logoURL || ''} onChange={handleInputChange} placeholder="https://..." />
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving || isUploadingLogo}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// Timetable Settings Tab using React Query
const TimetableSettingsTab: React.FC<{ school: School, schoolId: string }> = ({ school, schoolId }) => {
    const [selectedDivisionId, setSelectedDivisionId] = useState('');
    const [selectedDivision, setSelectedDivision] = useState<SchoolDivision | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
    const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
    const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'division' | 'timeslot' | 'room', data: any } | null>(null);
    const [workingDays, setWorkingDays] = useState<string[]>([]);

    // Replace 5 onSnapshot listeners with one React Query hook
    const { divisions, timeSlots, rooms, majors, groups, isLoading } = useSchoolTimetable(schoolId);

    React.useEffect(() => {
        setWorkingDays(school.workingDays || []);
        if (divisions.length > 0 && !selectedDivisionId) {
            setSelectedDivisionId(divisions[0].id);
        }
    }, [divisions, selectedDivisionId]);

    const handleWorkingDayChange = (day: string) => {
        setWorkingDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const saveWorkingDays = async () => {
        try {
            await updateDoc(doc(db, 'schools', schoolId), { workingDays });
            alert('Working days updated!');
        } catch (err) {
            console.error("Error saving working days:", err);
            alert('Failed to update working days.');
        }
    };

    const timeSlotsForSelectedDivision = useMemo(() => {
        return timeSlots
            .filter(ts => ts.divisionId === selectedDivisionId)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [timeSlots, selectedDivisionId]);

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        const { type, data } = itemToDelete;
        let collectionName = '';
        if (type === 'division') collectionName = 'schoolDivisions';
        else if (type === 'timeslot') collectionName = 'timeSlots';
        else if (type === 'room') collectionName = 'rooms';

        try {
            await deleteDoc(doc(db, collectionName, data.id));
            setItemToDelete(null);
        } catch (err) {
            console.error("Delete error:", err);
            alert('Failed to delete item.');
        }
    };

    const allWeekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>School Week</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4">
                        {allWeekDays.map(day => (
                            <label key={day} className="flex items-center space-x-2">
                                <Input type="checkbox" checked={workingDays.includes(day)} onChange={() => handleWorkingDayChange(day)} className="h-4 w-4" />
                                <span>{day}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button onClick={saveWorkingDays}>Save Week</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>School Divisions</CardTitle>
                        <Button size="sm" onClick={() => { setSelectedDivision(null); setIsDivisionModalOpen(true); }}>Add Division</Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {divisions.map(div => (
                            <div key={div.id} className="flex items-center justify-between p-2 rounded border">
                                <span>{div.name}</span>
                                <Button variant="destructive" size="sm" onClick={() => setItemToDelete({ type: 'division', data: div })}>Delete</Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Time Periods</CardTitle>
                        {selectedDivisionId && <Button size="sm" onClick={() => { setSelectedTimeSlot(null); setIsTimeSlotModalOpen(true); }}>Add Period</Button>}
                    </CardHeader>
                    <CardContent>
                        {selectedDivisionId ? (
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="border-b"><tr className="text-left"><th className="p-2">Period</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2 text-right">Actions</th></tr></thead>
                                    <tbody>
                                        {timeSlotsForSelectedDivision.map(ts => (
                                            <tr key={ts.id} className="border-b">
                                                <td className="p-2 font-medium">{ts.name}</td>
                                                <td className="p-2">{ts.startTime}</td>
                                                <td className="p-2">{ts.endTime}</td>
                                                <td className="p-2 text-right"><Button variant="destructive" size="sm" onClick={() => setItemToDelete({ type: 'timeslot', data: ts })}>Delete</Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-muted-foreground">Select a division first</p>}
                    </CardContent>
                </Card>
            </div>

            {isDivisionModalOpen && <DivisionModal isOpen={isDivisionModalOpen} onClose={() => setIsDivisionModalOpen(false)} schoolId={schoolId} division={selectedDivision} majors={majors} groups={groups} />}
            {isTimeSlotModalOpen && selectedDivisionId && <TimeSlotModal isOpen={isTimeSlotModalOpen} onClose={() => setIsTimeSlotModalOpen(false)} schoolId={schoolId} divisionId={selectedDivisionId} timeSlot={selectedTimeSlot} />}
            {itemToDelete && <ConfirmationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={handleConfirmDelete} title={`Delete ${itemToDelete.type}?`} message={<p>Are you sure? This cannot be undone.</p>} confirmText="Delete" />}
        </div>
    );
};

// Academic Year Settings Tab
const AcademicYearSettingsTab: React.FC<{ schoolId: string, activeYearId?: string }> = ({ schoolId, activeYearId }) => {
    const { academicYears } = useAcademicYear();

    const handleSetActive = async (yearName: string) => {
        try {
            await updateDoc(doc(db, 'schools', schoolId), {
                activeAcademicYear: yearName
            });
            alert('Active year updated.');
        } catch (err) {
            console.error("Error setting active year:", err);
            alert("Failed to update active year.");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Academic Years</CardTitle>
                <CardDescription>Select the active academic year for your school</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {academicYears.map(year => (
                        <div key={year} className="flex items-center justify-between p-3 rounded border">
                            <span>{year} {year === activeYearId ? '(Active)' : ''}</span>
                            {year !== activeYearId && <Button size="sm" onClick={() => handleSetActive(year)}>Set Active</Button>}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

// Subjects Tab using React Query
const SubjectsTab: React.FC<{ schoolId: string }> = ({ schoolId }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Replace onSnapshot with React Query hook
    const { subjects, isLoading, error } = useSubjects(schoolId);

    const handleCreate = () => {
        setSelectedSubject(null);
        setIsModalOpen(true);
    };

    const handleEdit = (subject: Subject) => {
        setSelectedSubject(subject);
        setIsModalOpen(true);
    };

    const handleDelete = (subject: Subject) => {
        setSubjectToDelete(subject);
    };

    const handleConfirmDelete = async () => {
        if (!subjectToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'subjects', subjectToDelete.id));
            setSubjectToDelete(null);
        } catch (err) {
            console.error("Error deleting subject:", err);
            alert("Failed to delete subject.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Subject List</CardTitle>
                            <CardDescription>Manage subjects taught at your school</CardDescription>
                        </div>
                        <Button onClick={handleCreate}>Add Subject</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Loader /> : error ? <p className="text-destructive">{error.message}</p> : (
                        <div className="space-y-2">
                            {subjects.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No subjects created yet.</p>
                            ) : (
                                subjects.map(subject => (
                                    <div key={subject.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/50">
                                        <p className="font-medium">{subject.name}</p>
                                        <div className="space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(subject)}>Edit</Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(subject)}>Delete</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isModalOpen && schoolId && (
                <SubjectModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    schoolId={schoolId}
                    subject={selectedSubject}
                />
            )}

            {subjectToDelete && (
                <ConfirmationModal
                    isOpen={!!subjectToDelete}
                    onClose={() => setSubjectToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Subject?"
                    message={<p>Are you sure you want to delete <strong>{subjectToDelete.name}</strong>?</p>}
                    confirmText="Delete Subject"
                    loading={isDeleting}
                />
            )}
        </>
    );
};

// Main SchoolSettings Component
const SchoolSettings: React.FC = () => {
    const { currentUserData } = useAuth();
    const schoolId = currentUserData?.schoolId;
    const { school } = useSchoolProfile(schoolId);

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">School Settings</h1>
                <Tabs defaultValue="profile">
                    <TabsList>
                        <TabsTrigger value="profile">School Profile</TabsTrigger>
                        <TabsTrigger value="academic-years">Academic Years</TabsTrigger>
                        <TabsTrigger value="subjects">Manage Subjects</TabsTrigger>
                        <TabsTrigger value="timetable">Timetable</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        {schoolId ? <SchoolProfileTab schoolId={schoolId} /> : <Loader />}
                    </TabsContent>

                    <TabsContent value="academic-years">
                        {schoolId ? <AcademicYearSettingsTab schoolId={schoolId} activeYearId={school?.activeAcademicYear} /> : <Loader />}
                    </TabsContent>

                    <TabsContent value="subjects">
                        {schoolId ? <SubjectsTab schoolId={schoolId} /> : <Loader />}
                    </TabsContent>

                    <TabsContent value="timetable">
                        {school && schoolId ? <TimetableSettingsTab school={school} schoolId={schoolId} /> : <Loader />}
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};

export default SchoolSettings;

