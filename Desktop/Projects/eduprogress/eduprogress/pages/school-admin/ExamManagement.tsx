import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, writeBatch, orderBy } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useAcademicYear } from "../../hooks/useAcademicYear";
import { useExamManagement } from "../../hooks/queries/useExamManagement";
import { ExamRoom, ExamSession, ExamSeating, UserProfile, Grade, Section, Major } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Select from "../../components/ui/Select";
import { Plus, Trash2, Save, Users, Calendar, MapPin, Printer, CheckSquare, Square } from "lucide-react";

const ExamManagement: React.FC = () => {
    const { currentUserData } = useAuth();
    const { currentAcademicYear } = useAcademicYear();
    
    // Phase 1E FIXED: Correct hook usage with proper parameters
    const { 
        data: examData = {},
        isLoading: isLoadingExam,
        refetch: refetchExam
    } = useExamManagement({
        schoolId: currentUserData?.schoolId,
        academicYear: currentAcademicYear
    });

    const rooms = (examData?.rooms || []) as ExamRoom[];
    const sessions = (examData?.sessions || []) as ExamSession[];
    
    const [activeTab, setActiveTab] = useState<"rooms" | "sessions" | "generator" | "view">("rooms");
    const [loading, setLoading] = useState(false);
    const [majors, setMajors] = useState<Major[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);

    // Room Config State
    const [newRoom, setNewRoom] = useState<Partial<ExamRoom>>({ rows: 5, columns: 5, building: "" });

    // Session State
    const [newSession, setNewSession] = useState<Partial<ExamSession>>({ grades: [], major: "" });

    // Generator State
    const [genStep, setGenStep] = useState(1);
    const [genSessionId, setGenSessionId] = useState("");
    const [genMajor, setGenMajor] = useState("");
    const [genSelectedClasses, setGenSelectedClasses] = useState<string[]>([]);
    const [genSelectedRooms, setGenSelectedRooms] = useState<string[]>([]);
    const [genStudents, setGenStudents] = useState<UserProfile[]>([]);

    // View State
    const [viewSessionId, setViewSessionId] = useState("");
    const [viewMajor, setViewMajor] = useState("");
    const [seatings, setSeatings] = useState<ExamSeating[]>([]);

    // Fetch grades, sections, and students separately on mount
    useEffect(() => {
        const fetchAcademicData = async () => {
            if (!currentUserData?.schoolId || !currentAcademicYear) return;

            setLoading(true);
            try {
                const [gradesSnap, sectionsSnap, studentsSnap] = await Promise.all([
                    getDocs(query(collection(db, "grades"), where("schoolId", "==", currentUserData.schoolId))),
                    getDocs(query(collection(db, "sections"), where("schoolId", "==", currentUserData.schoolId))),
                    getDocs(query(collection(db, "users"), 
                        where("schoolId", "==", currentUserData.schoolId),
                        where("role", "array-contains", "student")
                    ))
                ]);

                setGrades(gradesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Grade)));
                setSections(sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section)));
                
                const students = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
                setAllStudents(students);

                // Derive majors from students
                const uniqueMajors = new Set<string>();
                students.forEach(student => {
                    if (student.major) uniqueMajors.add(student.major);
                });

                if (uniqueMajors.size === 0) {
                    uniqueMajors.add("Boys Section");
                    uniqueMajors.add("Girls Section");
                }

                setMajors(Array.from(uniqueMajors).sort().map(m => ({ 
                    id: m, 
                    name: m, 
                    schoolId: currentUserData.schoolId 
                } as Major)));
            } catch (error) {
                console.error("Error fetching academic data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAcademicData();
    }, [currentUserData?.schoolId, currentAcademicYear]);

    // --- ROOM FUNCTIONS ---
    const handleAddRoom = async () => {
        if (!newRoom.name || !newRoom.building) return;
        try {
            const roomData = {
                ...newRoom,
                schoolId: currentUserData!.schoolId,
                capacity: (newRoom.rows || 0) * (newRoom.columns || 0),
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, "examRooms"), roomData);
            setNewRoom({ rows: 5, columns: 5, building: "" });
            refetchExam();
        } catch (error) {
            console.error("Error adding room:", error);
            alert("Failed to add room");
        }
    };

    const handleDeleteRoom = async (id: string) => {
        if (confirm("Delete this room?")) {
            try {
                await deleteDoc(doc(db, "examRooms", id));
                refetchExam();
            } catch (error) {
                console.error("Error deleting room:", error);
                alert("Failed to delete room");
            }
        }
    };

    // --- SESSION FUNCTIONS ---
    const handleAddSession = async () => {
        if (!newSession.name || !newSession.date || !newSession.major) {
            alert("Please fill in all fields including Major.");
            return;
        }
        try {
            const sessionData = {
                ...newSession,
                schoolId: currentUserData!.schoolId,
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, "examSessions"), sessionData);
            setNewSession({ grades: [], major: "" });
            refetchExam();
        } catch (error) {
            console.error("Error adding session:", error);
            alert("Failed to create session");
        }
    };

    // --- GENERATOR FUNCTIONS ---
    const fetchStudentsForGenerator = async () => {
        setLoading(true);
        try {
            let filteredStudents = allStudents;

            if (genMajor) {
                const majorObj = majors.find(m => m.id === genMajor || m.name === genMajor);
                if (majorObj) {
                    filteredStudents = filteredStudents.filter(s => s.major === majorObj.name);
                }
            }

            if (genSelectedClasses.length > 0) {
                filteredStudents = filteredStudents.filter(s => {
                    const classKey = `${s.grade}-${s.section}`;
                    return genSelectedClasses.includes(classKey);
                });
            }

            setGenStudents(filteredStudents);
        } catch (error) {
            console.error("Error fetching students:", error);
            alert("Error filtering students");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSeating = async () => {
        console.log("handleGenerateSeating started");
        console.log("Total students to be seated:", genStudents.length);

        if (!genSessionId) {
            alert("Please select a session first.");
            return;
        }

        if (genStudents.length === 0) {
            alert("No students selected. Please go back and select classes.");
            return;
        }

        setLoading(true);
        try {
            // --- 0. CLEAR EXISTING SEATING ---
            console.log("Clearing existing seating for session:", genSessionId);
            const existingSeatingSnap = await getDocs(query(collection(db, "examSeating"),
                where("schoolId", "==", currentUserData!.schoolId),
                where("sessionId", "==", genSessionId)
            ));

            console.log("Found existing seats to clear:", existingSeatingSnap.size);

            if (!existingSeatingSnap.empty) {
                const BATCH_SIZE = 450;
                const chunks = [];
                for (let i = 0; i < existingSeatingSnap.docs.length; i += BATCH_SIZE) {
                    chunks.push(existingSeatingSnap.docs.slice(i, i + BATCH_SIZE));
                }

                for (const chunk of chunks) {
                    const deleteBatch = writeBatch(db);
                    chunk.forEach(doc => deleteBatch.delete(doc.ref));
                    await deleteBatch.commit();
                    console.log(`Deleted batch of ${chunk.length} seats`);
                }
            }

            // --- 1. PREPARATION ---
            console.log("Preparing generation...");
            const studentsByGrade: { [key: string]: UserProfile[] } = {};
            genStudents.forEach(s => {
                if (!studentsByGrade[s.grade]) studentsByGrade[s.grade] = [];
                studentsByGrade[s.grade].push(s);
            });

            const sortedGrades = Object.keys(studentsByGrade).sort((a, b) => studentsByGrade[b].length - studentsByGrade[a].length);
            const uniqueGrades = sortedGrades;
            const N = uniqueGrades.length;

            let studentPool: UserProfile[] = [];
            sortedGrades.forEach(g => {
                const shuffled = studentsByGrade[g].sort(() => Math.random() - 0.5);
                studentsByGrade[g] = shuffled;
                studentPool = [...studentPool, ...shuffled];
            });

            const removeStudentFromPool = (student: UserProfile) => {
                const idx = studentPool.findIndex(s => s.uid === student.uid);
                if (idx !== -1) studentPool.splice(idx, 1);
            };

            const selectedRoomObjs = rooms.filter(r => genSelectedRooms.includes(r.id));
            type Seat = { roomId: string; row: number; col: number };
            let allSeats: Seat[] = [];
            selectedRoomObjs.forEach(room => {
                for (let r = 1; r <= room.rows; r++) {
                    for (let c = 1; c <= room.columns; c++) {
                        allSeats.push({ roomId: room.id, row: r, col: c });
                    }
                }
            });

            // --- 2. PLACEMENT LOOP ---
            const seatingRef = collection(db, "examSeating");

            const placements: { [roomId: string]: { [row: number]: { [col: number]: UserProfile } } } = {};

            const getNeighbors = (roomId: string, r: number, c: number) => {
                const left = placements[roomId]?.[r]?.[c - 1];
                const front = placements[roomId]?.[r - 1]?.[c];
                const right = placements[roomId]?.[r]?.[c + 1];
                const back = placements[roomId]?.[r + 1]?.[c];
                return { left, front, right, back };
            };

            let placedCount = 0;
            let currentSeatIdx = 0;

            while (studentPool.length > 0 && currentSeatIdx < allSeats.length) {
                const seat = allSeats[currentSeatIdx];
                const { roomId, row, col } = seat;

                if (!placements[roomId]) placements[roomId] = {};
                if (!placements[roomId][row]) placements[roomId][row] = {};

                const neighbors = getNeighbors(roomId, row, col);

                const r0 = row - 1;
                const c0 = col - 1;
                const idealGradeIndex = (c0 + r0 * (N - 1)) % N;
                const idealGrade = uniqueGrades[idealGradeIndex];

                let chosenStudent: UserProfile | null = null;

                // A. Try Ideal Grade
                if (studentsByGrade[idealGrade] && studentsByGrade[idealGrade].length > 0) {
                    const conflictLeft = neighbors.left && neighbors.left.grade === idealGrade;
                    const conflictFront = neighbors.front && neighbors.front.grade === idealGrade;

                    if (!conflictLeft && !conflictFront) {
                        chosenStudent = studentsByGrade[idealGrade][0];
                    }
                }

                // B. Fallback: Try other grades
                if (!chosenStudent) {
                    for (const grade of sortedGrades) {
                        if (grade === idealGrade) continue;
                        if (studentsByGrade[grade] && studentsByGrade[grade].length > 0) {
                            const conflictLeft = neighbors.left && neighbors.left.grade === grade;
                            const conflictFront = neighbors.front && neighbors.front.grade === grade;
                            if (!conflictLeft && !conflictFront) {
                                chosenStudent = studentsByGrade[grade][0];
                                break;
                            }
                        }
                    }
                }

                // C. Swap Recovery (Last Resort)
                if (!chosenStudent) {
                    const problemStudent = studentPool[0];
                    if (!problemStudent) {
                        console.error("CRITICAL: studentPool is empty but loop continues!");
                        break;
                    }

                    for (const placedSeat of allSeats.slice(0, currentSeatIdx)) {
                        const pRoom = placedSeat.roomId;
                        const pRow = placedSeat.row;
                        const pCol = placedSeat.col;
                        const placedStudent = placements[pRoom]?.[pRow]?.[pCol];

                        if (!placedStudent) continue;
                        if (placedStudent.grade === problemStudent.grade) continue;

                        const currentNeighbors = getNeighbors(roomId, row, col);

                        const conflictCurrent = (currentNeighbors.left && currentNeighbors.left.grade === placedStudent.grade) ||
                            (currentNeighbors.front && currentNeighbors.front.grade === placedStudent.grade);

                        if (!conflictCurrent) {
                            const oldNeighbors = getNeighbors(pRoom, pRow, pCol);

                            try {
                                const conflictOld = (oldNeighbors.left && oldNeighbors.left.grade === problemStudent.grade) ||
                                    (oldNeighbors.front && oldNeighbors.front.grade === problemStudent.grade) ||
                                    (oldNeighbors.right && oldNeighbors.right.grade === problemStudent.grade) ||
                                    (oldNeighbors.back && oldNeighbors.back.grade === problemStudent.grade);

                                if (!conflictOld) {
                                    placements[roomId][row][col] = placedStudent;
                                    placements[pRoom][pRow][pCol] = problemStudent;

                                    removeStudentFromPool(problemStudent);
                                    const gIdx = studentsByGrade[problemStudent.grade].findIndex(s => s.uid === problemStudent.uid);
                                    if (gIdx !== -1) studentsByGrade[problemStudent.grade].splice(gIdx, 1);

                                    placedCount++;
                                    currentSeatIdx++;
                                    chosenStudent = null;
                                    break;
                                }
                            } catch (e) {
                                console.error("Crash checking old neighbors:", e, { pRoom, pRow, pCol });
                            }
                        }
                    }

                    if (currentSeatIdx > allSeats.indexOf(seat)) continue;
                }

                // D. Buffer Zone
                if (!chosenStudent) {
                    console.log(`Skipping seat at ${roomId} R${row}C${col} to create buffer (Strict Mode).`);
                    currentSeatIdx++;
                    continue;
                }

                // E. Finalize Placement
                if (chosenStudent) {
                    placements[roomId][row][col] = chosenStudent;

                    const gIdx = studentsByGrade[chosenStudent.grade].findIndex(s => s.uid === chosenStudent.uid);
                    if (gIdx !== -1) studentsByGrade[chosenStudent.grade].splice(gIdx, 1);

                    removeStudentFromPool(chosenStudent);

                    placedCount++;
                    currentSeatIdx++;
                }
            }

            // --- 3. COMMIT TO DB (writeBatch operations - KEPT AS-IS) ---
            let batch = writeBatch(db);
            let writeCount = 0;
            const WRITE_BATCH_SIZE = 450;

            for (const rId in placements) {
                for (const rRow in placements[rId]) {
                    for (const rCol in placements[rId][rRow]) {
                        const student = placements[rId][rRow][rCol];
                        if (!student) continue;

                        const docRef = doc(seatingRef);

                        batch.set(docRef, {
                            schoolId: currentUserData!.schoolId,
                            sessionId: genSessionId,
                            roomId: rId,
                            studentId: student.uid,
                            studentName: student.name,
                            studentGrade: student.grade,
                            studentSection: student.section,
                            studentMajor: student.major || "",
                            seatRow: parseInt(rRow),
                            seatCol: parseInt(rCol),
                            assignedAt: serverTimestamp()
                        });

                        writeCount++;
                        if (writeCount >= WRITE_BATCH_SIZE) {
                            await batch.commit();
                            batch = writeBatch(db);
                            writeCount = 0;
                            console.log("Committed a batch of seats.");
                        }
                    }
                }
            }

            if (writeCount > 0) {
                await batch.commit();
                console.log("Committed final batch of seats.");
            }

            let message = `Seating generated for ${placedCount} students.`;
            if (studentPool.length > 0) {
                message += `\n\nWARNING: ${studentPool.length} students could NOT be seated due to strict separation rules. Please add more rooms or sessions.`;
            }
            alert(message);

            setGenStep(1);
            setGenSelectedClasses([]);
            setGenSelectedRooms([]);
            setActiveTab("view");
            setViewSessionId(genSessionId);
        } catch (error: any) {
            console.error("Generation failed:", error);
            alert(`Failed to generate seating plan. Error: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    // --- VIEW FUNCTIONS ---
    const fetchSeating = async () => {
        if (!viewSessionId) return;
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "examSeating"),
                where("schoolId", "==", currentUserData!.schoolId),
                where("sessionId", "==", viewSessionId)
            ));
            let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamSeating));

            if (viewMajor) {
                const majorObj = majors.find(m => m.id === viewMajor);
                if (majorObj) {
                    data = data.filter(s => s.studentMajor === majorObj.name);
                }
            }

            setSeatings(data);
        } catch (error) {
            console.error("Error fetching seating:", error);
            alert("Failed to fetch seating data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "view" && viewSessionId) {
            fetchSeating();
        }
    }, [viewSessionId, viewMajor, activeTab]);

    if ((isLoadingExam || loading) && !rooms.length) return <Loader />;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-3xl font-bold text-gray-900">Exam Management</h1>
                <div className="flex space-x-2">
                    <Button variant={activeTab === "rooms" ? "default" : "outline"} onClick={() => setActiveTab("rooms")}>Rooms</Button>
                    <Button variant={activeTab === "sessions" ? "default" : "outline"} onClick={() => setActiveTab("sessions")}>Sessions</Button>
                    <Button variant={activeTab === "generator" ? "default" : "outline"} onClick={() => setActiveTab("generator")}>Generator</Button>
                    <Button variant={activeTab === "view" ? "default" : "outline"} onClick={() => setActiveTab("view")}>View & Print</Button>
                </div>
            </div>

            {/* ROOMS TAB */}
            {activeTab === "rooms" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Add New Room</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Room Name</label>
                                    <input type="text" className="w-full p-2 border rounded" value={newRoom.name || ""} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} placeholder="e.g. Hall A" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Building / Major</label>
                                    <Select value={newRoom.building || ""} onChange={e => setNewRoom({ ...newRoom, building: e.target.value })}>
                                        <option value="">-- Select Major --</option>
                                        {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rows</label>
                                    <input type="number" className="w-full p-2 border rounded" value={newRoom.rows} onChange={e => setNewRoom({ ...newRoom, rows: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Columns</label>
                                    <input type="number" className="w-full p-2 border rounded" value={newRoom.columns} onChange={e => setNewRoom({ ...newRoom, columns: parseInt(e.target.value) })} />
                                </div>
                                <Button onClick={handleAddRoom} disabled={loading}><Plus className="w-4 h-4 mr-2" /> Add</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {rooms.map(room => (
                            <Card key={room.id}>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg">{room.name}</h3>
                                            <p className="text-sm text-gray-500">{room.building}</p>
                                            <div className="mt-2 text-sm">
                                                <p>Layout: {room.rows} x {room.columns}</p>
                                                <p>Capacity: {room.capacity} seats</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteRoom(room.id)} className="text-red-500 hover:text-red-700" disabled={loading}><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* SESSIONS TAB */}
            {activeTab === "sessions" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Create Exam Session</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Session Name</label>
                                    <input type="text" className="w-full p-2 border rounded" value={newSession.name || ""} onChange={e => setNewSession({ ...newSession, name: e.target.value })} placeholder="e.g. Midterm 2024 - Boys" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input type="date" className="w-full p-2 border rounded" value={newSession.date || ""} onChange={e => setNewSession({ ...newSession, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Major</label>
                                    <Select value={newSession.major || ""} onChange={e => setNewSession({ ...newSession, major: e.target.value })}>
                                        <option value="">-- Select Major --</option>
                                        {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </Select>
                                </div>
                                <Button onClick={handleAddSession} disabled={loading}><Plus className="w-4 h-4 mr-2" /> Create</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        {sessions.map(session => (
                            <div key={session.id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold">{session.name}</h3>
                                    <p className="text-sm text-gray-500">{session.date} | {session.startTime} - {session.endTime} | <span className="font-medium text-purple-600">{session.major || "General"}</span></p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setGenSessionId(session.id);
                                        setActiveTab("generator");
                                    }}>Generate Seating</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* GENERATOR TAB */}
            {activeTab === "generator" && (
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>
                            {[1, 2, 3, 4].map(step => (
                                <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${genStep >= step ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                                    {step}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs mt-2 text-gray-500">
                            <span>Scope</span>
                            <span>Classes</span>
                            <span>Rooms</span>
                            <span>Generate</span>
                        </div>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            {genStep === 1 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold">Step 1: Session & Scope</h2>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Select Major (Required)</label>
                                        <Select value={genMajor} onChange={e => {
                                            setGenMajor(e.target.value);
                                            setGenSessionId("");
                                        }}>
                                            <option value="">-- Select Major --</option>
                                            {majors.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                        </Select>
                                        <p className="text-xs text-gray-500 mt-1">Seating will be generated only for students and rooms belonging to this Major.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Select Session</label>
                                        <Select value={genSessionId} onChange={e => setGenSessionId(e.target.value)} disabled={!genMajor}>
                                            <option value="">-- Select Session --</option>
                                            {sessions
                                                .filter(s => !s.major || s.major === genMajor)
                                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </Select>
                                        {!genMajor && <p className="text-xs text-red-500">Please select a Major first.</p>}
                                    </div>
                                    <div className="flex justify-end mt-6">
                                        <Button onClick={() => setGenStep(2)} disabled={!genSessionId || !genMajor || loading}>Next</Button>
                                    </div>
                                </div>
                            )}

                            {genStep === 2 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold">Step 2: Select Classes</h2>
                                    <p className="text-sm text-gray-600">Select grades/sections for <span className="font-bold">{genMajor}</span>.</p>
                                    <div className="h-64 overflow-y-auto border rounded p-2 space-y-2">
                                        {grades
                                            .filter(grade => {
                                                const hasStudents = sections.some(section => {
                                                    const match = allStudents.some(s => {
                                                        const gradeMatch = s.grade === grade.name;
                                                        const sectionMatch = s.section === section.name;
                                                        const majorMatch = !genMajor || s.major === genMajor;
                                                        return gradeMatch && sectionMatch && majorMatch;
                                                    });
                                                    return match;
                                                });
                                                return hasStudents;
                                            })
                                            .map(grade => {
                                                const validSections = sections.filter(section => {
                                                    return allStudents.some(s =>
                                                        s.grade === grade.name &&
                                                        s.section === section.name &&
                                                        (!genMajor || s.major === genMajor)
                                                    );
                                                });

                                                const validClassKeys = validSections.map(s => `${grade.name}-${s.name}`);
                                                const isSelected = validClassKeys.length > 0 && validClassKeys.every(k => genSelectedClasses.includes(k));

                                                return (
                                                    <div key={grade.id} className="p-2 hover:bg-gray-50 rounded border">
                                                        <label className="flex items-center space-x-2 cursor-pointer font-bold">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        const newSelection = Array.from(new Set([...genSelectedClasses, ...validClassKeys]));
                                                                        setGenSelectedClasses(newSelection);
                                                                    } else {
                                                                        setGenSelectedClasses(genSelectedClasses.filter(k => !validClassKeys.includes(k)));
                                                                    }
                                                                }}
                                                            />
                                                            <span>{grade.name}</span>
                                                            <span className="text-xs font-normal text-gray-500 ml-2">({validSections.length} sections)</span>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    <div className="flex justify-between mt-6">
                                        <Button variant="outline" onClick={() => setGenStep(1)} disabled={loading}>Back</Button>
                                        <Button onClick={() => {
                                            fetchStudentsForGenerator();
                                            setGenStep(3);
                                        }} disabled={genSelectedClasses.length === 0 || loading}>Next</Button>
                                    </div>
                                </div>
                            )}

                            {genStep === 3 && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold">Step 3: Select Rooms</h2>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-600">Total Students Selected: <span className="font-bold">{genStudents.length}</span></p>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const filteredRooms = rooms.filter(r => !genMajor || r.building === genMajor);
                                                    const allIds = filteredRooms.map(r => r.id);
                                                    const allSelected = allIds.every(id => genSelectedRooms.includes(id));
                                                    if (allSelected) {
                                                        setGenSelectedRooms(genSelectedRooms.filter(id => !allIds.includes(id)));
                                                    } else {
                                                        const newSelection = Array.from(new Set([...genSelectedRooms, ...allIds]));
                                                        setGenSelectedRooms(newSelection);
                                                    }
                                                }}
                                                disabled={loading}
                                            >
                                                Select All
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="h-64 overflow-y-auto border rounded p-2 space-y-2">
                                        {rooms.filter(r => !genMajor || r.building === genMajor).length === 0 && (
                                            <p className="text-red-500 text-sm p-2">No rooms found for {genMajor || "selected filter"}. Please add rooms assigned to this Building in the Rooms tab.</p>
                                        )}
                                        {rooms
                                            .filter(r => !genMajor || r.building === genMajor)
                                            .map(room => (
                                                <label key={room.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border cursor-pointer">
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={genSelectedRooms.includes(room.id)}
                                                            onChange={e => {
                                                                if (e.target.checked) setGenSelectedRooms([...genSelectedRooms, room.id]);
                                                                else setGenSelectedRooms(genSelectedRooms.filter(r => r !== room.id));
                                                            }}
                                                        />
                                                        <div>
                                                            <p className="font-medium">{room.name}</p>
                                                            <p className="text-xs text-gray-500">{room.building}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-600">
                                                        Cap: {room.capacity}
                                                    </div>
                                                </label>
                                            ))}
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button variant="outline" onClick={() => setGenStep(2)} disabled={loading}>Back</Button>
                                        <Button onClick={handleGenerateSeating} disabled={genSelectedRooms.length === 0 || loading}>
                                            Generate Plan
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW TAB */}
            {activeTab === "view" && (
                <div className="space-y-6">
                    <div className="flex space-x-4 items-end print:hidden">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Select Session</label>
                            <Select value={viewSessionId} onChange={e => setViewSessionId(e.target.value)}>
                                <option value="">-- Select Session --</option>
                                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Filter by Major</label>
                            <Select value={viewMajor} onChange={e => setViewMajor(e.target.value)}>
                                <option value="">-- All Majors --</option>
                                {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </Select>
                        </div>
                        <Button onClick={() => window.print()} disabled={!viewSessionId}><Printer className="w-4 h-4 mr-2" /> Print All</Button>
                    </div>

                    {viewSessionId && (
                        <div className="space-y-8">
                            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded border print:hidden">
                                <span className="font-bold text-sm">Legend:</span>
                                {Array.from(new Set(seatings.map(s => s.studentGrade))).sort().map((grade, idx) => {
                                    const colors = ["bg-blue-100", "bg-green-100", "bg-yellow-100", "bg-red-100", "bg-purple-100", "bg-orange-100", "bg-pink-100", "bg-teal-100"];
                                    const colorClass = colors[idx % colors.length];
                                    return (
                                        <div key={grade} className={`flex items-center space-x-2 px-2 py-1 rounded ${colorClass}`}>
                                            <div className={`w-3 h-3 rounded-full ${colorClass.replace("bg-", "bg-opacity-50 border border-")}`}></div>
                                            <span className="text-xs font-medium">{grade}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {rooms.filter(r => seatings.some(s => s.roomId === r.id)).map(room => {
                                const roomSeatings = seatings.filter(s => s.roomId === room.id);
                                if (roomSeatings.length === 0) return null;

                                const uniqueGrades = Array.from(new Set(seatings.map(s => s.studentGrade))).sort();
                                const colors = ["bg-blue-100", "bg-green-100", "bg-yellow-100", "bg-red-100", "bg-purple-100", "bg-orange-100", "bg-pink-100", "bg-teal-100"];

                                return (
                                    <div key={room.id} className="break-after-page print:break-after-page print:h-screen print:flex print:flex-col">
                                        <div className="text-center mb-6 border-b pb-4 print:border-none print:mb-8">
                                            <h1 className="text-3xl font-bold uppercase tracking-wide mb-2 hidden print:block">Seating Plan</h1>
                                            <h2 className="text-2xl font-bold text-gray-800">{room.name}</h2>
                                            <p className="text-lg font-medium text-gray-600">{room.building}</p>
                                            <div className="mt-2 p-2 bg-gray-100 inline-block rounded print:bg-transparent print:p-0">
                                                <p className="text-xl font-bold text-purple-700 print:text-black">
                                                    {sessions.find(s => s.id === viewSessionId)?.name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 print:gap-2 flex-grow" style={{ gridTemplateColumns: `repeat(${room.columns}, minmax(0, 1fr))` }}>
                                            {Array.from({ length: room.rows * room.columns }).map((_, idx) => {
                                                const row = Math.floor(idx / room.columns) + 1;
                                                const col = (idx % room.columns) + 1;
                                                const seat = roomSeatings.find(s => s.seatRow === row && s.seatCol === col);

                                                let seatColorClass = "bg-gray-50";
                                                if (seat) {
                                                    const gradeIdx = uniqueGrades.indexOf(seat.studentGrade);
                                                    seatColorClass = colors[gradeIdx % colors.length];
                                                }

                                                return (
                                                    <div key={idx} className={`border p-2 rounded text-center min-h-[80px] print:min-h-0 flex flex-col justify-center ${seatColorClass} print:border-2 print:border-gray-800`} style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
                                                        {seat ? (
                                                            <>
                                                                <p className="font-bold text-sm truncate print:text-xs print:whitespace-normal print:leading-tight">
                                                                    {seat.studentName}
                                                                </p>
                                                                <p className="text-xs text-gray-600 font-medium print:text-xs print:text-gray-800">{seat.studentGrade} - {seat.studentSection}</p>
                                                                <p className="text-xs text-gray-400 mt-1 print:text-[10px] print:text-gray-500">Seat {row}-{col}</p>
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs print:hidden">Empty</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="hidden print:block text-center text-xs text-gray-400 mt-8">
                                            <p>Generated by EduProgress System</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExamManagement;