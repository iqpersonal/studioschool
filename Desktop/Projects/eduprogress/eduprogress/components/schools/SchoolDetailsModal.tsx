import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { School, UserProfile } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ManageAdminModal from './ManageAdminModal';

interface SchoolDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
}

const DetailItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  value ? (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  ) : null
);

const SchoolDetailsModal: React.FC<SchoolDetailsModalProps> = ({ isOpen, onClose, school }) => {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [errorAdmins, setErrorAdmins] = useState<string | null>(null);
  const [isManageAdminModalOpen, setIsManageAdminModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isOpen && school) {
      setLoadingAdmins(true);
      setErrorAdmins(null);

      const adminsQuery = query(
        collection(db, 'users'),
        where('schoolId', '==', school.id),
        where('role', 'array-contains', 'school-admin')
      );

      const unsubscribe = onSnapshot(adminsQuery,
        snapshot => {
          const adminData = snapshot.docs.map(doc => doc.data() as UserProfile)
            .filter(admin => admin.status !== 'archived');
          setAdmins(adminData);
          setLoadingAdmins(false);
        },
        err => {
          console.error("Error fetching school admins:", err);
          setErrorAdmins("Failed to fetch administrator details.");
          setLoadingAdmins(false);
        }
      );
      return () => unsubscribe();
    }
  }, [isOpen, school]);

  const handleManageAdmin = (admin: UserProfile) => {
    setSelectedAdmin(admin);
    setIsManageAdminModalOpen(true);
  };

  const SchoolIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-muted-foreground">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  );

  const AdminIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-muted-foreground">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
    </svg>
  );


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="School Details">
        <div className="space-y-6">
          {/* School Info Section */}
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0 border">
              {school.logoURL ? (
                <img src={school.logoURL} alt={`${school.name} logo`} className="w-full h-full rounded-lg object-cover" />
              ) : <SchoolIcon />}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-foreground">{school.name}</h4>
              <p className="text-sm text-muted-foreground capitalize">
                <span className={`capitalize text-xs font-medium px-2 py-1 rounded-full ${school.subscriptionTier === 'premium' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                  school.subscriptionTier === 'basic' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>{school.subscriptionTier} Tier</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
            <DetailItem label="Contact Email" value={school.contactEmail} />
            <DetailItem label="Contact Phone" value={school.contactPhone} />
            <DetailItem label="Address" value={school.address} />
          </div>

          {/* Admins Section */}
          <div>
            <h5 className="text-md font-semibold text-foreground mb-3 border-t pt-4">School Administrators</h5>
            {loadingAdmins ? (
              <p className="text-sm text-muted-foreground">Loading administrators...</p>
            ) : errorAdmins ? (
              <p className="text-sm text-destructive">{errorAdmins}</p>
            ) : admins.length > 0 ? (
              <div className="space-y-3">
                {admins.map(admin => (
                  <div key={admin.uid} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                    <div className="flex items-center space-x-3">
                      <AdminIcon />
                      <div>
                        <p className="text-sm font-medium text-foreground">{admin.name}</p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleManageAdmin(admin)}>Manage</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No administrators have been assigned to this school.</p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>

      {selectedAdmin && (
        <ManageAdminModal
          isOpen={isManageAdminModalOpen}
          onClose={() => setIsManageAdminModalOpen(false)}
          admin={selectedAdmin}
        />
      )}
    </>
  );
};

export default SchoolDetailsModal;