import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { TimeSlot } from '../../types';

export const useTimetableTimeSlots = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable-timeSlots', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];
            const q = query(collection(db, 'timeSlots'), where('schoolId', '==', schoolId));
            const snapshot = await getDocs(q);
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as TimeSlot))
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
