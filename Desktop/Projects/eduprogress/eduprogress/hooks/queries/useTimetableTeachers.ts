import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

export const useTimetableTeachers = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable-teachers', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];

            const teacherRoles = ['teacher', 'head-of-section', 'subject-coordinator', 'academic-director'];
            const fetchQueries = teacherRoles.flatMap(role => [
                getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', 'array-contains', role))),
                getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', role)))
            ]);

            const snaps = await Promise.all(fetchQueries);
            const teacherMap = new Map<string, UserProfile>();

            snaps.forEach(snap => {
                snap.docs.forEach(doc => {
                    if (!teacherMap.has(doc.id)) {
                        teacherMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
                    }
                });
            });

            return Array.from(teacherMap.values());
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
