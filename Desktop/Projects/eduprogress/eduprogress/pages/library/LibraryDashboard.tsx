import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import { Book, LibraryTransaction, BookMetadata } from '../../types';
import { Plus, Search, BookOpen, Users, Clock, Trash2, Edit2, Sparkles, ScanLine, Lightbulb, Camera } from 'lucide-react';
import BarcodeScanner from '../../components/ui/BarcodeScanner';
import ImageUpload from '../../components/ui/ImageUpload';

const LibraryDashboard: React.FC = () => {
    const { currentUserData } = useAuth();
    const db = getFirestore();
    const functions = getFunctions();
    const [activeTab, setActiveTab] = useState<'inventory' | 'issued' | 'recommended'>('inventory');
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [smartKeywords, setSmartKeywords] = useState<string[]>([]);
    const [isSmartSearching, setIsSmartSearching] = useState(false);
    const [showAddBookModal, setShowAddBookModal] = useState(false);
    const [identifying, setIdentifying] = useState(false);
    const [recommendations, setRecommendations] = useState<Book[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);

    // New Book Form State
    const [newBook, setNewBook] = useState({
        title: '',
        author: '',
        isbn: '',
        category: '',
        totalQuantity: 1,
        location: '',
        coverUrl: '',
        summary: '',
        blurb: '',
        tags: [] as string[]
    });

    const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [users, setUsers] = useState<{ id: string, name: string, role: string }[]>([]);

    // Issue Book Form State
    const [issueForm, setIssueForm] = useState({
        bookId: '',
        userId: '',
        dueDate: ''
    });

    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (currentUserData?.schoolId) {
            if (activeTab === 'inventory') {
                fetchBooks();
            } else if (activeTab === 'issued') {
                fetchTransactions();
                fetchUsers();
                fetchBooks();
            } else if (activeTab === 'recommended') {
                fetchRecommendations();
            }
        }
    }, [currentUserData, activeTab]);

    // Smart Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 3 && activeTab === 'inventory') {
                setIsSmartSearching(true);
                try {
                    const smartSearchFn = httpsCallable(functions, 'smartSearch');
                    const result = await smartSearchFn({ query: searchTerm });
                    const data = result.data as { keywords: string[] };
                    setSmartKeywords(data.keywords);
                } catch (error) {
                    console.error("Smart search failed", error);
                } finally {
                    setIsSmartSearching(false);
                }
            } else {
                setSmartKeywords([]);
            }
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, activeTab]);

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'books'), where('schoolId', '==', currentUserData?.schoolId));
            const querySnapshot = await getDocs(q);
            const booksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
            setBooks(booksData);
        } catch (error) {
            console.error("Error fetching books:", error);
        } finally {
            setLoading(false);
        }
    };



    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'library_transactions'),
                where('schoolId', '==', currentUserData?.schoolId),
                where('status', 'in', ['issued', 'overdue'])
            );
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryTransaction));
            setTransactions(data);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        // Fetch students and teachers for the dropdown
        // This is a simplified fetch. In a real app with many users, you'd want a search-as-you-type.
        try {
            const q = query(collection(db, 'users'), where('schoolId', '==', currentUserData?.schoolId));
            const querySnapshot = await getDocs(q);
            const usersData = querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    // Check if user is student or teacher
                    const roles = Array.isArray(data.role) ? data.role : [data.role];
                    if (roles.includes('student') || roles.includes('teacher')) {
                        return { id: doc.id, name: data.name, role: roles.includes('student') ? 'student' : 'teacher' };
                    }
                    return null;
                })
                .filter(u => u !== null) as { id: string, name: string, role: string }[];
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchRecommendations = async () => {
        if (!currentUserData?.schoolId || books.length === 0) {
            if (books.length === 0) await fetchBooks();
            return;
        }

        setLoadingRecs(true);
        try {
            // Get user's past transactions to build history
            const q = query(
                collection(db, 'library_transactions'),
                where('userId', '==', currentUserData.uid)
            );
            const querySnapshot = await getDocs(q);
            const history = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return `${data.bookTitle}`;
            });

            if (history.length === 0) {
                // No history, show random or recent books
                setRecommendations(books.slice(0, 3));
                setLoadingRecs(false);
                return;
            }

            // Prepare available books (simplified for MVP: send top 20 recent)
            const availableBooks = books.slice(0, 20).map(b => ({
                id: b.id,
                title: b.title,
                category: b.category,
                tags: b.tags
            }));

            const recommendBooksFn = httpsCallable(functions, 'recommendBooks');
            const result = await recommendBooksFn({ userHistory: history, availableBooks });
            const data = result.data as { recommendations: string[], reasoning: string };

            const recBooks = books.filter(b => data.recommendations.includes(b.id));
            setRecommendations(recBooks);

        } catch (error) {
            console.error("Error fetching recommendations:", error);
        } finally {
            setLoadingRecs(false);
        }
    };

    const handleIdentifyBook = async () => {
        if (!newBook.isbn) return;
        setIdentifying(true);
        try {
            const identifyBookFn = httpsCallable(functions, 'identifyBook');
            const result = await identifyBookFn({ isbn: newBook.isbn });
            const data = result.data as any;

            setNewBook(prev => ({
                ...prev,
                title: data.title,
                author: data.author,
                category: data.category,
                coverUrl: data.coverUrl,
                summary: data.summary,
                blurb: data.blurb,
                tags: data.tags || []
            }));
        } catch (error: any) {
            console.error("Error identifying book:", error);
            alert(`Could not find book details: ${error.message || "Unknown error"}`);
        } finally {
            setIdentifying(false);
        }
    };

    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserData?.schoolId) return;

        try {
            const bookData = {
                ...newBook,
                schoolId: currentUserData.schoolId,
                availableQuantity: newBook.totalQuantity,
                addedAt: Timestamp.now()
            };
            await addDoc(collection(db, 'books'), bookData);
            setShowAddBookModal(false);
            setNewBook({
                title: '', author: '', isbn: '', category: '', totalQuantity: 1, location: '',
                coverUrl: '', summary: '', blurb: '', tags: []
            });
            fetchBooks();
        } catch (error: any) {
            console.error("Error adding book:", error);
            alert(`Failed to add book: ${error.message || "Unknown error"}`);
        }
    };

    const handleIssueBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserData?.schoolId) return;

        const selectedBook = books.find(b => b.id === issueForm.bookId);
        const selectedUser = users.find(u => u.id === issueForm.userId);

        if (!selectedBook || !selectedUser) return;
        if (selectedBook.availableQuantity <= 0) {
            alert("Book is not available!");
            return;
        }

        try {
            // 1. Create Transaction
            const transactionData = {
                schoolId: currentUserData.schoolId,
                bookId: selectedBook.id,
                bookTitle: selectedBook.title,
                userId: selectedUser.id,
                userName: selectedUser.name,
                userRole: selectedUser.role,
                issueDate: Timestamp.now(),
                dueDate: Timestamp.fromDate(new Date(issueForm.dueDate)),
                returnDate: null,
                status: 'issued'
            };
            await addDoc(collection(db, 'library_transactions'), transactionData);

            // 2. Update Book Quantity
            await updateDoc(doc(db, 'books', selectedBook.id), {
                availableQuantity: selectedBook.availableQuantity - 1
            });

            setShowIssueModal(false);
            setIssueForm({ bookId: '', userId: '', dueDate: '' });
            fetchTransactions();
            fetchBooks(); // Update inventory counts
        } catch (error) {
            console.error("Error issuing book:", error);
            alert("Failed to issue book");
        }
    };

    const handleReturnBook = async (transaction: LibraryTransaction) => {
        if (!window.confirm(`Return "${transaction.bookTitle}" from ${transaction.userName}?`)) return;

        try {
            // 1. Update Transaction
            await updateDoc(doc(db, 'library_transactions', transaction.id), {
                returnDate: Timestamp.now(),
                status: 'returned'
            });

            // 2. Update Book Quantity
            const bookRef = doc(db, 'books', transaction.bookId);
            const bookDoc = books.find(b => b.id === transaction.bookId);
            if (bookDoc) {
                await updateDoc(bookRef, {
                    availableQuantity: bookDoc.availableQuantity + 1
                });
            }

            fetchTransactions();
            fetchBooks();
        } catch (error) {
            console.error("Error returning book:", error);
            alert("Failed to return book");
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (window.confirm('Are you sure you want to delete this book?')) {
            try {
                await deleteDoc(doc(db, 'books', bookId));
                fetchBooks();
            } catch (error) {
                console.error("Error deleting book:", error);
            }
        }
    };

    const filteredBooks = books.filter(book => {
        const searchLower = searchTerm.toLowerCase();
        const matchesTerm =
            book.title.toLowerCase().includes(searchLower) ||
            book.author.toLowerCase().includes(searchLower) ||
            book.isbn.includes(searchLower) ||
            book.category.toLowerCase().includes(searchLower);

        if (matchesTerm) return true;

        // Smart Search Match
        if (smartKeywords.length > 0) {
            const matchesKeywords = smartKeywords.some(keyword =>
                book.title.toLowerCase().includes(keyword.toLowerCase()) ||
                book.category.toLowerCase().includes(keyword.toLowerCase()) ||
                (book.tags && book.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase())))
            );
            return matchesKeywords;
        }

        return false;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Library Management</h1>
                    <p className="text-gray-500 mt-1">Manage books, track issues, and monitor inventory.</p>
                </div>
                <div className="flex space-x-4">
                    {activeTab === 'inventory' ? (
                        <button
                            onClick={() => setShowAddBookModal(true)}
                            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Book
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowIssueModal(true)}
                            className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Issue Book
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Books</p>
                            <h3 className="text-2xl font-bold text-gray-900">{books.reduce((acc, book) => acc + book.totalQuantity, 0)}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Books Issued</p>
                            <h3 className="text-2xl font-bold text-gray-900">{transactions.length}</h3>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-full">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Overdue</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {transactions.filter(t => t.dueDate.toDate() < new Date()).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-full">
                            <Clock className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('inventory')}
                >
                    Book Inventory
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'issued'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('issued')}
                >
                    Issued Books
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'recommended'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('recommended')}
                >
                    <Sparkles className="w-4 h-4 inline-block mr-2" />
                    For You
                </button>
            </div>

            {/* Content */}
            {activeTab === 'inventory' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search books, topics, or feelings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            {isSmartSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                </div>
                            )}
                        </div>
                        {smartKeywords.length > 0 && (
                            <div className="flex gap-2 ml-4 overflow-x-auto">
                                {smartKeywords.map((keyword, i) => (
                                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full whitespace-nowrap">
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>


                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Title</th>
                                    <th className="px-6 py-3">Author</th>
                                    <th className="px-6 py-3">ISBN</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3 text-center">Available / Total</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading inventory...</td></tr>
                                ) : filteredBooks.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No books found.</td></tr>
                                ) : (
                                    filteredBooks.map((book) => (
                                        <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-gray-900">{book.title}</td>
                                            <td className="px-6 py-3 text-gray-600">{book.author}</td>
                                            <td className="px-6 py-3 text-gray-500">{book.isbn}</td>
                                            <td className="px-6 py-3 text-gray-500">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{book.category}</span>
                                                {book.tags && book.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {book.tags.slice(0, 2).map(tag => (
                                                            <span key={tag} className="text-[10px] text-gray-400">#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`font-medium ${book.availableQuantity === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {book.availableQuantity}
                                                </span>
                                                <span className="text-gray-400 mx-1">/</span>
                                                <span className="text-gray-600">{book.totalQuantity}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <button className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBook(book.id)}
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'issued' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Book Title</th>
                                        <th className="px-6 py-3">Issued To</th>
                                        <th className="px-6 py-3">Role</th>
                                        <th className="px-6 py-3">Issue Date</th>
                                        <th className="px-6 py-3">Due Date</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading transactions...</td></tr>
                                    ) : transactions.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No issued books.</td></tr>
                                    ) : (
                                        transactions.map((t) => {
                                            const isOverdue = t.dueDate.toDate() < new Date();
                                            return (
                                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3 font-medium text-gray-900">{t.bookTitle}</td>
                                                    <td className="px-6 py-3 text-gray-600">{t.userName}</td>
                                                    <td className="px-6 py-3 text-gray-500 capitalize">{t.userRole}</td>
                                                    <td className="px-6 py-3 text-gray-500">{t.issueDate.toDate().toLocaleDateString()}</td>
                                                    <td className="px-6 py-3 text-gray-500">{t.dueDate.toDate().toLocaleDateString()}</td>
                                                    <td className="px-6 py-3">
                                                        {isOverdue ? (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Overdue</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Issued</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button
                                                            onClick={() => handleReturnBook(t)}
                                                            className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-xs font-medium"
                                                        >
                                                            Return
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {activeTab === 'recommended' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loadingRecs ? (
                        <div className="col-span-3 text-center py-12 text-gray-500">
                            <Sparkles className="w-8 h-8 mx-auto mb-3 text-blue-300 animate-pulse" />
                            <p>Curating personalized recommendations for you...</p>
                        </div>
                    ) : recommendations.length === 0 ? (
                        <div className="col-span-3 text-center py-12 text-gray-500">
                            <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                            <p>Borrow more books to get personalized suggestions!</p>
                        </div>
                    ) : (
                        recommendations.map(book => (
                            <div key={book.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="h-48 bg-gray-100 relative">
                                    {book.coverUrl ? (
                                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <BookOpen className="w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium text-blue-600">
                                        Recommended
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{book.title}</h3>
                                    <p className="text-sm text-gray-600 mb-3">{book.author}</p>

                                    {book.blurb && (
                                        <p className="text-xs text-gray-500 italic mb-3 line-clamp-2">"{book.blurb}"</p>
                                    )}

                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {book.tags?.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setIssueForm(prev => ({ ...prev, bookId: book.id }));
                                            setShowIssueModal(true);
                                        }}
                                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Borrow Now
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Book Modal */}
            {
                showAddBookModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Book</h2>
                            <form onSubmit={handleAddBook} className="space-y-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Book Cover</label>
                                    <ImageUpload
                                        folder="book-covers"
                                        onUploadComplete={(url) => setNewBook(prev => ({ ...prev, coverUrl: url }))}
                                        initialPreview={newBook.coverUrl}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={newBook.title}
                                        onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                                    <input
                                        type="text"
                                        required
                                        value={newBook.author}
                                        onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newBook.isbn}
                                                onChange={e => setNewBook({ ...newBook, isbn: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                placeholder="Enter ISBN..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowScanner(true)}
                                                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                                title="Scan Barcode"
                                            >
                                                <Camera className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleIdentifyBook}
                                                disabled={identifying || !newBook.isbn}
                                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                                title="Auto-fill details"
                                            >
                                                {identifying ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <input
                                            type="text"
                                            value={newBook.category}
                                            onChange={e => setNewBook({ ...newBook, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={newBook.totalQuantity}
                                            onChange={e => setNewBook({ ...newBook, totalQuantity: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Location (Shelf)</label>
                                        <input
                                            type="text"
                                            value={newBook.location}
                                            onChange={e => setNewBook({ ...newBook, location: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>

                                {/* AI Generated Fields Preview */}
                                {(newBook.blurb || newBook.tags.length > 0) && (
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                                        <div className="flex items-center gap-2 mb-2 text-blue-700 font-medium">
                                            <Sparkles className="w-3 h-3" /> AI Insights
                                        </div>
                                        {newBook.blurb && <p className="text-gray-600 italic mb-2">"{newBook.blurb}"</p>}
                                        <div className="flex flex-wrap gap-1">
                                            {newBook.tags.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 bg-white text-blue-600 text-xs rounded border border-blue-100">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddBookModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                    >
                                        Add Book
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Issue Book Modal */}
            {
                showIssueModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                            <h2 className="text-xl font-bold mb-4">Issue Book</h2>
                            <form onSubmit={handleIssueBook} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Book</label>
                                    <select
                                        required
                                        value={issueForm.bookId}
                                        onChange={e => setIssueForm({ ...issueForm, bookId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">-- Select Book --</option>
                                        {books.filter(b => b.availableQuantity > 0).map(book => (
                                            <option key={book.id} value={book.id}>
                                                {book.title} ({book.availableQuantity} avail)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                                    <select
                                        required
                                        value={issueForm.userId}
                                        onChange={e => setIssueForm({ ...issueForm, userId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">-- Select User --</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={issueForm.dueDate}
                                        onChange={e => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowIssueModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                    >
                                        Issue Book
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {showScanner && (
                <BarcodeScanner
                    onScanSuccess={(decodedText) => {
                        setNewBook(prev => ({ ...prev, isbn: decodedText }));
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
};

export default LibraryDashboard;

