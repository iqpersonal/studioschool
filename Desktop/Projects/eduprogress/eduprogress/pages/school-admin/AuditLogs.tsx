import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import { AuditLogEntry } from '../../services/audit';

const AuditLogs: React.FC = () => {
    const { currentUserData } = useAuth();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUserData?.schoolId) return;

        const fetchLogs = async () => {
            try {
                const q = query(collection(db, 'auditLogs'),
                    where('schoolId', '==', currentUserData.schoolId),
                    orderBy('timestamp', 'desc'),
                    limit(50)
                );
                const snapshot = await getDocs(q);

                const logsData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        timestamp: data.timestamp.toDate() // Convert Firestore Timestamp to Date
                    } as AuditLogEntry;
                });
                setLogs(logsData);
            } catch (error) {
                console.error("Error fetching audit logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [currentUserData?.schoolId]);

    if (loading) return <Loader />;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="p-3 text-left font-medium">Time</th>
                                    <th className="p-3 text-left font-medium">Action</th>
                                    <th className="p-3 text-left font-medium">User</th>
                                    <th className="p-3 text-left font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length > 0 ? (
                                    logs.map((log, index) => (
                                        <tr key={index} className="border-b last:border-0">
                                            <td className="p-3 text-muted-foreground">
                                                {log.timestamp.toLocaleString()}
                                            </td>
                                            <td className="p-3 font-medium">{log.action}</td>
                                            <td className="p-3">
                                                {log.performedBy.name} <span className="text-xs text-muted-foreground">({Array.isArray(log.performedBy.role) ? log.performedBy.role.join(', ') : log.performedBy.role})</span>
                                            </td>
                                            <td className="p-3">{log.details}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                                            No logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AuditLogs;
