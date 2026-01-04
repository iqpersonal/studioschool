import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

interface UseStudentsPaginatedReturn {
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

export const useStudentsPaginated = (
  schoolId: string,
  academicYear: string,
  pageNumber: number = 1,
  searchTerm?: string,
  gradeFilter?: string,
  sectionFilter?: string
): UseStudentsPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['students', 'paginated', schoolId, academicYear, pageNumber, searchTerm, gradeFilter, sectionFilter],
    queryFn: async (): Promise<UseStudentsPaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where('schoolId', '==', schoolId),
          where('academicYear', '==', academicYear),
          where('role', 'array-contains', 'student'),
          orderBy('name', 'asc'),
        ];

        const studentsQuery = query(collection(db, 'users'), ...constraints);
        const studentsSnapshot = await getDocs(studentsQuery);

        let students = studentsSnapshot.docs.map((doc) => {
          const user = { id: doc.id, ...doc.data() };
          return { id: user.id, ...user } as unknown as UserProfile;
        });

        // Filter active students
        students = students.filter((user) => user.status !== 'archived');

        // Apply grade filter
        if (gradeFilter) {
          students = students.filter((user) => user.grade === gradeFilter);
        }

        // Apply section filter
        if (sectionFilter) {
          students = students.filter((user) => user.section === sectionFilter);
        }

        // Apply search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          students = students.filter(
            (user) =>
              user.name.toLowerCase().includes(term) ||
              (user.email && user.email.toLowerCase().includes(term)) ||
              (user.studentIdNumber && user.studentIdNumber.toLowerCase().includes(term))
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
        console.error('Error fetching students:', err);
        throw err;
      }
    },
    enabled: !!schoolId && !!academicYear,
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
