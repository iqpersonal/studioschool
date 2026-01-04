import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ProgressReport } from '../../types';

interface UseProgressReportsParams {
  schoolId?: string;
  academicYearId?: string;
  gradeId?: string;
  studentId?: string;
}

export function useProgressReports(params: UseProgressReportsParams) {
  const { schoolId, academicYearId, gradeId, studentId } = params;
  const enabled = !!schoolId && !!academicYearId;

  return useQuery({
    queryKey: ['progressReports', schoolId, academicYearId, gradeId, studentId],
    queryFn: async (): Promise<ProgressReport[]> => {
      console.log('=== useProgressReports queryFn START ===');
      console.log('Params:', { schoolId, academicYearId, gradeId, studentId, enabled });
      if (!enabled) {
        console.log('Query disabled - returning empty array');
        return [];
      }
      try {
        const constraints = [
          where('schoolId', '==', schoolId!),
          where('academicYear', '==', academicYearId!),
        ];
        if (gradeId) constraints.push(where('gradeId', '==', gradeId));
        if (studentId) constraints.push(where('studentId', '==', studentId));
        
        console.log('Constraints:', constraints.length, 'filters');
        const q = query(collection(db, 'progressReports'), ...constraints, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        console.log('Query returned', snapshot.size, 'documents');
        const results = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          console.log('  Doc:', doc.id, '- studentId:', data.studentId, 'month:', data.month);
          return { id: doc.id, ...data } as ProgressReport;
        });
        console.log('=== useProgressReports queryFn END - returning', results.length, 'results');
        return results;
      } catch (error) {
        console.error('Error fetching progress reports:', error);
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}