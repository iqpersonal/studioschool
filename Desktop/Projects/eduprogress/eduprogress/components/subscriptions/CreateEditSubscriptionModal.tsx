import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';
import { SubscriptionDisplay } from '../../pages/Subscriptions';

interface CreateEditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subscription: SubscriptionDisplay;
}

const CreateEditSubscriptionModal: React.FC<CreateEditSubscriptionModalProps> = ({ isOpen, onClose, onSuccess, subscription }) => {
  const [planName, setPlanName] = useState<'free' | 'basic' | 'premium'>('basic');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'overdue'>('paid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNewSubscription = subscription?.status === 'unsubscribed';

  useEffect(() => {
    if (subscription && isOpen) {
      if (isNewSubscription) {
        // Set defaults for a new subscription
        const today = new Date();
        const nextYear = new Date(new Date().setFullYear(today.getFullYear() + 1));
        setPlanName('basic');
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(nextYear.toISOString().split('T')[0]);
        setPaymentStatus('paid');
      } else {
        // Populate with existing data
        setPlanName(subscription.planName as 'free' | 'basic' | 'premium');
        setStartDate(subscription.startDate ? subscription.startDate.toDate().toISOString().split('T')[0] : '');
        setEndDate(subscription.endDate ? subscription.endDate.toDate().toISOString().split('T')[0] : '');
        setPaymentStatus(subscription.paymentStatus as 'paid' | 'unpaid' | 'overdue');
      }
    }
  }, [subscription, isOpen, isNewSubscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !startDate || !endDate) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const schoolRef = doc(db, 'schools', subscription.schoolId);

      const subscriptionData = {
        schoolId: subscription.schoolId,
        planName,
        startDate: Timestamp.fromDate(new Date(startDate)),
        endDate: Timestamp.fromDate(new Date(endDate)),
        paymentStatus,
      };

      if (isNewSubscription) {
        await addDoc(collection(db, 'subscriptions'), subscriptionData);
      } else {
        const subscriptionRef = doc(db, 'subscriptions', subscription.id);
        await updateDoc(subscriptionRef, subscriptionData);
      }

      // IMPORTANT: Sync the school document to maintain consistency
      await updateDoc(schoolRef, { subscriptionTier: planName });

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Failed to save subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const title = isNewSubscription ? `Add Plan for ${subscription.schoolName}` : `Edit Subscription for ${subscription.schoolName}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="planName">Subscription Plan</Label>
          <Select id="planName" value={planName} onChange={e => setPlanName(e.target.value as any)}>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select id="paymentStatus" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as any)}>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Subscription'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditSubscriptionModal;
