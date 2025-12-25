import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { UserProfile } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface ManageAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: UserProfile;
}

const ManageAdminModal: React.FC<ManageAdminModalProps> = ({ isOpen, onClose, admin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendPasswordResetEmail(auth, admin.email);
      setSuccess(`A password reset email has been sent to ${admin.email}.`);
    } catch (err) {
      console.error(err);
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setLoading(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Manage Admin: ${admin.name}`}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">{admin.name}</p>
          <p className="text-sm text-muted-foreground">{admin.email}</p>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-foreground mb-2">Actions</h4>
          <div className="flex flex-col items-start space-y-3">
            <p className="text-sm text-muted-foreground">
              This will send an email to the user with a link to reset their password. They will not be notified that you initiated this action.
            </p>
            <Button onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Sending...' : 'Send Password Reset Email'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManageAdminModal;