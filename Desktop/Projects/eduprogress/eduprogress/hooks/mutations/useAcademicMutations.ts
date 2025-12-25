import { useQueryClient, useMutation } from '@tanstack/react-query';
import { db } from '../../services/firebase';
import { addDoc, updateDoc, deleteDoc, collection, doc, serverTimestamp } from 'firebase/firestore';

export const useAcademicMutations = () => {
    const queryClient = useQueryClient();

    // ============================================================
    // ASSESSMENT STRUCTURE MUTATIONS (using React Query useMutation)
    // ============================================================

    const createAssessmentStructureMutation = useMutation({
        mutationFn: async (data: any) => {
            const docRef = await addDoc(collection(db, 'assessmentStructures'), {
                ...data,
                createdAt: serverTimestamp()
            });
            return docRef;
        },
        onSuccess: (_, data) => {
            // Invalidate specific cache key
            queryClient.invalidateQueries({
                queryKey: ['assessmentStructures', data.schoolId, data.academicYear]
            });
        },
        onError: (error: any) => {
            console.error('Create Assessment Structure Failed:', error);
        }
    });

    const updateAssessmentStructureMutation = useMutation({
        mutationFn: async (data: { id: string; payload: any }) => {
            await updateDoc(doc(db, 'assessmentStructures', data.id), data.payload);
            return data.id;
        },
        onSuccess: (_, data) => {
            // Invalidate all assessment structures (update could affect multiple)
            queryClient.invalidateQueries({
                queryKey: ['assessmentStructures']
            });
        },
        onError: (error: any) => {
            console.error('Update Assessment Structure Failed:', error);
        }
    });

    const deleteAssessmentStructureMutation = useMutation({
        mutationFn: async (data: { id: string; schoolId: string; academicYear: string }) => {
            await deleteDoc(doc(db, 'assessmentStructures', data.id));
            return data.id;
        },
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: ['assessmentStructures', data.schoolId, data.academicYear]
            });
        },
        onError: (error: any) => {
            console.error('Delete Assessment Structure Failed:', error);
        }
    });

    // ============================================================
    // EXAM SESSION MUTATIONS
    // ============================================================

    const createExamSessionMutation = useMutation({
        mutationFn: async (data: any) => {
            const docRef = await addDoc(collection(db, 'examSessions'), {
                ...data,
                createdAt: serverTimestamp()
            });
            return docRef;
        },
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: ['examManagement', data.schoolId, data.academicYear]
            });
        },
        onError: (error: any) => {
            console.error('Create Exam Session Failed:', error);
        }
    });

    const updateExamSessionMutation = useMutation({
        mutationFn: async (data: { id: string; payload: any }) => {
            await updateDoc(doc(db, 'examSessions', data.id), data.payload);
            return data.id;
        },
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: ['examManagement']
            });
        },
        onError: (error: any) => {
            console.error('Update Exam Session Failed:', error);
        }
    });

    const deleteExamSessionMutation = useMutation({
        mutationFn: async (data: { id: string; schoolId: string; academicYear: string }) => {
            await deleteDoc(doc(db, 'examSessions', data.id));
            return data.id;
        },
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: ['examManagement', data.schoolId, data.academicYear]
            });
        },
        onError: (error: any) => {
            console.error('Delete Exam Session Failed:', error);
        }
    });

    // ============================================================
    // PROGRESS REPORT MUTATIONS
    // ============================================================

    const createProgressReportMutation = useMutation({
        mutationFn: async (data: any) => {
            const docRef = await addDoc(collection(db, 'progressReports'), {
                ...data,
                createdAt: serverTimestamp()
            });
            return docRef;
        },
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: ['progressReports', data.schoolId, data.academicYearId]
            });
        },
        onError: (error: any) => {
            console.error('Create Progress Report Failed:', error);
        }
    });

    const updateProgressReportMutation = useMutation({
        mutationFn: async (data: { id: string; payload: any }) => {
            await updateDoc(doc(db, 'progressReports', data.id), data.payload);
            return data.id;
        },
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: ['progressReports']
            });
        },
        onError: (error: any) => {
            console.error('Update Progress Report Failed:', error);
        }
    });

    const deleteProgressReportMutation = useMutation({
        mutationFn: async (data: { id: string; schoolId: string; academicYearId: string }) => {
            await deleteDoc(doc(db, 'progressReports', data.id));
            return data.id;
        },
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: ['progressReports', data.schoolId, data.academicYearId]
            });
        },
        onError: (error: any) => {
            console.error('Delete Progress Report Failed:', error);
        }
    });

    // ============================================================
    // WRAPPER FUNCTIONS FOR BACKWARD COMPATIBILITY
    // ============================================================

    const createAssessmentStructure = async (data: any) => {
        return createAssessmentStructureMutation.mutateAsync(data);
    };

    const updateAssessmentStructure = async (id: string, payload: any) => {
        return updateAssessmentStructureMutation.mutateAsync({ id, payload });
    };

    const deleteAssessmentStructure = async (id: string, schoolId: string, academicYear: string) => {
        return deleteAssessmentStructureMutation.mutateAsync({ id, schoolId, academicYear });
    };

    const createExamSession = async (data: any) => {
        return createExamSessionMutation.mutateAsync(data);
    };

    const updateExamSession = async (id: string, payload: any) => {
        return updateExamSessionMutation.mutateAsync({ id, payload });
    };

    const deleteExamSession = async (id: string, schoolId: string, academicYear: string) => {
        return deleteExamSessionMutation.mutateAsync({ id, schoolId, academicYear });
    };

    const createProgressReport = async (data: any) => {
        return createProgressReportMutation.mutateAsync(data);
    };

    const updateProgressReport = async (id: string, payload: any) => {
        return updateProgressReportMutation.mutateAsync({ id, payload });
    };

    const deleteProgressReport = async (id: string, schoolId: string, academicYearId: string) => {
        return deleteProgressReportMutation.mutateAsync({ id, schoolId, academicYearId });
    };

    return {
        // Wrapper functions (for backward compatibility with AssessmentSetup.tsx)
        createAssessmentStructure,
        updateAssessmentStructure,
        deleteAssessmentStructure,
        createExamSession,
        updateExamSession,
        deleteExamSession,
        createProgressReport,
        updateProgressReport,
        deleteProgressReport,
        
        // Mutation objects (for advanced usage with loading/error states)
        createAssessmentStructureMutation,
        updateAssessmentStructureMutation,
        deleteAssessmentStructureMutation,
        createExamSessionMutation,
        updateExamSessionMutation,
        deleteExamSessionMutation,
        createProgressReportMutation,
        updateProgressReportMutation,
        deleteProgressReportMutation
    };
};