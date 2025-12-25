import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import Loader from '../components/ui/Loader';

const Profile: React.FC = () => {
    const { currentUser, currentUserData, profileLoading } = useAuth();
    const [name, setName] = useState('');
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);


    useEffect(() => {
        if (currentUserData) {
            setName(currentUserData.name || '');
        }
    }, [currentUserData]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsSavingProfile(true);
        setProfileMessage(null);

        try {
            await Promise.all([
                updateProfile(currentUser, { displayName: name }),
                updateDoc(doc(db, 'users', currentUser.uid), { name })
            ]);
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error(error);
            setProfileMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !currentUser.email) return;

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: "New passwords do not match." });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: "New password must be at least 6 characters long." });
            return;
        }

        setIsChangingPassword(true);
        setPasswordMessage(null);

        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);

            setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                setPasswordMessage({ type: 'error', text: 'Incorrect current password.' });
            } else {
                setPasswordMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (profileLoading) return <Loader />;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <form onSubmit={handleProfileUpdate}>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your display name.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={currentUserData?.email || ''} disabled />
                            </div>
                            {profileMessage && (
                                <p className={`text-sm ${profileMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                                    {profileMessage.text}
                                </p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSavingProfile}>
                                {isSavingProfile ? 'Saving...' : 'Save Profile'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                <Card>
                    <form onSubmit={handlePasswordChange}>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Change your password.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                            {passwordMessage && (
                                <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                                    {passwordMessage.text}
                                </p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isChangingPassword}>
                                {isChangingPassword ? 'Changing...' : 'Change Password'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Profile;