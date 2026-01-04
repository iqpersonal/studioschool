import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

interface UseClassRosterPaginatedReturn {
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

const ITEMS_PER_PAGE = 25;

export const useClassRosterPaginated = (
  schoolId: string,
  academicYear: string,
  grade: string,
  section: string,
  pageNumber: number = 1,
  searchTerm?: string
): UseClassRosterPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['classRoster', 'paginated', schoolId, academicYear, grade, section, pageNumber, searchTerm],
    queryFn: async (): Promise<UseClassRosterPaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where('schoolId', '==', schoolId),
          where('academicYear', '==', academicYear),
          where('grade', '==', grade),
          where('section', '==', section),
          where('role', 'array-contains', 'student'),
          orderBy('name', 'asc'),
        ];

        const rosterQuery = query(collection(db, 'users'), ...constraints);
        const rosterSnapshot = await getDocs(rosterQuery);

        let students = rosterSnapshot.docs.map((doc) => {
          const user = { id: doc.id, ...doc.data() };
          return { id: user.id, ...user } as unknown as UserProfile;
        });

        // Filter active students
        students = students.filter((user) => user.status !== 'archived');

        // Apply search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          students = students.filter(
            (user) =>
              user.name.toLowerCase().includes(term) ||
              (user.email && user.email.toLowerCase().includes(term)) ||
              (user.studentIdNumber && user.studentIdNumber.toLowerCase().includes(term)) ||
              (user.fatherName && user.fatherName.toLowerCase().includes(term))
          );
        }

        const totalRecords = students.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = students.slice(startIndex, endIndex);

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
        console.error('Error fetching class roster:', err);
        throw err;
      }
    },
    enabled: !!schoolId && !!academicYear && !!grade && !!section,
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
