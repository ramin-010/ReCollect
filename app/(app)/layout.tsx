// app/(app)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { setDashboards, setCurrentDashboard } = useDashboardStore();
  const isSlideFullscreen = useViewStore((state) => state.isSlideFullscreen);
  const currentDoc = useDocStore((state) => state.currentDoc);
  
  // Quick Task Add modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  
  // Hide navbar/sidebar based on pathname
  const isDocEditorOpen = pathname === '/docs' && currentDoc !== null;
  const hideNavbar = isDocEditorOpen || pathname === '/todo' || (pathname === '/slides' && isSlideFullscreen);
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
      <div className="h-screen overflow-hidden flex bg-pattern">
        {!hideSidebar && <Sidebar />}
        <div className="flex-1 flex flex-col bg-[hsl(var(--background))] overflow-hidden">
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