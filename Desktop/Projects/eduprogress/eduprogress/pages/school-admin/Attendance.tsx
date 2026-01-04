import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { UserProfile } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Loader from '../../components/ui/Loader';
import { toast } from '../../components/ui/Toast';
import { logAction } from '../../services/audit';

// Phase 3D Step 2: React Query hooks for attendance management
import { useGradesList } from '../../hooks/queries/useGradesList';
import { useSectionsList } from '../../hooks/queries/useSectionsList';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks?: string;
}

const Attendance: React.FC = () => {
  const { currentUserData } = useAuth();
  const { selectedAcademicYear } = useAcademicYear();
  
  // Phase 3D: Use React Query hooks instead of manual fetches
  const { grades, isLoading: gradesLoading } = useGradesList(currentUserData?.schoolId);
  const { sections, isLoading: sectionsLoading } = useSectionsList(currentUserData?.schoolId);
  
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch Students and Existing Attendance
  useEffect(() => {
    if (!currentUserData?.schoolId || !selectedGrade || !selectedSection || !selectedDate) {
      setStudents([]);
      setAttendance({});
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Students for grade/section
        const studentsFirebaseQuery = query(
          collection(db, 'users'),
          where('schoolId', '==', currentUserData.schoolId),
          where('grade', '==', selectedGrade),
          where('section', '==', selectedSection),
          where('role', 'array-contains', 'student')
        );
        const studentsSnap = await getDocs(studentsFirebaseQuery);

        const studentsData = studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setStudents(studentsData);

        // Initialize default attendance (Present)
        const initialAttendance: Record<string, AttendanceRecord> = {};
        studentsData.forEach(s => {
          initialAttendance[s.uid] = {
            studentId: s.uid,
            studentName: s.name,
            status: 'Present',
          };
        });

        // Fetch Existing Attendance for this date
        const attendanceId = `${selectedGrade}-${selectedSection}-${selectedDate}`;
        const attendanceRef = doc(db, 'attendance', attendanceId);
        const attendanceSnap = await getDoc(attendanceRef);

        if (attendanceSnap.exists()) {
          const data = attendanceSnap.data();
          if (data?.records) {
            // Merge existing records
            data.records.forEach((r: AttendanceRecord) => {
              if (initialAttendance[r.studentId]) {
                initialAttendance[r.studentId] = r;
              }
            });
          }
        }

        setAttendance(initialAttendance);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({ title: 'Error', description: 'Failed to load students.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserData?.schoolId, selectedGrade, selectedSection, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleSave = async () => {
    if (!currentUserData?.schoolId || !selectedGrade || !selectedSection || !selectedDate) return;
    setSaving(true);
    try {
      const attendanceId = `${selectedGrade}-${selectedSection}-${selectedDate}`;
      const records = Object.values(attendance);

      await setDoc(doc(db, 'attendance', attendanceId), {
        schoolId: currentUserData.schoolId,
        grade: selectedGrade,
        section: selectedSection,
        date: selectedDate,
        academicYear: selectedAcademicYear,
        records,
        updatedAt: new Date(),
        updatedBy: currentUserData.uid
      });

      if (currentUserData) {
        await logAction(
          currentUserData,
          'SAVE_ATTENDANCE',
          `Saved attendance for Grade ${selectedGrade} - ${selectedSection} on ${selectedDate}`,
          'Attendance',
          attendanceId
        );
      }

      toast({ title: 'Success', description: 'Attendance saved successfully.' });
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast({ title: 'Error', description: 'Failed to save attendance.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Take Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Grade</label>
              <Select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} disabled={gradesLoading}>
                <option value="">Select Grade</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Section</label>
              <Select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={sectionsLoading}>
                <option value="">Select Section</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>

          {loading ? (
            <Loader />
          ) : students.length > 0 ? (
            <div className="mt-6">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Student Name</th>
                      <th className="p-3 text-center font-medium">Status</th>
                      <th className="p-3 text-left font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.uid} className="border-b last:border-0">
                        <td className="p-3">{student.name}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            {(['Present', 'Absent', 'Late', 'Excused'] as AttendanceStatus[]).map(status => (
                              <button
                                key={status}
                                onClick={() => handleStatusChange(student.uid, status)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  attendance[student.uid]?.status === status
                                    ? status === 'Present' ? 'bg-green-100 text-green-700 border-green-200 border'
                                      : status === 'Absent' ? 'bg-red-100 text-red-700 border-red-200 border'
                                        : status === 'Late' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 border'
                                          : 'bg-blue-100 text-blue-700 border-blue-200 border'
                                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <Input
                            placeholder="Optional remarks"
                            className="h-8 text-xs"
                            value={attendance[student.uid]?.remarks || ''}
                            onChange={(e) => setAttendance(prev => ({
                              ...prev,
                              [student.uid]: { ...prev[student.uid], remarks: e.target.value }
                            }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </div>
          ) : (
            selectedGrade && selectedSection && <p className="text-center text-muted-foreground py-8">No students found in this class.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
