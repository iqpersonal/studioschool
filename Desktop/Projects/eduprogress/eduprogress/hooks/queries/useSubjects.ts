import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Subject } from "../../types";

interface UseSubjectsReturn {
  subjects: Subject[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useSubjects = (schoolId?: string): UseSubjectsReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subjects", schoolId],
    queryFn: async (): Promise<UseSubjectsReturn> => {
      if (!schoolId) {
        return {
          subjects: [],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      try {
        const subjectsQuery = query(
          collection(db, "subjects"),
          where("schoolId", "==", schoolId),
          orderBy("name", "asc")
        );
        const subjectsSnap = await getDocs(subjectsQuery);
        const subjects = subjectsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Subject));

        return {
          subjects,
          isLoading: false,
          isError: false,
          error: null,
        };
      } catch (err) {
        console.error("Error fetching subjects:", err);
        throw err;
      }
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    subjects: data?.subjects || [],
    isLoading,
    isError,
    error: error as Error | null,
  };
};
