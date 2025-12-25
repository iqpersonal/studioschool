import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { AuditLogEntry } from "../../services/audit";

export interface AuditLogWithId extends AuditLogEntry {
  id: string;
}

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const logsQuery = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(logsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLogWithId[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};
