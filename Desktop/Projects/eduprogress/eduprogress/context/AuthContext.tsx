import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  currentUserData: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserData, setCurrentUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (!user) {
        setCurrentUserData(null);
        setProfileLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser) {
      setProfileLoading(true);
      const fetchUserProfile = async () => {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as any;

            // Normalize role to ensure it's always an array
            let roles: string[] = [];
            if (Array.isArray(data.role)) {
              roles = data.role;
            } else if (typeof data.role === 'string') {
              // Handle "stringified" array (e.g. "[\"admin\"]") which happens in manual console edits
              if (data.role.trim().startsWith('[') && data.role.trim().endsWith(']')) {
                try {
                  const parsed = JSON.parse(data.role);
                  if (Array.isArray(parsed)) roles = parsed;
                  else roles = [data.role];
                } catch (e) {
                  roles = [data.role];
                }
              } else {
                roles = [data.role];
              }
            }

            setCurrentUserData({ ...data, role: roles } as UserProfile);
          } else {
            console.error("Error: User is authenticated but no profile document was found.");
            setCurrentUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setCurrentUserData(null);
        } finally {
          setProfileLoading(false);
        }
      };

      fetchUserProfile();
    }
  }, [currentUser]);

  const value = {
    currentUser,
    currentUserData,
    loading,
    profileLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
