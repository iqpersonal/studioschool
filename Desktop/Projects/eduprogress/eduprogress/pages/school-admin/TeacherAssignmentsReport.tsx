import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Major, Group, Grade, TeacherAssignment } from '../../types';
import { Download } from 'lucide-react';

const TeacherAssignmentsReport: React.FC = () => {
    const { currentUserData } = useAuth();
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [majors, setMajors] = useState<Major[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMajorId, setSelectedMajorId] = useState<string>('all');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

    const [gradeGroupMap, setGradeGroupMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUserData?.schoolId) return;
            setLoading(true);
            try {
                const schoolId = currentUserData.schoolId;
                const [assignmentsSnap, majorsSnap, groupsSnap, gradesSnap, studentsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'majors'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'groups'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'grades'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', 'array-contains', 'student')))
                ]);

                setAssignments(assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAssignment)));
                setMajors(majorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Major)));
                setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
                setGrades(gradesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Grade)));

                // Build Grade -> Group Map from Students
                const map = new Map<string, string>();
                studentsSnap.docs.forEach(doc => {
                    const data = doc.data() as any; // UserProfile
                    if (data.grade && data.group) {
                        map.set(data.grade, data.group);
                    }
                });
                setGradeGroupMap(map);

            } catch (error) {
                console.error("Error fetching report data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUserData?.schoolId]);

    // Helper to get Group for a Grade
    const getGroupForGrade = (gradeName: string) => {
        const groupName = gradeGroupMap.get(gradeName);
        if (!groupName) return null;
        return groups.find(g => g.name === groupName);
    };

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            // Filter by Major
            if (selectedMajorId !== 'all') {
                const major = majors.find(m => m.id === selectedMajorId);
                // Match by name since assignment stores major name, or if assignment has majorId (future proof)
                if (major && a.major !== major.name) return false;
            }

            // Filter by Group
            if (selectedGroupId !== 'all') {
                const group = groups.find(g => g.id === selectedGroupId);
                const assignmentGroup = getGroupForGrade(a.grade);
                if (!assignmentGroup || assignmentGroup.id !== selectedGroupId) return false;
            }

            return true;
        });
    }, [assignments, selectedMajorId, selectedGroupId, majors, groups, grades]);

    // ... (previous code remains the same up to filteredAssignments)

    // --- Matrix Processing Logic ---
    const matrixData = useMemo(() => {
        if (filteredAssignments.length === 0) return { columns: [], rows: [] };

        // 1. Get Unique Columns (Grade-Section)
        const colSet = new Set<string>();
        filteredAssignments.forEach(a => {
            colSet.add(`${a.grade} - ${a.section}`);
        });
        // Sort columns naturally (e.g., Grade 1 before Grade 10)
        const columns = Array.from(colSet).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 2. Group by Teacher
        const teacherMap = new Map<string, {
            name: string,
            totalPeriods: number,
            allocations: { [colKey: string]: string[] }
        }>();

        filteredAssignments.forEach(a => {
            const teacherKey = a.teacherName; // Use Name or ID. Name is better for display.
            if (!teacherMap.has(teacherKey)) {
                teacherMap.set(teacherKey, { name: teacherKey, totalPeriods: 0, allocations: {} });
            }
            const teacherRow = teacherMap.get(teacherKey)!;
            const colKey = `${a.grade} - ${a.section}`;

            // Add periods to total
            teacherRow.totalPeriods += (a.periodsPerWeek || 0);

            // Add allocation to cell
            if (!teacherRow.allocations[colKey]) {
                teacherRow.allocations[colKey] = [];
            }
            teacherRow.allocations[colKey].push(`${a.subjectName} (${a.periodsPerWeek})`);
        });

        // Convert map to array and sort by name
        const rows = Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        // 3. Calculate Column Totals
        const columnTotals: { [colKey: string]: number } = {};
        columns.forEach(col => columnTotals[col] = 0);

        filteredAssignments.forEach(a => {
            const colKey = `${a.grade} - ${a.section}`;
            if (columnTotals[colKey] !== undefined) {
                columnTotals[colKey] += (a.periodsPerWeek || 0);
            }
        });

        return { columns, rows, columnTotals };
    }, [filteredAssignments]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div>Loading report...</div>;

    return (
        <div className="space-y-6 p-6 report-container">
            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 5mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    /* Hide everything else */
                    body > * {
                        display: none;
                    }
                    /* Show only our app root (if needed) or just the report container */
                    /* But usually easier to just hide specific parents or use the visibility trick */
                    
                    /* Better approach for this app structure: */
                    /* Assume AppShell sidebar is hidden by print:hidden */
                    /* We just need to ensure this container expands */
                    
                    .report-container {
                        display: block !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background: white;
                        z-index: 9999;
                    }

                    /* Scale down table to fit */
                    table {
                        font-size: 10px !important;
                        width: 100%;
                    }
                    th, td {
                        padding: 2px 4px !important;
                        height: auto !important;
                    }
                    
                    /* Ensure headers stick or repeat (browser dependent) */
                    thead {
                        display: table-header-group;
                    }
                    tr {
                        break-inside: avoid;
                    }
                    
                    /* Hide scrollbars */
                    .overflow-x-auto {
                        overflow: visible !important;
                    }
                }
            `}</style>
            <div className="flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Teacher Assignments Matrix</h1>
                    <p className="text-muted-foreground">View teacher workloads across classes.</p>
                </div>
                <Button onClick={handlePrint} variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Print / PDF
                </Button>
            </div>

            <Card className="print:border-none print:shadow-none">
                <CardHeader className="print:hidden">
                    <CardTitle>Filters</CardTitle>
                    <div className="flex gap-4">
                        <div className="w-[200px]">
                            <label className="text-sm font-medium mb-1 block">Major</label>
                            <Select
                                value={selectedMajorId}
                                onChange={(e) => setSelectedMajorId(e.target.value)}
                            >
                                <option value="all">All Majors</option>
                                {majors.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="w-[200px]">
                            <label className="text-sm font-medium mb-1 block">Group</label>
                            <Select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                            >
                                <option value="all">All Groups</option>
                                {groups
                                    .filter(g => selectedMajorId === 'all' || g.majorId === selectedMajorId)
                                    .map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border print:border-black overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px] sticky left-0 bg-background z-10 font-bold border-r">Teacher Name</TableHead>
                                    {matrixData.columns.map(col => (
                                        <TableHead key={col} className="text-center min-w-[120px] whitespace-nowrap border-r">{col}</TableHead>
                                    ))}
                                    <TableHead className="text-center font-bold bg-muted/50 w-[100px]">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matrixData.rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={matrixData.columns.length + 2} className="text-center h-24">No assignments found.</TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {matrixData.rows.map((row) => (
                                            <TableRow key={row.name}>
                                                <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">{row.name}</TableCell>
                                                {matrixData.columns.map(col => (
                                                    <TableCell key={col} className="text-center border-r text-xs">
                                                        {row.allocations[col] ? (
                                                            <div className="flex flex-col gap-1">
                                                                {row.allocations[col].map((item, idx) => (
                                                                    <span key={idx} className="bg-secondary/50 px-1 rounded">{item}</span>
                                                                ))}
                                                            </div>
                                                        ) : '-'}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-center font-bold bg-muted/50">{row.totalPeriods}</TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Total Row */}
                                        <TableRow className="bg-muted/50 font-bold border-t-2 border-black">
                                            <TableCell className="sticky left-0 bg-muted/50 z-10 border-r">Total Periods</TableCell>
                                            {matrixData.columns.map(col => (
                                                <TableCell key={col} className="text-center border-r">
                                                    {matrixData.columnTotals[col]}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center bg-muted/50">-</TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground print:hidden">
                        Total Teachers: {matrixData.rows.length}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherAssignmentsReport;
