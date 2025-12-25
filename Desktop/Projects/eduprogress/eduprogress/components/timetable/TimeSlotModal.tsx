import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { TimeSlot } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';

interface TimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  divisionId: string;
  timeSlot: TimeSlot | null;
}

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({ isOpen, onClose, schoolId, divisionId, timeSlot }) => {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState<'class' | 'break'>('class');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!timeSlot;

  useEffect(() => {
    if (timeSlot) {
      setName(timeSlot.name);
      setStartTime(timeSlot.startTime);
      setEndTime(timeSlot.endTime);
      setType(timeSlot.type);
    } else {
      setName('');
      setStartTime('');
      setEndTime('');
      setType('class');
    }
  }, [timeSlot, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startTime || !endTime) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError(null);

    const data = { name, startTime, endTime, type, schoolId, divisionId };

    try {
      if (isEditMode) {
        const slotRef = doc(db, 'timeSlots', timeSlot.id);
        await updateDoc(slotRef, data);
      } else {
        await addDoc(collection(db, 'timeSlots'), data);
      }
      onClose();
    } catch (err) {
      console.error("Error saving time slot:", err);
      setError(`Failed to save time slot.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Period' : 'Create Period'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Period Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Period 1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select id="type" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="class">Class</option>
              <option value="break">Break</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Period'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TimeSlotModal;
