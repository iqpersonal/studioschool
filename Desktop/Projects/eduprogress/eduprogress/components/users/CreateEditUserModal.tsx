import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../../services/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserProfile, Subject } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';
import Loader from '../ui/Loader';
import Checkbox from '../ui/Checkbox';
import { formatRole } from '../../utils/formatters';

interface CreateEditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  user: UserProfile | null;
}

const STAFF_ROLES: UserProfile['role'] = ['teacher', 'head-of-section', 'subject-coordinator', 'academic-director', 'school-admin'];

const CreateEditUserModal: React.FC<CreateEditUserModalProps> = ({ isOpen, onClose, schoolId, user }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({ role: ['teacher'] });
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!user;

  useEffect(() => {
    if (user) {
      setFormData(user);
      setPassword('');
    } else {
      setFormData({ role: ['teacher'] });
    }
  }, [user, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    const currentRoles = formData.role || [];
    const newRoles = checked
      ? [...currentRoles, id]
      : currentRoles.filter(r => r !== id);
    setFormData(prev => ({ ...prev, role: newRoles as UserProfile['role'] }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role || formData.role.length === 0) {
      setError('Full Name and at least one Role are required.');
      return;
    }
    if (!isEditMode && (!formData.email || !password)) {
      setError('Email and Password are required for new staff members.');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        const { uid, createdAt, email, ...updateData } = formData;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, updateData);
      } else {
        let userId: string;

        const secondaryAppName = `user-creator-${Date.now()}`;
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email!, password);
          userId = userCredential.user!.uid;
        } finally {
          await deleteApp(secondaryApp);
        }

        const newUser: Partial<UserProfile> = {
          ...formData,
          uid: userId,
          schoolId: schoolId,
          status: 'active',
          createdAt: serverTimestamp() as any,
        };
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, newUser);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('An account with this email already exists.');
      else setError(`Failed to ${isEditMode ? 'update' : 'create'} user.`);
    } finally {
      setLoading(false);
    }
  };

  const title = isEditMode ? `Edit User: ${user.name}` : 'Create New Staff User';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input id="name" value={formData.name || ''} onChange={handleInputChange} required />
        </div>

        <div className="space-y-2">
          <Label>Roles *</Label>
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
            {STAFF_ROLES.map(role => (
              <label key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={role}
                  checked={formData.role?.includes(role)}
                  onChange={handleRoleChange}
                />
                <span>{formatRole(role)}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Management responsibilities are assigned on the 'Management Assignments' page.</p>
        </div>

        {/* --- Auth Fields --- */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-foreground">Login Credentials</p>
          <p className="text-xs text-muted-foreground">Required for all new staff members.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={handleInputChange} disabled={isEditMode} required={!isEditMode} />
              {isEditMode && <p className="text-xs text-muted-foreground">Email cannot be changed after creation.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isEditMode} placeholder={isEditMode ? 'Cannot be changed here' : 'Min. 6 characters'} required={!isEditMode} />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create User')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditUserModal;
