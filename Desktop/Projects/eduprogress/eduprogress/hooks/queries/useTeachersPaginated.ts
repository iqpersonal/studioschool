import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

interface UseTeachersPaginatedReturn {
  data: UserProfile[];
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

export const useTeachersPaginated = (
  schoolId: string,
  pageNumber: number = 1,
  searchTerm?: string,
  departmentFilter?: string
): UseTeachersPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['teachers', 'paginated', schoolId, pageNumber, searchTerm, departmentFilter],
    queryFn: async (): Promise<UseTeachersPaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where('schoolId', '==', schoolId),
          where('role', 'array-contains', 'teacher'),
          orderBy('name', 'asc'),
        ];

        const teachersQuery = query(collection(db, 'users'), ...constraints);
        const teachersSnapshot = await getDocs(teachersQuery);

        let teachers = teachersSnapshot.docs.map((doc) => {
          const user = { id: doc.id, ...doc.data() };
          return { id: user.id, ...user } as unknown as UserProfile;
        });

        // Filter active teachers
        teachers = teachers.filter((user) => user.status !== 'archived');

        // Apply department filter if applicable
        if (departmentFilter) {
          teachers = teachers.filter((user) => user.department === departmentFilter);
        }

        // Apply search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          teachers = teachers.filter(
            (user) =>
              user.name.toLowerCase().includes(term) ||
              (user.email && user.email.toLowerCase().includes(term)) ||
              (user.employeeId && user.employeeId.toLowerCase().includes(term))
          );
        }

        const totalRecords = teachers.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = teachers.slice(startIndex, endIndex);

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
        console.error('Error fetching teachers:', err);
        throw err;
      }
    },
    enabled: !!schoolId,
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
