import React, { useState, useMemo } from 'react';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { useModules } from '../hooks/queries/useModules';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import CreateEditModuleModal from '../components/modules/CreateEditModuleModal';
import AssignModuleModal from '../components/modules/AssignModuleModal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Loader from '../components/ui/Loader';

const Modules: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Use React Query hook for modules data
  const { data, isLoading, isError, error } = useModules();
  
  const modules = data?.modules || [];
  const schools = data?.schools || [];
  const schoolModules = data?.schoolModules || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<typeof modules[0] | null>(null);

  const [moduleToDelete, setModuleToDelete] = useState<typeof modules[0] | null>(null);
  const [assignmentToRemove, setAssignmentToRemove] = useState<typeof schoolModules[0] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const moduleAssignments = useMemo(() => {
    const assignmentsMap = new Map<string, { school: typeof schools[0]; assignment: typeof schoolModules[0] }[]>();
    modules.forEach(module => assignmentsMap.set(module.id, []));

    schoolModules.forEach(assignment => {
      const school = schools.find(s => s.id === assignment.schoolId);
      if (school) {
        const currentAssignments = assignmentsMap.get(assignment.moduleId) || [];
        assignmentsMap.set(assignment.moduleId, [...currentAssignments, { school, assignment }]);
      }
    });

    return assignmentsMap;
  }, [modules, schools, schoolModules]);

  const handleEdit = (module: typeof modules[0]) => {
    setSelectedModule(module);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedModule(null);
    setIsModalOpen(true);
  };

  const handleAddSchool = (module: typeof modules[0]) => {
    setSelectedModule(module);
    setIsAssignModalOpen(true);
  };

  const handleDeleteModule = (module: typeof modules[0]) => {
    setModuleToDelete(module);
  };

  const handleConfirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    setIsDeleting(true);
    try {
      const assignmentsToDelete = schoolModules.filter(sm => sm.moduleId === moduleToDelete.id);

      const batch = writeBatch(db);

      const moduleRef = doc(db, 'modules', moduleToDelete.id);
      batch.delete(moduleRef);

      assignmentsToDelete.forEach(assignment => {
        const assignmentRef = doc(db, 'schoolModules', assignment.id);
        batch.delete(assignmentRef);
      });

      await batch.commit();
      
      // Invalidate cache after successful deletion
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    } catch (err) {
      console.error("Error performing cascading delete for module: ", err);
      alert('Failed to delete module and its assignments.');
    } finally {
      setIsDeleting(false);
      setModuleToDelete(null);
    }
  };

  const handleRemoveAssignment = (assignment: typeof schoolModules[0]) => {
    setAssignmentToRemove(assignment);
  };

  const handleConfirmRemoveAssignment = async () => {
    if (!assignmentToRemove) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'schoolModules', assignmentToRemove.id));
      
      // Invalidate cache after successful removal
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    } catch (err) {
      console.error("Error removing assignment: ", err);
      alert('Failed to remove school from module.');
    } finally {
      setIsDeleting(false);
      setAssignmentToRemove(null);
    }
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Manage Modules</h1>
          <Button onClick={handleCreate}>Create New Module</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Available Modules</CardTitle>
            <CardDescription>
              Define and manage features, and assign them to schools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader />
            ) : isError ? (
              <p className="text-destructive">Error: {error?.message || 'Failed to load modules'}</p>
            ) : modules.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-lg font-semibold">No Modules Found</h3>
                <p className="text-sm text-muted-foreground">Get started by creating a new module.</p>
                <Button className="mt-4" onClick={handleCreate}>Create Module</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(module => {
                  const assignments = moduleAssignments.get(module.id) || [];
                  return (
                    <Card key={module.id} className="flex flex-col">
                      <CardHeader className="flex-grow">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{module.moduleName}</CardTitle>
                          <span className={`capitalize text-xs font-medium px-2 py-1 rounded-full ${module.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>{module.status}</span>
                        </div>
                        <CardDescription>{module.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col justify-between flex-grow">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Assigned Schools</h4>
                          <div className="space-y-2 h-24 overflow-y-auto pr-2">
                            {assignments.length > 0 ? assignments.map(({ school, assignment }) => (
                              <div key={school.id} className="flex items-center justify-between text-sm bg-secondary/50 p-2 rounded-md">
                                <span className="text-secondary-foreground">{school.name}</span>
                                <Button variant="destructive" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveAssignment(assignment)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </Button>
                              </div>
                            )) : (
                              <p className="text-xs text-muted-foreground">No schools have this module enabled.</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2 mt-4 border-t pt-4">
                          <Button variant="outline" size="sm" onClick={() => handleAddSchool(module)}>Add School</Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(module)}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteModule(module)}>Delete</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateEditModuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        module={selectedModule}
      />
      {selectedModule && (
        <AssignModuleModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          module={selectedModule}
          assignedSchoolIds={(moduleAssignments.get(selectedModule.id) || []).map(a => a.school.id)}
        />
      )}
      {moduleToDelete && (
        <ConfirmationModal
          isOpen={!!moduleToDelete}
          onClose={() => setModuleToDelete(null)}
          onConfirm={handleConfirmDeleteModule}
          title="Delete Module?"
          message={<>
            <p>Are you sure you want to delete the <strong>{moduleToDelete.moduleName}</strong> module? This cannot be undone.</p>
            <p className="mt-2 text-sm font-semibold text-destructive">
              Warning: This will also remove the module from all schools that currently have it assigned.
            </p>
          </>}
          confirmText="Delete Module & Unassign"
          loading={isDeleting}
        />
      )}
      {assignmentToRemove && (
        <ConfirmationModal
          isOpen={!!assignmentToRemove}
          onClose={() => setAssignmentToRemove(null)}
          onConfirm={handleConfirmRemoveAssignment}
          title="Remove School from Module?"
          message={<p>Are you sure you want to remove this module from <strong>{schools.find(s => s.id === assignmentToRemove.schoolId)?.name}</strong>?</p>}
          confirmText="Yes, Remove"
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default Modules;
