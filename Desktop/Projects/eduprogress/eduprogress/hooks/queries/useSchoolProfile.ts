import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { School, UserProfile } from "../../types";

interface UseSchoolProfileReturn {
  school: School | null;
  academicYears: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useSchoolProfile = (schoolId?: string): UseSchoolProfileReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["schoolProfile", schoolId],
    queryFn: async (): Promise<UseSchoolProfileReturn> => {
      if (!schoolId) {
        return {
          school: null,
          academicYears: [],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      try {
        // Fetch school data
        const schoolDoc = await getDoc(doc(db, "schools", schoolId));
        let school: School | null = null;
        
        if (schoolDoc.exists()) {
          school = { id: schoolDoc.id, ...schoolDoc.data() } as School;
        }

        // Fetch academic years from all users in this school
        let academicYears: string[] = [];
        const usersQuery = query(collection(db, "users"), where("schoolId", "==", schoolId));
        const usersSnap = await getDocs(usersQuery);
        
        const yearsSet = new Set<string>();
        usersSnap.forEach((doc) => {
          const user = doc.data() as UserProfile;
          if (user.academicYear && typeof user.academicYear === "string" && user.academicYear.trim() !== "") {
            yearsSet.add(user.academicYear.trim());
          }
        });

        if (school?.activeAcademicYear) {
          yearsSet.add(school.activeAcademicYear);
        }

        academicYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

        return {
          school,
          academicYears,
          isLoading: false,
          isError: false,
          error: null,
        };
      } catch (err) {
        console.error("Error fetching school profile:", err);
        throw err;
      }
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    school: data?.school || null,
    academicYears: data?.academicYears || [],
    isLoading,
    isError,
    error: error as Error | null,
  };
};
