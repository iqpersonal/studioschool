import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';

// Reusable component for displaying details
const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-sm text-foreground">{value}</p>
        </div>
    );
};

// Component for a styled icon placeholder
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-muted-foreground">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const formatCurrency = (value?: number | null) => {
    if (typeof value !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(value);
};

const FinancialDetailRow: React.FC<{ label: string; value?: number | null }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-3 px-4 border-b border-border last:border-b-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{formatCurrency(value)}</p>
    </div>
);


const StudentDetails: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const [student, setStudent] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!studentId) {
            setError("No student ID provided.");
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, 'users', studentId),
            (doc) => {
                if (doc.exists()) {
                    setStudent({ uid: doc.id, ...doc.data() } as UserProfile);
                } else {
                    setError("Student not found.");
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching student details:", err);
                setError("Failed to fetch student details.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [studentId]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader /></div>;
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <p className="text-destructive">{error}</p>
                <Button onClick={() => navigate('/students')} className="mt-4">Back to Roster</Button>
            </div>
        );
    }

    if (!student) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm">
                <Link to="/students" className="text-muted-foreground hover:text-foreground">Manage Students</Link>
                <span>/</span>
                <span className="font-semibold">{student.name}</span>
            </div>

            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center shrink-0 border">
                        <UserIcon />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{student.name}</h1>
                        <p className="text-muted-foreground">Student ID: {student.studentIdNumber || 'N/A'}</p>
                    </div>
                </div>
                <Button onClick={() => navigate('/students')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                    Back to Roster
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Academic & Profile Details */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Academic & Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <DetailItem label="Email Address" value={student.email} />
                        <DetailItem label="Academic Year" value={student.academicYear} />
                        <DetailItem label="Major" value={student.major} />
                        <DetailItem label="Group" value={student.group} />
                        <DetailItem label="Grade / Class" value={student.grade} />
                        <DetailItem label="Section" value={student.section} />
                    </CardContent>
                </Card>

                {/* Family Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Family Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem label="Father's Name" value={student.fatherName} />
                        <DetailItem label="Family Name" value={student.familyName} />
                        <DetailItem label="Father's Email" value={student.fatherEmail} />
                        <DetailItem label="Family Username" value={student.familyUsername} />
                        <DetailItem label="Father's Phone 1" value={student.fatherPhone1} />
                        <DetailItem label="Father's Phone 2" value={student.fatherPhone2} />
                        <DetailItem label="Mother's Phone 1" value={student.motherPhone1} />
                    </CardContent>
                </Card>

                {/* Financial Details */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Financial Overview</CardTitle>
                        <CardDescription>A summary of the student's tuition and fee balances.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg border">
                            <FinancialDetailRow label="Open Balance" value={student.openBalance} />
                            <FinancialDetailRow label="Total Tuition Fees" value={student.totalTuitionFees} />
                            <FinancialDetailRow label="Tuition Fees (+VAT)" value={student.totalTuitionFeesVat} />
                            <FinancialDetailRow label="Tuition Fees Balance" value={student.tuitionFeesBalance} />
                            <FinancialDetailRow label="Transportation Fees" value={student.transportation} />
                            <FinancialDetailRow label="Other Fees" value={student.otherFees} />
                        </div>
                        <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                            <p className="text-lg font-bold text-foreground">TOTAL BALANCE</p>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(student.totalBalance)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default StudentDetails;