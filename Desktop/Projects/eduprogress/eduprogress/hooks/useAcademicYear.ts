import { useContext } from 'react';
import { AcademicYearContext } from '../context/AcademicYearContext';

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};
