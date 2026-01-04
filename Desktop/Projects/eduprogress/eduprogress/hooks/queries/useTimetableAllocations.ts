import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SubjectAllocation } from '../../types';

export const useTimetableAllocations = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable-allocations', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];
            const q = query(collection(db, 'subjectAllocations'), where('schoolId', '==', schoolId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectAllocation));
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
