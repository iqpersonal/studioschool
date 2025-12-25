import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, orderBy, limit, increment } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { InventoryItem, InventoryCategory, InventoryTransaction, UserProfile } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { Plus, Package, ArrowUpRight, ArrowDownLeft, AlertTriangle, Printer, Search, BarChart2, Trash2, Edit2 } from 'lucide-react';
import InventoryReports from './InventoryReports';
import { QRCodeSVG } from 'qrcode.react';
import QRScannerModal from '../../components/ui/QRScannerModal';
import { Scan } from 'lucide-react';

// Default Categories defined outside component to be available immediately
const DEFAULT_CATEGORIES: InventoryCategory[] = [
    { name: 'General', id: 'general', schoolId: 'system' },
    { name: 'IT Equipment', id: 'it', schoolId: 'system' },
    { name: 'Printers', id: 'printers', schoolId: 'system' },
    { name: 'Ink & Toner', id: 'ink', schoolId: 'system' },
    { name: 'Furniture', id: 'furniture', schoolId: 'system' },
    { name: 'Stationery', id: 'stationery', schoolId: 'system' }
];

const InventoryDashboard: React.FC = () => {
    const { currentUserData } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'transactions' | 'reports'>('overview');
    const [loading, setLoading] = useState(false);

    // Data State
    const [items, setItems] = useState<InventoryItem[]>([]);
    // Initialize with defaults so dropdown is never empty
    const [categories, setCategories] = useState<InventoryCategory[]>(DEFAULT_CATEGORIES);
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [activeLoans, setActiveLoans] = useState<InventoryTransaction[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // New Item State
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        category: 'General',
        quantity: 1,
        status: 'active'
    });

    // Print Label State
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printItem, setPrintItem] = useState<InventoryItem | null>(null);

    const handlePrintClick = (item: InventoryItem) => {
        setPrintItem(item);
        setShowPrintModal(true);
    };

    const handlePrintConfirm = () => {
        window.print();
    };

    // Transaction Form State
    const [transType, setTransType] = useState<'check-out' | 'add-stock' | 'remove-stock'>('check-out');
    const [transItemId, setTransItemId] = useState('');
    const [transUser, setTransUser] = useState('');
    const [transQty, setTransQty] = useState(1);
    const [transNotes, setTransNotes] = useState('');

    // Scanner State
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [scannerMode, setScannerMode] = useState<'transaction' | 'search'>('transaction');

    const handleScanSuccess = (decodedText: string) => {
        console.log("Scanned:", decodedText);
        if (scannerMode === 'transaction') {
            // Find item by ID
            const item = items.find(i => i.id === decodedText);
            if (item) {
                setTransItemId(item.id);
                alert(`Item found: ${item.name}`);
            } else {
                alert("Item not found in inventory.");
            }
        } else if (scannerMode === 'search') {
            setSearchTerm(decodedText);
            setActiveTab('inventory');
            // Optional: Check if item exists and maybe open details or just filter
        }
        setShowScannerModal(false);
    };

    useEffect(() => {
        if (currentUserData?.schoolId) {
            fetchData();
            fetchActiveLoans();
        }
    }, [currentUserData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const schoolId = currentUserData!.schoolId!;

            // Fetch Items
            const itemsQ = query(collection(db, 'inventoryItems'), where('schoolId', '==', schoolId));
            const itemsSnap = await getDocs(itemsQ);
            setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));

            // Fetch Categories
            const catQ = query(collection(db, 'inventoryCategories'), where('schoolId', '==', schoolId));
            const catSnap = await getDocs(catQ);

            const customCats = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryCategory));

            // Merge default and custom categories, avoiding duplicates by name
            const mergedCategories = [...DEFAULT_CATEGORIES];
            customCats.forEach(cat => {
                if (!mergedCategories.some(c => c.name === cat.name)) {
                    mergedCategories.push(cat);
                }
            });

            setCategories(mergedCategories);

            // Fetch Recent Transactions
            const transQ = query(collection(db, 'inventoryTransactions'),
                where('schoolId', '==', schoolId),
                orderBy('date', 'desc'),
                limit(20)
            );
            const transSnap = await getDocs(transQ);
            setTransactions(transSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction)));

            // Fetch Users (for selection)
            const usersQ = query(collection(db, 'users'), where('schoolId', '==', schoolId));
            const usersSnap = await getDocs(usersQ);
            const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
            // Filter for relevant roles (students, teachers, staff)
            const relevantUsers = allUsers.filter(u => {
                if (!u.role) return false;
                const roles = Array.isArray(u.role) ? u.role : [u.role];
                return roles.some(r => ['student', 'teacher', 'head-of-section', 'academic-director'].includes(r as any));
            });
            setUsers(relevantUsers);

        } catch (error) {
            console.error("Error fetching inventory:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveLoans = async () => {
        if (!currentUserData?.schoolId) return;
        try {
            const loansQ = query(collection(db, 'inventoryTransactions'),
                where('schoolId', '==', currentUserData.schoolId),
                where('type', '==', 'check-out'),
                where('returnedDate', '==', null)
            );
            const loansSnap = await getDocs(loansQ);
            setActiveLoans(loansSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction)));
        } catch (error) {
            console.error("Error fetching active loans:", error);
        }
    };

    const handleSaveItem = async () => {
        console.log("handleSaveItem called", newItem);
        console.log("User Role:", currentUserData?.role);

        if (!currentUserData?.schoolId) {
            console.error("No school ID found in currentUserData");
            alert("Session error. Please refresh the page.");
            return;
        }

        if (!newItem.name || !newItem.category) {
            console.warn("Validation failed: Name or Category missing", newItem);
            alert("Please fill in Item Name and Category");
            return;
        }

        try {
            let finalCategory = newItem.category;

            // Handle Custom Category
            if (newItem.category === 'Other') {
                if (!customCategory) {
                    alert("Please enter a category name");
                    return;
                }
                finalCategory = customCategory;

                // Save new category if it doesn't exist
                const exists = categories.some(c => c.name.toLowerCase() === customCategory.toLowerCase());
                if (!exists) {
                    await addDoc(collection(db, 'inventoryCategories'), {
                        schoolId: currentUserData!.schoolId,
                        name: customCategory
                    });
                }
            }

            const itemData: any = {
                ...newItem,
                category: finalCategory,
                schoolId: currentUserData!.schoolId,
                availableQuantity: newItem.quantity, // Default for new items
                updatedAt: serverTimestamp()
            };

            if (editingItem) {
                // Validation: Ensure we don't reduce quantity below what's checked out
                const checkedOutCount = editingItem.quantity - editingItem.availableQuantity;
                if ((newItem.quantity || 0) < checkedOutCount) {
                    alert(`Cannot reduce quantity below ${checkedOutCount} because items are currently checked out.`);
                    return;
                }

                const quantityDiff = (newItem.quantity || 0) - editingItem.quantity;
                itemData.availableQuantity = editingItem.availableQuantity + quantityDiff;

                await updateDoc(doc(db, 'inventoryItems', editingItem.id), itemData);
            } else {
                // Create new item
                itemData.createdAt = serverTimestamp();
                itemData.availableQuantity = newItem.quantity;
                await addDoc(collection(db, 'inventoryItems'), itemData);
            }

            handleCloseModal();
            fetchData();
        } catch (error) {
            console.error("Error saving item:", error);
        }
    };

    const handleEditClick = (item: InventoryItem) => {
        setEditingItem(item);
        setNewItem({ ...item });
        setShowAddItemModal(true);
    };

    const handleDeleteClick = async (itemId: string) => {
        if (window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, 'inventoryItems', itemId));
                fetchData();
            } catch (error) {
                console.error("Error deleting item:", error);
            }
        }
    };

    const handleCloseModal = () => {
        setShowAddItemModal(false);
        setEditingItem(null);
        setNewItem({ category: 'General', quantity: 1, status: 'active' });
        setCustomCategory('');
    };

    const handleTransactionSubmit = async () => {
        if (!transItemId || !transQty) return;

        const selectedItem = items.find(i => i.id === transItemId);
        if (!selectedItem) return;

        try {
            const batch = writeBatch(db);
            const itemRef = doc(db, 'inventoryItems', transItemId);
            const transRef = doc(collection(db, 'inventoryTransactions'));

            let newAvailable = selectedItem.availableQuantity;
            let newTotal = selectedItem.quantity;

            if (transType === 'check-out') {
                if (selectedItem.availableQuantity < transQty) {
                    alert("Insufficient available quantity!");
                    return;
                }
                newAvailable -= transQty;
            } else if (transType === 'add-stock') {
                newTotal += transQty;
                newAvailable += transQty;
            } else if (transType === 'remove-stock') {
                newTotal -= transQty;
                newAvailable -= transQty; // Assuming we remove from available
            }

            // Update Item
            batch.update(itemRef, {
                quantity: newTotal,
                availableQuantity: newAvailable,
                updatedAt: serverTimestamp()
            });

            // Create Transaction
            batch.set(transRef, {
                schoolId: currentUserData!.schoolId,
                itemId: transItemId,
                itemName: selectedItem.name,
                userId: transUser, // Selected User ID
                userName: users.find(u => u.uid === transUser)?.name || 'Unknown', // Get Name from ID
                type: transType,
                quantity: transQty,
                date: serverTimestamp(),
                returnedDate: null,
                notes: transNotes,
                performedBy: currentUserData!.uid
            });

            await batch.commit();

            // Reset Form
            setTransItemId('');
            setTransUser('');
            setTransQty(1);
            setTransNotes('');

            // Refresh Data
            fetchData();
            fetchActiveLoans();
            alert("Transaction successful!");
        } catch (error) {
            console.error("Error processing transaction:", error);
            alert("Error processing transaction");
        }
    };

    const handleReturnItem = async (loan: InventoryTransaction) => {
        if (!window.confirm(`Return ${loan.quantity} x ${loan.itemName}?`)) return;

        try {
            const batch = writeBatch(db);
            const itemRef = doc(db, 'inventoryItems', loan.itemId);
            const loanRef = doc(db, 'inventoryTransactions', loan.id);
            const returnTransRef = doc(collection(db, 'inventoryTransactions'));

            // 1. Update Loan Record (mark as returned)
            batch.update(loanRef, {
                returnedDate: serverTimestamp()
            });

            // 2. Update Item Stock (increase available)
            // We need to fetch latest item state to be safe, but for now using current state from list
            // Ideally we should use a transaction or increment
            batch.update(itemRef, {
                availableQuantity: increment(loan.quantity),
                updatedAt: serverTimestamp()
            });

            // 3. Create a "Check-in" transaction log for history
            batch.set(returnTransRef, {
                schoolId: currentUserData!.schoolId,
                itemId: loan.itemId,
                itemName: loan.itemName,
                userId: loan.userId,
                userName: loan.userName,
                type: 'check-in',
                quantity: loan.quantity,
                date: serverTimestamp(),
                notes: `Returned from loan ${loan.id}`,
                performedBy: currentUserData!.uid
            });

            await batch.commit();
            fetchData();
            fetchActiveLoans();
        } catch (error) {
            console.error("Error returning item:", error);
        }
    };

    // --- RENDER HELPERS ---

    const renderOverview = () => {
        const totalValue = items.reduce((sum, item) => sum + (item.value * item.quantity || 0), 0);
        const lowStockItems = items.filter(i => i.reorderPoint && i.availableQuantity <= i.reorderPoint);
        const outOfStockItems = items.filter(i => i.availableQuantity === 0);

        return (
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Asset Value</p>
                                    <h3 className="text-2xl font-bold">${totalValue.toLocaleString()}</h3>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full text-green-600">
                                    <BarChart2 className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Items</p>
                                    <h3 className="text-2xl font-bold">{items.length}</h3>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                    <Package className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Low Stock Alerts</p>
                                    <h3 className="text-2xl font-bold text-orange-600">{lowStockItems.length}</h3>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Out of Stock</p>
                                    <h3 className="text-2xl font-bold text-red-600">{outOfStockItems.length}</h3>
                                </div>
                                <div className="p-3 bg-red-100 rounded-full text-red-600">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                    <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {transactions.length === 0 && <p className="text-gray-500 text-center py-4">No recent activity.</p>}
                            {transactions.map(t => (
                                <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-full ${t.type === 'check-out' ? 'bg-orange-100 text-orange-600' : t.type === 'check-in' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                                            {t.type === 'check-out' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-medium">{t.itemName}</p>
                                            <p className="text-xs text-gray-500">
                                                {t.type.toUpperCase()} • {t.userName || 'System'} • {new Date(t.date.seconds * 1000).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-bold">{t.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderInventoryList = () => {
        const filteredItems = items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.modelNumber?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory ? item.category === filterCategory : true;
            return matchesSearch && matchesCategory;
        });

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex space-x-2 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search items, models..."
                                className="pl-10 w-full p-2 border rounded"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={() => { setScannerMode('search'); setShowScannerModal(true); }}>
                            <Scan className="w-4 h-4" />
                        </Button>
                        <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </Select>
                    </div>
                    <Button onClick={() => setShowAddItemModal(true)}><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
                </div>

                <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{item.name}</div>
                                        {item.modelNumber && <div className="text-xs text-gray-500">Model: {item.modelNumber}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-sm font-bold ${item.availableQuantity === 0 ? 'text-red-600' : item.availableQuantity <= (item.reorderPoint || 0) ? 'text-orange-600' : 'text-green-600'}`}>
                                            {item.availableQuantity} / {item.quantity}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEditClick(item)} className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteClick(item.id)} className="text-red-600 hover:text-red-900 mr-3"><Trash2 className="w-4 h-4" /></button>
                                        <button onClick={() => handlePrintClick(item)} className="text-gray-600 hover:text-gray-900"><Printer className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderTransactions = () => {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Transaction Form */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader><CardTitle>New Transaction</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                                <Select value={transType} onChange={e => setTransType(e.target.value as any)}>
                                    <option value="check-out">Check Out (Loan)</option>
                                    <option value="add-stock">Add Stock</option>
                                    <option value="remove-stock">Remove Stock</option>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Select Item</label>
                                <Select value={transItemId} onChange={e => setTransItemId(e.target.value)}>
                                    <option value="">-- Select Item --</option>
                                    {items.map(i => (
                                        <option key={i.id} value={i.id}>
                                            {i.name} ({i.availableQuantity} avail)
                                        </option>
                                    ))}
                                </Select>
                                <div className="mt-1 text-right">
                                    <button
                                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-end w-full"
                                        onClick={() => { setScannerMode('transaction'); setShowScannerModal(true); }}
                                    >
                                        <Scan className="w-3 h-3 mr-1" /> Scan QR Code
                                    </button>
                                </div>
                            </div>

                            {transType === 'check-out' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Assigned To (User)</label>
                                    <Select value={transUser} onChange={e => setTransUser(e.target.value)}>
                                        <option value="">-- Select User --</option>
                                        {users.map(u => (
                                            <option key={u.uid} value={u.uid}>
                                                {u.name} ({Array.isArray(u.role) ? u.role.join(', ') : u.role})
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded"
                                    min="1"
                                    value={transQty}
                                    onChange={e => setTransQty(parseInt(e.target.value))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <textarea
                                    className="w-full p-2 border rounded"
                                    rows={3}
                                    value={transNotes}
                                    onChange={e => setTransNotes(e.target.value)}
                                />
                            </div>

                            <Button className="w-full" onClick={handleTransactionSubmit}>
                                Process Transaction
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Loans List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Active Loans (Checked Out)</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {activeLoans.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-4 text-center text-gray-500 text-sm">No active loans.</td>
                                            </tr>
                                        )}
                                        {activeLoans.map(loan => (
                                            <tr key={loan.id}>
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{loan.itemName}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{loan.userName}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                    {new Date(loan.date.seconds * 1000).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{loan.quantity}</td>
                                                <td className="px-4 py-2 text-right text-sm">
                                                    <Button size="sm" variant="outline" onClick={() => handleReturnItem(loan)}>
                                                        Return
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div >
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
                <div className="flex space-x-2">
                    <Button variant={activeTab === 'overview' ? 'default' : 'outline'} onClick={() => setActiveTab('overview')}>Overview</Button>
                    <Button variant={activeTab === 'inventory' ? 'default' : 'outline'} onClick={() => setActiveTab('inventory')}>Inventory List</Button>
                    <Button variant={activeTab === 'transactions' ? 'default' : 'outline'} onClick={() => setActiveTab('transactions')}>Check In/Out</Button>
                    <Button variant={activeTab === 'reports' ? 'default' : 'outline'} onClick={() => setActiveTab('reports')}>Reports</Button>
                </div>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'inventory' && renderInventoryList()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'reports' && (
                <InventoryReports
                    items={items}
                    schoolId={currentUserData?.schoolId || ''}
                />
            )}

            {/* Add/Edit Item Modal */}
            {showAddItemModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Item Name</label>
                                <input type="text" className="w-full p-2 border rounded" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Category</label>
                                <Select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    <option value="Other">+ Add New Category</option>
                                </Select>
                                {newItem.category === 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Enter new category name"
                                        className="w-full p-2 border rounded mt-2"
                                        value={customCategory}
                                        onChange={e => setCustomCategory(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity</label>
                                <input type="number" className="w-full p-2 border rounded" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reorder Point</label>
                                <input type="number" className="w-full p-2 border rounded" value={newItem.reorderPoint || ''} onChange={e => setNewItem({ ...newItem, reorderPoint: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Location</label>
                                <input type="text" className="w-full p-2 border rounded" value={newItem.location || ''} onChange={e => setNewItem({ ...newItem, location: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Value ($)</label>
                                <input type="number" className="w-full p-2 border rounded" value={newItem.value || ''} onChange={e => setNewItem({ ...newItem, value: parseFloat(e.target.value) })} />
                            </div>

                            {/* IT Specific Fields */}
                            {(newItem.category === 'IT Equipment' || newItem.category === 'Printers' || newItem.category === 'Other') && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Manufacturer</label>
                                        <input type="text" className="w-full p-2 border rounded" value={newItem.manufacturer || ''} onChange={e => setNewItem({ ...newItem, manufacturer: e.target.value })} placeholder="e.g. HP, Dell" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Model Number</label>
                                        <input type="text" className="w-full p-2 border rounded" value={newItem.modelNumber || ''} onChange={e => setNewItem({ ...newItem, modelNumber: e.target.value })} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium mb-1">Serial Number</label>
                                        <input type="text" className="w-full p-2 border rounded" value={newItem.serialNumber || ''} onChange={e => setNewItem({ ...newItem, serialNumber: e.target.value })} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end mt-6 space-x-2">
                            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                            <Button onClick={handleSaveItem}>{editingItem ? 'Update Item' : 'Save Item'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Label Modal */}
            {showPrintModal && printItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:bg-white print:absolute print:inset-0 print:z-auto">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md print:shadow-none print:w-full print:max-w-none">
                        <div className="print:hidden flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Print Label</h2>
                            <button onClick={() => setShowPrintModal(false)} className="text-gray-500 hover:text-gray-700">
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="border-2 border-black p-4 text-center print:border-4 print:p-8">
                            <h3 className="text-lg font-bold mb-2 uppercase">{printItem.name}</h3>
                            <div className="flex justify-center my-4">
                                <QRCodeSVG value={printItem.id} size={150} />
                            </div>
                            <p className="text-sm font-mono mb-1">{printItem.id}</p>
                            <p className="text-xs text-gray-500 uppercase">{printItem.category}</p>
                            <p className="text-xs mt-2 font-semibold">Property of {currentUserData?.schoolId}</p>
                        </div>

                        <div className="print:hidden flex justify-end mt-6 space-x-2">
                            <Button variant="outline" onClick={() => setShowPrintModal(false)}>Cancel</Button>
                            <Button onClick={handlePrintConfirm}><Printer className="w-4 h-4 mr-2" /> Print</Button>
                        </div>
                    </div>

                    {/* Print Styles to hide everything else */}
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            .fixed.inset-0.bg-black.bg-opacity-50 {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                height: 100%;
                                background: white;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                visibility: visible;
                            }
                            .fixed.inset-0.bg-black.bg-opacity-50 * {
                                visibility: visible;
                            }
                            .print\\:hidden {
                                display: none !important;
                            }
                        }
                    `}</style>
                </div>
            )}

            {/* QR Scanner Modal */}
            <QRScannerModal
                isOpen={showScannerModal}
                onClose={() => setShowScannerModal(false)}
                onScanSuccess={handleScanSuccess}
            />
        </div>
    );
};

export default InventoryDashboard;
