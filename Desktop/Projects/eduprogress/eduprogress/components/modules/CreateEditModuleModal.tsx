import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { Module } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';

interface CreateEditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: Module | null;
}

const CreateEditModuleModal: React.FC<CreateEditModuleModalProps> = ({ isOpen, onClose, module }) => {
  const queryClient = useQueryClient();
  
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (module) {
      setModuleName(module.moduleName);
      setDescription(module.description);
      setStatus(module.status);
    } else {
      // Reset form for "create" mode
      setModuleName('');
      setDescription('');
      setStatus('active');
    }
  }, [module, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName || !description) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError(null);

    const data = {
      moduleName,
      description,
      status,
      icon: 'placeholder', // Placeholder for icon selection feature
    };

    try {
      if (module) {
        // Update existing module
        const moduleRef = doc(db, 'modules', module.id);
        await updateDoc(moduleRef, data);
      } else {
        // Create new module
        await addDoc(collection(db, 'modules'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      // Invalidate cache after successful create/edit
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      onClose();
    } catch (err) {
      console.error(err);
      setError(`Failed to ${module ? 'update' : 'create'} module. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const title = module ? 'Edit Module' : 'Create New Module';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="moduleName">Module Name</Label>
          <Input id="moduleName" value={moduleName} onChange={e => setModuleName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" value={description} onChange={e => setDescription(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={status} onChange={e => setStatus(e.target.value as any)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (module ? 'Save Changes' : 'Create Module')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateEditModuleModal;
