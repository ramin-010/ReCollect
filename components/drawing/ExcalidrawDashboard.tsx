
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

import { 
  PenTool, 
  Trash2, 
  Plus,
  ArrowLeft,
  Share2,
  Search,
  ArrowUpDown,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { CreateDrawingDialog } from './CreateDrawingDialog';
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog';
import { CloudSyncModal } from './CloudSyncModal';

import { useWhiteboardStore, Drawing } from '@/lib/store/whiteboardStore';
import { useRouter } from 'next/navigation';
import { 
  getAllDrawingMetadata, 
  saveDrawingMetadata, 
  deleteDrawingMetadata,
  createDrawingMetadata,
} from '@/lib/storage/drawingMetadata';
import dynamic from 'next/dynamic';

const ExcalidrawYjsEditor = dynamic(
  () => import('./excalidrawYjsEditor/ExcalidrawYjsEditor').then((mod) => mod.ExcalidrawYjsEditor),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 min-h-screen z-[100] flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Loading Studio Workspace...</p>
        </div>
      </div>
    )
  }
);
import { useDrawingDashboard } from './useDrawingDashboard';

export function ExcalidrawDashboard() {
  const { 
    drawings, 
    isLoading,
    currentDrawing,
    showEditor,
    showCreateDialog,
    renamingDrawing,
    isSaving,
    hasUnsavedChanges,
    
    // Delete dialog
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTargetDrawing,
    isDeleting,
    
    setShowCreateDialog,
    setRenamingDrawing,
    setHasUnsavedChanges,
    
    createNewDrawing,
    openDrawing,
    closeEditor,
    handleDeleteDrawing,
    confirmDeleteDrawing,
    handleDuplicate,
    handleRenameClick,
    handleRenameConfirm,
    togglePin
  } = useDrawingDashboard();

  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  
  // Moved hooks up before early return
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');

  // Check share status when opening a drawing
  useEffect(() => {
    if (currentDrawing?.id && showEditor) {
      // Fetch share status from API
      import('@/lib/api/drawingApi').then(({ drawingApi }) => {
        drawingApi.getShareStatus(currentDrawing.id).then((result) => {
          if (result.success) {
            setShareEnabled(result.shareEnabled);
            console.log('[Dashboard] Share status:', result.shareEnabled ? 'ENABLED' : 'disabled');
          }
        }).catch(() => {
          setShareEnabled(false);
        });
      });
    } else {
      setShareEnabled(false);
      setCollaboratorCount(0);
    }
  }, [currentDrawing?.id, showEditor]);

  const filteredDrawings = drawings
    .filter((draw) => draw.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.name.localeCompare(b.name);
    });

  const pinnedDrawings = filteredDrawings.filter(d => d.isPinned);
  const unpinnedDrawings = filteredDrawings.filter(d => !d.isPinned);
  const allSortedDrawings = [...pinnedDrawings, ...unpinnedDrawings];

  // State for split-pane selection
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);

  // Automatically select the first canvas if none is selected and drawings exist
  useEffect(() => {
    if (drawings.length > 0 && !selectedCanvasId && !searchQuery) {
      setSelectedCanvasId(allSortedDrawings[0]?.id || null);
    } else if (drawings.length === 0) {
      setSelectedCanvasId(null);
    }
  }, [drawings, selectedCanvasId, allSortedDrawings, searchQuery]);

  if (showEditor) {
    const isDark =resolvedTheme === 'theme-dark-gray';
    
    return (
      <div className={`fixed inset-0 z-[100]  bg-[hsl(var(--background))] flex flex-col`}>
        {/* Editor Canvas - Yjs handles persistence automatically */}
        <ExcalidrawYjsEditor
          drawingId={currentDrawing?.id || ''}
          drawingName={currentDrawing?.name || 'Untitled'}
          isOwner={true}
          collaborationEnabled={shareEnabled}
          theme={isDark ? 'dark' : 'light'}
          onStateChange={(hasChanges) => setHasUnsavedChanges(hasChanges)}
          onCollaboratorCountChange={(count) => setCollaboratorCount(count)}
          onBack={closeEditor}
          onShare={() => setShowShareModal(true)}
        />
        
        {/* Share Modal */}
        <CloudSyncModal
          drawing={currentDrawing}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </div>
    );
  }

  const selectedDrawing = drawings.find(d => d.id === selectedCanvasId);

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      
      {/* Main Split Interface - Now a floating panel layout */}
      <div className="flex-1 flex overflow-hidden p-6 lg:p-12 xl:p-16 gap-6 lg:gap-8 max-w-[1200px] mx-auto w-full">
        
        {/* Left Pane: Index (Floating Panel) */}
        <div className="w-[320px] xl:w-[380px] flex-shrink-0 bg-[hsl(var(--sidebar-bg))] border border-[hsl(var(--border))]/50 rounded-2xl flex flex-col shadow-sm overflow-hidden z-10 relative">
          
          <div className="px-5 pt-6 pb-4 border-b border-[hsl(var(--border))]/40 bg-[hsl(var(--sidebar-bg))]/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-semibold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-400" />
                Whiteboards
              </h1>
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 rounded-full hover:bg-[hsl(var(--foreground))] hover:text-[hsl(var(--background))] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] group-focus-within:text-indigo-400 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search canvases..." 
                 value={searchQuery} 
                 onChange={(e) => setSearchQuery(e.target.value)} 
                 className="w-full pl-9 pr-4 py-2 bg-[hsl(var(--background))]/50 border border-[hsl(var(--border))]/60 rounded-xl focus:border-indigo-500/40 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))] shadow-sm" 
               />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {allSortedDrawings.map((drawing) => {
              const isSelected = selectedCanvasId === drawing.id;
              
              return (
                <button
                  key={drawing.id}
                  onClick={() => setSelectedCanvasId(drawing.id)}
                  onDoubleClick={() => openDrawing(drawing)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-start gap-3",
                    isSelected 
                      ? "bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/20" 
                      : "hover:bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  <div className={cn(
                    "mt-0.5",
                    isSelected ? "text-indigo-400" : (drawing.isPinned ? "text-indigo-400/60" : "text-[hsl(var(--muted-foreground))]/40")
                  )}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-indigo-100" : "text-[hsl(var(--foreground))]/80"
                    )}>
                      {drawing.name}
                    </p>
                    <p className="text-[11px] font-medium opacity-60 mt-0.5 truncate">
                      {new Date(drawing.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </button>
              );
            })}

            {allSortedDrawings.length === 0 && (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No canvases found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Staging Area (Floating Panel) */}
        <div className="flex-1 relative bg-[hsl(var(--card-bg))]/30 border border-[hsl(var(--border))]/40 rounded-2xl flex items-center justify-center pointer-events-none shadow-inner overflow-hidden">
           {/* Subtle background decoration */}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none opacity-50" />

           {selectedDrawing ? (
             <motion.div 
               key={selectedDrawing.id}
               initial={{ opacity: 0, y: 10, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               transition={{ duration: 0.3 }}
               className="w-full max-w-lg pointer-events-auto flex flex-col items-center text-center p-8"
             >
               <div className="w-24 h-24 mb-8 rounded-[2rem] bg-[hsl(var(--card-bg))] border border-[hsl(var(--border))]/50 shadow-2xl flex items-center justify-center text-indigo-400 relative">
                 <PenTool className="w-10 h-10" />
                 {selectedDrawing.isPinned && (
                   <div className="absolute -top-2 -right-2 w-8 h-8 bg-[hsl(var(--background))] rounded-full flex items-center justify-center p-1">
                     <div className="w-full h-full bg-indigo-500 rounded-full flex items-center justify-center text-white">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76v-4C15 5.24 13.66 4 12 4s-3 1.24-3 2.76v4z"/></svg>
                     </div>
                   </div>
                 )}
               </div>

               <h2 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))] mb-3">
                 {selectedDrawing.name}
               </h2>
               
               <p className="text-sm text-[hsl(var(--muted-foreground))] mb-10 flex items-center gap-4 justify-center">
                 <span>Created {new Date(selectedDrawing.createdAt).toLocaleDateString()}</span>
                 <span className="w-1 h-1 rounded-full bg-[hsl(var(--border))]" />
                 <span>Updated {new Date(selectedDrawing.updatedAt).toLocaleDateString()}</span>
               </p>

               <Button
                 onClick={() => openDrawing(selectedDrawing)}
                 className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 font-medium text-base shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all mb-8"
               >
                 Launch Canvas
               </Button>

               <div className="flex items-center gap-3">
                 <Button
                   variant="outline"
                   onClick={() => togglePin(selectedDrawing.id)}
                   className="rounded-xl border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/50 px-4 h-10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                 >
                   {selectedDrawing.isPinned ? 'Unpin' : 'Pin to top'}
                 </Button>
                 <Button
                   variant="outline"
                   onClick={(e) => handleDuplicate(selectedDrawing, e)}
                   className="rounded-xl border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/50 px-4 h-10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                 >
                   Duplicate
                 </Button>
                 <Button
                   variant="outline"
                   onClick={(e) => handleDeleteDrawing(selectedDrawing.id, e)}
                   className="rounded-xl border-[hsl(var(--border))]/50 hover:bg-red-500/10 hover:border-red-500/20 text-red-400 hover:text-red-400 px-4 h-10"
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
               </div>
             </motion.div>
           ) : (
             <div className="flex flex-col items-center pointer-events-auto opactiy-50">
               <PenTool className="w-12 h-12 text-[hsl(var(--muted-foreground))]/20 mb-4" />
               <p className="text-[hsl(var(--muted-foreground))]/60 font-medium">Select a canvas to view details</p>
             </div>
           )}
        </div>
      </div>

      <CreateDrawingDialog
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setRenamingDrawing(null);
        }}
        onConfirm={handleRenameConfirm}
        existingNames={drawings.map(d => d.name)}
        initialName={renamingDrawing?.name}
        mode={renamingDrawing ? 'rename' : 'create'}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteDrawing}
        isLoading={isDeleting}
        title={`Delete "${deleteTargetDrawing?.name || 'Drawing'}"?`}
        description="This action cannot be undone. The drawing and all its data will be permanently removed."
      />

    </div>
  );
}
