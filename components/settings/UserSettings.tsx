'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { ContentCard } from '@/components/content/ContentCard';
import { User, Settings, Mail, Bell, Archive, Heart, Save, ArrowLeft, Lock, KeyRound, CheckCircle2, X, Edit, Camera } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { useViewStore } from '@/lib/store/viewStore';
import { userApi } from '@/lib/api/user';
import { Content as ContentType } from '@/lib/utils/types';
import { useEffect } from 'react';

type TabType = 'profile' | 'archived' | 'favorites';
type PasswordChangeStep = 'idle' | 'sending-otp' | 'otp-sent' | 'verifying' | 'verified' | 'changing';

export function UserSettings() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const dashboards = useDashboardStore((state) => state.dashboards);
  const setCurrentView = useViewStore((state) => state.setCurrentView);
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [archivedNotesData, setArchivedNotesData] = useState<ContentType[]>([]);
  const [favoriteNotesData, setFavoriteNotesData] = useState<ContentType[]>([]);
  
  // Password change state
  const [passwordChangeStep, setPasswordChangeStep] = useState<PasswordChangeStep>('idle');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      dashboardId: content.DashId || '', // Use DashId from backend
      dashboardName: 'Archived'
    })).sort((a, b) => 
      new Date(b.content.updatedAt).getTime() - new Date(a.content.updatedAt).getTime()
    );
  }, [archivedNotesData]);

  const favoriteNotes = useMemo(() => {
    return favoriteNotesData.map(content => ({
      content,
      dashboardId: content.DashId || '', // Use DashId from backend
      dashboardName: 'Favorite'
    })).sort((a, b) => 
      new Date(b.content.updatedAt).getTime() - new Date(a.content.updatedAt).getTime()
    );
  }, [favoriteNotesData]);

  // Track which notes are exiting (for animation)
  const [exitingNotes, setExitingNotes] = useState<Set<string>>(new Set());

  // Handle note deletion - remove from both lists with animation delay
  const handleNoteDelete = (contentId: string) => {
    setExitingNotes(prev => new Set(prev).add(contentId));
    setTimeout(() => {
      setArchivedNotesData(prev => prev.filter(note => note._id !== contentId));
      setFavoriteNotesData(prev => prev.filter(note => note._id !== contentId));
      setExitingNotes(prev => {
        const next = new Set(prev);
        next.delete(contentId);
        return next;
      });
    }, 300);
  };

  // Handle note updates (archive/favorite toggle)
  const handleNoteUpdate = (contentId: string, updates: Partial<ContentType>) => {
    // If note was unarchived, remove from archived list with animation
    if (updates.isArchived === false) {
      setExitingNotes(prev => new Set(prev).add(contentId));
      setTimeout(() => {
        setArchivedNotesData(prev => prev.filter(note => note._id !== contentId));
        setExitingNotes(prev => {
          const next = new Set(prev);
          next.delete(contentId);
          return next;
        });
      }, 300);
    }
    // If note was unfavorited, remove from favorites list with animation
    if (updates.isPinned === false) {
      setExitingNotes(prev => new Set(prev).add(contentId));
      setTimeout(() => {
        setFavoriteNotesData(prev => prev.filter(note => note._id !== contentId));
        setExitingNotes(prev => {
          const next = new Set(prev);
          next.delete(contentId);
          return next;
        });
      }, 300);
    }
    // If note was archived, update the note in the list
    if (updates.isArchived === true) {
      setArchivedNotesData(prev => 
        prev.map(note => note._id === contentId ? { ...note, ...updates } : note)
      );
    }
    // If note was favorited, update the note in the list
    if (updates.isPinned === true) {
      setFavoriteNotesData(prev => 
        prev.map(note => note._id === contentId ? { ...note, ...updates } : note)
      );
    }
  };

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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await axiosInstance.post('/api/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        const newAvatarUrl = response.data.data.avatar;
        if (user) {
          setUser({ ...user, avatar: newAvatarUrl });
        }
        toast.success('Profile picture updated successfully');
      }
    } catch (error: any) {
      toast.error('Failed to upload profile picture', {
        description: error.response?.data?.message || 'Please try again'
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset input value so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  // Password change handlers
  const handleSendOtp = async () => {
    setPasswordChangeStep('sending-otp');
    try {
      const response = await axiosInstance.post('/api/otp/generate-auth');
      if (response.data?.success) {
        setPasswordChangeStep('otp-sent');
        toast.success('OTP sent to your email');
      }
    } catch (error: any) {
      setPasswordChangeStep('idle');
      toast.error('Failed to send OTP', {
        description: error.response?.data?.message || 'Please try again'
      });
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 4) {
      toast.error('Please enter all 4 digits');
      return;
    }
    
    setPasswordChangeStep('verifying');
    try {
      const response = await axiosInstance.post('/api/otp/verify', {
        email: user?.email,
        otp: otpString
      });
      if (response.data?.success) {
        setPasswordChangeStep('verified');
        toast.success('OTP verified successfully');
      }
    } catch (error: any) {
      setPasswordChangeStep('otp-sent');
      toast.error('Invalid OTP', {
        description: error.response?.data?.message || 'Please try again'
      });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setPasswordChangeStep('changing');
    try {
      const response = await axiosInstance.post('/api/change-password', {
        newPassword,
        confirmPassword
      });
      if (response.data?.success) {
        toast.success('Password changed successfully');
        resetPasswordFlow();
      }
    } catch (error: any) {
      setPasswordChangeStep('verified');
      toast.error('Failed to change password', {
        description: error.response?.data?.message || 'Please try again'
      });
    }
  };

  const resetPasswordFlow = () => {
    setPasswordChangeStep('idle');
    setOtp(['', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
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
                          <div className="relative group">
                            <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={handleAvatarFileChange}
                              disabled={isUploadingAvatar}
                            /> 
                            
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-primary))] to-[hsl(var(--brand-secondary))] flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-[hsl(var(--card))] overflow-hidden relative">
                              {user?.avatar ? (
                                <img 
                                  src={user.avatar} 
                                  alt={user.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getInitials(user?.name)
                              )}
                              
                              {/* Overlay loading state */}
                              {isUploadingAvatar && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                                </div>
                              )}
                            </div>

                            {/* Edit Button - Only visible when editing or hovering */}
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingAvatar}
                              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--brand-primary))] shadow-sm transition-all z-10"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
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
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">Personal Information</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Update your personal details and contact information
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSendOtp}
                        leftIcon={<KeyRound className="h-4 w-4" />}
                        className="border-[hsl(var(--brand-primary))]/30 hover:bg-[hsl(var(--brand-primary))]/10 text-sm h-9"
                      >
                        Change Password
                      </Button>
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
                      <AnimatePresence mode="popLayout">
                        {archivedNotes.map(({ content, dashboardId, dashboardName }, index) => {
                          const isExiting = exitingNotes.has(content._id);
                          return (
                            <motion.div
                              key={content._id}
                              layout
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={isExiting 
                                ? { opacity: 0, scale: 0.9, y: -10 } 
                                : { opacity: 1, y: 0, scale: 1 }
                              }
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              transition={{ 
                                duration: 0.3, 
                                delay: isExiting ? 0 : index * 0.03,
                                layout: { duration: 0.3 }
                              }}
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
                                  onDelete={handleNoteDelete}
                                  onUpdate={handleNoteUpdate}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
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
                      <AnimatePresence mode="popLayout">
                        {favoriteNotes.map(({ content, dashboardId, dashboardName }, index) => {
                          const isExiting = exitingNotes.has(content._id);
                          return (
                            <motion.div
                              key={content._id}
                              layout
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={isExiting 
                                ? { opacity: 0, scale: 0.9, y: -10 } 
                                : { opacity: 1, y: 0, scale: 1 }
                              }
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              transition={{ 
                                duration: 0.3, 
                                delay: isExiting ? 0 : index * 0.03,
                                layout: { duration: 0.3 }
                              }}
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
                                  onDelete={handleNoteDelete}
                                  onUpdate={handleNoteUpdate}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Password Change Modal Overlay */}
      <AnimatePresence>
        {passwordChangeStep !== 'idle' && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetPasswordFlow}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md px-4"
            >
              <Card variant="elevated" padding="lg" className="shadow-2xl border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                      <Lock className="h-5 w-5 text-[hsl(var(--brand-primary))]" />
                      Change Password
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Secure your account with a new password
                    </p>
                  </div>
                  <button onClick={resetPasswordFlow} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {/* Sending OTP */}
                  {passwordChangeStep === 'sending-otp' && (
                    <motion.div
                      key="sending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8 gap-4 text-[hsl(var(--muted-foreground))]"
                    >
                      <div className="animate-spin h-8 w-8 border-2 border-[hsl(var(--brand-primary))] border-t-transparent rounded-full" />
                      <span>Sending OTP to your email...</span>
                    </motion.div>
                  )}

                  {/* OTP Input State */}
                  {(passwordChangeStep === 'otp-sent' || passwordChangeStep === 'verifying') && (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="bg-[hsl(var(--muted))]/30 rounded-xl p-4 text-center">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          Enter the 4-digit code sent to <span className="font-medium text-[hsl(var(--foreground))]">{user?.email}</span>
                        </p>
                      </div>

                      <div className="flex justify-center gap-3">
                        {[0, 1, 2, 3].map((index) => (
                          <input
                            key={index}
                            ref={(el) => { otpInputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otp[index]}
                            onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--surface-light))] focus:border-[hsl(var(--brand-primary))] focus:ring-2 focus:ring-[hsl(var(--brand-primary))]/20 outline-none transition-all"
                            disabled={passwordChangeStep === 'verifying'}
                          />
                        ))}
                      </div>

                      <div className="space-y-3">
                        <Button
                          variant="primary"
                          onClick={handleVerifyOtp}
                          isLoading={passwordChangeStep === 'verifying'}
                          className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 h-10"
                        >
                          Verify OTP
                        </Button>
                        <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                          OTP expires in 3 minutes.{' '}
                          <button
                            onClick={handleSendOtp}
                            className="text-[hsl(var(--brand-primary))] hover:underline"
                            disabled={passwordChangeStep === 'verifying'}
                          >
                            Resend OTP
                          </button>
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Password Change Form */}
                  {(passwordChangeStep === 'verified' || passwordChangeStep === 'changing') && (
                    <motion.div
                      key="password"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-5"
                    >
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          OTP verified! Enter new password.
                        </span>
                      </div>

                      <div className="space-y-4">
                        <Input
                          label="New Password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          leftIcon={<Lock className="h-4 w-4" />}
                          placeholder="Minimum 8 characters"
                          disabled={passwordChangeStep === 'changing'}
                          autoComplete="new-password"
                          className="bg-[hsl(var(--surface-light))]"
                        />
                        <Input
                          label="Confirm Password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          leftIcon={<Lock className="h-4 w-4" />}
                          placeholder="Re-enter password"
                          disabled={passwordChangeStep === 'changing'}
                          autoComplete="new-password"
                          className="bg-[hsl(var(--surface-light))]"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="primary"
                          onClick={handleChangePassword}
                          isLoading={passwordChangeStep === 'changing'}
                          leftIcon={<Save className="h-4 w-4" />}
                          className="flex-1 bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90"
                        >
                          Update Password
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={resetPasswordFlow}
                          disabled={passwordChangeStep === 'changing'}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
