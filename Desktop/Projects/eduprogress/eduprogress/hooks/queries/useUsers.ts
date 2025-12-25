import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { UserProfile } from '../../types';

interface UseUsersOptions {
    schoolId?: string;
    role?: string;
}

export const useUsers = ({ schoolId, role }: UseUsersOptions) => {
    return useQuery({
        queryKey: ['users', schoolId, role],
        queryFn: async () => {
            let q = collection(db, 'users');
            const constraints = [];

            if (schoolId) {
                constraints.push(where('schoolId', '==', schoolId));
            }

            if (role) {
                constraints.push(where('role', 'array-contains', role));
            }

            // Note: orderBy might require an index if combined with where clauses
            // constraints.push(orderBy('email')); 

            const finalQuery = query(q, ...constraints);
            const snapshot = await getDocs(finalQuery);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile));
        },
        enabled: !!schoolId, // Only fetch if schoolId is provided (usually required for school admin)
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};
