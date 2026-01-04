import React, { useState } from "react";
import { db } from "../../services/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useTeachersPaginated } from "../../hooks/queries/useTeachersPaginated";
import { useQueryClient } from "@tanstack/react-query";
import { UserProfile } from "../../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react";

const ManageTeachers: React.FC = () => {
  const { currentUserData } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<UserProfile | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  // Fetch teachers with pagination
  const teachersQuery = useTeachersPaginated({
    schoolId: currentUserData?.schoolId,
    pageNumber: currentPage,
    searchTerm,
    departmentFilter,
  });

  const teachers = teachersQuery.data?.data || [];
  const totalPages = teachersQuery.data?.totalPages || 1;
  const totalRecords = teachersQuery.data?.totalRecords || 0;
  const isLoading = teachersQuery.isLoading;
  const hasError = teachersQuery.isError;
  const errorMessage = teachersQuery.error?.message;

  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => (p < totalPages ? p + 1 : p));

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (value: string) => {
    setDepartmentFilter(value);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await deleteDoc(doc(db, "users", teacherToDelete.uid));
      
      // Invalidate cache to refresh the list
      await queryClient.invalidateQueries({
        queryKey: ["teachers-paginated", currentUserData?.schoolId, currentPage, searchTerm, departmentFilter],
      });
      
      setTeacherToDelete(null);
      setRetryAttempts(0);
    } catch (err) {
      console.error("Error deleting teacher:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to delete teacher";
      
      // Check if we should retry
      if (retryAttempts < MAX_RETRY_ATTEMPTS) {
        setDeleteError(`${errorMsg}. Retry ${retryAttempts + 1}/${MAX_RETRY_ATTEMPTS}`);
      } else {
        setDeleteError("Failed to delete teacher after multiple attempts. Please try again later.");
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
          <h1 className="text-3xl font-bold tracking-tight">Manage Teachers</h1>
          <p className="text-muted-foreground">View and manage teacher accounts.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Teacher List</CardTitle>
          <CardDescription>Showing {teachers.length} of {totalRecords} teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
              <input
                type="text"
                placeholder="Filter by department..."
                value={departmentFilter}
                onChange={e => handleDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>

            {/* Content */}
            {isLoading ? (
              <Loader />
            ) : hasError ? (
              <p className="text-destructive text-center py-8">{errorMessage || "Failed to load teachers"}</p>
            ) : teachers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No teachers found.</p>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Email</th>
                        <th className="px-4 py-3 text-left font-semibold">Department</th>
                        <th className="px-4 py-3 text-left font-semibold">Phone</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {teachers.map((teacher) => (
                        <tr key={teacher.uid} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {teacher.name} {teacher.fatherName} {teacher.familyName}
                            </div>
                            <div className="text-xs text-muted-foreground">{teacher.employeeId}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{teacher.email || "-"}</td>
                          <td className="px-4 py-3 text-sm">{teacher.department || "-"}</td>
                          <td className="px-4 py-3 text-sm">{teacher.phoneNumber || "-"}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              teacher.status === 'active' ? 'bg-green-100 text-green-800' : 
                              teacher.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {teacher.status || 'unknown'}
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
                                  setTeacherToDelete(teacher);
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
      {teacherToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Delete Teacher?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">
                Are you sure you want to delete <strong>{teacherToDelete.name}</strong>? This action cannot be undone.
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
                    setTeacherToDelete(null);
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

export default ManageTeachers;
