import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { FeeStructure, Payment } from '../../types';
import { Plus, DollarSign, CreditCard, TrendingUp, Search, FileText } from 'lucide-react';

const FinanceDashboard: React.FC = () => {
    const { currentUserData } = useAuth();
    const db = getFirestore();
    const [activeTab, setActiveTab] = useState<'fees' | 'payments'>('fees');
    const [loading, setLoading] = useState(true);

    // Data State
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [students, setStudents] = useState<{ id: string, name: string, grade: string }[]>([]);

    // Modal State
    const [showAddFeeModal, setShowAddFeeModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Forms
    const [newFee, setNewFee] = useState({
        grade: '',
        feeType: '',
        amount: 0,
        dueDate: ''
    });

    const [newPayment, setNewPayment] = useState({
        studentId: '',
        amount: 0,
        paymentMethod: 'cash',
        feeType: '',
        notes: ''
    });

    useEffect(() => {
        if (currentUserData?.schoolId) {
            fetchData();
        }
    }, [currentUserData, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'fees') {
                const q = query(collection(db, 'fee_structures'), where('schoolId', '==', currentUserData?.schoolId));
                const snapshot = await getDocs(q);
                setFeeStructures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure)));
            } else {
                const q = query(collection(db, 'payments'), where('schoolId', '==', currentUserData?.schoolId), orderBy('paymentDate', 'desc'));
                const snapshot = await getDocs(q);
                setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));

                // Also fetch students for the payment form
                const studentsQ = query(collection(db, 'users'), where('schoolId', '==', currentUserData?.schoolId), where('role', 'array-contains', 'student'));
                const studentsSnapshot = await getDocs(studentsQ);
                setStudents(studentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, grade: doc.data().grade })));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserData?.schoolId) return;

        try {
            await addDoc(collection(db, 'fee_structures'), {
                ...newFee,
                schoolId: currentUserData.schoolId,
                academicYear: '2023-2024', // Hardcoded for now, should come from context
                createdAt: Timestamp.now(),
                dueDate: newFee.dueDate ? Timestamp.fromDate(new Date(newFee.dueDate)) : null
            });
            setShowAddFeeModal(false);
            setNewFee({ grade: '', feeType: '', amount: 0, dueDate: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding fee structure:", error);
            alert("Failed to add fee structure");
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserData?.schoolId) return;

        const student = students.find(s => s.id === newPayment.studentId);
        if (!student) return;

        try {
            await addDoc(collection(db, 'payments'), {
                ...newPayment,
                schoolId: currentUserData.schoolId,
                studentName: student.name,
                grade: student.grade,
                paymentDate: Timestamp.now(),
                status: 'completed',
                createdAt: Timestamp.now()
            });
            setShowPaymentModal(false);
            setNewPayment({ studentId: '', amount: 0, paymentMethod: 'cash', feeType: '', notes: '' });
            fetchData();
        } catch (error) {
            console.error("Error recording payment:", error);
            alert("Failed to record payment");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
                    <p className="text-gray-500 mt-1">Manage fees, track payments, and view financial reports.</p>
                </div>
                <div className="flex space-x-4">
                    {activeTab === 'fees' ? (
                        <button
                            onClick={() => setShowAddFeeModal(true)}
                            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Fee Structure
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Record Payment
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Collected</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                ${payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Dues</p>
                            <h3 className="text-2xl font-bold text-gray-900">$0</h3>
                            <p className="text-xs text-gray-400 mt-1">Calculation pending</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-full">
                            <CreditCard className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Today's Collection</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                ${payments
                                    .filter(p => {
                                        const today = new Date();
                                        const pDate = p.paymentDate.toDate();
                                        return pDate.getDate() === today.getDate() &&
                                            pDate.getMonth() === today.getMonth() &&
                                            pDate.getFullYear() === today.getFullYear();
                                    })
                                    .reduce((acc, p) => acc + p.amount, 0)
                                    .toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fees'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('fees')}
                >
                    Fee Structure
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'payments'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('payments')}
                >
                    Payments
                </button>
            </div>

            {/* Content */}
            {activeTab === 'fees' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Grade</th>
                                    <th className="px-6 py-3">Fee Type</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Due Date</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading fees...</td></tr>
                                ) : feeStructures.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No fee structures defined.</td></tr>
                                ) : (
                                    feeStructures.map((fee) => (
                                        <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-gray-900">{fee.grade}</td>
                                            <td className="px-6 py-3 text-gray-600">{fee.feeType}</td>
                                            <td className="px-6 py-3 text-gray-900 font-medium">${fee.amount.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-gray-500">
                                                {fee.dueDate ? fee.dueDate.toDate().toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button className="text-gray-400 hover:text-blue-600">
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Student</th>
                                    <th className="px-6 py-3">Grade</th>
                                    <th className="px-6 py-3">Fee Type</th>
                                    <th className="px-6 py-3">Method</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading payments...</td></tr>
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No payments recorded.</td></tr>
                                ) : (
                                    payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 text-gray-500">{payment.paymentDate.toDate().toLocaleDateString()}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900">{payment.studentName}</td>
                                            <td className="px-6 py-3 text-gray-500">{payment.grade}</td>
                                            <td className="px-6 py-3 text-gray-600">{payment.feeType}</td>
                                            <td className="px-6 py-3 text-gray-500 capitalize">{payment.paymentMethod}</td>
                                            <td className="px-6 py-3 text-green-600 font-medium">+${payment.amount.toLocaleString()}</td>
                                            <td className="px-6 py-3">
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium capitalize">
                                                    {payment.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Fee Modal */}
            {showAddFeeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Add Fee Structure</h2>
                        <form onSubmit={handleAddFee} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                                <select
                                    required
                                    value={newFee.grade}
                                    onChange={e => setNewFee({ ...newFee, grade: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">-- Select Grade --</option>
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                                        <option key={g} value={g}>Grade {g}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Tuition, Transport"
                                    value={newFee.feeType}
                                    onChange={e => setNewFee({ ...newFee, feeType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={newFee.amount}
                                    onChange={e => setNewFee({ ...newFee, amount: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                                <input
                                    type="date"
                                    value={newFee.dueDate}
                                    onChange={e => setNewFee({ ...newFee, dueDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddFeeModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                >
                                    Save Fee
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Record Payment</h2>
                        <form onSubmit={handleRecordPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                                <select
                                    required
                                    value={newPayment.studentId}
                                    onChange={e => setNewPayment({ ...newPayment, studentId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">-- Select Student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                                <select
                                    required
                                    value={newPayment.feeType}
                                    onChange={e => setNewPayment({ ...newPayment, feeType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">-- Select Fee Type --</option>
                                    <option value="Tuition">Tuition</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Uniform">Uniform</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={newPayment.amount}
                                    onChange={e => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                <select
                                    required
                                    value={newPayment.paymentMethod}
                                    onChange={e => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="transfer">Bank Transfer</option>
                                    <option value="check">Check</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                >
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceDashboard;
