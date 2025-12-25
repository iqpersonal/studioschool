import React, { useState } from 'react';
import { InventoryItem, InventoryTransaction } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BarChart2, FileText, AlertTriangle, Clock, User } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface InventoryReportsProps {
    items: InventoryItem[];
    schoolId: string;
}

const InventoryReports: React.FC<InventoryReportsProps> = ({ items, schoolId }) => {
    const [activeReport, setActiveReport] = useState<'stock' | 'low-stock' | 'value' | 'history'>('stock');
    const [fullTransactions, setFullTransactions] = useState<InventoryTransaction[]>([]);
    const [loadingTrans, setLoadingTrans] = useState(false);

    const fetchAllTransactions = async () => {
        if (fullTransactions.length > 0) return;
        setLoadingTrans(true);
        try {
            const q = query(collection(db, 'inventoryTransactions'),
                where('schoolId', '==', schoolId),
                orderBy('date', 'desc'),
                limit(500)
            );
            const snap = await getDocs(q);
            setFullTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction)));
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoadingTrans(false);
        }
    };

    const renderStockReport = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {items.map(item => (
                        <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.location}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {item.availableQuantity} / {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                ${item.value ? item.value.toLocaleString() : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderLowStockReport = () => {
        const lowStock = items.filter(i => i.reorderPoint && i.availableQuantity <= i.reorderPoint);
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {lowStock.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No low stock items.</td></tr>}
                        {lowStock.map(item => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">{item.availableQuantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.reorderPoint}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        Low Stock
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderValueReport = () => {
        const valueByCategory: Record<string, number> = {};
        items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            const val = (item.value || 0) * (item.quantity || 0);
            valueByCategory[cat] = (valueByCategory[cat] || 0) + val;
        });

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Asset Value by Category</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(valueByCategory).map(([cat, val]) => (
                                <div key={cat} className="flex justify-between items-center border-b pb-2">
                                    <span className="font-medium">{cat}</span>
                                    <span className="font-bold">${val.toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200">
                                <span className="font-bold text-lg">Total</span>
                                <span className="font-bold text-lg text-green-600">
                                    ${Object.values(valueByCategory).reduce((a, b) => a + b, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderHistoryReport = () => {
        if (loadingTrans) return <div className="text-center py-4">Loading history...</div>;

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {fullTransactions.map(t => (
                            <tr key={t.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(t.date.seconds * 1000).toLocaleDateString()} {new Date(t.date.seconds * 1000).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${t.type === 'check-out' ? 'bg-orange-100 text-orange-800' :
                                            t.type === 'check-in' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {t.type.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{t.itemName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.userName || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{t.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{t.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex space-x-2 overflow-x-auto pb-2">
                <Button
                    variant={activeReport === 'stock' ? 'default' : 'outline'}
                    onClick={() => setActiveReport('stock')}
                >
                    <FileText className="w-4 h-4 mr-2" /> Current Stock
                </Button>
                <Button
                    variant={activeReport === 'low-stock' ? 'default' : 'outline'}
                    onClick={() => setActiveReport('low-stock')}
                >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Low Stock
                </Button>
                <Button
                    variant={activeReport === 'value' ? 'default' : 'outline'}
                    onClick={() => setActiveReport('value')}
                >
                    <BarChart2 className="w-4 h-4 mr-2" /> Asset Value
                </Button>
                <Button
                    variant={activeReport === 'history' ? 'default' : 'outline'}
                    onClick={() => { setActiveReport('history'); fetchAllTransactions(); }}
                >
                    <Clock className="w-4 h-4 mr-2" /> Transaction History
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {activeReport === 'stock' && 'Current Stock Report'}
                        {activeReport === 'low-stock' && 'Low Stock Alerts'}
                        {activeReport === 'value' && 'Asset Value Report'}
                        {activeReport === 'history' && 'Transaction History'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeReport === 'stock' && renderStockReport()}
                    {activeReport === 'low-stock' && renderLowStockReport()}
                    {activeReport === 'value' && renderValueReport()}
                    {activeReport === 'history' && renderHistoryReport()}
                </CardContent>
            </Card>
        </div>
    );
};

export default InventoryReports;
