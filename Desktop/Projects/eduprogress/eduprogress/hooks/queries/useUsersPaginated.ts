import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "../../services/firebase";
import { UserProfile } from "../../types";

interface UseUsersPaginatedReturn {
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

export const useUsersPaginated = (
  schoolId: string,
  pageNumber: number = 1,
  searchTerm?: string,
  roleFilter?: string
): UseUsersPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users", "paginated", schoolId, pageNumber, searchTerm, roleFilter],
    queryFn: async (): Promise<UseUsersPaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where("schoolId", "==", schoolId),
        ];

        const usersQuery = query(collection(db, "users"), ...constraints, orderBy("name", "asc"));
        const usersSnapshot = await getDocs(usersQuery);

        let users = usersSnapshot.docs.map((doc) => {
          const user = { id: doc.id, ...doc.data() };
          return { id: user.id, ...user } as unknown as UserProfile;
        });

        // Filter active users
        users = users.filter((user) => user.status !== "archived");

        // Apply role filter
        if (roleFilter) {
          users = users.filter((user) => {
            const userRoles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
            return userRoles.includes(roleFilter as any);
          });
        }

        // Apply search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          users = users.filter(
            (user) =>
              user.name.toLowerCase().includes(term) ||
              (user.email && user.email.toLowerCase().includes(term))
          );
        }

        const totalRecords = users.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = users.slice(startIndex, endIndex);

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
        console.error("Error fetching users:", err);
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
