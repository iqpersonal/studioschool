import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Toaster } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <ErrorBoundary scope="global">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AcademicYearProvider>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <AppShell />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
                <Toaster />
              </Router>
            </ThemeProvider>
          </AcademicYearProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
