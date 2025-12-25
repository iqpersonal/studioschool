import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { UserProfile, TimeSlot } from '../../types';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from '../ui/Toast';
import { Check, X, Clock } from 'lucide-react';

interface TeacherConstraintsModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: UserProfile | null;
    timeSlots: TimeSlot[];
    workingDays: string[];
    onSave: (updatedTeacher: UserProfile) => void;
}

const TeacherConstraintsModal: React.FC<TeacherConstraintsModalProps> = ({
    isOpen,
    onClose,
    teacher,
    timeSlots,
    workingDays,
    onSave
}) => {
    const [unavailableSlots, setUnavailableSlots] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Filter only class slots (ignore breaks)
    const classSlots = timeSlots.filter(s => s.type === 'class');

    useEffect(() => {
        if (teacher && teacher.unavailableSlots) {
            setUnavailableSlots(new Set(teacher.unavailableSlots));
        } else {
            setUnavailableSlots(new Set());
        }
    }, [teacher]);

    const toggleSlot = (day: string, slotId: string) => {
        const key = `${day}-${slotId}`;
        const newSet = new Set(unavailableSlots);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setUnavailableSlots(newSet);
    };

    const handleSave = async () => {
        if (!teacher) return;

        setIsSaving(true);
        try {
            const slotsArray = Array.from(unavailableSlots);
            const teacherRef = doc(db, 'users', teacher.uid);

            await updateDoc(teacherRef, {
                unavailableSlots: slotsArray
            });

            const updatedTeacher = { ...teacher, unavailableSlots: slotsArray };
            onSave(updatedTeacher);
            toast({ title: "Success", description: `Constraints updated for ${teacher.name}` });
            onClose();
        } catch (error) {
            console.error("Error saving constraints:", error);
            toast({ title: "Error", description: "Failed to save constraints.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (!teacher) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Time Off: ${teacher.name}`}>
            <div className="space-y-4">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <p>Click on the slots where the teacher is <strong>unavailable</strong> (Time Off).</p>
                </div>

                <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="p-2 text-left font-medium min-w-[100px]">Day / Time</th>
                                {classSlots.map(slot => (
                                    <th key={slot.id} className="p-2 text-center font-medium min-w-[80px]">
                                        <div className="text-xs text-muted-foreground">{slot.startTime}</div>
                                        <div>{slot.name}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {workingDays.map(day => (
                                <tr key={day} className="border-b last:border-0 hover:bg-muted/5">
                                    <td className="p-2 font-medium border-r">{day}</td>
                                    {classSlots.map(slot => {
                                        const key = `${day}-${slot.id}`;
                                        const isUnavailable = unavailableSlots.has(key);
                                        return (
                                            <td
                                                key={slot.id}
                                                className={`p-1 border-r last:border-0 cursor-pointer transition-colors ${isUnavailable ? 'bg-red-100 hover:bg-red-200' : 'hover:bg-gray-100'}`}
                                                onClick={() => toggleSlot(day, slot.id)}
                                            >
                                                <div className="flex items-center justify-center h-10 w-full rounded">
                                                    {isUnavailable ? (
                                                        <X className="h-5 w-5 text-red-600" />
                                                    ) : (
                                                        <Check className="h-4 w-4 text-gray-200 opacity-0 hover:opacity-100" />
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <div className="text-sm text-muted-foreground">
                        {unavailableSlots.size} slots marked as unavailable.
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Constraints'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TeacherConstraintsModal;
