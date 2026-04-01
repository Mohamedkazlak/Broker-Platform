import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBroker } from '@/contexts/BrokerContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, User, Building2, Lock } from 'lucide-react';

const DashboardSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const { broker } = useBroker();

  const fullNameParts = (profile?.full_name || '').split(' ');

  const [personalForm, setPersonalForm] = useState({
    first_name: fullNameParts[0] || '',
    last_name: fullNameParts.slice(1).join(' ') || '',
    email: profile?.email || user?.email || '',
    phone: broker?.phone_number || '',
    whatsapp: broker?.whatsapp_number || '',
  });

  const [platformForm, setPlatformForm] = useState({
    platform_name: broker?.platform_name || '',
    domain: broker?.subdomain || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm_password: '',
  });

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePersonal = async () => {
    setSavingPersonal(true);
    try {
      const fullName = `${personalForm.first_name} ${personalForm.last_name}`.trim();

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: fullName, email: personalForm.email })
          .eq('id', user.id);

        if (error) throw error;
      }

      if (broker && broker.id !== 'demo-broker-id') {
        const { error } = await supabase
          .from('brokers')
          .update({ phone_number: personalForm.phone, whatsapp_number: personalForm.whatsapp, email: personalForm.email })
          .eq('id', broker.id);

        if (error) throw error;
      }

      toast({ title: 'Personal info updated successfully' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSavePlatform = async () => {
    setSavingPlatform(true);
    try {
      if (broker && broker.id !== 'demo-broker-id') {
        const { error } = await supabase
          .from('brokers')
          .update({ platform_name: platformForm.platform_name, subdomain: platformForm.domain })
          .eq('id', broker.id);

        if (error) throw error;
      }

      toast({ title: 'Platform settings updated successfully' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password });
      if (error) throw error;

      setPasswordForm({ new_password: '', confirm_password: '' });
      toast({ title: 'Password changed successfully' });
    } catch (err: any) {
      toast({ title: 'Error changing password', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and platform settings</p>
          </div>
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </div>
            <CardDescription>Update your name and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={personalForm.first_name}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={personalForm.last_name}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={personalForm.email}
                onChange={(e) => setPersonalForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={personalForm.whatsapp}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, whatsapp: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSavePersonal} disabled={savingPersonal}>
                <Save className="h-4 w-4 mr-2" />
                {savingPersonal ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Platform Settings</CardTitle>
            </div>
            <CardDescription>Configure your platform name and domain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform_name">Platform Name</Label>
              <Input
                id="platform_name"
                value={platformForm.platform_name}
                onChange={(e) => setPlatformForm((p) => ({ ...p, platform_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                value={platformForm.domain}
                onChange={(e) => setPlatformForm((p) => ({ ...p, domain: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSavePlatform} disabled={savingPlatform}>
                <Save className="h-4 w-4 mr-2" />
                {savingPlatform ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Change Password</CardTitle>
            </div>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={savingPassword}>
                <Lock className="h-4 w-4 mr-2" />
                {savingPassword ? 'Updating...' : 'Change Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSettings;
