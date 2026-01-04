import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface UseSectionsListReturn {
  sections: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useSectionsList = (schoolId?: string): UseSectionsListReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sections', 'list', schoolId],
    queryFn: async (): Promise<string[]> => {
      if (!schoolId) return [];
      try {
        const q = query(collection(db, 'sections'), where('schoolId', '==', schoolId));
        const snapshot = await getDocs(q);
        const sectionsList = snapshot.docs
          .map(doc => doc.data().name)
          .sort();
        return sectionsList;
      } catch (error) {
        console.error('Error fetching sections:', error);
        throw error;
      }
    },
    enabled: !!schoolId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  return {
    sections: data || [],
    isLoading,
    isError,
    error: error as Error | null,
  };
};
