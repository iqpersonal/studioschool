import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Grade } from '../../types';

export const useTimetableGrades = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable-grades', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];
            const q = query(collection(db, 'grades'), where('schoolId', '==', schoolId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
