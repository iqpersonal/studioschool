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
        const schoolDoc = await getDocs(query(collection(db, "schools"), where("__name__", "==", schoolId)));
        let school: School | null = null;
        
        if (schoolDoc.docs.length > 0) {
          const docData = schoolDoc.docs[0].data();
          school = { id: schoolDoc.docs[0].id, ...docData } as School;
        }

        // Count teachers/staff by filtering by role='teacher' (not by academicYear since staff don't have that)
        let teacherCount = 0;
        const teacherQuery = query(
          collection(db, "users"),
          where("schoolId", "==", schoolId),
          where("role", "==", "teacher")
        );
        const teacherSnapshot = await getDocs(teacherQuery);
        teacherCount = teacherSnapshot.docs.filter((doc) => {
          const user = doc.data() as UserProfile;
          return user.status !== "archived";
        }).length;

        // Count students for selected academic year
        let studentCount = 0;
        if (selectedAcademicYear) {
          const studentQuery = query(
            collection(db, "users"),
            where("schoolId", "==", schoolId),
            where("academicYear", "==", selectedAcademicYear),
            where("role", "==", "student")
          );
          const studentSnapshot = await getDocs(studentQuery);
          studentCount = studentSnapshot.docs.filter((doc) => {
            const user = doc.data() as UserProfile;
            return user.status !== "archived";
          }).length;
        }

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
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
