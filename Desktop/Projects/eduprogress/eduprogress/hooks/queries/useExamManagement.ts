import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ExamSession, ExamRoom } from '../../types';

interface UseExamManagementParams {
  schoolId?: string;
  academicYear?: string;
}

export interface ExamManagementData {
  sessions: ExamSession[];
  rooms: ExamRoom[];
}

export function useExamManagement(params: UseExamManagementParams) {
  const { schoolId, academicYear } = params;
  const enabled = !!schoolId && !!academicYear;

  return useQuery({
    queryKey: ['examManagement', schoolId, academicYear],
    queryFn: async (): Promise<ExamManagementData> => {
      if (!enabled) return { sessions: [], rooms: [] };
      try {
        const [sessionsSnap, roomsSnap] = await Promise.all([
          getDocs(query(collection(db, 'examSessions'), where('schoolId', '==', schoolId!), where('academicYear', '==', academicYear!), orderBy('date', 'desc'))),
          getDocs(query(collection(db, 'examRooms'), where('schoolId', '==', schoolId!))),
        ]);
        return {
          sessions: sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSession)),
          rooms: roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamRoom)),
        };
      } catch (error) {
        console.error('Error fetching exam management data:', error);
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
