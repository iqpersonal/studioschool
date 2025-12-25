import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../../services/firebase';
import { doc, updateDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserProfile } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';

interface CreateEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  student: UserProfile | null;
  // FIX: Add onSuccess prop to match usage in parent component.
  onSuccess?: () => void;
}

const CreateEditStudentModal: React.FC<CreateEditStudentModalProps> = ({ isOpen, onClose, schoolId, student, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!student;

  useEffect(() => {
    if (student) {
      setName(student.name);
      setEmail(student.email || '');
      setStudentIdNumber(student.studentIdNumber || '');
      setGrade(student.grade || '');
      setSection(student.section || '');
      setPassword(''); // Password is not fetched, so it's always cleared
    } else {
      // Reset form for create mode
      setName('');
      setEmail('');
      setPassword('');
      setStudentIdNumber('');
      setGrade('');
      setSection('');
    }
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !schoolId) {
      setError('Student Name is required.');
      return;
    }
    if (email && password && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        // --- UPDATE LOGIC ---
        const updatedData: Partial<UserProfile> = {
          name,
          studentIdNumber,
          grade,
          section,
        };
        // Note: We are not updating email/password here as it's a complex
        // and sensitive operation, best handled separately or via cloud functions.
        const studentRef = doc(db, 'users', student.uid);
        await updateDoc(studentRef, updatedData);

      } else {
        // --- CREATE LOGIC ---
        let userId: string;
        let userEmail: string | null = null;

        // Only create an auth user if email and password are provided
        if (email && password) {
          const secondaryAppName = `student-creator-${Date.now()}`;
          const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
          const secondaryAuth = getAuth(secondaryApp);
          try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            userId = userCredential.user!.uid;
            userEmail = email;
          } finally {
            await deleteApp(secondaryApp);
          }
        } else {
          // If no email/password, create a profile-only user with a random ID
          userId = doc(collection(db, 'users')).id;
        }

        const newStudent: UserProfile = {
          uid: userId,
          name,
          email: userEmail,
          role: ['student'],
          schoolId: schoolId,
          status: 'active',
          grade,
          section,
          studentIdNumber,
          createdAt: serverTimestamp() as any,
        };
        const studentRef = doc(db, 'users', userId);
        await setDoc(studentRef, newStudent);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'create'} student. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const title = isEditMode ? 'Edit Student' : 'Create New Student';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="studentName">Full Name *</Label>
            <Input id="studentName" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentIdNumber">Student ID</Label>
            <Input id="studentIdNumber" value={studentIdNumber} onChange={e => setStudentIdNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="grade">Grade / Class</Label>
            <Input id="grade" value={grade} onChange={e => setGrade(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Input id="section" value={section} onChange={e => setSection(e.target.value)} />
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Login Credentials (Optional)</p>
          <p className="text-xs text-muted-foreground">Fill this out to create a login account for the student. Leave blank to only create a profile.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isEditMode} />
            {isEditMode && <p className="text-xs text-muted-foreground">Email cannot be changed after creation.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isEditMode} placeholder={isEditMode ? 'Cannot be changed here' : 'Min. 6 characters'} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Student')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditStudentModal;