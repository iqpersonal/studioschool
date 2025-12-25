import React from 'react';
import { useAcademicYear } from '../../hooks/useAcademicYear';
import { useAuth } from '../../hooks/useAuth';
import Select from '../ui/Select';
import Label from '../ui/Label';

const AcademicYearSelector: React.FC = () => {
    const { academicYears, selectedAcademicYear, setSelectedAcademicYear, loadingYears } = useAcademicYear();
    const { currentUserData } = useAuth();

    if (loadingYears || academicYears.length === 0) {
        return null; // Don't render if loading or no years are available
    }

    const userRoles = Array.isArray(currentUserData?.role) ? currentUserData.role : (currentUserData?.role ? [currentUserData.role] : []);
    const isSchoolAdmin = userRoles.includes('school-admin');

    if (!isSchoolAdmin) {
        return (
            <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground hidden sm:block">Academic Year:</span>
                <span className="text-sm font-medium px-3 py-1.5 bg-muted rounded-md border border-input">
                    {selectedAcademicYear}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-2">
            <Label htmlFor="academic-year-selector" className="text-sm text-muted-foreground whitespace-nowrap hidden sm:block">Academic Year:</Label>
            <Select
                id="academic-year-selector"
                value={selectedAcademicYear}
                onChange={e => setSelectedAcademicYear(e.target.value)}
                className="h-9 w-36 text-sm"
                aria-label="Select Academic Year"
            >
                {academicYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </Select>
        </div>
    );
};

export default AcademicYearSelector;
