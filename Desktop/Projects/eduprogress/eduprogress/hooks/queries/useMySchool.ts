import { useQuery } from "@tanstack/react-query";
import { collection, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { School, UserProfile, TeacherAssignment } from "../../types";

interface UseMySchoolReturn {
  school: School | null;
  stats: { studentCount: number; teacherCount: number };
  teacherAssignments: TeacherAssignment[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useMySchool = (
  schoolId?: string,
  selectedAcademicYear?: string,
  userRoles?: string[],
  teacherId?: string
): UseMySchoolReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["mySchool", schoolId, selectedAcademicYear, userRoles, teacherId],
    queryFn: async (): Promise<UseMySchoolReturn> => {
      if (!schoolId) {
        return {
          school: null,
          stats: { studentCount: 0, teacherCount: 0 },
          teacherAssignments: [],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      try {
        // Fetch school data
        const schoolDoc = await getDocs(query(collection(db, "schools"), where("__name__", "==", schoolId)));
        let school: School | null = null;
        
        if (schoolDoc.docs.length > 0) {
          const docData = schoolDoc.docs[0].data();
          school = { id: schoolDoc.docs[0].id, ...docData } as School;
        }

        // Fetch staff count (all active teachers and management)
        let teacherCount = 0;
        const staffRoleSet = new Set(["teacher", "head-of-section", "subject-coordinator", "academic-director", "school-admin"]);
        
        const staffQuery = query(collection(db, "users"), where("schoolId", "==", schoolId));
        const staffSnapshot = await getDocs(staffQuery);
        
        staffSnapshot.forEach((doc) => {
          const user = doc.data() as UserProfile;
          if (user.status !== "archived") {
            const userRoles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
            if (userRoles.some((role) => role && staffRoleSet.has(role))) {
              teacherCount++;
            }
          }
        });

        // Fetch student count for selected academic year
        let studentCount = 0;
        if (selectedAcademicYear && userRoles?.some(r => ["school-admin", "academic-director"].includes(r))) {
          const studentQuery = query(
            collection(db, "users"),
            where("schoolId", "==", schoolId),
            where("academicYear", "==", selectedAcademicYear)
          );
          const studentSnapshot = await getDocs(studentQuery);
          
          studentSnapshot.forEach((doc) => {
            const user = doc.data() as UserProfile;
            if (user.status !== "archived") {
              const userRoles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
              if (userRoles.includes("student")) {
                studentCount++;
              }
            }
          });
        }

        // Fetch teacher assignments (if user is a teacher)
        let teacherAssignments: TeacherAssignment[] = [];
        if (userRoles?.includes("teacher") && teacherId) {
          const assignmentsQuery = query(
            collection(db, "teacherAssignments"),
            where("schoolId", "==", schoolId),
            where("teacherId", "==", teacherId)
          );
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          teacherAssignments = assignmentsSnapshot.docs.map((doc) => doc.data() as TeacherAssignment);
        }

        return {
          school,
          stats: { studentCount, teacherCount },
          teacherAssignments,
          isLoading: false,
          isError: false,
          error: null,
        };
      } catch (err) {
        console.error("Error fetching MySchool data:", err);
        throw err;
      }
    },
    enabled: !!schoolId, // Only fetch if schoolId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    school: data?.school || null,
    stats: data?.stats || { studentCount: 0, teacherCount: 0 },
    teacherAssignments: data?.teacherAssignments || [],
    isLoading,
    isError,
    error: error as Error | null,
  };
};
