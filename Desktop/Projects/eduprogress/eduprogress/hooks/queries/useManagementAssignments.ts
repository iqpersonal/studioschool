import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ManagementAssignment } from '../../types';

export const useManagementAssignments = ({
  schoolId,
  userId,
}: {
  schoolId?: string;
  userId?: string;
}) => {
  return useQuery<ManagementAssignment[]>({
    queryKey: ['management-assignments', schoolId, userId],
    queryFn: async () => {
      if (!schoolId || !userId) return [];
      const q = query(
        collection(db, 'managementAssignments'),
        where('schoolId', '==', schoolId),
        where('headOfSectionId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ManagementAssignment));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!schoolId && !!userId,
  });
};
