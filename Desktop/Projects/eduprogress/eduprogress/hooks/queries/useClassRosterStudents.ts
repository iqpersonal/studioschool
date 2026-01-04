import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

export const useClassRosterStudents = ({
  schoolId,
  grade,
  section,
}: {
  schoolId?: string;
  grade?: string;
  section?: string;
}) => {
  return useQuery<UserProfile[]>({
    queryKey: ['class-roster-students', schoolId, grade, section],
    queryFn: async () => {
      if (!schoolId || !grade || !section) return [];
      
      try {
        const q = query(
          collection(db, 'users'),
          where('schoolId', '==', schoolId),
          where('grade', '==', grade),
          where('section', '==', section)
        );
        
        const snapshot = await getDocs(q);
        const allUsers = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        
        // Filter for active students only
        return allUsers
          .filter(u => {
            const roles = Array.isArray(u.role) ? u.role : u.role ? [u.role] : [];
            return roles.includes('student') && u.status !== 'archived';
          })
          .sort((a, b) => {
            const nameA = `${a.name || ''} ${a.fatherName || ''} ${a.familyName || ''}`.trim().toLowerCase();
            const nameB = `${b.name || ''} ${b.fatherName || ''} ${b.familyName || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
          });
      } catch (error) {
        console.error('Error fetching class roster students:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!schoolId && !!grade && !!section,
  });
};
