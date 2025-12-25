import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';

interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateSchoolModal: React.FC<CreateSchoolModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'premium'>('free');
  const [logoURL, setLogoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactEmail) {
      setError('School Name and Contact Email are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'schools'), {
        name,
        address,
        contactEmail,
        contactPhone,
        subscriptionTier,
        logoURL,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      onClose();
      // Reset form
      setName('');
      setAddress('');
      setContactEmail('');
      setContactPhone('');
      setSubscriptionTier('free');
      setLogoURL('');
    } catch (err) {
      console.error(err);
      setError('Failed to create school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New School">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="schoolName">School Name</Label>
          <Input id="schoolName" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input id="contactEmail" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input id="contactPhone" type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subscriptionTier">Subscription Tier</Label>
          <Select id="subscriptionTier" value={subscriptionTier} onChange={e => setSubscriptionTier(e.target.value as any)}>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
          </Select>
        </div>

        <ImageUpload onUploadComplete={setLogoURL} folder="school_logos" onUploadStateChange={setIsUploadingLogo} />
        {isUploadingLogo && <p className="text-xs text-muted-foreground text-center">Please wait for logo upload to complete...</p>}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading || isUploadingLogo}>{loading ? 'Creating...' : 'Create School'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateSchoolModal;