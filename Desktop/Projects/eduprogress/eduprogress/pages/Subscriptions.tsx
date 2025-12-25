import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscriptionsPaginated } from "../hooks/queries/useSubscriptionsPaginated";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/Card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import CreateEditSubscriptionModal from "../components/subscriptions/CreateEditSubscriptionModal";
import { toast } from "../components/ui/Toast";

const Subscriptions: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any | null>(null);

  const { data, isLoading: loading, isError, error, totalPages, totalRecords, pageSize, hasNextPage, hasPrevPage } = 
    useSubscriptionsPaginated(currentPage, searchTerm || undefined, statusFilter || undefined);

  const handleOpenModal = (sub: any) => {
    setSelectedSubscription(sub);
    setIsModalOpen(true);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const headers = ["School Name", "Plan", "Status", "Start Date", "Expiry Date", "Amount"];
      
      const rows = data.map(sub => [
        sub.schoolName,
        sub.planName,
        sub.status,
        new Date(sub.startDate?.seconds * 1000 || sub.startDate).toLocaleDateString(),
        new Date(sub.expiryDate?.seconds * 1000 || sub.expiryDate).toLocaleDateString(),
        sub.amount
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => {
          const str = String(cell);
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = "subscriptions-" + new Date().toISOString().split("T")[0] + ".csv";
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Subscriptions exported successfully!" });
    } catch (err) {
      console.error("Export failed:", err);
      toast({ title: "Error", description: "Failed to export subscriptions", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const getStatusChip = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      expiring: "bg-yellow-100 text-yellow-800",
      expired: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    const statusClass = styles[status] || styles.inactive;
    const fullClass = "capitalize text-xs font-medium px-2 py-1 rounded-full " + statusClass;
    return <span className={fullClass}>{status}</span>;
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscriptions Management</CardTitle>
              <CardDescription>Manage school subscriptions and plans</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setSelectedSubscription(null); setIsModalOpen(true); }} variant="default" size="sm">
                New Subscription
              </Button>
              <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={exporting}>
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Search by school or plan name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="expiring">Expiring</option>
              </select>
            </div>
          </div>

          {isError && (
            <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
              Error loading subscriptions: {error?.message || "Unknown error"}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading subscriptions...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {totalRecords === 0 ? "No subscriptions available" : "No subscriptions matching your search"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.schoolName}</TableCell>
                        <TableCell>{sub.planName}</TableCell>
                        <TableCell>{getStatusChip(sub.status)}</TableCell>
                        <TableCell>{sub.currency} {sub.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(sub.startDate?.seconds * 1000 || sub.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(sub.expiryDate?.seconds * 1000 || sub.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(sub)}>
                            Edit
                          </Button>
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
                  <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={!hasPrevPage}>
                    Previous
                  </Button>
                  <div className="px-4 py-2 bg-muted rounded text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasNextPage}>
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

      <CreateEditSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSubscription(null);
        }}
        subscription={selectedSubscription}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
          setIsModalOpen(false);
          setSelectedSubscription(null);
        }}
      />
    </div>
  );
};

export default Subscriptions;
