import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/Card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuditLogsPaginated } from "../hooks/queries/useAuditLogsPaginated";
import { toast } from "../components/ui/Toast";

const AuditLogs: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const { data, isLoading, isError, error, totalPages, totalRecords, pageSize, hasNextPage, hasPrevPage } = useAuditLogsPaginated(
    currentPage,
    searchTerm || undefined,
    filterAction || undefined
  );

  const handleExport = () => {
    try {
      const headers = ["Timestamp", "Action", "Details", "User Name", "Resource", "Resource ID", "Status", "IP Address"];
      const rows = data.map(log => [
        new Date(log.timestamp?.seconds * 1000 || log.timestamp).toLocaleString(),
        log.action,
        log.details,
        log.userName,
        log.resource,
        log.resourceId,
        log.status,
        log.ipAddress
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => {
          const str = String(cell);
          if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
            return "\"" + str.replace(/"/g, "\"\"") + "\"";
          }
          return str;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = "audit-logs-" + new Date().toISOString().split("T")[0] + ".csv";
      link.click();
      toast.success("Audit logs exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export audit logs.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate?.() || new Date(timestamp.seconds * 1000 || timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
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

  // Reset to page 1 when search/filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction]);

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>System activity and user actions</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
               Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Search by action, user, details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
            </div>
          </div>

          {isError && (
            <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
              Error loading audit logs: {error?.message || "Unknown error"}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {totalRecords === 0 ? "No audit logs available" : "No logs matching your search"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>User Name</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{formatDate(log.timestamp)}</TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="text-sm">{log.details || "-"}</TableCell>
                        <TableCell>{log.userName}</TableCell>
                        <TableCell>{log.resource || "-"}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded text-xs font-medium">
                            {log.status || "unknown"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Server-Side Pagination Controls */}
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

              {/* Summary Stats */}
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
  );
};

export default AuditLogs;

