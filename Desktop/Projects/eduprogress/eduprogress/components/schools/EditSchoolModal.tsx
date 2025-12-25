import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { School } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';

interface EditSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
}

const EditSchoolModal: React.FC<EditSchoolModalProps> = ({ isOpen, onClose, school }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'premium'>('free');
  const [logoURL, setLogoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (school) {
      setName(school.name);
      setAddress(school.address || '');
      setContactEmail(school.contactEmail || '');
      setContactPhone(school.contactPhone || '');
      setSubscriptionTier(school.subscriptionTier || 'free');
      setLogoURL(school.logoURL || '');
    }
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactEmail) {
      setError('School Name and Contact Email are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const schoolRef = doc(db, 'schools', school.id);
      await updateDoc(schoolRef, {
        name,
        address,
        contactEmail,
        contactPhone,
        subscriptionTier,
        logoURL,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to update school. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${school.name}`}>
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
        {logoURL && !logoURL.startsWith('data:') && !isUploadingLogo && <p className="text-xs text-muted-foreground">Current logo: <a href={logoURL} target="_blank" rel="noopener noreferrer" className="underline">View Image</a></p>}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading || isUploadingLogo}>{loading ? 'Updating...' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditSchoolModal;