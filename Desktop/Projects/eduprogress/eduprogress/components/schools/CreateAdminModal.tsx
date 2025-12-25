import React, { useState } from 'react';
import { db, firebaseConfig } from '../../services/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { School } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
}

const CreateAdminModal: React.FC<CreateAdminModalProps> = ({ isOpen, onClose, school }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setError(null);

    // Initialize a secondary app to create user without logging out the current admin
    const secondaryAppName = `secondary-app-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // Create user in Firebase Auth using the secondary app
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const user = userCredential.user;

      if (user) {
        // Create user profile in Firestore using the main app's db instance
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          role: ['school-admin'],
          schoolId: school.id,
        });
      }
      handleClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError('Failed to create admin account. Please try again.');
      }
    } finally {
      // Clean up the secondary app
      await deleteApp(secondaryApp);
      setLoading(false);
    }
  };

  // Reset state when modal closes to avoid showing old data
  const handleClose = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError(null);
    setLoading(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Create Admin for ${school.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="adminName">Full Name</Label>
          <Input id="adminName" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Email Address</Label>
          <Input id="adminEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminPassword">Password</Label>
          <Input id="adminPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <p className="text-xs text-muted-foreground">Password must be at least 6 characters long.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Admin'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateAdminModal;