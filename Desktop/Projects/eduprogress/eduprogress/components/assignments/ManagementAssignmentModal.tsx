import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteField } from 'firebase/firestore';
import { ManagementAssignment, UserProfile, Subject } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Label from '../ui/Label';
import Select from '../ui/Select';
import Loader from '../ui/Loader';

interface ManagementAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  assignmentToEdit: ManagementAssignment | null;
  managers: UserProfile[];
  existingAssignments: ManagementAssignment[];
}

const formatRole = (role: string) => {
  return role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ManagementAssignmentModal: React.FC<ManagementAssignmentModalProps> = ({ isOpen, onClose, schoolId, assignmentToEdit, managers, existingAssignments }) => {
  const [formData, setFormData] = useState<Partial<ManagementAssignment>>({});

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const isEditMode = !!assignmentToEdit;

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      setError(null);

      const fetchPrerequisites = async () => {
        try {
          const usersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
          const subjectsQuery = query(collection(db, 'subjects'), where('schoolId', '==', schoolId));

          const [usersSnap, subjectsSnap] = await Promise.all([getDocs(usersQuery), getDocs(subjectsQuery)]);

          const allUsers = usersSnap.docs.map(doc => doc.data() as UserProfile);
          const studentData = allUsers.filter(u => {
            const roles = Array.isArray(u.role) ? u.role : (u.role ? [u.role] : []);
            return roles.includes('student') && u.status !== 'archived';
          });
          setAllStudents(studentData);

          const subjectsData = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
          subjectsData.sort((a, b) => a.name.localeCompare(b.name));
          setSubjects(subjectsData);

          if (isEditMode) {
            setFormData(assignmentToEdit);
          } else {
            setFormData({});
          }
        } catch (err) {
          setError("Failed to load required school data (students, subjects). Please ensure student data is imported.");
          console.error(err);
        } finally {
          setLoadingData(false);
        }
      };

      fetchPrerequisites();
    }
  }, [isOpen, schoolId, assignmentToEdit, isEditMode]);

  // Cascading Dropdown Options
  const majorOptions = useMemo(() => {
    return Array.from(new Set(allStudents.map(s => s.major).filter(Boolean as any))).sort();
  }, [allStudents]);

  const groupOptions = useMemo(() => {
    if (!formData.major) return [];
    return Array.from(new Set(allStudents.filter(s => s.major === formData.major).map(s => s.group).filter(Boolean as any))).sort();
  }, [allStudents, formData.major]);

  const gradeOptions = useMemo(() => {
    if (!formData.major || !formData.group) return [];

    // 1. Get all possible grades for the selected scope from the student data
    const allPossibleGrades = Array.from(new Set(allStudents
      .filter(s => s.major === formData.major && s.group === formData.group)
      .map(s => s.grade)
      .filter(Boolean as any)
    )).sort();

    // 2. Determine if the current role requires unique grade assignments
    // Subject Coordinators can have multiple assignments for the same grade (different subjects)
    const isRoleUniquePerGrade = formData.role && formData.role !== 'subject-coordinator';

    if (!isRoleUniquePerGrade) {
      // For Subject Coordinators, show all grades. The final check is on submission with the subject.
      return allPossibleGrades;
    }

    // 3. Find grades that are already assigned for this specific role and scope
    const assignedGrades = new Set(existingAssignments
      .filter(a =>
        // Don't filter out the grade of the item we are currently editing
        (!isEditMode || a.id !== assignmentToEdit.id) &&
        a.role === formData.role &&
        a.major === formData.major &&
        a.group === formData.group
      )
      .map(a => a.grade)
    );

    // 4. Return only the grades that are not already assigned
    return allPossibleGrades.filter(grade => !assignedGrades.has(grade));
  }, [allStudents, formData.major, formData.group, formData.role, existingAssignments, isEditMode, assignmentToEdit]);


  const selectedUser = useMemo(() => {
    return managers.find(m => m.uid === formData.userId);
  }, [formData.userId, managers]);

  const showSubjectField = useMemo(() => {
    if (!selectedUser) return false;
    const roles = Array.isArray(selectedUser.role) ? selectedUser.role : [selectedUser.role];
    return roles.includes('subject-coordinator');
  }, [selectedUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;

    if (id === 'userId') {
      const user = managers.find(m => m.uid === value);
      if (user) {
        const roles = Array.isArray(user.role) ? user.role : [user.role];
        const primaryRole = ['subject-coordinator', 'head-of-section', 'academic-director'].find(r => roles.includes(r as any));
        setFormData(prev => ({ ...prev, userId: value, userName: user.name, role: primaryRole as any }));
      }
    } else if (id === 'subjectId') {
      const subject = subjects.find(s => s.id === value);
      setFormData(prev => ({ ...prev, subjectId: value, subjectName: subject?.name }));
    } else {
      setFormData(prev => {
        const newFormData = { ...prev, [id]: value };
        if (id === 'major') {
          newFormData.group = '';
          newFormData.grade = '';
        }
        if (id === 'group') {
          newFormData.grade = '';
        }
        return newFormData;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.major || !formData.group || !formData.grade) {
      setError('Please select a staff member and define the full scope (Major, Group, Grade).');
      return;
    }
    if (showSubjectField && !formData.subjectId) {
      setError('Please select a subject for the Subject Coordinator.');
      return;
    }

    const isDuplicate = existingAssignments.some(a => {
      if (isEditMode && a.id === assignmentToEdit.id) {
        return false;
      }

      const scopeMatch = a.role === formData.role &&
        a.major === formData.major &&
        a.group === formData.group &&
        a.grade === formData.grade;

      if (!scopeMatch) {
        return false;
      }

      if (formData.role === 'subject-coordinator') {
        return a.subjectId === formData.subjectId;
      }

      return true;
    });

    if (isDuplicate) {
      setError("This exact assignment already exists.");
      return;
    }

    setLoading(true);
    setError(null);

    const baseAssignmentData: any = {
      schoolId,
      userId: formData.userId,
      userName: formData.userName!,
      role: formData.role!,
      major: formData.major,
      group: formData.group,
      grade: formData.grade,
    };

    try {
      if (isEditMode) {
        const updateData = { ...baseAssignmentData };
        if (showSubjectField) {
          updateData.subjectId = formData.subjectId;
          updateData.subjectName = formData.subjectName;
        } else {
          updateData.subjectId = deleteField();
          updateData.subjectName = deleteField();
        }
        const assignmentRef = doc(db, 'managementAssignments', assignmentToEdit.id);
        await updateDoc(assignmentRef, updateData);
      } else {
        const createData = { ...baseAssignmentData };
        if (showSubjectField) {
          createData.subjectId = formData.subjectId;
          createData.subjectName = formData.subjectName;
        }
        await addDoc(collection(db, 'managementAssignments'), createData);
      }
      onClose();
    } catch (err) {
      setError(`Failed to save assignment.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const title = isEditMode ? 'Edit Assignment' : 'Create New Assignment';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {loadingData ? <Loader /> : (
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-2">
            <Label htmlFor="userId">Staff Member</Label>
            <Select id="userId" value={formData.userId || ''} onChange={handleInputChange} required disabled={isEditMode}>
              <option value="">-- Select Staff --</option>
              {managers.map(m => {
                const roles = Array.isArray(m.role) ? m.role : [m.role];
                return <option key={m.uid} value={m.uid}>{m.name} ({roles.map(formatRole).join(', ')})</option>
              })}
            </Select>
            {isEditMode && <p className="text-xs text-muted-foreground">To change the person, please delete this assignment and create a new one.</p>}
          </div>

          {selectedUser && (
            <div className="space-y-2">
              <Label htmlFor="role">Assigned Role</Label>
              <Select id="role" value={formData.role || ''} onChange={handleInputChange} required>
                {(Array.isArray(selectedUser.role) ? selectedUser.role : [selectedUser.role])
                  .filter(r => ['head-of-section', 'academic-director', 'subject-coordinator'].includes(r))
                  .map(r => <option key={r} value={r}>{formatRole(r)}</option>)
                }
              </Select>
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Responsibility Scope</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="major">Major</Label>
                <Select id="major" value={formData.major || ''} onChange={handleInputChange} required>
                  <option value="">-- Select Major --</option>
                  {majorOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="group">Group</Label>
                <Select id="group" value={formData.group || ''} onChange={handleInputChange} required disabled={!formData.major || groupOptions.length === 0}>
                  <option value="">-- Select Group --</option>
                  {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="grade">Grade</Label>
                <Select id="grade" value={formData.grade || ''} onChange={handleInputChange} required disabled={!formData.group || gradeOptions.length === 0}>
                  <option value="">-- Select Grade --</option>
                  {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </Select>
              </div>
            </div>
          </div>

          {showSubjectField && (
            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="subjectId">Coordinated Subject</Label>
              <Select id="subjectId" value={formData.subjectId || ''} onChange={handleInputChange} required>
                <option value="">-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Assignment'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ManagementAssignmentModal;