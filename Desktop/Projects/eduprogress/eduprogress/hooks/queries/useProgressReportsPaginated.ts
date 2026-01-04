import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ProgressReport } from '../../types';

interface UseProgressReportsPaginatedReturn {
  data: ProgressReport[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const ITEMS_PER_PAGE = 20;

export const useProgressReportsPaginated = (
  schoolId: string,
  academicYearId: string,
  pageNumber: number = 1,
  gradeFilter?: string
): UseProgressReportsPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['progressReports', 'paginated', schoolId, academicYearId, pageNumber, gradeFilter],
    queryFn: async (): Promise<UseProgressReportsPaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where('schoolId', '==', schoolId),
          where('academicYearId', '==', academicYearId),
          orderBy('createdAt', 'desc'),
        ];

        if (gradeFilter) {
          constraints.push(where('grade', '==', gradeFilter));
        }

        const reportsQuery = query(collection(db, 'progressReports'), ...constraints);
        const reportsSnapshot = await getDocs(reportsQuery);

        let reports = reportsSnapshot.docs.map((doc) => {
          const report = { id: doc.id, ...doc.data() };
          return { id: report.id, ...report } as unknown as ProgressReport;
        });

        const totalRecords = reports.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = reports.slice(startIndex, endIndex);

        return {
          data: pageData,
          totalRecords,
          currentPage: pageNumber,
          pageSize: ITEMS_PER_PAGE,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1,
          isLoading: false,
          isError: false,
          error: null,
        };
      } catch (err) {
        console.error('Error fetching progress reports:', err);
        throw err;
      }
    },
    enabled: !!schoolId && !!academicYearId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: data?.data || [],
    totalRecords: data?.totalRecords || 0,
    currentPage: data?.currentPage || 1,
    pageSize: data?.pageSize || ITEMS_PER_PAGE,
    totalPages: data?.totalPages || 0,
    hasNextPage: data?.hasNextPage || false,
    hasPrevPage: data?.hasPrevPage || false,
    isLoading,
    isError,
    error: error as Error | null,
  };
};
