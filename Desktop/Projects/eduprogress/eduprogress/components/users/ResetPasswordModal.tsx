import React, { useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { UserProfile } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset component state when the user prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  const handleResetPassword = async () => {
    if (!user || !user.email) {
      setError("This user does not have a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSuccess(`A password reset email has been sent to ${user.email}.`);
    } catch (err) {
      console.error(err);
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reset Password for ${user?.name}`}>
      <div className="space-y-4">
        {success ? (
          <div className="text-center">
            <p className="text-sm text-green-600">{success}</p>
            <div className="mt-4">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to send a password reset link to <strong>{user?.email}</strong>?
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="button" onClick={handleResetPassword} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
