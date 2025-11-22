// app/(app)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { authApi } from '@/lib/api/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateNoteProvider } from '@/lib/context/CreateNoteContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, setUser, setIsLoading } = useAuthStore();
  const { setDashboards, setCurrentDashboard } = useDashboardStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
       
          setUser(response.data);

          // Derive dashboards from payload defensively
          let dashboards: any = [];
          const payload: any = response.data as any;
          if (Array.isArray(payload)) {
            dashboards = payload;
          } else if (Array.isArray(payload?.dashboards)) {
            dashboards = payload.dashboards;
          } else if (Array.isArray(payload?.data)) {
            dashboards = payload.data;
          }

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
          <Navbar />
          <main className="flex-1 overflow-y-auto bg-[hsl(var(--background))]">
            {children}
          </main>
        </div>
      </div>
    </CreateNoteProvider>
  );
}