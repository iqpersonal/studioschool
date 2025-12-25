import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export interface AuditLogEntry {
    action: string;
    details: string;
    performedBy: {
        uid: string;
        name: string;
        role: string | string[];
    };
    schoolId: string;
    timestamp: Date;
    entityType?: string;
    entityId?: string;
}

export const logAction = async (
    currentUser: UserProfile,
    action: string,
    details: string,
    entityType?: string,
    entityId?: string
) => {
    if (!currentUser.schoolId) {
        console.warn('Cannot log action: User has no schoolId');
        return;
    }

    try {
        const logEntry: AuditLogEntry = {
            action,
            details,
            performedBy: {
                uid: currentUser.uid,
                name: currentUser.name,
                role: currentUser.role,
            },
            schoolId: currentUser.schoolId,
            timestamp: new Date(),
            entityType,
            entityId,
        };

        await addDoc(collection(db, 'auditLogs'), logEntry);
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // We don't want to block the main action if logging fails, so we just log the error
    }
};
