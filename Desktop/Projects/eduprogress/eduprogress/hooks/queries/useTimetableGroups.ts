import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Group } from '../../types';

export const useTimetableGroups = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable-groups', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];
            const q = query(collection(db, 'groups'), where('schoolId', '==', schoolId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
