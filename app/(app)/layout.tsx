// app/(app)/layout.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, setUser, setIsLoading } = useAuthStore();
  const { setDashboards, setCurrentDashboard } = useDashboardStore();
  const currentView = useViewStore((state) => state.currentView);
  const currentDoc = useDocStore((state) => state.currentDoc);
  
  // Quick Task Add modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  // Hide navbar when editing a document (docs view with editor open) or viewing tasks
  const isDocEditorOpen = currentView === 'docs' && currentDoc !== null;
  const hideNavbar = isDocEditorOpen || currentView === 'todo';

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
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          const { user, dashboards } = response.data;
          
          // Set user in auth store
          setUser(user);
          
          // Set dashboards in dashboard store
          if (Array.isArray(dashboards)) {
            setDashboards(dashboards);
            setCurrentDashboard(null);
          }
        } else {
          // Not authenticated
          router.replace('/welcome');
        }
      } catch (error) {
        // On error assume unauthenticated and send to welcome signup path
        router.replace('/welcome');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, setUser, setDashboards, setCurrentDashboard, setIsLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-pattern">
        <div className="w-64 border-r border-[hsl(var(--divider))] p-4 space-y-4 bg-[hsl(var(--sidebar-bg))]">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-8 bg-[hsl(var(--background))]">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <CreateNoteProvider>
      <div className="min-h-screen flex bg-pattern">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-[hsl(var(--background))]">
          {!hideNavbar && <Navbar />}
          <main className="flex-1 overflow-y-auto bg-[hsl(var(--background))] relative">
            {children}
          </main>
        </div>
      </div>
      
      {/* Global Quick Add Task Modal (Ctrl+K) */}
      <QuickTaskAdd 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
      />
    </CreateNoteProvider>
  );
}