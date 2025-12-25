import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "../../services/firebase";

export interface SchoolForPagination {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  principalName?: string;
  registrationNumber?: string;
  createdAt?: any;
}

interface UseSchoolsPaginatedReturn {
  data: SchoolForPagination[];
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

export const useSchoolsPaginated = (
  pageNumber: number = 1,
  searchTerm?: string
): UseSchoolsPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["schools", "paginated", pageNumber, searchTerm],
    queryFn: async (): Promise<UseSchoolsPaginatedReturn> => {
      try {
        const schoolsQuery = query(
          collection(db, "schools"),
          orderBy("name", "asc")
        );
        const schoolsSnapshot = await getDocs(schoolsQuery);

        let schools = schoolsSnapshot.docs.map((doc) => {
          const school = { id: doc.id, ...doc.data() };
          return {
            id: school.id,
            name: school.name || "Unknown School",
            email: school.email || "",
            phone: school.phone || "",
            address: school.address || "",
            city: school.city || "",
            state: school.state || "",
            country: school.country || "",
            principalName: school.principalName || "",
            registrationNumber: school.registrationNumber || "",
            createdAt: school.createdAt,
          } as SchoolForPagination;
        });

        // Apply search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          schools = schools.filter(
            (school) =>
              school.name.toLowerCase().includes(term) ||
              school.email.toLowerCase().includes(term) ||
              school.city.toLowerCase().includes(term) ||
              school.principalName.toLowerCase().includes(term)
          );
        }

        const totalRecords = schools.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = schools.slice(startIndex, endIndex);

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
        console.error("Error fetching schools:", err);
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
