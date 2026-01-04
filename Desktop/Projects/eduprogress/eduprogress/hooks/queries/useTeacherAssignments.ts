import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { TeacherAssignment } from '../../types';

export const useTeacherAssignments = ({
  schoolId,
}: {
  schoolId?: string;
}) => {
  return useQuery<TeacherAssignment[]>({
    queryKey: ['teacher-assignments', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const q = query(
        collection(db, 'teacherAssignments'),
        where('schoolId', '==', schoolId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TeacherAssignment));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!schoolId,
  });
};
