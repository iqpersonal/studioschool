import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  userName?: string;
  timestamp: any;
  details?: string;
  resource?: string;
  resourceId?: string;
  status?: string;
  ipAddress?: string;
}

interface UseAuditLogsPaginatedReturn {
  data: AuditLogEntry[];
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

export const useAuditLogsPaginated = (
  pageNumber: number = 1,
  searchTerm?: string,
  actionFilter?: string
): UseAuditLogsPaginatedReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['auditLogs', 'paginated', pageNumber, searchTerm, actionFilter],
    queryFn: async (): Promise<UseAuditLogsPaginatedReturn> => {
      try {
        // Get all logs (we need to filter client-side for now due to Firestore limitations)
        const logsQuery = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
        const logsSnapshot = await getDocs(logsQuery);

        // Filter by search and action
        let filtered = logsSnapshot.docs.map(doc => {
          const log = { id: doc.id, ...doc.data() };
          return {
            id: log.id,
            action: log.action || '',
            userId: log.userId || '',
            userName: log.userName || 'Unknown User',
            timestamp: log.timestamp,
            details: log.details || '',
            resource: log.resource || '',
            resourceId: log.resourceId || '',
            status: log.status || '',
            ipAddress: log.ipAddress || '',
          } as AuditLogEntry;
        });

        // Apply filters
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(log =>
            log.action.toLowerCase().includes(term) ||
            log.userName.toLowerCase().includes(term) ||
            log.details.toLowerCase().includes(term) ||
            log.resource.toLowerCase().includes(term)
          );
        }

        if (actionFilter && actionFilter !== 'all') {
          filtered = filtered.filter(log => log.action === actionFilter);
        }

        const totalRecords = filtered.length;
        const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

        // Paginate
        const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageData = filtered.slice(startIndex, endIndex);

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
        console.error('Error fetching audit logs:', err);
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
