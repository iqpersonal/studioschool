import { TimetableEntry } from '../types';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export const checkTeacherAvailability = (
    teacherId: string,
    day: string,
    timeSlotId: string,
    allEntries: TimetableEntry[],
    currentEntryId?: string
): boolean => {
    const conflictingEntry = allEntries.find(entry =>
        entry.teacherId === teacherId &&
        entry.day === day &&
        entry.timeSlotId === timeSlotId &&
        entry.id !== currentEntryId
    );

    return !conflictingEntry;
};

export const checkDailyLimit = (
    teacherId: string,
    day: string,
    allEntries: TimetableEntry[],
    currentEntryId?: string
): boolean => {
    const dailyEntries = allEntries.filter(entry =>
        entry.teacherId === teacherId &&
        entry.day === day &&
        entry.id !== currentEntryId
    );

    return dailyEntries.length < 7;
};

export const validateTimetableEntry = (
    entry: Partial<TimetableEntry>,
    allEntries: TimetableEntry[]
): ValidationResult => {
    if (!entry.teacherId || !entry.day || !entry.timeSlotId) {
        return { isValid: false, error: "Missing required fields." };
    }

    // 1. Check Teacher Availability
    if (!checkTeacherAvailability(entry.teacherId, entry.day, entry.timeSlotId, allEntries, entry.id)) {
        const conflict = allEntries.find(e =>
            e.teacherId === entry.teacherId &&
            e.day === entry.day &&
            e.timeSlotId === entry.timeSlotId &&
            e.id !== entry.id
        );
        return {
            isValid: false,
            error: `Teacher is already assigned to ${conflict?.grade} - ${conflict?.section} at this time.`
        };
    }

    // 2. Check Daily Limit
    if (!checkDailyLimit(entry.teacherId, entry.day, allEntries, entry.id)) {
        return { isValid: false, error: "Teacher has reached the daily limit of 7 periods." };
    }

    return { isValid: true };
};

export const getTeacherWorkload = (
    teacherId: string,
    allEntries: TimetableEntry[]
): { [day: string]: number; total: number } => {
    const workload: { [day: string]: number; total: number } = { total: 0 };
    const processedSlots = new Set<string>();

    allEntries.filter(e => e.teacherId === teacherId).forEach(entry => {
        const uniqueKey = `${entry.day}-${entry.timeSlotId}`;
        if (!processedSlots.has(uniqueKey)) {
            processedSlots.add(uniqueKey);
            workload[entry.day] = (workload[entry.day] || 0) + 1;
            workload.total += 1;
        }
    });

    return workload;
};
