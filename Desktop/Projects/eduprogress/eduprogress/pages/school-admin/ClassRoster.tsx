import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db } from "../../services/firebase";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { UserProfile, TeacherAssignment, ProgressReport } from "../../types";
import { useTeacherAssignments } from "../../hooks/queries/useTeacherAssignments";
import { useClassRosterStudents } from "../../hooks/queries/useClassRosterStudents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import AssignTeacherModal from "../../components/assignments/AssignTeacherModal";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClassRoster: React.FC = () => {
  const { grade, section } = useParams<{ grade: string; section: string }>();
  const navigate = useNavigate();
  const { currentUserData } = useAuth();

  const decodedGrade = grade ? decodeURIComponent(grade) : "";
  const decodedSection = section ? decodeURIComponent(section) : "";
  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<TeacherAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<TeacherAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [classReports, setClassReports] = useState<ProgressReport[]>([]);
  const [reportError, setReportError] = useState<string | null>(null);

  // Phase 3D Step 3: Use React Query hooks (replaced dynamic import)
  const assignmentsQuery = useTeacherAssignments({
    schoolId: currentUserData?.schoolId,
  });

  const studentsQuery = useClassRosterStudents({
    schoolId: currentUserData?.schoolId,
    grade: decodedGrade,
    section: decodedSection,
  });

  // Filter assignments for this specific grade/section
  const classAssignments = (assignmentsQuery.data || []).filter(
    a => a.grade === decodedGrade && a.section === decodedSection
  );

  // Fetch progress reports (kept as side effect since it's status-only data)
  React.useEffect(() => {
    const fetchReports = async () => {
      if (!currentUserData?.schoolId || !decodedGrade || !decodedSection) return;

      try {
        const reportsQuery = query(
          collection(db, "progressReports"),
          where("schoolId", "==", currentUserData.schoolId),
          where("grade", "==", decodedGrade),
          where("section", "==", decodedSection)
        );
        const reportsSnap = await getDocs(reportsQuery);
        setClassReports(
          reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ProgressReport)
        );
      } catch (err) {
        console.error("Error fetching reports:", err);
        setReportError("Failed to fetch progress reports.");
      }
    };

    fetchReports();
  }, [currentUserData?.schoolId, decodedGrade, decodedSection]);

  // Combined loading/error state
  const isLoading = studentsQuery.isLoading || assignmentsQuery.isLoading;
  const hasError = studentsQuery.isError || assignmentsQuery.isError;
  const errorMessage = studentsQuery.error?.message || assignmentsQuery.error?.message;

  // Filter students based on search
  const allStudents = studentsQuery.data || [];
  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      const fullName = `${student.name || ""} ${student.fatherName || ""} ${student.familyName || ""}`.toLowerCase();
      const email = (student.email || "").toLowerCase();
      const studentId = (student.studentIdNumber || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return fullName.includes(search) || email.includes(search) || studentId.includes(search);
    });
  }, [allStudents, searchTerm]);

  // Pagination logic
  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Report status map
  const studentReportStatus = useMemo(() => {
    const statusMap = new Map<string, boolean>();
    classReports.forEach(report => {
      if (report.entries && Object.keys(report.entries).length > 0) {
        statusMap.set(report.studentId, true);
      }
    });
    return statusMap;
  }, [classReports]);

  const handleOpenCreateModal = () => {
    setAssignmentToEdit(null);
    setIsAssignmentModalOpen(true);
  };

  const handleOpenEditModal = (assignment: TeacherAssignment) => {
    setAssignmentToEdit(assignment);
    setIsAssignmentModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "teacherAssignments", assignmentToDelete.id));
    } catch (err) {
      console.error("Error deleting assignment", err);
      alert("Failed to remove assignment.");
    } finally {
      setIsDeleting(false);
      setAssignmentToDelete(null);
    }
  };

  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => (p < totalPages ? p + 1 : p));

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-sm">
          <Link to="/grades-sections" className="text-muted-foreground hover:text-foreground">Grades & Sections</Link>
          <span>/</span>
          <span className="font-semibold">Class Roster</span>
        </div>

        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{decodedGrade} - {decodedSection}</h1>
            <p className="text-muted-foreground">Manage students and assigned teachers.</p>
          </div>
          <Button onClick={() => navigate("/grades-sections")}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Back to Grades & Sections
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Class Roster</CardTitle>
                <CardDescription>{allStudents.length} student(s) in this class.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                  {isLoading ? (
                    <Loader />
                  ) : hasError ? (
                    <p className="text-destructive text-center">{errorMessage || "Failed to load students"}</p>
                  ) : filteredStudents.length === 0 ? (
                    <p className="text-muted-foreground text-center">No students found.</p>
                  ) : (
                    <>
                      <ul className="divide-y divide-border">
                        {paginatedStudents.map((student, index) => {
                          const hasReport = studentReportStatus.get(student.uid);
                          const studentName = `${student.name || ""} ${student.fatherName || ""} ${student.familyName || ""}`.trim();
                          return (
                            <li key={student.uid || index} className="py-3 px-1 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Link
                                  to={`/progress-reports/${encodeURIComponent(decodedGrade)}/${encodeURIComponent(decodedSection)}/${student.uid}/${encodeURIComponent(currentMonth)}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {studentName}
                                </Link>
                                {hasReport && <CheckCircleIcon />}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages} ({filteredStudents.length} total)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assigned Teachers</CardTitle>
                    <CardDescription>Teachers for this class.</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleOpenCreateModal}>Assign Staff</Button>
                </div>
              </CardHeader>
              <CardContent>
                {assignmentsQuery.isLoading ? (
                  <Loader size="sm" />
                ) : (
                  <div className="space-y-2">
                    {classAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
                    ) : (
                      classAssignments.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                          <div>
                            <p className="text-sm font-medium">{assignment.teacherName}</p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.subjectName}
                              {assignment.periodsPerWeek ? ` (${assignment.periodsPerWeek} period(s)/week)` : ""}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(assignment)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => setAssignmentToDelete(assignment)}>Remove</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {currentUserData?.schoolId && (
        <AssignTeacherModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          onSuccess={() => setIsAssignmentModalOpen(false)}
          schoolId={currentUserData.schoolId}
          grade={decodedGrade}
          section={decodedSection}
          assignmentToEdit={assignmentToEdit}
        />
      )}
      {assignmentToDelete && (
        <ConfirmationModal
          isOpen={!!assignmentToDelete}
          onClose={() => setAssignmentToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Remove Assignment?"
          message={
            <p>
              Are you sure you want to remove <strong>{assignmentToDelete.teacherName}</strong> from this class for
              the subject of <strong>{assignmentToDelete.subjectName}</strong>?
            </p>
          }
          confirmText="Yes, Remove"
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default ClassRoster;
