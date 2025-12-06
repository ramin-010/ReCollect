'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { ContentCard } from '@/components/content/ContentCard';
import { User, Settings, Mail, Bell, Archive, Heart, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { useViewStore } from '@/lib/store/viewStore';
import { userApi } from '@/lib/api/user';
import { Content as ContentType } from '@/lib/utils/types';
import { useEffect } from 'react';

type TabType = 'profile' | 'archived' | 'favorites';

export function UserSettings() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const dashboards = useDashboardStore((state) => state.dashboards);
  const setCurrentView = useViewStore((state) => state.setCurrentView);
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [archivedNotesData, setArchivedNotesData] = useState<ContentType[]>([]);
  const [favoriteNotesData, setFavoriteNotesData] = useState<ContentType[]>([]);
  
  // Profile form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    reminderEmail: user?.reminderEmail || user?.email || '',
  });

  // Fetch archived and favorite notes from API
  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoadingNotes(true);
      try {
        const response = await userApi.getSettings();
        if (response.success && response.data) {
          setArchivedNotesData(response.data.archivedNotes);
          setFavoriteNotesData(response.data.favoriteNotes);
        }
      } catch (error) {
        console.error('Failed to fetch user settings:', error);
        toast.error('Failed to load archived and favorite notes');
      } finally {
        setIsLoadingNotes(false);
      }
    };

    fetchNotes();
  }, []);

  // Use fetched data for notes
  const archivedNotes = useMemo(() => {
    return archivedNotesData.map(content => ({
      content,
      dashboardId: '', // Not needed since we're not filtering by dashboard anymore
      dashboardName: 'Archived'
    })).sort((a, b) => 
      new Date(b.content.updatedAt).getTime() - new Date(a.content.updatedAt).getTime()
    );
  }, [archivedNotesData]);

  const favoriteNotes = useMemo(() => {
    return favoriteNotesData.map(content => ({
      content,
      dashboardId: '', // Not needed since we're not filtering by dashboard anymore
      dashboardName: 'Favorite'
    })).sort((a, b) => 
      new Date(b.content.updatedAt).getTime() - new Date(a.content.updatedAt).getTime()
    );
  }, [favoriteNotesData]);

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await axiosInstance.patch('/api/update-profile', {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        reminderEmail: formData.reminderEmail.trim() || formData.email,
      });

      if (response.data?.success && response.data?.data) {
        setUser(response.data.data);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error: any) {
      toast.error('Failed to update profile', {
        description: error.response?.data?.message || 'Something went wrong.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      reminderEmail: user?.reminderEmail || user?.email || '',
    });
    setIsEditing(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'U';
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'archived' as TabType, label: 'Archived', icon: Archive, count: archivedNotes.length },
    { id: 'favorites' as TabType, label: 'Favorites', icon: Heart, count: favoriteNotes.length },
  ];

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--brand-primary))]/10 to-[hsl(var(--brand-primary))]/5 flex items-center justify-center border border-[hsl(var(--brand-primary))]/20">
                <Settings className="h-5 w-5 text-[hsl(var(--brand-primary))]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Manage your account and preferences
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setCurrentView('dashboard')}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              className="hover:bg-[hsl(var(--muted))]"
            >
              Back
            </Button>
          </div>
        </motion.div>

        {/* Main Layout - Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:w-64 shrink-0"
          >
            <Card variant="elevated" padding="sm" className="sticky top-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg
                        transition-all duration-200 text-left group
                        ${isActive 
                          ? 'bg-gradient-to-r from-[hsl(var(--brand-primary))]/10 to-[hsl(var(--brand-primary))]/5 text-[hsl(var(--brand-primary))] shadow-sm border border-[hsl(var(--brand-primary))]/20' 
                          : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          p-2 rounded-lg transition-colors
                          ${isActive 
                            ? 'bg-[hsl(var(--brand-primary))]/10' 
                            : 'bg-[hsl(var(--muted))] group-hover:bg-[hsl(var(--muted))]/80'
                          }
                        `}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{tab.label}</span>
                      </div>
                      
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`
                          px-2.5 py-1 text-xs font-semibold rounded-full
                          ${isActive 
                            ? 'bg-[hsl(var(--brand-primary))] text-white' 
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          }
                        `}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </motion.aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Profile Card with Gradient */}
                  <Card variant="elevated" padding="none" className="overflow-hidden">
                    {/* Gradient Header */}
                    <div className="relative h-32 bg-gradient-to-br from-[hsl(var(--brand-primary))] via-[hsl(var(--brand-primary))]/90 to-[hsl(var(--brand-secondary))] overflow-hidden">
                      <div 
                        className="absolute inset-0 opacity-10"
                        style={{
                          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                          backgroundSize: '24px 24px'
                        }}
                      />
                    </div>
                    
                    {/* Profile Info */}
                    <div className="relative px-6 pb-6">
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
                        <div className="flex items-end gap-4">
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-[hsl(var(--card))]">
                            {getInitials(user?.name)}
                          </div>
                          <div className="pb-2">
                            <h2 className="text-2xl font-bold mb-1">{user?.name}</h2>
                            <p className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5" />
                              {user?.email}
                            </p>
                          </div>
                        </div>
                        
                        {!isEditing && (
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                            leftIcon={<Settings className="h-4 w-4" />}
                            className="shrink-0"
                          >
                            Edit Profile
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Profile Form Card */}
                  <Card variant="elevated" padding="lg">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-1">Personal Information</h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Update your personal details and contact information
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                          label="Full Name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          disabled={!isEditing}
                          leftIcon={<User className="h-4 w-4" />}
                          placeholder="Your name"
                          className="bg-[hsl(var(--surface-light))]"
                        />

                        <Input
                          label="Email Address"
                          value={formData.email}
                          disabled
                          leftIcon={<Mail className="h-4 w-4" />}
                          hint="Email cannot be changed"
                          className="bg-[hsl(var(--muted))]/30"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                          label="Phone Number"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          disabled={!isEditing}
                          leftIcon={<User className="h-4 w-4" />}
                          placeholder="+1 (555) 000-0000"
                          className="bg-[hsl(var(--surface-light))]"
                        />

                        <Input
                          label="Reminder Email"
                          value={formData.reminderEmail}
                          onChange={(e) => setFormData({ ...formData, reminderEmail: e.target.value })}
                          disabled={!isEditing}
                          leftIcon={<Bell className="h-4 w-4" />}
                          placeholder="Email for reminders"
                          hint="Receive reminder notifications at this email"
                          className="bg-[hsl(var(--surface-light))]"
                        />
                      </div>

                      {isEditing && (
                        <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
                          <Button
                            variant="primary"
                            onClick={handleSaveProfile}
                            isLoading={isSaving}
                            leftIcon={<Save className="h-4 w-4" />}
                            className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 shadow-md shadow-[hsl(var(--brand-primary))]/20"
                          >
                            Save Changes
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="hover:bg-[hsl(var(--muted))]"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'archived' && (
                <motion.div
                  key="archived"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Archived Notes</h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {archivedNotes.length} {archivedNotes.length === 1 ? 'note' : 'notes'} archived
                    </p>
                  </div>

                  {archivedNotes.length === 0 ? (
                    <Card variant="elevated" padding="lg" className="text-center">
                      <div className="py-12">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[hsl(var(--muted))]/30 flex items-center justify-center">
                          <Archive className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No archived notes</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                          Notes you archive will appear here for safekeeping
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {archivedNotes.map(({ content, dashboardId, dashboardName }, index) => (
                        <motion.div
                          key={content._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <div className="relative">
                            <div className="absolute -top-2 left-4 z-10">
                              <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] text-white rounded-lg shadow-md">
                                {dashboardName}
                              </span>
                            </div>
                            <ContentCard
                              content={content}
                              dashboardId={dashboardId}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'favorites' && (
                <motion.div
                  key="favorites"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Favorite Notes</h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {favoriteNotes.length} {favoriteNotes.length === 1 ? 'note' : 'notes'} pinned
                    </p>
                  </div>

                  {favoriteNotes.length === 0 ? (
                    <Card variant="elevated" padding="lg" className="text-center">
                      <div className="py-12">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[hsl(var(--muted))]/30 flex items-center justify-center">
                          <Heart className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No favorite notes</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                          Pin your important notes to quick access them here
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {favoriteNotes.map(({ content, dashboardId, dashboardName }, index) => (
                        <motion.div
                          key={content._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <div className="relative">
                            <div className="absolute -top-2 left-4 z-10">
                              <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] text-white rounded-lg shadow-md">
                                {dashboardName}
                              </span>
                            </div>
                            <ContentCard
                              content={content}
                              dashboardId={dashboardId}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
