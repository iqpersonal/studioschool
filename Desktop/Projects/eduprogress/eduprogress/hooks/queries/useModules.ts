import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface Module {
  id: string;
  moduleName: string;
  description: string;
  status: 'active' | 'inactive';
  icon: string;
  createdAt?: any;
}

export interface School {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: any;
}

export interface SchoolModule {
  id: string;
  schoolId: string;
  moduleId: string;
  moduleName: string;
  status: 'enabled' | 'disabled';
  assignedAt?: any;
}

interface ModulesData {
  modules: Module[];
  schools: School[];
  schoolModules: SchoolModule[];
  modulesError: string | null;
  schoolsError: string | null;
  schoolModulesError: string | null;
}

const fetchModulesData = async (): Promise<ModulesData> => {
  let modulesError = null as string | null;
  let schoolsError = null as string | null;
  let schoolModulesError = null as string | null;

  // Parallel fetch: modules, schools, schoolModules (same pattern as Phase 3A)
  const [modulesResult, schoolsResult, schoolModulesResult] = await Promise.all([
    // Modules collection
    getDocs(query(collection(db, 'modules'), orderBy('createdAt', 'desc'))).catch(err => {
      console.error('Error fetching modules:', err);
      modulesError = err.message;
      return null;
    }),
    // Schools collection
    getDocs(collection(db, 'schools')).catch(err => {
      console.error('Error fetching schools:', err);
      schoolsError = err.message;
      return null;
    }),
    // SchoolModules collection
    getDocs(collection(db, 'schoolModules')).catch(err => {
      console.error('Error fetching schoolModules:', err);
      schoolModulesError = err.message;
      return null;
    }),
  ]);

  const modules: Module[] = modulesResult
    ? modulesResult.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module))
    : [];

  const schools: School[] = schoolsResult
    ? schoolsResult.docs.map(doc => ({ id: doc.id, ...doc.data() } as School))
    : [];

  const schoolModules: SchoolModule[] = schoolModulesResult
    ? schoolModulesResult.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolModule))
    : [];

  return {
    modules,
    schools,
    schoolModules,
    modulesError,
    schoolsError,
    schoolModulesError,
  };
};

export const useModules = () => {
  return useQuery({
    queryKey: ['modules'],
    queryFn: fetchModulesData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes for cleanup
    retry: 1,
  });
};
