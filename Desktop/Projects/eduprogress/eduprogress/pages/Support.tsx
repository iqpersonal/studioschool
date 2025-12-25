import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { SupportTicket, School } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/Table';
import Button from '../components/ui/Button';
import ViewTicketModal from '../components/support/ViewTicketModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';

const Support: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const schoolsSnapshot = await getDocs(collection(db, 'schools'));
        const schoolsMap = new Map<string, string>();
        schoolsSnapshot.forEach(doc => {
          const school = doc.data() as Omit<School, 'id'>;
          schoolsMap.set(doc.id, school.name);
        });

        const ticketsSnapshot = await getDocs(query(collection(db, 'tickets'), orderBy('createdAt', 'desc')));
        const ticketsData = ticketsSnapshot.docs.map(doc => {
          const ticket = { id: doc.id, ...doc.data() } as SupportTicket;
          return {
            ...ticket,
            schoolName: schoolsMap.get(ticket.schoolId) || 'Unknown School'
          };
        });
        setTickets(ticketsData);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch support tickets.');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const getPriorityChip = (priority: 'low' | 'medium' | 'high') => {
    const styles = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      high: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`capitalize text-xs font-medium px-2 py-1 rounded-full ${styles[priority]}`}>{priority}</span>;
  };

  const renderTableContent = (status: 'open' | 'pending' | 'resolved') => {
    const filteredTickets = tickets.filter(ticket => ticket.status === status);
    return (
      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}>Loading tickets...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="text-destructive">{error}</TableCell></TableRow>
            ) : filteredTickets.length === 0 ? (
              <TableRow><TableCell colSpan={5}>No {status} tickets found.</TableCell></TableRow>
            ) : (
              filteredTickets.map(ticket => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.schoolName}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>{getPriorityChip(ticket.priority)}</TableCell>
                  <TableCell>{ticket.createdAt.toDate().toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTicket(ticket)}>View Details</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
        <Card>
          <CardHeader>
            <CardTitle>Support Queue</CardTitle>
            <CardDescription>
              View, assign, and resolve support tickets from school administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* FIX: Refactored to use Tabs with TabsContent for proper uncontrolled component usage. */}
            <Tabs defaultValue="open">
              <TabsList>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
              <TabsContent value="open">
                {renderTableContent('open')}
              </TabsContent>
              <TabsContent value="pending">
                {renderTableContent('pending')}
              </TabsContent>
              <TabsContent value="resolved">
                {renderTableContent('resolved')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      {selectedTicket && (
        <ViewTicketModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          ticket={selectedTicket}
        />
      )}
    </>
  );
};

export default Support;