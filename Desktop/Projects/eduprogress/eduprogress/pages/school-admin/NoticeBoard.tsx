import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Loader from '../../components/ui/Loader';
import { toast } from '../../components/ui/Toast';
import { Trash2, Plus, Edit2, X } from 'lucide-react';
import { logAction } from '../../services/audit';

interface Notice {
    id: string;
    title: string;
    content: string;
    date: any; // Firestore Timestamp
    authorId: string;
    schoolId: string;
    targetAudience: 'all' | 'teachers' | 'students';
    priority: 'normal' | 'high';
}

const NoticeBoard: React.FC = () => {
    const { currentUserData } = useAuth();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentNotice, setCurrentNotice] = useState<Partial<Notice>>({
        targetAudience: 'all',
        priority: 'normal'
    });

    useEffect(() => {
        if (!currentUserData?.schoolId) return;

        const q = query(
            collection(db, 'notices'),
            where('schoolId', '==', currentUserData.schoolId),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, snapshot => {
            const noticesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notice));
            setNotices(noticesData);
            setLoading(false);
        }, error => {
            console.error("Error fetching notices:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserData?.schoolId]);

    const handleSave = async () => {
        if (!currentNotice.title || !currentNotice.content || !currentUserData?.schoolId) {
            toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
            return;
        }

        try {
            const noticeData = {
                ...currentNotice,
                schoolId: currentUserData.schoolId,
                authorId: currentUserData.uid,
                date: currentNotice.date || new Date(),
                updatedAt: new Date()
            };

            if (currentNotice.id) {
                await updateDoc(doc(db, 'notices', currentNotice.id), noticeData);
                await logAction(currentUserData, 'UPDATE_NOTICE', `Updated notice: ${currentNotice.title}`, 'Notice', currentNotice.id);
                toast({ title: "Success", description: "Notice updated successfully." });
            } else {
                const docRef = await addDoc(collection(db, 'notices'), noticeData);
                await logAction(currentUserData, 'CREATE_NOTICE', `Created notice: ${currentNotice.title}`, 'Notice', docRef.id);
                toast({ title: "Success", description: "Notice created successfully." });
            }
            setIsEditing(false);
            setCurrentNotice({ targetAudience: 'all', priority: 'normal' });
        } catch (error) {
            console.error("Error saving notice:", error);
            toast({ title: "Error", description: "Failed to save notice.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm("Are you sure you want to delete this notice?")) return;
        try {
            await deleteDoc(doc(db, 'notices', id));
            if (currentUserData) {
                await logAction(currentUserData, 'DELETE_NOTICE', `Deleted notice: ${title}`, 'Notice', id);
            }
            toast({ title: "Success", description: "Notice deleted successfully." });
        } catch (error) {
            console.error("Error deleting notice:", error);
            toast({ title: "Error", description: "Failed to delete notice.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Notice Board</h1>
                <Button onClick={() => {
                    setCurrentNotice({ targetAudience: 'all', priority: 'normal' });
                    setIsEditing(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" /> New Notice
                </Button>
            </div>

            {isEditing && (
                <Card className="mb-6 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle>{currentNotice.id ? 'Edit Notice' : 'New Notice'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Title</label>
                            <Input
                                value={currentNotice.title || ''}
                                onChange={e => setCurrentNotice({ ...currentNotice, title: e.target.value })}
                                placeholder="Notice Title"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Content</label>
                            <textarea
                                className="w-full p-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                rows={4}
                                value={currentNotice.content || ''}
                                onChange={e => setCurrentNotice({ ...currentNotice, content: e.target.value })}
                                placeholder="Write your announcement here..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Target Audience</label>
                                <select
                                    className="w-full p-2 rounded-md border border-input bg-background text-sm"
                                    value={currentNotice.targetAudience}
                                    onChange={e => setCurrentNotice({ ...currentNotice, targetAudience: e.target.value as any })}
                                >
                                    <option value="all">All Users</option>
                                    <option value="teachers">Teachers Only</option>
                                    <option value="students">Students Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Priority</label>
                                <select
                                    className="w-full p-2 rounded-md border border-input bg-background text-sm"
                                    value={currentNotice.priority}
                                    onChange={e => setCurrentNotice({ ...currentNotice, priority: e.target.value as any })}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="high">High Priority</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save Notice</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? <Loader /> : (
                <div className="grid gap-4">
                    {notices.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No notices posted yet.</p>
                    ) : (
                        notices.map(notice => (
                            <Card key={notice.id} className={`transition-all hover:shadow-md ${notice.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}`}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold">{notice.title}</h3>
                                                {notice.priority === 'high' && (
                                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">High Priority</span>
                                                )}
                                                <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full capitalize">
                                                    To: {notice.targetAudience}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground whitespace-pre-wrap mb-4">{notice.content}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Posted on {notice.date?.toDate ? notice.date.toDate().toLocaleDateString() : new Date(notice.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                setCurrentNotice(notice);
                                                setIsEditing(true);
                                            }}>
                                                <Edit2 className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(notice.id, notice.title)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NoticeBoard;
