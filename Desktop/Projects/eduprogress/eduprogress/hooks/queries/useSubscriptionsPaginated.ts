import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  orderBy,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface SubscriptionWithSchool {
  id: string;
  schoolId: string;
  schoolName: string;
  planName: string;
  status: string;
  expiryDate: any;
  startDate: any;
  amount: number;
  currency: string;
  features?: string[];
  createdAt?: any;
}

interface UseSubscriptionsPaginatedReturn {
  data: SubscriptionWithSchool[];
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

export const useSubscriptionsPaginated = (
  pageNumber: number = 1,
  searchTerm?: string,
  statusFilter?: string
): UseSubscriptionsPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['subscriptions', 'paginated', pageNumber, searchTerm, statusFilter],
    queryFn: async (): Promise<UseSubscriptionsPaginatedReturn> => {
      try {
        // Fetch all subscriptions
        const subscriptionsSnapshot = await getDocs(
          query(collection(db, 'subscriptions'), orderBy('startDate', 'desc'))
        );

        // Fetch all schools for name mapping
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schoolsMap = new Map<string, string>();
        schoolsSnapshot.forEach(doc => {
          const school = doc.data();
          schoolsMap.set(doc.id, school.name || 'Unknown School');
        });

        // Map subscriptions with school names
        let subscriptions = subscriptionsSnapshot.docs.map(doc => {
          const sub = { id: doc.id, ...doc.data() };
          return {
            id: sub.id,
            schoolId: sub.schoolId || '',
            schoolName: schoolsMap.get(sub.schoolId) || 'Unknown School',
            planName: sub.planName || 'Unknown Plan',
            status: sub.status || 'active',
            expiryDate: sub.expiryDate,
            startDate: sub.startDate,
            amount: sub.amount || 0,
            currency: sub.currency || 'USD',
            features: sub.features || [],
            createdAt: sub.createdAt,
          } as SubscriptionWithSchool;
        });

        // Apply filters
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          subscriptions = subscriptions.filter(sub =>
            sub.schoolName.toLowerCase().includes(term) ||
            sub.planName.toLowerCase().includes(term)
          );
        }

        if (statusFilter && statusFilter !== 'all') {
          subscriptions = subscriptions.filter(sub => sub.status === statusFilter);
        }

        const totalRecords = subscriptions.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = subscriptions.slice(startIndex, endIndex);

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
        console.error('Error fetching subscriptions:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
