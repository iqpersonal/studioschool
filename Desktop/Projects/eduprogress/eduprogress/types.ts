import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  role: ('super-admin' | 'school-admin' | 'academic-director' | 'head-of-section' | 'subject-coordinator' | 'teacher' | 'student' | 'parent' | 'librarian' | 'finance')[];
  schoolId?: string;
  createdAt?: Timestamp;
  status?: 'active' | 'archived';

  // student specific
  grade?: string; // from E_Class_Desc
  section?: string; // from E_Section_Name
  studentIdNumber?: string; // from UserName

  // New fields from CSV
  academicYear?: string;
  major?: string; // from E_Major_Desc
  group?: string; // from E_Group_Desc
  fatherName?: string; // from E_Father_Name
  familyName?: string; // from E_Family_Name
  fatherEmail?: string; // from Father_Email
  familyUsername?: string; // from Family_UserName
  familyPassword?: string; // from Family_Password
  fatherPhone1?: string;
  fatherPhone2?: string;
  motherPhone1?: string;
  openBalance?: number;
  totalTuitionFees?: number;
  totalTuitionFeesVat?: number;
  tuitionFeesBalance?: number;
  transportation?: number;
  otherFees?: number; // from Other
  totalBalance?: number;

  // Management Role specific (now managed in a separate collection)
  // managedGrade?: string;
  // managedSection?: string;
  coordinatedSubjectId?: string;

  // Timetable Constraints
  unavailableSlots?: string[]; // Array of "Day-TimeSlotID" strings
}

export interface School {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  subscriptionTier?: 'free' | 'basic' | 'premium';
  logoURL?: string;
  workingDays?: string[];
  activeAcademicYear?: string;
  status?: 'active' | 'archived';
  createdAt?: Timestamp;
  useAssessmentAverages?: boolean;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string; // e.g. "2023-2024"
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'active' | 'archived';
}

export interface Module {
  id: string;
  moduleName: string;
  description: string;
  status: 'active' | 'inactive';
  icon?: string;
  createdAt?: Timestamp;
}

export interface SchoolModule {
  id: string;
  schoolId: string;
  moduleId: string;
  moduleName: string;
  status: 'enabled' | 'disabled';
  assignedAt: Timestamp;
}

export interface ProgressReportEntry {
  subjectName: string;
  academicPerformance: string;
  homeworkEffort: string;
  inClassParticipation: string;
  conduct: string;
  notes: string;
}

export interface ProgressReport {
  id: string;
  schoolId: string;
  studentId: string;
  academicYear: string;
  grade: string;
  section: string;
  month: string;
  entries: {
    [subjectId: string]: ProgressReportEntry;
  };
  generalComment?: string;
  attendanceSummary?: {
    present: number;
    absent: number;
    late: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}


export interface Subscription {
  id: string;
  schoolId: string;
  planName: 'free' | 'basic' | 'premium';
  startDate: Timestamp;
  endDate: Timestamp;
  paymentStatus: 'paid' | 'unpaid' | 'overdue';
}

export interface AIUsage {
  id: string;
  schoolId: string;
  schoolName?: string;
  module: string;
  totalRequests: number;
  tokensUsed: number;
  lastUsed: Timestamp;
}

export interface SupportTicket {
  id: string;
  schoolId: string;
  schoolName?: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'pending' | 'resolved';
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface GlobalSettings {
  systemEmail: string;
  contactPhone: string;
  // aiProviderKey has been moved to backend secrets
  defaultCurrency: string;
  maxSchools: number;
}

export interface Major {
  id: string;
  schoolId: string;
  name: string;
  createdAt?: Timestamp;
}

export interface Group {
  id: string;
  schoolId: string;
  majorId: string;
  name: string;
  createdAt?: Timestamp;
}

export interface Grade {
  id: string;
  schoolId: string;
  name: string;
  createdAt?: Timestamp;
}

export interface Section {
  id: string;
  schoolId: string;
  name: string;
  createdAt?: Timestamp;
}

export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  createdAt?: Timestamp;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  grade: string;
  section: string;
  schoolId: string;
  periodsPerWeek?: number;
  major?: string;
}

export interface ManagementAssignment {
  id: string;
  schoolId: string;
  userId: string;
  userName: string;
  role: 'head-of-section' | 'academic-director' | 'subject-coordinator';
  major: string;
  group: string;
  grade: string;
  subjectId?: string;
  subjectName?: string;
}


// TIMETABLE MODULE
export interface SchoolDivision {
  id: string;
  schoolId: string;
  name: string;
  majorId?: string;
  groupIds?: string[];
}

export interface TimeSlot {
  id: string;
  schoolId: string;
  divisionId: string;
  name: string; // e.g., "Period 1"
  startTime: string; // "HH:MM" format (24h)
  endTime: string; // "HH:MM" format (24h)
  type: 'class' | 'break';
}

export interface Room {
  id: string;
  schoolId: string;
  name: string;
}

export interface TimetableEntry {
  id: string;
  schoolId: string;
  grade: string;
  section: string;
  day: string; // e.g., "Sunday"
  timeSlotId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  divisionId?: string;
}

export interface SubjectAllocation {
  id: string;
  schoolId: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  periodsPerWeek: number;
}

// ASSESSMENT MODULE
export interface SubAssessment {
  id: string;
  name: string;
  maxScore: number;
}

export interface MainAssessment {
  id: string;
  name: string;
  weightage: number; // Percentage (0-100)
  subAssessments: SubAssessment[];
}

export interface AssessmentStructure {
  id: string;
  schoolId: string;
  academicYear: string;
  grade: string;
  subjectId: string;
  subjectName: string;
  assessments: MainAssessment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentAssessmentGrade {
  id: string;
  schoolId: string;
  studentId: string;
  assessmentStructureId: string;
  academicYear: string;
  grade: string; // Class grade
  subjectId: string;
  // Map of MainAssessmentID -> SubAssessmentID -> Score
  scores: {
    [mainAssessmentId: string]: {
      [subAssessmentId: string]: number;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// LIBRARY MODULE
export interface Book {
  id: string;
  schoolId: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  location?: string;
  addedAt: Timestamp;

  // Smart Library Fields
  coverUrl?: string;
  summary?: string;
  blurb?: string; // "Why read this?" short text
  tags?: string[];
  pageCount?: number;
  publishedDate?: string;
}

export interface BookMetadata {
  title: string;
  author: string;
  isbn: string;
  coverUrl?: string;
  summary?: string;
  blurb?: string;
  tags?: string[];
  pageCount?: number;
  publishedDate?: string;
  category?: string;
}

export interface LibraryTransaction {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher';
  issueDate: Timestamp;
  dueDate: Timestamp;
  returnDate: Timestamp | null;
  status: 'issued' | 'returned' | 'overdue';
}

// FINANCE MODULE
export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYear: string;
  grade: string;
  feeType: string; // e.g., "Tuition", "Transport", "Uniform"
  amount: number;
  dueDate?: Timestamp;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  grade: string; // To easily filter payments by grade
  amount: number;
  paymentDate: Timestamp;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
  feeType: string; // e.g., "Tuition"
  status: 'completed' | 'pending' | 'failed';
  receiptNumber?: string;
  notes?: string;
  createdAt: Timestamp;
}

// EXAM SEATING MODULE
export interface ExamRoom {
  id: string;
  schoolId: string;
  name: string;
  rows: number;
  columns: number;
  capacity: number;
  building: string; // e.g., "Boys Section", "Girls Section"
}

export interface ExamSession {
  id: string;
  schoolId: string;
  name: string; // e.g., "Midterm Math"
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  grades: string[]; // e.g., ["Grade 9", "Grade 10"]
  major?: string; // e.g., "Boys' School" (Optional, for filtering/context)
  createdAt: Timestamp;
}

export interface ExamSeating {
  id: string; // Usually a composite or auto-id
  schoolId: string;
  sessionId: string;
  roomId: string;
  studentId: string;
  studentName: string;
  studentGrade: string;
  studentSection: string;
  studentMajor: string; // For filtering
  seatRow: number;
  seatCol: number;
  assignedAt: Timestamp;
}

// INVENTORY MODULE
export interface InventoryItem {
  id: string;
  schoolId: string;
  name: string;
  category: string; // e.g., "IT", "Furniture", "Supplies"
  quantity: number; // Total quantity owned
  availableQuantity: number; // Currently available for checkout
  location: string;
  purchaseDate: string; // YYYY-MM-DD
  value: number;
  status: 'active' | 'maintenance' | 'retired' | 'lost';

  // IT Specifics
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;

  // Supplies Specifics
  specifications?: { [key: string]: string }; // e.g., { "Ink Number": "950XL", "Color": "Black" }
  reorderPoint?: number;

  qrCode?: string; // Content for QR code
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InventoryCategory {
  id: string;
  schoolId: string;
  name: string; // "Printers", "Laptops", "Ink & Toner"
}

export interface InventoryTransaction {
  id: string;
  schoolId: string;
  itemId: string;
  itemName: string;
  userId?: string; // User who took the item (if applicable)
  userName?: string;
  userRole?: 'teacher' | 'student' | 'staff';
  type: 'check-out' | 'check-in' | 'consume' | 'add-stock' | 'remove-stock' | 'maintenance';
  quantity: number;
  date: Timestamp;
  dueDate?: Timestamp; // For check-outs
  returnedDate?: Timestamp; // For check-ins
  notes?: string;
  performedBy: string; // Admin who performed the action
}