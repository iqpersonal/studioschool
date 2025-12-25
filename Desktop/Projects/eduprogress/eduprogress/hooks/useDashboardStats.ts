import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';

interface DashboardStatsData {
  schoolsCount: number;
  activeSubs: number;
  openTickets: number;
  totalTokens: number;
  statErrors: {
    schools: string | null;
    subscriptions: string | null;
    tickets: string | null;
    aiUsage: string | null;
  };
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

const fetchDashboardStats = async (): Promise<DashboardStatsData> => {
  const statErrors = {
    schools: null as string | null,
    subscriptions: null as string | null,
    tickets: null as string | null,
    aiUsage: null as string | null,
  };

  let schoolsCount = 0;
  let activeSubs = 0;
  let openTickets = 0;
  let totalTokens = 0;

  // OPTIMIZATION: Parallel queries with Promise.all() for 4x speed improvement
  const [schoolsResult, subscriptionsResult, ticketsResult, aiUsageResult] = await Promise.all([
    // 1. Schools Count
    getDocs(collection(db, 'schools')).catch(err => {
      console.error('Error fetching schools count:', err);
      statErrors.schools = 'Failed to load';
      return null;
    }),
    // 2. Active Subscriptions
    getDocs(collection(db, 'subscriptions')).catch(err => {
      console.error('Error fetching subscriptions:', err);
      statErrors.subscriptions = 'Failed to load';
      return null;
    }),
    // 3. Open Support Tickets
    getDocs(query(collection(db, 'tickets'), where('status', '==', 'open'))).catch(err => {
      console.error('Error fetching tickets:', err);
      statErrors.tickets = 'Failed to load';
      return null;
    }),
    // 4. AI Usage
    getDocs(collection(db, 'aiUsage')).catch(err => {
      console.error('Error fetching AI usage:', err);
      statErrors.aiUsage = 'Failed to load';
      return null;
    }),
  ]);

  // Process results (handle nulls from errors)
  if (schoolsResult) {
    schoolsCount = schoolsResult.size;
  }

  if (subscriptionsResult) {
    const now = new Date();
    subscriptionsResult.forEach((doc) => {
      const data = doc.data();
      if (data.endDate) {
        const endDate = data.endDate instanceof Timestamp
          ? data.endDate.toDate()
          : new Date(data.endDate);
        if (endDate > now) {
          activeSubs++;
        }
      }
    });
  }

  if (ticketsResult) {
    openTickets = ticketsResult.size;
  }

  if (aiUsageResult) {
    aiUsageResult.forEach((doc) => {
      const data = doc.data();
      if (data.tokensUsed) {
        totalTokens += data.tokensUsed;
      }
    });
  }

  return {
    schoolsCount,
    activeSubs,
    openTickets,
    totalTokens: totalTokens, // Store raw number, format in component
    statErrors,
  };
};

export const useDashboardStats = () => {
  return useQuery<DashboardStatsData>({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 300000, // 5 minutes
    retry: false,
  });
};
