import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { School } from '../types';

interface AcademicYearContextType {
    academicYears: string[];
    selectedAcademicYear: string;
    setSelectedAcademicYear: (year: string) => void;
    loadingYears: boolean;
}

export const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export const AcademicYearProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUserData } = useAuth();
    const [academicYears, setAcademicYears] = useState<string[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingYears, setLoadingYears] = useState(true);

    useEffect(() => {
        if (!currentUserData?.schoolId) {
            setLoadingYears(false);
            return;
        }
        setLoadingYears(true);

        const schoolId = currentUserData.schoolId;

        // Revert: Fetch all users for the school to find unique academic years
        // This is what the user requested: "list it from the users table"
        const usersQuery = query(collection(db, 'users'), where('schoolId', '==', schoolId));
        const usersPromise = getDocs(usersQuery);

        const schoolRef = doc(db, 'schools', schoolId);
        const schoolPromise = getDoc(schoolRef);

        Promise.all([usersPromise, schoolPromise]).then(([usersSnapshot, schoolDoc]) => {
            const years = new Set<string>();

            // Add years found in user profiles
            usersSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.academicYear && typeof data.academicYear === 'string' && data.academicYear.trim() !== '') {
                    years.add(data.academicYear.trim());
                }
            });

            let activeYear = '';
            if (schoolDoc.exists()) {
                const schoolData = schoolDoc.data() as School;
                if (schoolData.activeAcademicYear) {
                    activeYear = schoolData.activeAcademicYear;
                    years.add(activeYear); // Ensure active year is always in the list
                }
            }

            const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
            setAcademicYears(sortedYears);

            if (activeYear && sortedYears.includes(activeYear)) {
                setSelectedAcademicYear(activeYear);
            } else if (sortedYears.length > 0) {
                setSelectedAcademicYear(sortedYears[0]);
            }
        }).catch(error => {
            console.error("Error fetching academic years:", error);
        }).finally(() => {
            setLoadingYears(false);
        });
    }, [currentUserData?.schoolId]);

    const value = { academicYears, selectedAcademicYear, setSelectedAcademicYear, loadingYears };

    return (
        <AcademicYearContext.Provider value={value}>
            {children}
        </AcademicYearContext.Provider>
    );
};