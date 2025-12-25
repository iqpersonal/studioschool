import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  Query,
  QueryConstraint,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface AIUsageWithSchool {
  id: string;
  schoolId: string;
  schoolName: string;
  tokensUsed: number;
  requestsCount: number;
  date: any;
  createdAt?: any;
}

interface UseAiUsagePaginatedReturn {
  data: AIUsageWithSchool[];
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

const ITEMS_PER_PAGE = 25;

export const useAiUsagePaginated = (
  pageNumber: number = 1
): UseAiUsagePaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['aiUsage', 'paginated', pageNumber],
    queryFn: async (): Promise<UseAiUsagePaginatedReturn> => {
      try {
        // Get schools for name mapping
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schoolsMap = new Map<string, string>();
        schoolsSnapshot.forEach(doc => {
          const school = doc.data();
          schoolsMap.set(doc.id, school.name || 'Unknown School');
        });

        // Get total count (needed for pagination info)
        const allUsageSnapshot = await getDocs(
          query(collection(db, 'aiUsage'), orderBy('date', 'desc'))
        );
        const totalRecords = allUsageSnapshot.size;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Calculate skip amount
        const skip = (pageNumber - 1) * ITEMS_PER_PAGE;

        // Build query with limit for current page
        const queryConstraints: QueryConstraint[] = [
          orderBy('date', 'desc'),
          limit(ITEMS_PER_PAGE),
        ];

        // For pages after first, use startAfter() for cursor-based pagination
        if (pageNumber > 1 && allUsageSnapshot.docs.length > skip) {
          const lastDocBefore = allUsageSnapshot.docs[skip - 1];
          if (lastDocBefore) {
            queryConstraints.push(startAfter(lastDocBefore));
          }
        }

        const usageQuery = query(collection(db, 'aiUsage'), ...queryConstraints);
        const usageSnapshot = await getDocs(usageQuery);

        const data = usageSnapshot.docs.map(doc => {
          const usage = { id: doc.id, ...doc.data() };
          return {
            id: usage.id,
            schoolId: usage.schoolId,
            schoolName: schoolsMap.get(usage.schoolId) || 'Unknown School',
            tokensUsed: usage.tokensUsed || 0,
            requestsCount: usage.requestsCount || 0,
            date: usage.date,
            createdAt: usage.createdAt,
          } as AIUsageWithSchool;
        });

        return {
          data,
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
        console.error('Error fetching AI usage data:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes for cleanup
    retry: 1,
  });

  return {
    data: data?.data || [],
    totalRecords: data?.totalRecords || 0,
    currentPage: data?.currentPage || pageNumber,
    pageSize: data?.pageSize || ITEMS_PER_PAGE,
    totalPages: data?.totalPages || 0,
    hasNextPage: data?.hasNextPage || false,
    hasPrevPage: data?.hasPrevPage || false,
    isLoading,
    isError,
    error: error as Error | null,
  };
};
