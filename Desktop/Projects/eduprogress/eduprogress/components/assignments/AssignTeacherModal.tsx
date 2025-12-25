import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteField } from 'firebase/firestore';
import { UserProfile, Subject, TeacherAssignment } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';
import Loader from '../ui/Loader';
import Input from '../ui/Input';

interface AssignTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  grade: string;
  section: string;
  assignmentToEdit?: TeacherAssignment | null;
}

const AssignTeacherModal: React.FC<AssignTeacherModalProps> = ({ isOpen, onClose, onSuccess, schoolId, grade, section, assignmentToEdit }) => {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!assignmentToEdit;

  const formatRole = (role: string) => {
    return role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      setError(null);

      const fetchPrerequisites = async () => {
        try {
          const staffQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
          const subjectsQuery = query(collection(db, 'subjects'), where('schoolId', '==', schoolId));

          const [staffSnapshot, subjectsSnapshot] = await Promise.all([getDocs(staffQuery), getDocs(subjectsQuery)]);

          const allUsers = staffSnapshot.docs.map(doc => doc.data() as UserProfile);

          const staffRoles: UserProfile['role'] = ['teacher', 'head-of-section', 'subject-coordinator', 'academic-director', 'school-admin'];
          const staffData = allUsers.filter(user => {
            const userRoles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
            return userRoles.some(role => staffRoles.includes(role));
          });

          staffData.sort((a, b) => a.name.localeCompare(b.name));
          setStaff(staffData);

          const subjectsData = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Subject);
          subjectsData.sort((a, b) => a.name.localeCompare(b.name));
          setSubjects(subjectsData);

          if (isEditMode) {
            setSelectedTeacherId(assignmentToEdit.teacherId);
            setSelectedSubjectId(assignmentToEdit.subjectId);
            setPeriodsPerWeek(assignmentToEdit.periodsPerWeek?.toString() || '');
          } else {
            if (staffData.length > 0) setSelectedTeacherId(staffData[0].uid);
            if (subjectsData.length > 0) setSelectedSubjectId(subjectsData[0].id);
            setPeriodsPerWeek('');
          }

        } catch (err) {
          console.error("Error fetching data:", err);
          setError("Could not load staff or subjects. Please try again.");
        } finally {
          setLoadingData(false);
        }
      };

      fetchPrerequisites();
    }
  }, [isOpen, schoolId, assignmentToEdit, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedSubjectId) {
      setError('Please select both a staff member and a subject.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedStaff = staff.find(t => t.uid === selectedTeacherId);
      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

      if (!selectedStaff || !selectedSubject) {
        throw new Error("Selected staff or subject not found.");
      }

      const assignmentData: any = {
        teacherId: selectedStaff.uid,
        teacherName: selectedStaff.name,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        grade,
        section,
        schoolId,
        periodsPerWeek: periodsPerWeek ? parseInt(periodsPerWeek, 10) : deleteField(),
      };

      if (isEditMode) {
        const assignmentRef = doc(db, 'teacherAssignments', assignmentToEdit.id);
        await updateDoc(assignmentRef, assignmentData);
      } else {
        const existingAssignmentQuery = query(
          collection(db, 'teacherAssignments'),
          where('schoolId', '==', schoolId),
          where('grade', '==', grade),
          where('section', '==', section),
          where('teacherId', '==', selectedTeacherId),
          where('subjectId', '==', selectedSubjectId)
        );
        const existingAssignmentSnapshot = await getDocs(existingAssignmentQuery);

        if (!existingAssignmentSnapshot.empty) {
          setError("This staff member is already assigned this subject for this class.");
          setLoading(false);
          return;
        }
        await addDoc(collection(db, 'teacherAssignments'), assignmentData);
      }

      onSuccess();
    } catch (err) {
      console.error("Error creating assignment:", err);
      setError(`Failed to ${isEditMode ? 'update' : 'create'} assignment.`);
    } finally {
      setLoading(false);
    }
  };

  const title = isEditMode ? 'Edit Assignment' : `Assign Staff to ${grade} - ${section}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {loadingData ? <Loader /> : error ? <p className="text-destructive">{error}</p> : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher">Select Staff Member</Label>
            <Select id="teacher" value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} required>
              {staff.length === 0 ? <option disabled>No staff members found</option> : staff.map(t => {
                const userRoles = Array.isArray(t.role) ? t.role : (t.role ? [t.role] : []);
                return <option key={t.uid} value={t.uid}>{t.name} ({userRoles.map(formatRole).join(', ')})</option>
              })}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Select Subject</Label>
            <Select id="subject" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} required>
              {subjects.length === 0 ? <option disabled>No subjects found</option> : subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodsPerWeek">Periods per Week</Label>
            <Input
              id="periodsPerWeek"
              type="number"
              value={periodsPerWeek}
              onChange={e => setPeriodsPerWeek(e.target.value)}
              min="1"
              placeholder="e.g., 5"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Assign Staff')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AssignTeacherModal;
