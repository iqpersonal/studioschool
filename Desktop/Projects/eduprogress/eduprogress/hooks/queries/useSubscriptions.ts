import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Subscription, School } from "../../types";
import { v4 as uuidv4 } from "uuid";

export interface SubscriptionDisplay {
  id: string;
  schoolId: string;
  schoolName: string;
  planName: "free" | "basic" | "premium" | "none";
  startDate?: any | null;
  endDate?: any | null;
  status: "active" | "expiring" | "expired" | "unsubscribed";
  paymentStatus: "paid" | "unpaid" | "overdue" | "n/a";
}

interface SubscriptionsData {
  subscriptions: SubscriptionDisplay[];
  subscriptionErrors: {
    subscriptions: string | null;
    schools: string | null;
  };
}

const generateSafeId = (schoolId: string) => {
  return `unsub_${schoolId}_${uuidv4()}`;
};

const fetchSubscriptionsAndSchools = async (): Promise<SubscriptionsData> => {
  const subscriptionErrors = {
    subscriptions: null as string | null,
    schools: null as string | null,
  };

  // Fetch all subscriptions
  let subscriptionsMap = new Map<string, Subscription>();
  try {
    const subscriptionsSnapshot = await getDocs(collection(db, "subscriptions"));
    subscriptionsSnapshot.forEach(doc => {
      const sub = { id: doc.id, ...doc.data() } as Subscription;
      subscriptionsMap.set(sub.schoolId, sub);
    });
  } catch (subErr) {
    console.error("Failed to fetch subscriptions:", subErr);
    subscriptionErrors.subscriptions = "Failed to fetch subscriptions";
  }

  // Fetch all schools (source of truth)
  let schoolsSnapshot;
  try {
    const schoolsQuery = query(collection(db, "schools"), orderBy("name"));
    schoolsSnapshot = await getDocs(schoolsQuery);
  } catch (schoolErr) {
    console.error("Failed to fetch schools:", schoolErr);
    subscriptionErrors.schools = "Failed to fetch schools";
    throw new Error("Failed to fetch schools");
  }

  const displayData: SubscriptionDisplay[] = schoolsSnapshot.docs.map((doc) => {
    const school = { id: doc.id, ...doc.data() } as School;
    const subscription = subscriptionsMap.get(school.id);

    if (subscription) {
      const now = new Date();
      const endDate = subscription.endDate.toDate();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      let status: "active" | "expiring" | "expired" = "active";
      if (endDate < now) {
        status = "expired";
      } else if (endDate <= thirtyDaysFromNow) {
        status = "expiring";
      }

      return {
        ...subscription,
        schoolName: school.name,
        status: status,
      };
    } else {
      return {
        id: generateSafeId(school.id),
        schoolId: school.id,
        schoolName: school.name,
        planName: "none",
        status: "unsubscribed",
        paymentStatus: "n/a",
        endDate: null,
      };
    }
  });

  return {
    subscriptions: displayData,
    subscriptionErrors,
  };
};

export const useSubscriptions = () => {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: fetchSubscriptionsAndSchools,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
  });
};
