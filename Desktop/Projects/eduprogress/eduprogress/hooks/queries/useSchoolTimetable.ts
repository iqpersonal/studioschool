import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { SchoolDivision, TimeSlot, Room, Major, Group } from "../../types";

interface UseSchoolTimetableReturn {
  divisions: SchoolDivision[];
  timeSlots: TimeSlot[];
  rooms: Room[];
  majors: Major[];
  groups: Group[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useSchoolTimetable = (schoolId?: string): UseSchoolTimetableReturn => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["schoolTimetable", schoolId],
    queryFn: async (): Promise<UseSchoolTimetableReturn> => {
      if (!schoolId) {
        return {
          divisions: [],
          timeSlots: [],
          rooms: [],
          majors: [],
          groups: [],
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      try {
        // Fetch all timetable-related data in parallel
        const [divisionsSnap, timeSlotsSnap, roomsSnap, majorsSnap, groupsSnap] = await Promise.all([
          getDocs(query(collection(db, "schoolDivisions"), where("schoolId", "==", schoolId))),
          getDocs(query(collection(db, "timeSlots"), where("schoolId", "==", schoolId))),
          getDocs(query(collection(db, "rooms"), where("schoolId", "==", schoolId))),
          getDocs(query(collection(db, "majors"), where("schoolId", "==", schoolId))),
          getDocs(query(collection(db, "groups"), where("schoolId", "==", schoolId))),
        ]);

        const divisions = divisionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SchoolDivision));
        const timeSlots = timeSlotsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TimeSlot));
        const rooms = roomsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Room));
        const majors = majorsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Major));
        const groups = groupsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Group));

        return {
          divisions,
          timeSlots,
          rooms,
          majors,
          groups,
          isLoading: false,
          isError: false,
          error: null,
        };
      } catch (err) {
        console.error("Error fetching school timetable data:", err);
        throw err;
      }
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    divisions: data?.divisions || [],
    timeSlots: data?.timeSlots || [],
    rooms: data?.rooms || [],
    majors: data?.majors || [],
    groups: data?.groups || [],
    isLoading,
    isError,
    error: error as Error | null,
  };
};
