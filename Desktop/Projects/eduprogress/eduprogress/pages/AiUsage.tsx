import React, { useState } from 'react';
import { useAiUsagePaginated } from '../hooks/queries/useAiUsagePaginated';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import Button from '../components/ui/Button';

const RobotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V8.25a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 8.25v10.5A2.25 2.25 0 006.75 21z" />
    </svg>
);

const AiUsage: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const { data, isLoading, isError, error, totalPages, totalRecords, pageSize, hasNextPage, hasPrevPage } = useAiUsagePaginated(currentPage);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString();
    };

    const formatNumber = (num: number) => {
        return num.toLocaleString();
    };

    const handleNextPage = () => {
        if (hasNextPage) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (hasPrevPage) setCurrentPage(prev => prev - 1);
    };

    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalRecords);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <RobotIcon />
                        <div>
                            <CardTitle>AI Usage Analytics</CardTitle>
                            <CardDescription>Track AI feature usage across schools</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isError && (
                        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
                            Error loading AI usage data: {error?.message || 'Unknown error'}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading AI usage data...</div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No AI usage data available</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>School Name</TableHead>
                                            <TableHead className="text-right">Tokens Used</TableHead>
                                            <TableHead className="text-right">Requests Count</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map(usage => (
                                            <TableRow key={usage.id}>
                                                <TableCell>{usage.schoolName}</TableCell>
                                                <TableCell className="text-right">{formatNumber(usage.tokensUsed)}</TableCell>
                                                <TableCell className="text-right">{formatNumber(usage.requestsCount)}</TableCell>
                                                <TableCell>{formatDate(usage.date)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Server-Side Pagination Controls */}
                            <div className="mt-6 flex items-center justify-between">
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
                                    <div className="text-2xl font-bold text-blue-900">{formatNumber(totalRecords)}</div>
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

export default AiUsage;
