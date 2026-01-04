import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

export const useStudentsByYear = ({
  schoolId,
  academicYear,
}: {
  schoolId?: string;
  academicYear?: string;
}) => {
  return useQuery<UserProfile[]>({
    queryKey: ['students-by-year', schoolId, academicYear],
    queryFn: async () => {
      if (!schoolId || !academicYear) return [];
      const q = query(
        collection(db, 'users'),
        where('schoolId', '==', schoolId),
        where('role', '==', 'student'),
        where('academicYear', '==', academicYear)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!schoolId && !!academicYear,
  });
};

