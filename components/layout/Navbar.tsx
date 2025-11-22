// components/layout/Navbar.tsx
'use client';

import { ThemeSwitcher } from './ThemeSwitcher';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useCreateNote } from '@/lib/context/CreateNoteContext';
import { Button } from '@/components/ui-base/Button';
import { Share2, Plus } from 'lucide-react';
import { useState } from 'react';
import { ShareDashboardDialog } from '@/components/dashboard/ShareDashboardDialog';
import { Logo } from '@/components/brand/Logo';

export function Navbar() {
  const currentDashboard = useDashboardStore((state) => state.currentDashboard);
  const { triggerCreateNote } = useCreateNote();
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-30 w-full border-b border-[hsl(var(--divider))] bg-[hsl(var(--card))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--card))]/80">
        <div className="flex h-20 items-center px-4 lg:px-8 gap-4">
          {/* ReCollect Logo and Brand */}
          <div className="flex items-center">
            <Logo size="lg" showText={true} className="text-[hsl(var(--foreground))]" />
          </div>

          {/* Dashboard info - centered */}
          <div className="flex-1 flex items-center justify-center">
            {currentDashboard ? (
              <div className="text-center">
                <h2 className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  {currentDashboard.name}
                </h2>
              </div>
            ) : (
              <h2 className="text-sm font-medium text-[hsl(var(--muted-foreground))]">All Dashboards</h2>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {currentDashboard && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentDashboard && triggerCreateNote(currentDashboard._id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Note</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShareOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      {currentDashboard && (
        <ShareDashboardDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          dashboard={currentDashboard}
        />
      )}
    </>
  );
}