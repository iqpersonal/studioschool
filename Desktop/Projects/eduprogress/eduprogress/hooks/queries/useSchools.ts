import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { School } from '../../types';

export const useSchools = () => {
    return useQuery({
        queryKey: ['schools'],
        queryFn: async () => {
            const q = query(collection(db, 'schools'), orderBy('name'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School));
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useSchool = (schoolId: string | undefined) => {
    return useQuery({
        queryKey: ['school', schoolId],
        queryFn: async () => {
            if (!schoolId) return null;
            const docRef = doc(db, 'schools', schoolId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as School;
            }
            return null;
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
