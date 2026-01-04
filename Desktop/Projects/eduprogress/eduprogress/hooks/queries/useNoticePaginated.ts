import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, orderBy, QueryConstraint } from "firebase/firestore";
import { db } from "../../services/firebase";

interface Notice {
  id: string;
  title: string;
  content: string;
  date: any;
  authorId: string;
  schoolId: string;
  targetAudience: 'all' | 'teachers' | 'students';
  priority: 'normal' | 'high';
}

interface UseNoticePaginatedReturn {
  data: Notice[];
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

const ITEMS_PER_PAGE = 15;

export const useNoticePaginated = (
  schoolId: string,
  pageNumber: number = 1,
  targetAudienceFilter?: string,
  priorityFilter?: string,
  searchTerm?: string
): UseNoticePaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["notices", "paginated", schoolId, pageNumber, targetAudienceFilter, priorityFilter, searchTerm],
    queryFn: async (): Promise<UseNoticePaginatedReturn> => {
      try {
        const constraints: QueryConstraint[] = [
          where("schoolId", "==", schoolId),
          orderBy("date", "desc")
        ];

        const noticesQuery = query(collection(db, "notices"), ...constraints);
        const noticesSnapshot = await getDocs(noticesQuery);

        let notices = noticesSnapshot.docs.map((doc) => {
          const notice = { id: doc.id, ...doc.data() };
          return { id: notice.id, ...notice } as unknown as Notice;
        });

        // Apply target audience filter
        if (targetAudienceFilter) {
          notices = notices.filter((notice) => notice.targetAudience === targetAudienceFilter);
        }

        // Apply priority filter
        if (priorityFilter) {
          notices = notices.filter((notice) => notice.priority === priorityFilter);
        }

        // Apply search filter (search in title and content)
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          notices = notices.filter((notice) =>
            notice.title.toLowerCase().includes(term) ||
            notice.content.toLowerCase().includes(term)
          );
        }

        const totalRecords = notices.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = notices.slice(startIndex, endIndex);

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
        console.error("Error fetching notices:", err);
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
