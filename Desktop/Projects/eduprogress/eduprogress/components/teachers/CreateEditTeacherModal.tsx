import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../../services/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserProfile } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';

interface CreateEditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  teacher: UserProfile | null;
  onSuccess: () => void;
}

const CreateEditTeacherModal: React.FC<CreateEditTeacherModalProps> = ({ isOpen, onClose, schoolId, teacher, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!teacher;

  useEffect(() => {
    if (teacher) {
      setName(teacher.name);
      setEmail(teacher.email || '');
      setPassword(''); // Password is not fetched/editable here
    } else {
      setName('');
      setEmail('');
      setPassword('');
    }
  }, [teacher, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('Teacher Name and Email are required.');
      return;
    }
    if (!isEditMode && (!password || password.length < 6)) {
      setError('A password of at least 6 characters is required for new teachers.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        // --- UPDATE LOGIC ---
        // Only updating name. Email/auth changes are complex and should be handled differently.
        const teacherRef = doc(db, 'users', teacher.uid);
        await updateDoc(teacherRef, { name });
      } else {
        // --- CREATE LOGIC ---
        const secondaryAppName = `teacher-creator-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        let userId: string;
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          userId = userCredential.user!.uid;
        } finally {
          await deleteApp(secondaryApp);
        }

        const newTeacher: Partial<UserProfile> = {
          uid: userId,
          name,
          email,
          role: ['teacher'],
          schoolId: schoolId,
          createdAt: serverTimestamp() as any, // Cast to any to avoid type mismatch with UserProfile interface if strict
        };
        const teacherRef = doc(db, 'users', userId);
        await setDoc(teacherRef, newTeacher);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'create'} teacher. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const title = isEditMode ? 'Edit Teacher' : 'Create New Teacher';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teacherName">Full Name *</Label>
          <Input id="teacherName" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isEditMode} />
          {isEditMode && <p className="text-xs text-muted-foreground">Email cannot be changed after creation.</p>}
        </div>
        {!isEditMode && (
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 characters" />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Teacher')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditTeacherModal;
