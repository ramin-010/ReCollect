
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
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateDrawingDialog } from './CreateDrawingDialog';

import { useWhiteboardStore, Drawing } from '@/lib/store/whiteboardStore';
import { useViewStore } from '@/lib/store/viewStore';
import { 
  getAllDrawingMetadata, 
  saveDrawingMetadata, 
  deleteDrawingMetadata,
  createDrawingMetadata,
} from '@/lib/storage/drawingMetadata';
import { ExcalidrawYjsEditor } from './ExcalidrawYjsEditor';
import { DrawingCard } from './DrawingCard';
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
    
    setShowCreateDialog,
    setRenamingDrawing,
    setHasUnsavedChanges,
    setCurrentView,
    
    createNewDrawing,
    openDrawing,
    closeEditor,
    handleDeleteDrawing,
    handleDuplicate,
    handleRenameClick,
    handleRenameConfirm,
    togglePin
  } = useDrawingDashboard();

  const { resolvedTheme } = useTheme();
  



  if (showEditor) {
    const isDark =resolvedTheme === 'theme-dark-gray';
    
    return (
      <div className={`fixed inset-0 z-[100]  bg-[hsl(var(--background))] flex flex-col`}>
        {/* Editor Header - Architect Style */}
        <div className="h-14 border-b border-[hsl(var(--border))] flex items-center justify-between px-4 bg-[hsl(var(--background))]/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEditor}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg px-2"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <div className="h-4 w-px bg-[hsl(var(--border))] mx-1" />
            <span className="text-[hsl(var(--foreground))] font-medium text-sm tracking-wide truncate max-w-[200px] md:max-w-md">
              {currentDrawing?.name}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
             {/* 4. Persistence Indicators */}
             {isSaving && (
                <span className="text-sm text-blue-400/80 animate-pulse">Syncing...</span>
             )}
             {hasUnsavedChanges && !isSaving && (
                <span   
                  className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" 
                  title="Saving to local storage"
                />
             )}
          </div>
        </div>

        {/* Editor Canvas - Yjs handles persistence automatically */}
        <ExcalidrawYjsEditor
          drawingId={currentDrawing?.id || ''}
          theme={isDark ? 'dark' : 'light'}
          onStateChange={(hasChanges) => setHasUnsavedChanges(hasChanges)}
        />
      </div>
    );
  }

  
  const activeProjects = drawings.filter(d => d.isPinned);
  const archiveProjects = drawings.filter(d => !d.isPinned).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[hsl(var(--background))]">
      {/* Architectural Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4] dark:opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(to right, 
              hsl(var(--foreground) / 0.1) 1px, 
              transparent 1px
            ),
            linear-gradient(to bottom, 
              hsl(var(--foreground) / 0.1) 1px, 
              transparent 1px
            )
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at 50% 0%, black 40%, transparent 100%)'
        }}
      />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-8 py-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
        {/* Header Section - Floating & Minimal */}
        <div className="flex items-end justify-between gap-6 mb-12 pb-6 border-b border-[hsl(var(--border))]/40">
          <div className="space-y-1">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-bold tracking-wider uppercase mb-2"
            >
              <PenTool className="w-3 h-3" />
              <span>Studio</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-[hsl(var(--foreground))]"
            >
              Architect's Desk
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[hsl(var(--muted-foreground))] text-lg font-medium"
            >
              Your infinite canvas for visual thinking.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
             <Button
              variant="outline"
              onClick={() => setCurrentView('dashboard')}
              className="border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Exit Studio
            </Button>
          </motion.div>
        </div>

        {/* Content Area - Divided into Workbench and Library */}
        
        {/* SECTION 1: THE WORKBENCH (Pinned / Active) */}
        {activeProjects.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Active Workbench</span>
              <div className="h-px flex-1 bg-[hsl(var(--border))]/40" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {activeProjects.map((drawing) => (
                <DrawingCard
                  key={drawing.id}
                  drawing={drawing}
                  isRecent={false} // Not shown for workbench
                  onOpen={openDrawing}
                  onPin={(id, e) => {
                    e.stopPropagation();
                    togglePin(id);
                    toast.success("Moved to Library");
                  }}
                  onDuplicate={handleDuplicate}
                  onRename={handleRenameClick}
                  onDelete={handleDeleteDrawing}
                  variant="workbench"
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: THE LIBRARY (Archive / All) */}
        <div>
           {activeProjects.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Library</span>
                <div className="h-px flex-1 bg-[hsl(var(--border))]/40" />
              </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">

          
          {/* 1. The "Draft New" Card - Intentional & Inviting */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, translateY: -4 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowCreateDialog(true)}
            className="group relative aspect-[1.4] rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--muted))]/20 cursor-pointer overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300"
          >
            {/* Subtle Grid Pattern inside the card */}
            <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
               <div className="w-16 h-16 rounded-full bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-500">
                  <Plus className="w-6 h-6 text-indigo-500/70 group-hover:text-indigo-500 transition-colors" />
               </div>
               <div>
                 <h3 className="font-semibold text-[hsl(var(--foreground))] text-lg group-hover:text-indigo-500 transition-colors">New Blueprint</h3>
                 <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-medium tracking-wide">Start a fresh idea</p>
               </div>
            </div>
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/0 to-indigo-500/5 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        
          {/* Existing Drawings - Sorted by Date */}
          {archiveProjects.map((drawing, index) => {
               const isRecent = (new Date().getTime() - new Date(drawing.updatedAt).getTime()) < 24 * 60 * 60 * 1000;
               
               return (
                <motion.div
                  key={drawing.id}
                  layoutId={drawing.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <DrawingCard
                    drawing={drawing}
                    isRecent={isRecent}
                    onOpen={openDrawing}
                    onPin={(id, e) => {
                      e.stopPropagation();
                      togglePin(id);
                      toast.success("Pinned to Workbench");
                    }}
                    onDuplicate={handleDuplicate}
                    onRename={handleRenameClick}
                    onDelete={handleDeleteDrawing}
                  />
                </motion.div>
               );
          })}
        </div>
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


    </div>
  );
}
