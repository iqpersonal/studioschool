import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface SchoolSettings {
    workingDays: string[];
    activeAcademicYear: string;
}

export const useTimetableSchoolSettings = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable-school-settings', schoolId],
        queryFn: async () => {
            if (!schoolId) return { workingDays: [], activeAcademicYear: '' };
            
            const schoolDocRef = doc(db, 'schools', schoolId);
            const schoolDoc = await getDoc(schoolDocRef);
            
            if (!schoolDoc.exists()) {
                return { workingDays: [], activeAcademicYear: '' };
            }

            const data = schoolDoc.data();
            return {
                workingDays: data?.workingDays || ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
                activeAcademicYear: data?.activeAcademicYear || '',
            };
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
