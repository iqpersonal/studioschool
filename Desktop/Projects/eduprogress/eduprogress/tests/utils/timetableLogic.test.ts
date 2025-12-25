import { describe, it, expect } from 'vitest';
import { checkTeacherAvailability, checkDailyLimit, validateTimetableEntry, getTeacherWorkload } from '../../utils/timetableLogic';
import { TimetableEntry } from '../../types';

describe('Timetable Logic', () => {
    const mockEntries: TimetableEntry[] = [
        { id: '1', teacherId: 't1', day: 'Monday', timeSlotId: 'slot1', grade: '10', section: 'A', subjectId: 'Math', schoolId: 's1', academicYear: '2024' },
        { id: '2', teacherId: 't1', day: 'Monday', timeSlotId: 'slot2', grade: '10', section: 'B', subjectId: 'Math', schoolId: 's1', academicYear: '2024' },
    ];

    describe('checkTeacherAvailability', () => {
        it('should return true if teacher is free', () => {
            expect(checkTeacherAvailability('t1', 'Monday', 'slot3', mockEntries)).toBe(true);
        });

        it('should return false if teacher is busy', () => {
            expect(checkTeacherAvailability('t1', 'Monday', 'slot1', mockEntries)).toBe(false);
        });

        it('should ignore current entry when editing', () => {
            expect(checkTeacherAvailability('t1', 'Monday', 'slot1', mockEntries, '1')).toBe(true);
        });
    });

    describe('checkDailyLimit', () => {
        it('should return true if under limit', () => {
            expect(checkDailyLimit('t1', 'Monday', mockEntries)).toBe(true);
        });

        it('should return false if limit reached', () => {
            const busyEntries = Array(7).fill(null).map((_, i) => ({
                id: `busy${i}`, teacherId: 't2', day: 'Tuesday', timeSlotId: `slot${i}`, grade: '10', section: 'A', subjectId: 'Math', schoolId: 's1', academicYear: '2024'
            }));
            expect(checkDailyLimit('t2', 'Tuesday', busyEntries)).toBe(false);
        });
    });

    describe('getTeacherWorkload', () => {
        it('should calculate correct workload', () => {
            const workload = getTeacherWorkload('t1', mockEntries);
            expect(workload.total).toBe(2);
            expect(workload['Monday']).toBe(2);
        });
    });
});
