import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

export interface TimetableHierarchy {
    hierarchy: { [major: string]: { [group: string]: { [grade: string]: Set<string> } } };
    students: UserProfile[];
}

export const useTimetableHierarchy = (
    schoolId: string | undefined,
    activeYear: string | undefined
) => {
    return useQuery({
        queryKey: ['timetable-hierarchy', schoolId, activeYear],
        queryFn: async (): Promise<TimetableHierarchy> => {
            if (!schoolId || !activeYear) {
                return { hierarchy: {}, students: [] };
            }

            try {
                // Fetch students by role string
                const studentsQuery1 = query(
                    collection(db, 'users'),
                    where('schoolId', '==', schoolId),
                    where('academicYear', '==', activeYear),
                    where('role', '==', 'student')
                );
                const studentsSnap = await getDocs(studentsQuery1);

                // Also fetch array-contains 'student'
                const studentsQuery2 = query(
                    collection(db, 'users'),
                    where('schoolId', '==', schoolId),
                    where('academicYear', '==', activeYear),
                    where('role', 'array-contains', 'student')
                );
                const studentsSnapArray = await getDocs(studentsQuery2);

                const newHierarchy: {
                    [major: string]: { [group: string]: { [grade: string]: Set<string> } };
                } = {};
                const processedIds = new Set<string>();
                const allStudents: UserProfile[] = [];

                [...studentsSnap.docs, ...studentsSnapArray.docs].forEach(doc => {
                    if (processedIds.has(doc.id)) return;
                    processedIds.add(doc.id);

                    const data = doc.data() as UserProfile;
                    allStudents.push({ uid: doc.id, ...data });

                    const major = data.major || 'Unknown';
                    const group = data.group || 'Unknown';
                    const grade = data.grade || 'Unknown';
                    const section = data.section || 'Unknown';

                    if (!newHierarchy[major]) {
                        newHierarchy[major] = {};
                    }
                    if (!newHierarchy[major][group]) {
                        newHierarchy[major][group] = {};
                    }
                    if (!newHierarchy[major][group][grade]) {
                        newHierarchy[major][group][grade] = new Set();
                    }

                    newHierarchy[major][group][grade].add(section);
                });

                return { hierarchy: newHierarchy, students: allStudents };
            } catch (error) {
                console.error('Error fetching hierarchy:', error);
                return { hierarchy: {}, students: [] };
            }
        },
        enabled: !!schoolId && !!activeYear,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
