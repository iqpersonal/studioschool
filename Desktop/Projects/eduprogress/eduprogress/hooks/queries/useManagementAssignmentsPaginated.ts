import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ManagementAssignment } from "../../types";

interface UseManagementAssignmentsPaginatedReturn {
  data: ManagementAssignment[];
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

export const useManagementAssignmentsPaginated = (
  schoolId: string,
  pageNumber: number = 1,
  userFilter?: string,
  roleFilter?: string,
  searchTerm?: string
): UseManagementAssignmentsPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["managementAssignments", "paginated", schoolId, pageNumber, userFilter, roleFilter, searchTerm],
    queryFn: async (): Promise<UseManagementAssignmentsPaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where("schoolId", "==", schoolId),
          orderBy("userName", "asc")
        ];

        const assignmentsQuery = query(collection(db, "managementAssignments"), ...constraints);
        const assignmentsSnapshot = await getDocs(assignmentsQuery);

        let assignments = assignmentsSnapshot.docs.map((doc) => {
          const assignment = { id: doc.id, ...doc.data() };
          return { id: assignment.id, ...assignment } as unknown as ManagementAssignment;
        });

        // Apply user filter
        if (userFilter) {
          assignments = assignments.filter((assignment) => assignment.userId === userFilter);
        }

        // Apply role filter
        if (roleFilter) {
          assignments = assignments.filter((assignment) => assignment.role === roleFilter);
        }

        // Apply search filter (search in user name or subject name)
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          assignments = assignments.filter((assignment) =>
            assignment.userName.toLowerCase().includes(term) ||
            (assignment.subjectName?.toLowerCase().includes(term) || false)
          );
        }

        const totalRecords = assignments.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = assignments.slice(startIndex, endIndex);

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
        console.error("Error fetching management assignments:", err);
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
