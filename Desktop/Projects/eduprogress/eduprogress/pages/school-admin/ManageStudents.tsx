import React, { useState } from "react";
import { db } from "../../services/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useStudentsPaginated } from "../../hooks/queries/useStudentsPaginated";
import { useQueryClient } from "@tanstack/react-query";
import { UserProfile } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react";

const ManageStudents: React.FC = () => {
  const { currentUserData } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  // Fetch students with pagination
  const studentsQuery = useStudentsPaginated({
    schoolId: currentUserData?.schoolId,
    pageNumber: currentPage,
    searchTerm,
    gradeFilter,
    sectionFilter,
  });

  const students = studentsQuery.data?.data || [];
  const totalPages = studentsQuery.data?.totalPages || 1;
  const totalRecords = studentsQuery.data?.totalRecords || 0;
  const isLoading = studentsQuery.isLoading;
  const hasError = studentsQuery.isError;
  const errorMessage = studentsQuery.error?.message;

  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => (p < totalPages ? p + 1 : p));

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleGradeFilter = (value: string) => {
    setGradeFilter(value);
    setCurrentPage(1);
  };

  const handleSectionFilter = (value: string) => {
    setSectionFilter(value);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await deleteDoc(doc(db, "users", studentToDelete.uid));
      
      // Invalidate cache to refresh the list
      await queryClient.invalidateQueries({
        queryKey: ["students-paginated", currentUserData?.schoolId, currentPage, searchTerm, gradeFilter, sectionFilter],
      });
      
      setStudentToDelete(null);
      setRetryAttempts(0);
    } catch (err) {
      console.error("Error deleting student:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to delete student";
      
      // Check if we should retry
      if (retryAttempts < MAX_RETRY_ATTEMPTS) {
        setDeleteError(`${errorMsg}. Retry ${retryAttempts + 1}/${MAX_RETRY_ATTEMPTS}`);
      } else {
        setDeleteError("Failed to delete student after multiple attempts. Please try again later.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryDelete = () => {
    if (retryAttempts < MAX_RETRY_ATTEMPTS) {
      setRetryAttempts(prev => prev + 1);
      handleDeleteConfirm();
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Students</h1>
          <p className="text-muted-foreground">View and manage student accounts.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>Showing {students.length} of {totalRecords} students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <input
                type="text"
                placeholder="Filter by grade..."
                value={gradeFilter}
                onChange={e => handleGradeFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <input
                type="text"
                placeholder="Filter by section..."
                value={sectionFilter}
                onChange={e => handleSectionFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            {/* Content */}
            {isLoading ? (
              <Loader />
            ) : hasError ? (
              <p className="text-destructive text-center py-8">{errorMessage || "Failed to load students"}</p>
            ) : students.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No students found.</p>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Email</th>
                        <th className="px-4 py-3 text-left font-semibold">Grade</th>
                        <th className="px-4 py-3 text-left font-semibold">Section</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {students.map((student) => (
                        <tr key={student.uid} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {student.name} {student.fatherName} {student.familyName}
                            </div>
                            <div className="text-xs text-muted-foreground">{student.studentIdNumber}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{student.email || "-"}</td>
                          <td className="px-4 py-3 text-sm">{student.grade || "-"}</td>
                          <td className="px-4 py-3 text-sm">{student.section || "-"}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              student.status === 'active' ? 'bg-green-100 text-green-800' : 
                              student.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {student.status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" title="Edit">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setStudentToDelete(student);
                                  setRetryAttempts(0);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
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

      {/* Delete Confirmation */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Delete Student?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">
                Are you sure you want to delete <strong>{studentToDelete.name}</strong>? This action cannot be undone.
              </p>
              {deleteError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  {deleteError}
                  {retryAttempts < MAX_RETRY_ATTEMPTS && (
                    <button 
                      onClick={handleRetryDelete}
                      className="ml-2 underline hover:no-underline"
                      disabled={isDeleting}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStudentToDelete(null);
                    setRetryAttempts(0);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;
