// app/(app)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useDocStore } from '@/lib/store/docStore';
import { authApi } from '@/lib/api/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateNoteProvider } from '@/lib/context/CreateNoteContext';
import { useViewStore } from '@/lib/store/viewStore';
import { QuickTaskAdd } from '@/components/todo/QuickTaskAdd';
import { UserSettings } from '@/components/settings/UserSettings';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { setDashboards, setCurrentDashboard } = useDashboardStore();
  const isSlideFullscreen = useViewStore((state) => state.isSlideFullscreen);
  const currentDoc = useDocStore((state) => state.currentDoc);
  
  // Quick Task Add modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  const isTodoInputExpanded = useViewStore((state) => state.isTodoInputExpanded);
  const todoFilter = useViewStore((state) => state.todoFilter);

  // Hide navbar/sidebar based on pathname
  const isDocEditorOpen = pathname === '/docs' && currentDoc !== null;
  const INBOX_FILTERS = ['inbox', 'today', 'upcoming', 'completed', 'docs', 'notes'];
  const isTodoInboxScreen = pathname === '/todo' && INBOX_FILTERS.includes(todoFilter);
  const hideNavbar = isDocEditorOpen || (pathname === '/slides' && isSlideFullscreen) || pathname === '/workspace' || pathname?.startsWith('/todo');
  const hideSidebar = (pathname === '/slides' && isSlideFullscreen);
  

  // Global keyboard shortcut for Ctrl+K (Quick Add Task)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // React to auth state from AuthProvider (no duplicate getMe() call)
  useEffect(() => {
    if (isLoading) return; // Wait for AuthProvider to finish

    if (!isAuthenticated) {
      router.replace('/welcome');
      return;
    }

    // Fetch dashboards now that we're authenticated
    const fetchDashboards = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data?.dashboards) {
          const { dashboards } = response.data;
          if (Array.isArray(dashboards)) {
            setDashboards(dashboards);
            setCurrentDashboard(null);
          }
        }
      } catch (error) {
        // Dashboard fetch failed, but auth is still valid
        console.error('Failed to fetch dashboards:', error);
      }
    };

    fetchDashboards();
  }, [isLoading, isAuthenticated, router, setDashboards, setCurrentDashboard]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[2.5px] border-white/10 border-t-white/70 rounded-full animate-spin" />
          <p className="text-[13px] text-white/30 font-medium tracking-wide animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <CreateNoteProvider>
      <div className="h-screen overflow-hidden flex bg-pattern">
        {!hideSidebar && <Sidebar />}
        <div className="flex-1 flex flex-col bg-[hsl(var(--background))] overflow-hidden">
          <AnimatePresence>
            {!hideNavbar && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="overflow-hidden shrink-0"
              >
                <Navbar />
              </motion.div>
            )}
          </AnimatePresence>
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-[hsl(var(--background))] relative">
            {children}
          </main>
        </div>
      </div>
      
      {/* Global Quick Add Task Modal (Ctrl+K) */}
      <QuickTaskAdd 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
      />

      {/* Global Settings Modal */}
      <UserSettings />
    </CreateNoteProvider>
  );
}