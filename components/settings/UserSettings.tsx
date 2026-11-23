'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { ContentCard } from '@/components/content/ContentCard';
import { User, Archive, Heart, X, LogOut, Bot, Gauge, Smartphone, MessageSquare, Database, ChartNoAxesColumn } from 'lucide-react';
import { rcScope, RcConfirm, RcIconButton } from '@/components/rc-ui';
import { cn } from '@/lib/utils';
import { AgentTokens } from './AgentTokens';
import { AiSettings } from './AiSettings';
import { PhoneAppSettings } from './PhoneAppSettings';
import { ProfileSettings } from './ProfileSettings';
import { SendFeedback } from './SendFeedback';
import { TrackingSettings } from './TrackingSettings';
import { YourData } from './YourData';
import { toast } from 'sonner';
import { userApi } from '@/lib/api/user';
import { authApi } from '@/lib/api/auth';
import { Content as ContentType } from '@/lib/utils/types';
import { useEffect } from 'react';
import { features } from '@/lib/features';

type TabType = 'profile' | 'agents' | 'tracking' | 'ai' | 'phone' | 'data' | 'feedback' | 'archived' | 'favorites';

export function UserSettings() {
  const router = useRouter();

  const isOpen = useSettingsStore((state) => state.isOpen);
  const setIsOpen = useSettingsStore((state) => state.setIsOpen);
  const activeTab = useSettingsStore((state) => state.activeTab) as TabType;
  const setActiveTab = useSettingsStore((state) => state.setActiveTab);

  const [, setIsLoadingNotes] = useState(false);
  const [archivedNotesData, setArchivedNotesData] = useState<ContentType[]>([]);
  const [favoriteNotesData, setFavoriteNotesData] = useState<ContentType[]>([]);

  // Logout state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  // Fetch archived and favorite notes from API
  useEffect(() => {
    // These are legacy content notes, hidden while `content` is off (lib/features.ts).
    if (!features.content) return;

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

  const handleLogout = async () => {
    try {
      document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.re-collect.in';
      document.cookie = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      localStorage.removeItem('auth_hint');
      await authApi.logout();
      logout();
      setIsOpen(false);
      toast.success('Logged out');
      router.push('/login');
    } catch {
      toast.error('You were not logged out. Try again.');
    }
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'agents' as TabType, label: 'Agents', icon: Bot },
    // PERSONAL_OFFICE_PLAN (11-23): what counts as progress, and what each folder is.
    { id: 'tracking' as TabType, label: 'Tracking', icon: ChartNoAxesColumn },
    { id: 'ai' as TabType, label: 'AI', icon: Gauge },
    { id: 'phone' as TabType, label: 'Phone app', icon: Smartphone },
    // Stage 11 (§9.6): everything in one file, deleting the account; a few words to whoever runs this server.
    { id: 'data' as TabType, label: 'Your data', icon: Database },
    { id: 'feedback' as TabType, label: 'Send feedback', icon: MessageSquare },
    // Archived / Favorites list legacy content notes: hidden while `content` is off (lib/features.ts).
    ...(features.content
      ? [
          { id: 'archived' as TabType, label: 'Archived', icon: Archive, count: archivedNotes.length },
          { id: 'favorites' as TabType, label: 'Favorites', icon: Heart, count: favoriteNotes.length },
        ]
      : []),
  ];

  return (
    <>
      <SettingsEscape open={isOpen} onClose={() => setIsOpen(false)} />
      <AnimatePresence>
        {isOpen && (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 bg-[var(--overlay-mask,rgba(15,15,15,0.4))] flex items-center justify-center p-4 sm:p-6 md:p-12"
             onClick={() => setIsOpen(false)}
          >
            <motion.div
               initial={{ scale: 0.98, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.98, opacity: 0 }}
               transition={{ duration: 0.16, ease: [0.2, 0.9, 0.25, 1] }}
               onClick={(e) => e.stopPropagation()}
              className="relative w-[90vw] max-w-[1150px] h-[85vh] flex flex-col md:flex-row bg-[hsl(var(--background))] rounded-xl shadow-2xl overflow-hidden border border-[hsl(var(--border))]/50"
            >
              {/* Sidebar Navigation inside Modal */}
              <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--border))]/30">
                <div className="p-4 pl-6 pt-6">
                  <h2 className="text-[12px] font-medium text-[var(--ui-ink-3)] mb-1 px-2">Account</h2>
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
                            ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' 
                            : 'text-[var(--ui-ink-2)] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]'
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
                    className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors text-left text-[14px] font-medium text-[var(--ui-ink-2)] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 flex flex-col relative h-full bg-[hsl(var(--background))]">
                {/* Close Button top-right area */}
                <div className={cn(rcScope, 'absolute top-4 right-4 z-10')}>
                  <RcIconButton label="Close settings" onClick={() => setIsOpen(false)}>
                    <X />
                  </RcIconButton>
                </div>

                <main className="flex-1 overflow-y-auto px-6 py-10 md:px-20 md:py-14 custom-scrollbar relative">
                  <div className="max-w-3xl space-y-8">
                    {/* On a phone the side list is hidden: the tabs as a row that scrolls sideways. */}
                    <div className={cn(rcScope, 'md:hidden -mx-6 -mt-4 overflow-x-auto px-6 pr-12 [scrollbar-width:none]')}>
                      <div role="tablist" aria-label="Settings" className="flex w-max gap-1">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                              'h-8 shrink-0 rounded-[6px] px-3 text-[14px] font-medium transition-colors',
                              activeTab === tab.id ? 'bg-[var(--rc-selected)] text-[var(--rc-ink-1)]' : 'text-[var(--rc-ink-2)] hover:bg-[var(--rc-hover)]',
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Header: the tab's name and one line on what it holds (the sidebar already says "Account"). */}
                    <div className={cn(rcScope, 'mb-2')}>
                      <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-[var(--rc-ink-1)]">
                        {tabs.find(t => t.id === activeTab)?.label}
                      </h1>
                      <p className="rc-meta mt-1 text-[14px]">
                        {activeTab === 'profile' && 'Your name, your photo and how you sign in'}
                        {activeTab === 'agents' && 'Tokens for Claude Code and other agents'}
                        {activeTab === 'tracking' && 'Personal growth, work, and the folders your agents work in'}
                        {activeTab === 'ai' && 'Recall questions and grading, and what they cost'}
                        {activeTab === 'phone' && 'Your day on your Android home and lock screen'}
                        {activeTab === 'feedback' && 'Tell the person who runs this server what you think'}
                        {activeTab === 'data' && 'Everything that is yours, in one file, and deleting your account'}
                        {activeTab === 'archived' && `${archivedNotes.length} ${archivedNotes.length === 1 ? 'note' : 'notes'} archived`}
                        {activeTab === 'favorites' && `${favoriteNotes.length} ${favoriteNotes.length === 1 ? 'note' : 'notes'} pinned`}
                      </p>
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                          <ProfileSettings />
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

              {activeTab === 'agents' && (
                <motion.div key="agents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <AgentTokens />
                </motion.div>
              )}

              {activeTab === 'tracking' && (
                <motion.div key="tracking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <TrackingSettings />
                </motion.div>
              )}

              {activeTab === 'phone' && (
                <motion.div key="phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <PhoneAppSettings />
                </motion.div>
              )}

              {activeTab === 'ai' && (
                <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <AiSettings />
                </motion.div>
              )}

              {activeTab === 'feedback' && (
                <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <SendFeedback />
                </motion.div>
              )}

              {activeTab === 'data' && (
                <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <YourData />
                </motion.div>
              )}
            </AnimatePresence>
            {/* On a phone the side list (with Log out at its foot) is hidden. */}
            {activeTab === 'profile' && (
              <div className={cn(rcScope, 'md:hidden border-t border-[var(--rc-line)] pt-4')}>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex h-9 items-center gap-2.5 rounded-[6px] px-2 -ml-2 text-[14px] font-medium text-[var(--rc-ink-2)] hover:bg-[var(--rc-hover)]"
                >
                  <LogOut className="h-4 w-4" aria-hidden /> Log out
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </motion.div>
  </motion.div>
)}
</AnimatePresence>

      <RcConfirm
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Log out?"
        body="You’ll sign in again with your email and password on this device."
        confirmLabel="Log out"
        onConfirm={() => void handleLogout()}
      />
    </>
  );
}

/**
 * Esc closes the settings dialog, unless something inside (the name edit, a code step) handled it
 * first, or a dialog or sheet of its own is open on top (that one closes first).
 */
function SettingsEscape({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('.rc-dialog, .rc-sheet')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return null;
}
