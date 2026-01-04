import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface UseGradesListReturn {
  grades: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useGradesList = (schoolId?: string): UseGradesListReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['grades', 'list', schoolId],
    queryFn: async (): Promise<string[]> => {
      if (!schoolId) return [];
      try {
        const q = query(collection(db, 'grades'), where('schoolId', '==', schoolId));
        const snapshot = await getDocs(q);
        const gradesList = snapshot.docs
          .map(doc => doc.data().name)
          .sort();
        return gradesList;
      } catch (error) {
        console.error('Error fetching grades:', error);
        throw error;
      }
    },
    enabled: !!schoolId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  return {
    grades: data || [],
    isLoading,
    isError,
    error: error as Error | null,
  };
};
