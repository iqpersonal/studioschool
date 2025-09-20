export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    role: 'student' | 'parent' | 'instructor';
    createdAt: Date;
    updatedAt: Date;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    instructorId: string;
    lessons: Lesson[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Lesson {
    id: string;
    title: string;
    content: string;
    quizId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Quiz {
    id: string;
    title: string;
    questions: Question[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Question {
    id: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
}

export interface Activity {
    userId: string;
    courseId: string;
    lessonId: string;
    completedAt: Date;
}

export interface Analytics {
    userId: string;
    courseId: string;
    engagementScore: number;
    performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
    quizzesTaken: number;
    averageScore: number;
    lessonsCompleted: number;
}

export interface Payment {
    id: string;
    userId: string;
    courseId: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}