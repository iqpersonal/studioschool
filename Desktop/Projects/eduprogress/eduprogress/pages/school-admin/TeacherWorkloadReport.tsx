import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { TeacherAssignment, UserProfile, Major, Group } from '../../types';
import { Printer } from 'lucide-react';
import Loader from '../../components/ui/Loader';

interface WorkloadRow {
    teacherId: string;
    teacherName: string;
    totalPeriods: number;
    details: {
        major: string;
        group: string;
        grade: string;
        section: string;
        subject: string;
        periods: number;
    }[];
}

const TeacherWorkloadReport: React.FC = () => {
    const { currentUserData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allRows, setAllRows] = useState<WorkloadRow[]>([]);

    const [majors, setMajors] = useState<Major[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedMajor, setSelectedMajor] = useState<string>('All');
    const [selectedGroup, setSelectedGroup] = useState<string>('All');

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUserData?.schoolId) return;
            setLoading(true);
            try {
                const schoolId = currentUserData.schoolId;

                // Fetch assignments, students, majors, and groups
                const [assignmentsSnap, studentsSnap, majorsSnap, groupsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'teacherAssignments'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', 'array-contains', 'student'))),
                    getDocs(query(collection(db, 'majors'), where('schoolId', '==', schoolId))),
                    getDocs(query(collection(db, 'groups'), where('schoolId', '==', schoolId)))
                ]);

                setMajors(majorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Major)));
                setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));

                const assignments = assignmentsSnap.docs.map(d => d.data() as TeacherAssignment);

                // Build Map: "Grade-Section" -> { major, group } from Students
                const gradeSectionToMajorGroup = new Map<string, { major: string, group: string }>();
                studentsSnap.docs.forEach(doc => {
                    const data = doc.data() as UserProfile;
                    if (data.grade && data.section) {
                        const key = `${data.grade}-${data.section}`;
                        if (!gradeSectionToMajorGroup.has(key)) {
                            gradeSectionToMajorGroup.set(key, {
                                major: data.major || '-',
                                group: data.group || '-'
                            });
                        }
                    }
                });

                // Aggregate Data
                const workloadMap = new Map<string, WorkloadRow>();

                assignments.forEach(alloc => {
                    const teacherKey = alloc.teacherId || alloc.teacherName;
                    const teacherName = alloc.teacherName || 'Unknown Teacher';

                    const gradeName = alloc.grade;
                    const sectionName = alloc.section;
                    const subjectName = alloc.subjectName;

                    // Get Major/Group from map
                    const mapping = gradeSectionToMajorGroup.get(`${gradeName}-${sectionName}`);

                    let major = mapping?.major || alloc.major || '-';
                    let group = mapping?.group || '-';

                    if (!workloadMap.has(teacherKey)) {
                        workloadMap.set(teacherKey, {
                            teacherId: teacherKey,
                            teacherName,
                            totalPeriods: 0,
                            details: []
                        });
                    }

                    const row = workloadMap.get(teacherKey)!;
                    const periods = alloc.periodsPerWeek || 0;

                    row.totalPeriods += periods;
                    row.details.push({
                        major,
                        group,
                        grade: gradeName,
                        section: sectionName,
                        subject: subjectName,
                        periods
                    });
                });

                setAllRows(Array.from(workloadMap.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName)));

            } catch (error) {
                console.error("Error fetching workload report:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUserData?.schoolId]);

    // Filter groups based on selected Major
    const filteredGroups = useMemo(() => {
        if (selectedMajor === 'All') return groups;
        const major = majors.find(m => m.name === selectedMajor);
        if (!major) return groups;
        return groups.filter(g => g.majorId === major.id);
    }, [selectedMajor, majors, groups]);

    // Reset selected group when major changes
    useEffect(() => {
        setSelectedGroup('All');
    }, [selectedMajor]);

    const filteredRows = useMemo(() => {
        return allRows.map(row => {
            // Filter details based on selection
            const filteredDetails = row.details.filter(detail => {
                const majorMatch = selectedMajor === 'All' || detail.major === selectedMajor;
                const groupMatch = selectedGroup === 'All' || detail.group === selectedGroup;
                return majorMatch && groupMatch;
            });

            // Recalculate total periods for filtered details
            const newTotal = filteredDetails.reduce((sum, d) => sum + d.periods, 0);

            return {
                ...row,
                totalPeriods: newTotal,
                details: filteredDetails
            };
        }).filter(row => row.details.length > 0); // Only show teachers with matching assignments
    }, [allRows, selectedMajor, selectedGroup]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <Loader />;

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="space-y-6 p-6">
            <style>{`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Inter', sans-serif; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .card { border: none !important; shadow: none !important; padding: 0 !important; }
                    .table-container { border: none !important; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background-color: #f3f4f6 !important; color: #111827 !important; font-weight: 800 !important; border: 1px solid #e5e7eb; padding: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
                    td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; }
                    tr { break-inside: avoid; }
                    .detail-row { border-bottom: 1px solid #f3f4f6; }
                    .detail-row:last-child { border-bottom: none; }
                }
            `}</style>

            {/* Print Header */}
            <div className="hidden print:block mb-8">
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-black uppercase tracking-wide">Teacher Workload Report</h1>
                        <p className="text-sm text-gray-600 mt-1">Academic Year: {currentUserData?.academicYear || 'Current'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">Generated on: {currentDate}</p>
                        {(selectedMajor !== 'All' || selectedGroup !== 'All') && (
                            <p className="text-xs text-gray-500 mt-1">
                                Filters: {selectedMajor !== 'All' ? `Major: ${selectedMajor}` : ''} {selectedGroup !== 'All' ? `Group: ${selectedGroup}` : ''}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Teacher Workload Report</h1>
                    <p className="text-muted-foreground">Detailed view of teacher allocations and total periods.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="border rounded p-2"
                        value={selectedMajor}
                        onChange={(e) => setSelectedMajor(e.target.value)}
                    >
                        <option value="All">All Majors</option>
                        {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>

                    <select
                        className="border rounded p-2"
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                    >
                        <option value="All">All Groups</option>
                        {filteredGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>

                    <Button onClick={handlePrint} variant="outline">
                        <Printer className="mr-2 h-4 w-4" /> Print Report
                    </Button>
                </div>
            </div>

            <Card className="print:shadow-none print:border-0">
                <CardContent className="pt-6 print:p-0">
                    <div className="rounded-md border overflow-x-auto table-container print:border-0 print:overflow-visible">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold w-[20%]">Teacher Name</TableHead>
                                    <TableHead className="font-bold text-center w-[10%]">Total Periods</TableHead>
                                    <TableHead className="font-bold w-[70%]">
                                        <div className="grid grid-cols-5 gap-2">
                                            <span>Major</span>
                                            <span>Group</span>
                                            <span>Grade - Section</span>
                                            <span>Subject</span>
                                            <span className="text-right">Periods</span>
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No allocations found matching filters.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRows.map((row) => (
                                        <TableRow key={row.teacherId} className="align-top">
                                            <TableCell className="font-medium text-gray-900">{row.teacherName}</TableCell>
                                            <TableCell className="text-center font-bold text-lg text-gray-900">{row.totalPeriods}</TableCell>
                                            <TableCell className="p-0">
                                                <div className="flex flex-col">
                                                    {row.details.map((detail, idx) => (
                                                        <div key={idx} className="grid grid-cols-5 gap-2 text-sm p-2 detail-row items-center hover:bg-gray-50 print:hover:bg-transparent">
                                                            <span className="text-gray-600 truncate" title={detail.major}>{detail.major}</span>
                                                            <span className="text-gray-600 truncate" title={detail.group}>{detail.group}</span>
                                                            <span className="font-medium text-gray-900">{detail.grade} - {detail.section}</span>
                                                            <span className="font-medium text-gray-900 truncate" title={detail.subject}>{detail.subject}</span>
                                                            <span className="text-right font-bold text-gray-900">{detail.periods}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherWorkloadReport;
