// --- Types ---
export interface TimeSlot {
    id: string;
    divisionId: string;
    day: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    name: string;
    type?: 'class' | 'break';
}

export interface TimetableEntry {
    id?: string;
    teacherId: string;
    subjectId: string;
    grade: string;
    section: string;
    day: string;
    timeSlotId: string;
    divisionId: string;
    schoolId?: string;
}

export interface Allocation {
    teacherId: string;
    subjectId: string;
    gradeId: string;
    sectionId: string;
    periodsPerWeek: number;
    divisionId?: string; // Resolved division
    majorName?: string;
    groupName?: string;
    schoolId?: string;
}

// --- Helper: Time Parsing ---
const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// --- Class: Constraint Graph ---
export class ConstraintGraph {
    private overlapMap: Map<string, Set<string>>; // slotId -> Set<overlappingSlotIds>

    constructor(allTimeSlots: TimeSlot[]) {
        this.overlapMap = new Map();
        this.buildGraph(allTimeSlots);
    }

    private buildGraph(slots: TimeSlot[]) {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                const slotA = slots[i];
                const slotB = slots[j];

                // Only check overlap if they are on the same day (or generic slots)
                // Note: If slots have explicit 'day', check it. If generic, assume they apply to all days.
                // Current system uses generic slots usually, but let's be safe.
                if (slotA.day && slotB.day && slotA.day !== slotB.day) continue;

                if (this.areOverlapping(slotA, slotB)) {
                    this.addEdge(slotA.id, slotB.id);
                }
            }
        }
    }

    private areOverlapping(slotA: TimeSlot, slotB: TimeSlot): boolean {
        const startA = parseTime(slotA.startTime);
        const endA = parseTime(slotA.endTime);
        const startB = parseTime(slotB.startTime);
        const endB = parseTime(slotB.endTime);
        return startA < endB && startB < endA;
    }

    private addEdge(idA: string, idB: string) {
        if (!this.overlapMap.has(idA)) this.overlapMap.set(idA, new Set());
        if (!this.overlapMap.has(idB)) this.overlapMap.set(idB, new Set());
        this.overlapMap.get(idA)?.add(idB);
        this.overlapMap.get(idB)?.add(idA);
    }

    public areSlotsConflicting(slotIdA: string, slotIdB: string): boolean {
        if (slotIdA === slotIdB) return true;
        return this.overlapMap.get(slotIdA)?.has(slotIdB) || false;
    }

    public getOverlappingSlots(slotId: string): string[] {
        return Array.from(this.overlapMap.get(slotId) || []);
    }
}

// --- Class: Validator ---
export class TimetableValidator {
    private graph: ConstraintGraph;
    private existingEntries: TimetableEntry[];

    constructor(graph: ConstraintGraph, existingEntries: TimetableEntry[]) {
        this.graph = graph;
        this.existingEntries = existingEntries;
    }

    public addEntries(entries: TimetableEntry[]) {
        this.existingEntries.push(...entries);
    }

    public validateEntry(entry: TimetableEntry): { valid: boolean; error?: string } {
        // 1. Check Teacher Conflict
        const teacherConflict = this.existingEntries.find(e =>
            e.teacherId === entry.teacherId &&
            e.day === entry.day &&
            this.graph.areSlotsConflicting(e.timeSlotId, entry.timeSlotId)
        );

        if (teacherConflict) {
            return { valid: false, error: `Teacher busy in slot ${teacherConflict.timeSlotId} (${entry.day})` };
        }

        // 2. Check Class Conflict
        const classConflict = this.existingEntries.find(e =>
            e.grade === entry.grade &&
            e.section === entry.section &&
            e.day === entry.day &&
            this.graph.areSlotsConflicting(e.timeSlotId, entry.timeSlotId)
        );

        if (classConflict) {
            return { valid: false, error: `Class busy in slot ${classConflict.timeSlotId} (${entry.day})` };
        }

        // 3. Check Division Consistency (Optional but recommended)
        // Ensure the slot belongs to the correct division if provided
        if (entry.divisionId) {
            // We'd need access to slot details here to verify divisionId matches
        }

        return { valid: true };
    }

    public validateSchedule(schedule: TimetableEntry[]): { valid: boolean; conflicts: any[] } {
        const conflicts: any[] = [];
        // Check internal consistency of the new schedule + external consistency with existing
        const allEntries = [...this.existingEntries, ...schedule];

        // We only need to check the NEW entries against ALL entries (including themselves)
        for (let i = 0; i < schedule.length; i++) {
            const entry = schedule[i];

            // Check against all other entries
            for (const other of allEntries) {
                if (entry === other) continue; // Skip self comparison if reference same (won't happen with spread)
                // Actually, 'entry' is in 'allEntries' now at index existing.length + i.
                // Let's just compare entry against everything else.
            }
        }

        // Optimized: Just check each new entry against the "World State"
        // But "World State" updates as we add entries.
        // So we should check:
        // 1. Entry vs Existing
        // 2. Entry vs Other New Entries

        for (let i = 0; i < schedule.length; i++) {
            const entry = schedule[i];

            // Check vs Existing
            const res = this.validateEntry(entry);
            if (!res.valid) {
                conflicts.push({ entry, error: res.error });
            }

            // Check vs Other New Entries (Internal Conflict)
            for (let j = i + 1; j < schedule.length; j++) {
                const other = schedule[j];
                if (entry.day === other.day && this.graph.areSlotsConflicting(entry.timeSlotId, other.timeSlotId)) {
                    if (entry.teacherId === other.teacherId) {
                        conflicts.push({ entry, other, error: "Double Booking (Teacher)" });
                    }
                    if (entry.grade === other.grade && entry.section === other.section) {
                        conflicts.push({ entry, other, error: "Double Booking (Class)" });
                    }
                }
            }
        }

        return { valid: conflicts.length === 0, conflicts };
    }
}

// --- Class: Scope Resolver ---
export class ScopeResolver {
    // This would typically interact with Firestore, but since we are in a Cloud Function,
    // we might pass the data in.
    // For now, let's assume we receive the raw data and filter it.

    static filterAllocations(
        allocations: Allocation[],
        scope: 'global' | 'major' | 'group' | 'division',
        scopeId?: string,
        divisions?: any[] // Needed to resolve Division -> Major/Group
    ): Allocation[] {
        if (scope === 'global') return allocations;
        if (!scopeId) return allocations;

        return allocations.filter(a => {
            if (scope === 'division') return a.divisionId === scopeId;
            // For Major/Group, we need to know the Division's Major/Group or the Allocation's Major/Group
            // Assuming Allocation has divisionId resolved:
            if (!divisions) return true;

            const div = divisions.find(d => d.id === a.divisionId);
            if (!div) return false;

            if (scope === 'major') return div.majorId === scopeId;
            if (scope === 'group') return div.groupIds?.includes(scopeId);

            return false;
        });
    }
}

// --- Class: Backtracking Scheduler (Exact Solver) ---
export class TimetableScheduler {
    private allTimeSlots: TimeSlot[];
    private existingEntries: TimetableEntry[];
    private constraintGraph: ConstraintGraph;
    private workingDays: string[];
    private searchSlots: { slot: TimeSlot, day: string, id: string }[];
    private teachers: { [id: string]: { unavailableSlots?: string[] } };

    // Fast Lookup Maps for Constraints
    // key: teacherId-day-slotId -> boolean (true if busy)
    private teacherBusy: Set<string> = new Set();
    // key: gradeId-sectionId-day-Id -> boolean (true if busy)
    private classBusy: Set<string> = new Set();
    // key: teacherId-day -> count
    // key: teacherId-day -> count
    private teacherDailyCount: Map<string, number> = new Map();

    private bestSchedule: TimetableEntry[] = [];


    constructor(allTimeSlots: TimeSlot[], existingEntries: TimetableEntry[], workingDays: string[], teachers: { [id: string]: { unavailableSlots?: string[] } } = {}) {
        this.allTimeSlots = allTimeSlots;
        this.existingEntries = [...existingEntries];
        this.workingDays = workingDays || ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
        this.teachers = teachers;
        this.constraintGraph = new ConstraintGraph(allTimeSlots);
        this.searchSlots = this.initializeSearchSpace();
        this.initializeState();
    }

    private initializeSearchSpace() {
        const expanded: { slot: TimeSlot, day: string, id: string }[] = [];
        const validDays = this.workingDays.filter(d => d && typeof d === 'string');

        for (const day of validDays) {
            for (const slot of this.allTimeSlots) {
                if (slot.day && slot.day !== day) continue;
                if (slot.type === 'break') continue;

                expanded.push({
                    slot: slot,
                    day: day,
                    id: `${day}-${slot.id}`
                });
            }
        }
        return expanded;
    }

    private initializeState() {
        // Pre-fill busy states from existing entries
        for (const entry of this.existingEntries) {
            this.markBusy(entry, true);
        }
    }

    private markBusy(entry: TimetableEntry, isBusy: boolean) {
        const teacherKey = `${entry.teacherId}-${entry.day}-${entry.timeSlotId}`;
        const classKey = `${entry.grade}-${entry.section}-${entry.day}-${entry.timeSlotId}`;
        const dailyKey = `${entry.teacherId}-${entry.day}`;

        if (isBusy) {
            this.teacherBusy.add(teacherKey);
            this.classBusy.add(classKey);
            this.teacherDailyCount.set(dailyKey, (this.teacherDailyCount.get(dailyKey) || 0) + 1);
        } else {
            this.teacherBusy.delete(teacherKey);
            this.classBusy.delete(classKey);
            const count = this.teacherDailyCount.get(dailyKey) || 0;
            if (count > 0) this.teacherDailyCount.set(dailyKey, count - 1);
        }
    }

    private startTime: number = 0;

    private readonly TIME_LIMIT_MS = 480000; // 8 minutes

    public generateSchedule(allocations: Allocation[], onProgress?: (current: number, total: number) => void): { schedule: TimetableEntry[], failures: any[] } {
        // 1. Flatten Allocations into Lessons
        const lessons: { allocation: Allocation, id: string }[] = [];
        const teacherLoad: { [key: string]: number } = {};
        const classLoad: { [key: string]: number } = {};

        allocations.forEach(alloc => {
            // Track loads for heuristics
            teacherLoad[alloc.teacherId] = (teacherLoad[alloc.teacherId] || 0) + alloc.periodsPerWeek;
            const classKey = `${alloc.gradeId}-${alloc.sectionId}`;
            classLoad[classKey] = (classLoad[classKey] || 0) + alloc.periodsPerWeek;

            for (let i = 0; i < alloc.periodsPerWeek; i++) {
                lessons.push({
                    allocation: alloc,
                    id: `${alloc.teacherId}-${alloc.subjectId}-${alloc.gradeId}-${alloc.sectionId}-${i}`
                });
            }
        });

        // 2. Sort Lessons (Heuristic: Most Constrained First)
        // Primary: Teacher Load (Descending)
        // Secondary: Class Load (Descending)
        lessons.sort((a, b) => {
            const tLoadA = teacherLoad[a.allocation.teacherId] || 0;
            const tLoadB = teacherLoad[b.allocation.teacherId] || 0;
            if (tLoadA !== tLoadB) return tLoadB - tLoadA;

            const cLoadA = classLoad[`${a.allocation.gradeId}-${a.allocation.sectionId}`] || 0;
            const cLoadB = classLoad[`${b.allocation.gradeId}-${b.allocation.sectionId}`] || 0;
            return cLoadB - cLoadA;
        });

        // 3. Randomized Greedy Solver with Restarts
        this.startTime = Date.now();

        this.bestSchedule = [];


        let maxIterations = 1000;
        // If we have a lot of lessons, reduce iterations to ensure we don't timeout
        if (lessons.length > 500) maxIterations = 100;

        console.log(`Starting Randomized Greedy Solver. Max Iterations: ${maxIterations}`);

        for (let iter = 0; iter < maxIterations; iter++) {
            // Check Timeout
            if (Date.now() - this.startTime > this.TIME_LIMIT_MS) break;

            // Shuffle lessons slightly to explore different paths
            // We keep the heuristic sort but shuffle items with same priority? 
            // Or just shuffle completely? 
            // A good mix is: Sort by constraints, but add some randomness.
            // Let's try: Pure shuffle for some iterations, Heuristic for others?
            // Or: Heuristic sort, but pick random slot from top N best slots?
            // Let's stick to: Shuffle lessons, then try to assign.
            // Actually, Heuristic Sort is very powerful. Let's keep it but shuffle "equal" items?
            // Simpler: Just shuffle the whole list for now, or use the sorted list with slight perturbation.
            // Let's try: 1st iteration = Heuristic Sort. Subsequent = Shuffle.

            let currentLessons = [...lessons];
            if (iter > 0) {
                // Fisher-Yates shuffle
                for (let i = currentLessons.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [currentLessons[i], currentLessons[j]] = [currentLessons[j], currentLessons[i]];
                }
            }

            const currentSchedule: TimetableEntry[] = [];
            let successCount = 0;

            // Clear temporary state for this iteration
            // We need to clone the "busy" state? 
            // The `isTeacherBusy` checks `this.teacherBusy`.
            // We need to reset `this.teacherBusy` etc. before each iteration.
            // BUT `this.teacherBusy` is global for the class instance.
            // We should refactor `solve` to take state as argument?
            // Or just clear it.
            this.teacherBusy.clear();
            this.classBusy.clear();
            this.teacherDailyCount.clear();

            // Re-apply existing entries (if any) - wait, existing entries are handled in `initializeConstraints`.
            // We need to re-run `initializeConstraints`? 
            // No, `initializeConstraints` populates `teacherBusy` from `existingEntries`.
            // We should probably store the "initial" busy state and clone it.
            // Since Map cloning is shallow, we can just re-populate.
            // Optimization: Store initial state in a separate Map and copy it.

            // For now, let's just assume we can't easily reset, so we'll implement a `clearDynamicState` and `restoreInitialState`.
            // Actually, `generateSchedule` is called once.
            // We can just re-initialize constraints inside the loop.
            // But `initializeConstraints` takes `existingEntries`. We don't have them here (they are in `this.existingEntries`?).
            // `generateSchedule` doesn't take `existingEntries`. `initializeConstraints` was called before.
            // We need to save the `initial` state.

            // Hack: We will just implement a greedy pass that uses *local* state for the iteration?
            // The helper methods `isTeacherBusy` use `this.teacherBusy`.
            // We must modify `this.teacherBusy`.
            // So we need to save/restore.

            // Save State
            const savedTeacherBusy = new Set(this.teacherBusy);
            const savedClassBusy = new Set(this.classBusy);
            const savedTeacherDailyCount = new Map(this.teacherDailyCount);

            for (const lesson of currentLessons) {
                const slot = this.findBestSlot(lesson, currentLessons.length); // We need a findBestSlot method
                if (slot) {
                    // Assign
                    const entry: TimetableEntry = {
                        id: lesson.id, // Temporary ID
                        schoolId: lesson.allocation.schoolId,
                        teacherId: lesson.allocation.teacherId,
                        subjectId: lesson.allocation.subjectId,
                        grade: lesson.allocation.gradeId,
                        section: lesson.allocation.sectionId,
                        day: slot.day,
                        timeSlotId: slot.slotId,
                        divisionId: lesson.allocation.divisionId || ''
                    };
                    currentSchedule.push(entry);
                    this.markBusy(entry, true); // Updates `this.teacherBusy`
                    successCount++;
                }
            }

            // Update Best
            if (currentSchedule.length > this.bestSchedule.length) {
                this.bestSchedule = [...currentSchedule];
                console.log(`New best: ${currentSchedule.length}/${lessons.length} (Iter ${iter})`);
                if (onProgress) onProgress(currentSchedule.length, lessons.length);
            }

            // Restore State
            this.teacherBusy = savedTeacherBusy;
            this.classBusy = savedClassBusy;
            this.teacherDailyCount = savedTeacherDailyCount;

            // Perfect score?
            if (currentSchedule.length === lessons.length) break;
        }

        if (this.bestSchedule.length === lessons.length) {
            console.log(`Successfully scheduled all ${lessons.length} lessons.`);
            return { schedule: this.bestSchedule, failures: [] };
        } else {
            console.warn(`Greedy solver finished. Scheduled ${this.bestSchedule.length}/${lessons.length}.`);
            return {
                schedule: this.bestSchedule,
                failures: [{ reason: `Could not find perfect schedule. Scheduled ${this.bestSchedule.length}/${lessons.length} lessons.` }]
            };
        }
    }

    private findBestSlot(lesson: { allocation: Allocation, id: string }, totalLessons: number): { day: string, slotId: string } | null {
        // Try all slots, pick first valid (or random valid)
        // We can shuffle candidate slots to add randomness
        const candidates = [...this.searchSlots];

        // Filter candidates by division if needed
        const validCandidates = candidates.filter(s => {
            if (lesson.allocation.divisionId && s.slot.divisionId && lesson.allocation.divisionId !== s.slot.divisionId) return false;
            return true;
        });

        // Fisher-Yates shuffle candidates
        for (let i = validCandidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validCandidates[i], validCandidates[j]] = [validCandidates[j], validCandidates[i]];
        }

        for (const { day, slot } of validCandidates) {
            if (!this.isTeacherBusy(lesson.allocation.teacherId, day, slot.id) &&
                !this.isClassBusy(lesson.allocation.gradeId, lesson.allocation.sectionId, day, slot.id) &&
                this.checkDailyLimit(lesson.allocation.teacherId, day)) {
                return { day, slotId: slot.id };
            }
        }
        return null;
    }

    private checkDailyLimit(teacherId: string, day: string): boolean {
        const dailyLoad = this.teacherDailyCount.get(`${teacherId}-${day}`) || 0;
        return dailyLoad < 7;
    }

    private isTeacherBusy(teacherId: string, day: string, slotId: string): boolean {
        // Check Unavailable Slots (Time Off)
        const constraintKey = `${day}-${slotId}`;
        if (this.teachers[teacherId]?.unavailableSlots?.includes(constraintKey)) return true;

        // Direct check
        if (this.teacherBusy.has(`${teacherId}-${day}-${slotId}`)) return true;

        // Check overlapping slots (using ConstraintGraph)
        const overlapping = this.constraintGraph.getOverlappingSlots(slotId);
        for (const ov of overlapping) {
            if (this.teacherBusy.has(`${teacherId}-${day}-${ov}`)) return true;
        }
        return false;
    }

    private isClassBusy(grade: string, section: string, day: string, slotId: string): boolean {
        // Direct check
        if (this.classBusy.has(`${grade}-${section}-${day}-${slotId}`)) return true;

        // Check overlapping slots
        const overlapping = this.constraintGraph.getOverlappingSlots(slotId);
        for (const ov of overlapping) {
            if (this.classBusy.has(`${grade}-${section}-${day}-${ov}`)) return true;
        }
        return false;
    }
}
