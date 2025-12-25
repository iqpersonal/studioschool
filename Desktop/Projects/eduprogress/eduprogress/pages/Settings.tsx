import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { GlobalSettings } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';

const Settings: React.FC = () => {
    const [settings, setSettings] = useState<Partial<GlobalSettings>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef,
            (doc) => {
                if (doc.exists) {
                    setSettings(doc.data() as GlobalSettings);
                } else {
                    // Set default values if the doc doesn't exist
                    setSettings({
                        systemEmail: '',
                        contactPhone: '',
                        // aiProviderKey removed
                        defaultCurrency: 'SAR',
                        maxSchools: 100,
                    });
                }
                setLoading(false);
            },
            (err) => {
                console.error("Error fetching settings:", err);
                setError("Failed to load settings.");
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setSettings(prev => ({ ...prev, [id]: type === 'number' ? Number(value) : value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
            alert('Settings saved successfully!');
        } catch (err) {
            console.error("Error saving settings:", err);
            setError("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>Loading settings...</p>;
    if (error) return <p className="text-destructive">{error}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            {/* FIX: Ensured Tabs component is correctly structured to prevent type errors. */}
            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Configuration</CardTitle>
                            <CardDescription>Manage platform-wide settings and defaults.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="systemEmail">System Email</Label>
                                    <Input id="systemEmail" type="email" value={settings.systemEmail || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Contact Phone</Label>
                                    <Input id="contactPhone" type="tel" value={settings.contactPhone || ''} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                                    <Input id="defaultCurrency" value={settings.defaultCurrency || 'SAR'} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maxSchools">Max Schools Limit</Label>
                                    <Input id="maxSchools" type="number" value={settings.maxSchools || 0} onChange={handleInputChange} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications">
                    <Card>
                        <CardHeader><CardTitle>Notification Settings</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">Notification configuration will be here.</p></CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader><CardTitle>Security & API Keys</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    API Keys are now securely managed by the system administrator via the backend.
                                    You do not need to configure them here.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save All Settings'}
                </Button>
            </div>
        </div>
    );
};

export default Settings;