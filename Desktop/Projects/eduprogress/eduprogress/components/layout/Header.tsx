
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../services/firebase';
// FIX: signOut is a method on auth object in v8, not a separate import.
// import { signOut } from 'firebase/auth';
import Button from '../ui/Button';
import ModeToggle from '../ui/ModeToggle';
import AcademicYearSelector from './AcademicYearSelector';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { currentUserData } = useAuth();
  const userRoles = Array.isArray(currentUserData?.role) ? currentUserData.role : (currentUserData?.role ? [currentUserData.role] : []);
  const isSuperAdmin = userRoles.includes('super-admin');

  const handleLogout = () => {
    // FIX: Use auth.signOut() for v8
    auth.signOut();
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white/10 backdrop-blur-md border-b border-white/20 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        className="lg:hidden text-muted-foreground"
        onClick={() => setSidebarOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        <span className="sr-only">Open sidebar</span>
      </button>

      {/* Spacer to push content to the right on mobile */}
      <div className="lg:hidden flex-1"></div>

      {/* Right side content */}
      <div className="flex items-center space-x-4 ml-auto">
        {!isSuperAdmin && <AcademicYearSelector />}
        <ModeToggle />
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{currentUserData?.name || 'Admin User'}</p>
            <p className="text-xs text-muted-foreground">{currentUserData?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;