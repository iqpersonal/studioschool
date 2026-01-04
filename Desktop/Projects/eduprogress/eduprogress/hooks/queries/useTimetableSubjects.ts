import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Subject } from '../../types';

export const useTimetableSubjects = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable-subjects', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];
            const q = query(collection(db, 'subjects'), where('schoolId', '==', schoolId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
