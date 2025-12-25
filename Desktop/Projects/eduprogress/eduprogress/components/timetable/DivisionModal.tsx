import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { SchoolDivision, Major, Group } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';

interface DivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  division: SchoolDivision | null;
  majors: any[]; // Using any[] to avoid circular dependency issues if types aren't exported perfectly, but preferably Major[]
  groups: any[]; // Same for Group[]
}

const DivisionModal: React.FC<DivisionModalProps> = ({ isOpen, onClose, schoolId, division, majors, groups }) => {
  const [name, setName] = useState('');
  const [majorId, setMajorId] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!division;

  useEffect(() => {
    if (division) {
      setName(division.name);
      setMajorId(division.majorId || '');
      setGroupIds(division.groupIds || []);
    } else {
      setName('');
      setMajorId('');
      setGroupIds([]);
    }
  }, [division, isOpen]);

  const filteredGroups = majorId ? groups.filter(g => g.majorId === majorId) : groups;

  const handleGroupToggle = (id: string) => {
    setGroupIds(prev => prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Division name cannot be empty.');
      return;
    }
    if (!majorId) {
      setError('Please select a Major.');
      return;
    }
    if (groupIds.length === 0) {
      setError('Please select at least one Group.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        await updateDoc(doc(db, 'schoolDivisions', division.id), {
          name,
          majorId,
          groupIds
        });
      } else {
        await addDoc(collection(db, 'schoolDivisions'), {
          name,
          schoolId,
          majorId: majorId || null,
          groupIds
        });
      }
      onClose();
    } catch (err) {
      console.error("Error saving division:", err);
      setError(`Failed to save division.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Division' : 'Create Division'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="major">Major</Label>
          <select
            id="major"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={majorId}
            onChange={e => { setMajorId(e.target.value); setGroupIds([]); }}
            required
          >
            <option value="">Select Major</option>
            {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Groups</Label>
          <div className="grid grid-cols-2 gap-2 border p-2 rounded-md max-h-40 overflow-y-auto">
            {filteredGroups.map(g => (
              <label key={g.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupIds.includes(g.id)}
                  onChange={() => handleGroupToggle(g.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{g.name}</span>
              </label>
            ))}
            {filteredGroups.length === 0 && <p className="text-xs text-muted-foreground col-span-2">
              {majorId ? 'No groups found for this major.' : 'Select a major to view groups.'}
            </p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="divisionName">Division Name</Label>
          <Input id="divisionName" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., High School" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Division'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DivisionModal;
