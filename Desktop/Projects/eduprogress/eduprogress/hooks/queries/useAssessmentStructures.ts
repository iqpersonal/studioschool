import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AssessmentStructure } from '../../types';

interface UseAssessmentStructuresParams {
  schoolId?: string;
  academicYear?: string;
  grade?: string;
  subjectId?: string;
}

export function useAssessmentStructures(params: UseAssessmentStructuresParams) {
  const { schoolId, academicYear, grade, subjectId } = params;
  const enabled = !!schoolId && !!academicYear;

  return useQuery({
    queryKey: ['assessmentStructures', schoolId, academicYear, grade, subjectId],
    queryFn: async (): Promise<AssessmentStructure[]> => {
      if (!enabled) return [];
      try {
        const constraints = [
          where('schoolId', '==', schoolId!),
          where('academicYear', '==', academicYear!),
        ];
        if (grade) constraints.push(where('grade', '==', grade));
        if (subjectId) constraints.push(where('subjectId', '==', subjectId));
        const q = query(collection(db, 'assessmentStructures'), ...constraints, orderBy('grade', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssessmentStructure));
      } catch (error) {
        console.error('Error fetching assessment structures:', error);
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
