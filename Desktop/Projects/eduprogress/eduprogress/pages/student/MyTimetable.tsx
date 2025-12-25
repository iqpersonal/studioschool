import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { TimetableEntry, TimeSlot, Subject, UserProfile } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MyTimetable: React.FC = () => {
    const { currentUserData } = useAuth();
    const schoolId = currentUserData?.schoolId;
    const grade = currentUserData?.grade;
    const section = currentUserData?.section;

    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<UserProfile[]>([]);
    const [workingDays, setWorkingDays] = useState<string[]>(DAYS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!schoolId || !grade || !section) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch School for working days
                const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
                if (schoolDoc.exists()) {
                    setWorkingDays(schoolDoc.data()?.workingDays || DAYS);
                }

                // Fetch Entries for this class
                const entrySnap = await getDocs(query(collection(db, 'timetableEntries'),
                    where('schoolId', '==', schoolId),
                    where('grade', '==', grade),
                    where('section', '==', section)
                ));

                const fetchedEntries = entrySnap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry));
                setEntries(fetchedEntries);

                // Fetch related data
                const [slotSnap, subSnap, userSnap] = await Promise.all([
                    getDocs(query(collection(db, 'timeSlots'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'subjects'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', 'array-contains', 'teacher')))
                ]);

                setTimeSlots(slotSnap.docs.map(d => ({ id: d.id, ...d.data() } as TimeSlot)));
                setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
                setTeachers(userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));

                setLoading(false);
            } catch (err) {
                console.error("Error fetching my timetable:", err);
                setLoading(false);
            }
        };

        fetchData();
    }, [schoolId, grade, section]);

    const activeDivisionId = useMemo(() => {
        if (entries.length > 0) {
            const firstSlot = timeSlots.find(ts => ts.id === entries[0].timeSlotId);
            return firstSlot?.divisionId;
        }
        return null;
    }, [entries, timeSlots]);

    const displaySlots = useMemo(() => {
        if (!activeDivisionId) return [];
        return timeSlots
            .filter(ts => ts.divisionId === activeDivisionId)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [timeSlots, activeDivisionId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Loader />;

    if (!grade || !section) {
        return <div className="p-6 text-center text-muted-foreground">No class assigned to your profile.</div>;
    }

    if (displaySlots.length === 0 && entries.length === 0) {
        return <div className="p-6 text-center text-muted-foreground">No timetable found for your class ({grade} - {section}).</div>;
    }

    return (
        <div className="space-y-6 print:p-0">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold">My Timetable</h1>
                <Button variant="outline" onClick={handlePrint}>Print</Button>
            </div>

            <div className="print:block hidden text-center mb-6">
                <h1 className="text-3xl font-bold">Class Timetable</h1>
                <p className="text-xl">{grade} - {section}</p>
            </div>

            <Card className="print:shadow-none print:border-none">
                <CardContent className="p-0 print:p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="border p-3 bg-muted/50 w-32 print:bg-gray-100">Day / Time</th>
                                    {displaySlots.map(slot => (
                                        <th key={slot.id} className="border p-3 bg-muted/50 min-w-[150px] print:bg-gray-100">
                                            <div className="font-bold">{slot.name}</div>
                                            <div className="text-xs text-muted-foreground print:text-black">{slot.startTime} - {slot.endTime}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {workingDays.map(day => (
                                    <tr key={day}>
                                        <td className="border p-3 font-bold bg-muted/20 print:bg-gray-50">{day}</td>
                                        {displaySlots.map(slot => {
                                            const entry = entries.find(e => e.day === day && e.timeSlotId === slot.id);
                                            const isBreak = slot.type === 'break';

                                            return (
                                                <td key={slot.id} className={`border p-3 text-center ${isBreak ? 'bg-secondary/30 print:bg-gray-100' : ''}`}>
                                                    {isBreak ? (
                                                        <span className="italic text-muted-foreground">Break</span>
                                                    ) : entry ? (
                                                        <div className="space-y-1">
                                                            <div className="font-bold text-primary print:text-black">
                                                                {subjects.find(s => s.id === entry.subjectId)?.name}
                                                            </div>
                                                            <div className="text-sm">
                                                                {teachers.find(t => t.uid === entry.teacherId)?.name}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground/30">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MyTimetable;
