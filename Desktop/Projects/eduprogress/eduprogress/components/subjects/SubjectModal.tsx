
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Subject } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  subject: Subject | null;
}

const SubjectModal: React.FC<SubjectModalProps> = ({ isOpen, onClose, schoolId, subject }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!subject;

  useEffect(() => {
    if (subject) {
      setName(subject.name);
    } else {
      setName('');
    }
  }, [subject, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject name cannot be empty.');
      return;
    }
    if (!isEditMode && !schoolId) {
      setError('System Error: School ID is missing. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        // Only update the name. Security rules usually check the existing document's schoolId.
        const subjectRef = doc(db, 'subjects', subject.id);
        await updateDoc(subjectRef, { name });
      } else {
        await addDoc(collection(db, 'subjects'), {
          name,
          schoolId,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (err: any) {
      console.error("Error saving subject:", err);
      if (err.code === 'permission-denied') {
        setError(`Permission denied. You do not have rights to ${isEditMode ? 'update' : 'create'} this subject.`);
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'create'} subject. ${err.message || ''}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Subject' : 'Create Subject'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subjectName">Subject Name</Label>
          <Input id="subjectName" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SubjectModal;
