import React, { useState } from "react";
import { db } from "../services/firebase";
import { doc, updateDoc } from "firebase/firestore";
import Button from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/Card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Input from "../components/ui/Input";
import CreateSchoolModal from "../components/schools/CreateSchoolModal";
import EditSchoolModal from "../components/schools/EditSchoolModal";
import CreateAdminModal from "../components/schools/CreateAdminModal";
import SchoolDetailsModal from "../components/schools/SchoolDetailsModal";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { useSchoolsPaginated } from "../hooks/queries/useSchoolsPaginated";
import { useQueryClient } from "@tanstack/react-query";

const Schools: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading: loading, isError: error, totalPages, totalRecords, pageSize, hasNextPage, hasPrevPage } =
    useSchoolsPaginated(currentPage, searchTerm || undefined);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleViewDetails = (school: any) => {
    setSelectedSchool(school);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (school: any) => {
    setSelectedSchool(school);
    setIsEditModalOpen(true);
  };

  const handleCreateAdmin = (school: any) => {
    setSelectedSchool(school);
    setIsAdminModalOpen(true);
  };

  const handleDelete = (school: any) => {
    setSchoolToDelete(school);
  };

  const handleConfirmDelete = async () => {
    if (!schoolToDelete) return;
    setIsDeleting(true);
    try {
      const schoolRef = doc(db, "schools", schoolToDelete.id);
      await updateDoc(schoolRef, { status: "archived" });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    } catch (err) {
      console.error("Error archiving school: ", err);
      alert("Failed to archive school. You may not have the required permissions.");
    } finally {
      setIsDeleting(false);
      setSchoolToDelete(null);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRecords);

  const SchoolIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-8 h-8 text-muted-foreground"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
      />
    </svg>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Manage Schools</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>Create New School</Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SchoolIcon />
              <div>
                <CardTitle>Schools List</CardTitle>
                <CardDescription>View and manage all schools</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Input
                placeholder="Search by name, email, city, or principal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
                Error loading schools
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading schools...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {totalRecords === 0 ? "No schools available" : "No schools matching your search"}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((school) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.name}</TableCell>
                          <TableCell>{school.email}</TableCell>
                          <TableCell>{school.city || "-"}</TableCell>
                          <TableCell>{school.principalName || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(school)}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(school)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateAdmin(school)}
                              >
                                Admin
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(school)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex} to {endIndex} of {totalRecords} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={!hasPrevPage}
                    >
                      Previous
                    </Button>
                    <div className="px-4 py-2 bg-muted rounded text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Records</div>
                    <div className="text-2xl font-bold text-blue-900">{totalRecords.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Pages</div>
                    <div className="text-2xl font-bold text-green-900">{totalPages}</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Page Size</div>
                    <div className="text-2xl font-bold text-purple-900">{pageSize}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["schools"] });
          setIsCreateModalOpen(false);
        }}
      />

      {selectedSchool && (
        <>
          <EditSchoolModal
            isOpen={isEditModalOpen}
            school={selectedSchool}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedSchool(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["schools"] });
              setIsEditModalOpen(false);
              setSelectedSchool(null);
            }}
          />
          <CreateAdminModal
            isOpen={isAdminModalOpen}
            school={selectedSchool}
            onClose={() => {
              setIsAdminModalOpen(false);
              setSelectedSchool(null);
            }}
            onSuccess={() => {
              setIsAdminModalOpen(false);
              setSelectedSchool(null);
            }}
          />
          <SchoolDetailsModal
            isOpen={isDetailsModalOpen}
            school={selectedSchool}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedSchool(null);
            }}
          />
        </>
      )}

      <ConfirmationModal
        isOpen={!!schoolToDelete}
        title="Archive School"
        message={`Are you sure you want to archive "${schoolToDelete?.name}"? This action can be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSchoolToDelete(null)}
        isLoading={isDeleting}
      />
    </>
  );
};

export default Schools;
