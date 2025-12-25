import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { SupportTicket } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';

interface ViewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket;
}

const DetailItem: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) => (
  value ? (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  ) : null
);

const ViewTicketModal: React.FC<ViewTicketModalProps> = ({ isOpen, onClose, ticket }) => {
  const [status, setStatus] = useState(ticket.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStatusUpdate = async () => {
    setLoading(true);
    setError('');
    try {
      const updateData: { status: string, resolvedAt?: Date } = { status };
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
      await updateDoc(doc(db, 'tickets', ticket.id), updateData);
      onClose(); // Close modal on success
    } catch (err) {
      console.error(err);
      setError("Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ticket: ${ticket.subject}`}>
      <div className="space-y-4">
        <div className="p-4 rounded-md bg-secondary/50 space-y-2">
          <p className="text-sm">{ticket.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <DetailItem label="School" value={ticket.schoolName} />
          <DetailItem label="Submitted" value={ticket.createdAt.toDate().toLocaleString()} />
          <DetailItem label="Priority" value={<span className="capitalize">{ticket.priority}</span>} />
          <DetailItem label="Status" value={<span className="capitalize">{ticket.status}</span>} />
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="status-update">Update Status</Label>
          <div className="flex items-center space-x-2">
            <Select id="status-update" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Button onClick={handleStatusUpdate} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ViewTicketModal;