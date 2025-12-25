import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { Module, School } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';
import Loader from '../ui/Loader';

interface AssignModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: Module;
  assignedSchoolIds: string[];
}

const AssignModuleModal: React.FC<AssignModuleModalProps> = ({ isOpen, onClose, module, assignedSchoolIds }) => {
  const queryClient = useQueryClient();
  
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableSchools = useMemo(() => {
    return allSchools.filter(school => !assignedSchoolIds.includes(school.id));
  }, [allSchools, assignedSchoolIds]);

  useEffect(() => {
    if (isOpen) {
      setLoadingSchools(true);
      setError(null);
      setSuccess(null);

      const fetchSchools = async () => {
        try {
          const schoolsQuery = query(collection(db, 'schools'), orderBy('name'));
          const snapshot = await getDocs(schoolsQuery);
          const schoolData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as School[];
          setAllSchools(schoolData);
        } catch (err) {
          setError("Failed to load schools.");
        } finally {
          setLoadingSchools(false);
        }
      };
      fetchSchools();
    }
  }, [isOpen]);

  useEffect(() => {
    // Set default selection when available schools list changes
    if (availableSchools.length > 0) {
      setSelectedSchoolId(availableSchools[0].id);
    } else {
      setSelectedSchoolId('');
    }
  }, [availableSchools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) {
      setError('Please select a school.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await addDoc(collection(db, 'schoolModules'), {
        schoolId: selectedSchoolId,
        moduleId: module.id,
        moduleName: module.moduleName,
        status: 'enabled',
        assignedAt: serverTimestamp(),
      });
      const schoolName = allSchools.find(s => s.id === selectedSchoolId)?.name || 'the selected school';
      setSuccess(`Successfully assigned '${module.moduleName}' to ${schoolName}.`);
      // Invalidate cache after successful assignment
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    } catch (err) {
      console.error(err);
      setError('Failed to assign module. Please try again.');
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
    <Modal isOpen={isOpen} onClose={handleClose} title={`Add School to '\''${module.moduleName}'\''`}>
      {loadingSchools ? <Loader /> : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school">Select School</Label>
            {availableSchools.length > 0 ? (
              <Select id="school" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} required>
                {availableSchools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">All schools already have this module assigned.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>Close</Button>
            <Button type="submit" disabled={loading || availableSchools.length === 0}>
              {loading ? 'Adding...' : 'Add School'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AssignModuleModal;
