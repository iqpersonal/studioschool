import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "../../services/firebase";

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  remarks?: string;
}

interface AttendanceEntry {
  id: string;
  schoolId: string;
  grade: string;
  section: string;
  date: string;
  academicYear: string;
  records: AttendanceRecord[];
  updatedAt: any;
  updatedBy: string;
}

interface UseAttendancePaginatedReturn {
  data: AttendanceEntry[];
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

export const useAttendancePaginated = (
  schoolId: string,
  pageNumber: number = 1,
  gradeFilter?: string,
  sectionFilter?: string,
  dateRangeStart?: string,
  dateRangeEnd?: string
): UseAttendancePaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["attendance", "paginated", schoolId, pageNumber, gradeFilter, sectionFilter, dateRangeStart, dateRangeEnd],
    queryFn: async (): Promise<UseAttendancePaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where("schoolId", "==", schoolId),
          orderBy("date", "desc"),
          orderBy("grade", "asc")
        ];

        const attendanceQuery = query(collection(db, "attendance"), ...constraints);
        const attendanceSnapshot = await getDocs(attendanceQuery);

        let records = attendanceSnapshot.docs.map((doc) => {
          const record = { id: doc.id, ...doc.data() };
          return { id: record.id, ...record } as unknown as AttendanceEntry;
        });

        // Apply grade filter
        if (gradeFilter) {
          records = records.filter((record) => record.grade === gradeFilter);
        }

        // Apply section filter
        if (sectionFilter) {
          records = records.filter((record) => record.section === sectionFilter);
        }

        // Apply date range filter
        if (dateRangeStart) {
          records = records.filter((record) => record.date >= dateRangeStart);
        }
        if (dateRangeEnd) {
          records = records.filter((record) => record.date <= dateRangeEnd);
        }

        const totalRecords = records.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = records.slice(startIndex, endIndex);

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
        console.error("Error fetching attendance:", err);
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
