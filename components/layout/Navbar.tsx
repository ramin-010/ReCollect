// components/layout/Navbar.tsx
'use client';

import { useViewStore } from '@/lib/store/viewStore';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { useCreateNote } from '@/lib/context/CreateNoteContext';
import { Button } from '@/components/ui-base/Button';
import { Share2, Plus, ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import { ShareDashboardDialog } from '@/components/dashboard/ShareDashboardDialog';
import { Logo } from '@/components/brand/Logo';
import { CoverPicker } from '@/components/docs/doc_editor/CoverPicker';

export function Navbar() {
  const currentDashboard = useDashboardStore((state) => state.currentDashboard);
  const currentView = useViewStore((state) => state.currentView);
  const { triggerCreateNote } = useCreateNote();
  
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Determine title based on view state
  const getTitle = () => {
    if (currentDashboard) return currentDashboard.name;
    
    switch (currentView) {
      case 'docs': return 'Documents';
      case 'todo': return 'To-Do List';
      case 'drawing': return 'Whiteboard';
      case 'slides': return 'Slides';
      case 'settings': return 'Settings';
      default: return 'All Dashboards';
    }
  };

  const title = getTitle();

  return (
    <>
      {/* Navbar Container */}
      <nav className="sticky top-0 z-30 w-full bg-[hsl(var(--sidebar-bg))] backdrop-blur-md overflow-hidden">
        {/* <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--background))] via-[hsl(var(--background))] to-[hsl(var(--background))] opacity-100 blur-3xl" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-15 pointer-events-none" /> */}
        <div className="flex h-[52px] items-center px-4 lg:px-6 gap-4 relative z-10">
          
          {/* ReCollect Logo and Title */}
          <div className="flex items-center gap-1">
            <Logo size="md" showText={false} className="text-[hsl(var(--foreground))]" />
            
            <h2 className="text-lg pl-0 font-semibold text-[hsl(var(--foreground))] tracking-tight">
              {title}
            </h2>
          </div>

          <div className="flex-1" /> {/* Spacer */}

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {!coverImage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoverPicker(true)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                title="Add Cover"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            )}

            {currentDashboard && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShareOpen(true)}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <div className="hidden sm:block mx-1 h-4 w-px bg-[hsl(var(--border))]"></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentDashboard && triggerCreateNote(currentDashboard._id)}
                  className="mr-1 h-8"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span>Note</span>
                </Button>
              </>
            )}

            <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]"></div>
            
            <ThemeSwitcher />
          </div>
        </div>
      </nav>

      {/* Cover Image Header */}
      {coverImage && (
        <div className="w-full h-[20vh] relative group shrink-0">
          <img 
            src={coverImage} 
            alt="Page cover" 
            className="w-full h-full object-cover object-[0_50%]"
          />
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCoverPicker(true)}
              className="bg-black/50 hover:bg-black/70 text-white text-xs backdrop-blur-sm"
            >
              Change cover
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCoverImage(null)}
              className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cover Picker Modal */}
      <CoverPicker
        show={showCoverPicker}
        onClose={() => setShowCoverPicker(false)}
        currentCover={coverImage}
        onSelect={(url) => {
          setCoverImage(url);
          setShowCoverPicker(false);
        }}
      />

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