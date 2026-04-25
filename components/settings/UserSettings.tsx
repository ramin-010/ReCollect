'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { ContentCard } from '@/components/content/ContentCard';
import { User, Settings, Mail, Bell, Archive, Heart, Save, ArrowLeft, Lock, KeyRound, CheckCircle2, X, Edit, Camera, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { useViewStore } from '@/lib/store/viewStore';
import { userApi } from '@/lib/api/user';
import { authApi } from '@/lib/api/auth';
import { Content as ContentType } from '@/lib/utils/types';
import { useEffect } from 'react';

type TabType = 'profile' | 'archived' | 'favorites';
type PasswordChangeStep = 'idle' | 'sending-otp' | 'otp-sent' | 'verifying' | 'verified' | 'changing';

export function UserSettings() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const dashboards = useDashboardStore((state) => state.dashboards);
  const router = useRouter();
  
  const isOpen = useSettingsStore((state) => state.isOpen);
  const setIsOpen = useSettingsStore((state) => state.setIsOpen);
  const activeTab = useSettingsStore((state) => state.activeTab) as TabType;
  const setActiveTab = useSettingsStore((state) => state.setActiveTab);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [archivedNotesData, setArchivedNotesData] = useState<ContentType[]>([]);
  const [favoriteNotesData, setFavoriteNotesData] = useState<ContentType[]>([]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Password change state
  const [passwordChangeStep, setPasswordChangeStep] = useState<PasswordChangeStep>('idle');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Alt email change state
  const [altEmailStep, setAltEmailStep] = useState<'idle' | 'enter-email' | 'enter-otp' | 'verifying'>('idle');
  const [newAltEmail, setNewAltEmail] = useState('');
  const [isSendingAltEmailOtp, setIsSendingAltEmailOtp] = useState(false);
  const [altEmailOtp, setAltEmailOtp] = useState(['', '', '', '']);
  const altEmailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Logout state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logout = useAuthStore((state) => state.logout);

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

  const handleSendAltEmailOtp = async () => {
    if (!newAltEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    setIsSendingAltEmailOtp(true);
    try {
      const response = await axiosInstance.post('/api/otp/generate-for-email', {
        email: newAltEmail.trim()
      });
      if (response.data?.success) {
        toast.success(`OTP sent to ${newAltEmail}`);
        setAltEmailStep('enter-otp');
        setAltEmailOtp(['', '', '', '']);
      }
    } catch (error: any) {
      toast.error('Failed to send OTP', {
        description: error.response?.data?.message || 'Please try again'
      });
    } finally {
      setIsSendingAltEmailOtp(false);
    }
  };


  const handleAltEmailOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...altEmailOtp];
    newOtp[index] = value;
    setAltEmailOtp(newOtp);
    if (value && index < 3) {
      altEmailOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleAltEmailOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !altEmailOtp[index] && index > 0) {
      altEmailOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAltEmailOtp = async () => {
    const otpString = altEmailOtp.join('');
    if (otpString.length !== 4) {
      toast.error('Please enter all 4 digits');
      return;
    }
    setAltEmailStep('verifying');
    try {
      // Verify the OTP
      const verifyRes = await axiosInstance.post('/api/otp/verify', {
        email: newAltEmail.trim(),
        otp: otpString
      });
      if (verifyRes.data?.success) {
        // OTP verified — now update the profile
        const updateRes = await axiosInstance.patch('/api/update-profile', {
          name: user?.name,
          reminderEmail: newAltEmail.trim(),
        });
        if (updateRes.data?.success && updateRes.data?.data) {
          setUser(updateRes.data.data);
          toast.success('Alternative email updated!');
        }
        // Reset state
        setAltEmailStep('idle');
        setNewAltEmail('');
        setAltEmailOtp(['', '', '', '']);
      }
    } catch (error: any) {
      setAltEmailStep('enter-otp');
      toast.error('Verification failed', {
        description: error.response?.data?.message || 'Invalid OTP. Please try again.'
      });
    }
  };

  const resetAltEmailFlow = () => {
    setAltEmailStep('idle');
    setNewAltEmail('');
    setAltEmailOtp(['', '', '', '']);
    setIsSendingAltEmailOtp(false);
  };

  const handleLogout = async () => {
    try {
      document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.re-collect.in';
      document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      localStorage.removeItem('auth_hint');
      await authApi.logout();
      logout();
      setIsOpen(false);
      toast.success('Logged out successfully!');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout. Please try again.');
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
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-12"
             onClick={() => setIsOpen(false)}
          >
            <motion.div
               initial={{ scale: 0.97, opacity: 0, y: 10 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.97, opacity: 0, y: 10 }}
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
               onClick={(e) => e.stopPropagation()}
              className="relative w-[90vw] max-w-[1150px] h-[85vh] flex flex-col md:flex-row bg-[hsl(var(--background))] rounded-xl shadow-2xl overflow-hidden border border-[hsl(var(--border))]/50"
            >
              {/* Sidebar Navigation inside Modal */}
              <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--border))]/30">
                <div className="p-4 pl-6 pt-6">
                  <h2 className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-2">Account</h2>
                </div>
                <nav className="flex-1 px-3 space-y-[4px] overflow-y-auto custom-scrollbar">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-md
                          transition-all duration-200 text-left group text-[14px] font-medium
                          ${isActive 
                            ? 'bg-white/10 text-[hsl(var(--foreground))]' 
                            : 'text-[hsl(var(--muted-foreground))] hover:bg-white/5 hover:text-[hsl(var(--foreground))]'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </div>
                        
                        {tab.count !== undefined && tab.count > 0 && (
                          <span className={`
                            px-1.5 py-0.5 text-[10px] font-semibold rounded-md
                            ${isActive 
                              ? 'bg-[hsl(var(--brand-primary))] text-white' 
                              : 'bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                            }
                          `}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
                <div className="p-3 border-t border-[hsl(var(--border))]/30 mt-auto">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-left text-[14px] font-medium text-red-400 hover:text-red-500 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 flex flex-col relative h-full bg-[hsl(var(--background))]">
                {/* Close Button top-right area */}
                <div className="absolute top-4 right-4 z-10">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsOpen(false)} 
                    className="rounded-md w-8 h-8 p-0 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <main className="flex-1 overflow-y-auto px-6 py-10 md:px-20 md:py-14 custom-scrollbar relative">
                  <div className="max-w-3xl space-y-8">
                    {/* Header - Notion style */}
                    <div className="mb-2">
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]/70 mb-1 font-normal">Account</div>
                      <h1 className="text-[24px] font-bold text-[hsl(var(--foreground))] leading-tight">
                        {tabs.find(t => t.id === activeTab)?.label}
                      </h1>
                      {activeTab === 'profile' && (
                        <p className="text-[14px] text-[hsl(var(--muted-foreground))] mt-1">
                          Manage your account info and security
                        </p>
                      )}
                      {activeTab === 'archived' && (
                        <p className="text-[14px] text-[hsl(var(--muted-foreground))] mt-1">
                          {archivedNotes.length} {archivedNotes.length === 1 ? 'note' : 'notes'} archived
                        </p>
                      )}
                      {activeTab === 'favorites' && (
                        <p className="text-[14px] text-[hsl(var(--muted-foreground))] mt-1">
                          {favoriteNotes.length} {favoriteNotes.length === 1 ? 'note' : 'notes'} pinned
                        </p>
                      )}
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === 'profile' && (
                        <motion.div
                          key="profile"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-0"
                        >
                  {/* Profile Section */}
                  <div>
                    
                    {/* Avatar and Name Top Area */}
                    <div className="flex items-start gap-8 pb-6 pt-4">
                      {/* Avatar */}
                      <div className="relative group shrink-0">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          disabled={isUploadingAvatar}
                        /> 
                        <button 
                          className="w-[72px] h-[72px] rounded-full bg-[#5e7e8b] border-none flex items-center justify-center text-white text-[28px] font-medium overflow-hidden relative cursor-pointer"
                          onClick={() => user?.avatar ? setShowAvatarModal(true) : fileInputRef.current?.click()}
                          type="button"
                        >
                          {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : getInitials(user?.name)}
                          {isUploadingAvatar && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Name Field */}
                      <div className="flex-1 max-w-sm pt-1">
                        <div className="text-[12px] text-[hsl(var(--muted-foreground))]/80 mb-1.5 font-normal">Preferred name</div>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input 
                              value={formData.name} 
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                              className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2.5 py-1 text-[14px] flex-1 outline-none focus:border-[hsl(var(--muted-foreground))]/50 transition-colors text-[hsl(var(--foreground))]"
                              autoFocus
                            />
                            <Button 
                              variant="primary" 
                              className="h-7 text-[12px] px-3 bg-[#2383e2] hover:bg-[#2383e2]/90 text-white font-medium shadow-none border-none shrink-0" 
                              onClick={() => {
                                handleSaveProfile();
                                setIsEditing(false);
                              }}
                              isLoading={isSaving}
                            >
                              Save
                            </Button>
                            <Button 
                              variant="ghost" 
                              className="h-7 text-[12px] px-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5 shrink-0" 
                              onClick={() => {
                                setFormData({ ...formData, name: user?.name || '' });
                                setIsEditing(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2.5 py-1 text-[14px] flex-1 text-[hsl(var(--foreground))]">
                              {user?.name}
                            </div>
                            <button
                              onClick={() => setIsEditing(true)}
                              className="text-[12px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors shrink-0 px-1"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-[hsl(var(--border))]/20" />

                    {/* Account Security Header */}
                    <div className="text-[14px] font-semibold text-[hsl(var(--foreground))] pt-6 pb-3">
                      Account security
                    </div>

                    {/* Email Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5">
                      <div>
                        <div className="text-[14px] font-medium text-[hsl(var(--foreground))]">Email</div>
                        <div className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">{user?.email}</div>
                      </div>
                    </div>

                    {/* Password Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5">
                      <div>
                        <div className="text-[14px] font-medium text-[hsl(var(--foreground))]">Password</div>
                        <div className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          Set a password for your account
                        </div>
                      </div>
                      <button onClick={handleSendOtp} className="mt-2 sm:mt-0 h-7 text-[12px] px-3 font-medium bg-[hsl(var(--background))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 text-[hsl(var(--foreground))] rounded transition-colors">
                        Change password
                      </button>
                    </div>

                    {/* Alt Email Row */}
                    <div className="py-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-[14px] font-medium text-[hsl(var(--foreground))]">Alternative Email</div>
                          <div className="text-[13px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            Used for task reminders, calendar notifications, and account recovery
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 flex items-center gap-2">
                          {user?.reminderEmail && altEmailStep === 'idle' && (
                            <span className="text-[13px] text-[hsl(var(--muted-foreground))]">{user.reminderEmail}</span>
                          )}
                          {altEmailStep === 'idle' && (
                            <button 
                              onClick={() => {
                                setNewAltEmail('');
                                setAltEmailStep('enter-email');
                              }} 
                              className="h-7 text-[12px] px-3 font-medium bg-[hsl(var(--background))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 text-[hsl(var(--foreground))] rounded transition-colors shrink-0"
                            >
                              {user?.reminderEmail ? 'Change email' : 'Add email'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step 1: Enter new email */}
                      {altEmailStep === 'enter-email' && (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="email"
                            value={newAltEmail}
                            onChange={(e) => setNewAltEmail(e.target.value)}
                            placeholder="Enter new email address"
                            className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2.5 py-1 text-[13px] flex-1 max-w-[280px] outline-none focus:border-[hsl(var(--muted-foreground))]/50 transition-colors text-[hsl(var(--foreground))]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newAltEmail.trim()) {
                                handleSendAltEmailOtp();
                              }
                              if (e.key === 'Escape') resetAltEmailFlow();
                            }}
                          />
                          <Button
                            variant="primary"
                            className="h-7 text-[12px] px-3 bg-[#2383e2] hover:bg-[#2383e2]/90 text-white font-medium shadow-none border-none shrink-0"
                            onClick={handleSendAltEmailOtp}
                            isLoading={isSendingAltEmailOtp}
                          >
                            Send OTP
                          </Button>
                          <button
                            onClick={resetAltEmailFlow}
                            className="text-[12px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors px-1"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Step 2: Enter OTP */}
                      {(altEmailStep === 'enter-otp' || altEmailStep === 'verifying') && (
                        <div className="mt-3">
                          <div className="text-[13px] text-[hsl(var(--muted-foreground))] mb-2">
                            Enter the 4-digit code sent to <span className="text-[hsl(var(--foreground))] font-medium">{newAltEmail}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                              {altEmailOtp.map((digit, index) => (
                                <input
                                  key={index}
                                  ref={(el) => { altEmailOtpRefs.current[index] = el; }}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleAltEmailOtpChange(index, e.target.value)}
                                  onKeyDown={(e) => handleAltEmailOtpKeyDown(index, e)}
                                  className="w-9 h-9 text-center bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded text-[16px] font-medium outline-none focus:border-[#2383e2] transition-colors text-[hsl(var(--foreground))]"
                                />
                              ))}
                            </div>
                            <Button
                              variant="primary"
                              className="h-7 text-[12px] px-3 bg-[#2383e2] hover:bg-[#2383e2]/90 text-white font-medium shadow-none border-none shrink-0"
                              onClick={handleVerifyAltEmailOtp}
                              isLoading={altEmailStep === 'verifying'}
                            >
                              Verify
                            </Button>
                            <button
                              onClick={resetAltEmailFlow}
                              className="text-[12px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors px-1"
                            >
                              Cancel
                            </button>
                          </div>
                          <button
                            onClick={handleSendAltEmailOtp}
                            className="text-[12px] text-[#2383e2] hover:underline mt-2 inline-block"
                          >
                            Resend OTP
                          </button>
                        </div>
                      )}
                    </div>


                  </div>
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


                  {archivedNotes.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center border-t border-[hsl(var(--border))]/50">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/5 border border-[hsl(var(--border))]/30 flex items-center justify-center">
                        <Archive className="h-7 w-7 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <h3 className="text-[15px] font-medium mb-1">No archived notes</h3>
                      <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                        Notes you archive will appear here for safekeeping
                      </p>
                    </div>
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


                  {favoriteNotes.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center border-t border-[hsl(var(--border))]/50">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/5 border border-[hsl(var(--border))]/30 flex items-center justify-center">
                        <Heart className="h-7 w-7 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <h3 className="text-[15px] font-medium mb-1">No favorite notes</h3>
                      <p className="text-[13px] text-[hsl(var(--muted-foreground))]">
                        Pin your important notes to quick access them here
                      </p>
                    </div>
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
        </main>
      </div>
    </motion.div>
  </motion.div>
)}
</AnimatePresence>

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

  {/* Logout Confirmation Modal */}
  <AnimatePresence>
    {showLogoutConfirm && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-[8px] flex items-center justify-center z-[200]"
        onClick={() => setShowLogoutConfirm(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl relative z-[201]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <LogOut className="h-7 w-7 text-red-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">Log out</h3>
              <p className="text-[13px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                Are you sure you want to log out of your account on this device?
              </p>
            </div>
            <div className="flex flex-col w-full gap-2.5 mt-2">
              <button
                onClick={handleLogout}
                className="w-full h-10 text-[14px] font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
              >
                Log out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full h-10 text-[14px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>

  {/* Avatar Modal */}
  <AnimatePresence>
    {showAvatarModal && user?.avatar && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={() => setShowAvatarModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative max-w-2xl w-full aspect-square md:aspect-auto md:h-[80vh] bg-transparent rounded-2xl overflow-hidden flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={user.avatar} 
            alt={`${user.name}'s full avatar`}
            className="w-full h-full object-contain drop-shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={() => setShowAvatarModal(false)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all drop-shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
</>
  );
}
