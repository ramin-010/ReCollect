// ReCollect - Excalidraw Dashboard Integration
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { useTheme } from 'next-themes';
import { debounce } from 'lodash';
import { cn } from '@/lib/utils';

import { 
  PenTool, 
  Save, 
  Download, 
  Trash2, 
  Plus,
  FileImage,
  Palette,
  Edit2,
  Copy,
  Clock,
  ArrowLeft,
  Cloud,
  CloudOff,
  Pin,
  PinOff
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateDrawingDialog } from './CreateDrawingDialog';
import { CloudSyncModal } from './CloudSyncModal';
import { useWhiteboardStore, Drawing } from '@/lib/store/whiteboardStore';
import { useViewStore } from '@/lib/store/viewStore';
import axiosInstance from '@/lib/utils/axios';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

export function ExcalidrawDashboard() {
  const { 
    drawings, 
    setDrawings, 
    isLoading, 
    setLoading, 
    isInitialized,
    addDrawing,
    updateDrawing,
    deleteDrawing: removeDrawingStore,
    togglePin
  } = useWhiteboardStore();

  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [renamingDrawing, setRenamingDrawing] = useState<Drawing | null>(null);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  // Remove local isLoading state, use store's
  // const [isLoading, setIsLoading] = useState(false); 
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [drawingToSync, setDrawingToSync] = useState<Drawing | null>(null);
  const [cloudSyncedIds, setCloudSyncedIds] = useState<Set<string>>(new Set());
  const { setCurrentView } = useViewStore();
  const { resolvedTheme } = useTheme();
  
  // Use refs to capture latest Excalidraw state
  const excalidrawStateRef = useRef<any>({
    elements: [],
    appState: {},
    files: {}
  });

  // Load saved drawings on mount
  useEffect(() => {
    loadDrawings();
  }, []);

  const loadDrawings = async () => {
    // If already initialized, just ensure cloudSyncedIds are set correctly from the store data
    if (isInitialized) {
      const cloudIds = new Set(drawings.filter(d => d.isCloudSynced).map(d => d.id));
      setCloudSyncedIds(cloudIds);
      return;
    }

    try {
      setLoading(true);
      // Load from localStorage
      const saved = localStorage.getItem('recollect-drawings');
      let localDrawings: Drawing[] = [];
      if (saved) {
        localDrawings = JSON.parse(saved);
      }

      // Load cloud-synced drawings
      try {
        const response = await axiosInstance.get('/api/drawings');
        if (response.data?.success) {
          const cloudDrawings: Drawing[] = response.data.data;
          const cloudIds = new Set(cloudDrawings.map((d: Drawing) => d.id));
          setCloudSyncedIds(cloudIds);

          // Merge: cloud drawings override local ones with the same id
          const mergedMap = new Map<string, Drawing>();
          localDrawings.forEach(d => mergedMap.set(d.id, d));
          cloudDrawings.forEach(d => mergedMap.set(d.id, { ...d, isCloudSynced: true }));
          localDrawings = Array.from(mergedMap.values());
        }
      } catch (cloudError) {
        // Cloud fetch failed, just use local drawings
        console.log('Cloud drawings not available, using local only');
      }

      setDrawings(localDrawings);
    } catch (error) {
      console.error('Failed to load drawings:', error);
      setLoading(false);
    }
  };

  const saveDrawings = (updatedDrawings: Drawing[]) => {
    try {
      localStorage.setItem('recollect-drawings', JSON.stringify(updatedDrawings));
      setDrawings(updatedDrawings);
    } catch (error) {
      console.error('Failed to save drawings:', error);
      toast.error('Failed to save drawings');
    }
  };

  const createNewDrawing = (name: string) => {
    const isDark = resolvedTheme === 'dark' || resolvedTheme === 'theme-dark-gray';
    const newDrawing: Drawing = {
      id: Date.now().toString(),
      name: name,
      data: {
        elements: [],
        appState: {
          viewBackgroundColor: isDark ? '#ffffff' : '#18181b',
          theme: isDark ? 'dark' : 'light'
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentDrawing(newDrawing);
    setShowEditor(true);
    toast.success(`Created "${name}"`);
  };

  const openDrawing = (drawing: Drawing) => {
    setCurrentDrawing(drawing);
    setShowEditor(true);
  };

  const generateThumbnail = async () => {
    if (!excalidrawAPI) return '';
    
    try {
      const { elements, appState, files } = excalidrawStateRef.current;

      // Export as image using Excalidraw's built-in export
      const { exportToCanvas } = await import('@excalidraw/excalidraw');
      const tempCanvas = await exportToCanvas({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: true,
          viewBackgroundColor: 'transparent',
        },
        files,
        maxWidthOrHeight: 1200
      });

      // Composite onto a dark background manually to ensure visibility
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = tempCanvas.width;
      finalCanvas.height = tempCanvas.height;
      const ctx = finalCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#121212'; // Force dark background
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
      
      return finalCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
    }
    return '';
  };

  const saveCurrentDrawing = async (silent = false, generateThumbnail_flag = false) => {
    if (!currentDrawing) return;

    setLoading(true);
    try {
      const { elements, appState, files } = excalidrawStateRef.current;
      
      // Only generate thumbnail if explicitly requested (e.g., on close)
      let thumbnail = currentDrawing.thumbnail || '';
      if (generateThumbnail_flag) {
        console.log("hit thumnail genration")
        try {
          const generatedThumbnail = await generateThumbnail();
          if (generatedThumbnail) {
            thumbnail = generatedThumbnail;
          }
        } catch (error) {
          console.error('Thumbnail generation failed:', error);
        }
      }
      
      const updatedDrawing = {
        ...currentDrawing,
        data: { elements, appState, files },
        thumbnail,
        updatedAt: new Date().toISOString()
      };

      const existingIndex = drawings.findIndex(d => d.id === currentDrawing.id);
      let updatedDrawings;
      
      if (existingIndex >= 0) {
        updatedDrawings = [...drawings];
        updatedDrawings[existingIndex] = updatedDrawing;
      } else {
        updatedDrawings = [...drawings, updatedDrawing];
      }

      saveDrawings(updatedDrawings);
      setCurrentDrawing(updatedDrawing);
      if (!silent) {
        toast.success('Drawing saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save drawing:', error);
      if (!silent) {
        toast.error('Failed to save drawing');
      }
    } finally {
      setLoading(false);
    }
  };

  // Ref to hold the latest save function to avoid closure staleness in debounce
  const saveCurrentDrawingRef = useRef(saveCurrentDrawing);
  useEffect(() => {
    saveCurrentDrawingRef.current = saveCurrentDrawing;
  }, [saveCurrentDrawing]);

  // Debounced auto-save
  const debouncedSave = useMemo(
    () => debounce(() => {
      saveCurrentDrawingRef.current(true);
    }, 1000),
    []
  );

  // Sync theme with Excalidraw background
  useEffect(() => {
    if (excalidrawAPI && showEditor) {
      const isDark = resolvedTheme === 'dark' || resolvedTheme === 'theme-dark-gray';
      const bgColor = isDark ? '#18181b' : '#ffffff';
      
      // Only update if the background color is significantly different (e.g. switching modes)
      // We don't want to override user's custom background color if they changed it manually to something else
      // But the requirement says "sync with current theme", so we'll enforce it for now or check against defaults.
      // For now, we'll update it to match the theme.
      const currentBg = excalidrawStateRef.current?.appState?.viewBackgroundColor;
      
      // Update scene if the background color doesn't match the theme default
      // This might override custom colors, but it fulfills the "sync" requirement.
      // To be safer, we could only switch if the current bg is white or the dark default.
      if (currentBg !== bgColor) {
         excalidrawAPI.updateScene({
            appState: {
              viewBackgroundColor: bgColor,
              theme: isDark ? 'dark' : 'light'
            }
         });
      }
    }
  }, [resolvedTheme, excalidrawAPI, showEditor]);

  const deleteDrawing = (drawingId: string) => {
    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;
    
    if (confirm(`Delete "${drawing.name}"? This action cannot be undone.`)) {
      const updatedDrawings = drawings.filter(d => d.id !== drawingId);
      saveDrawings(updatedDrawings);
      toast.success(`"${drawing.name}" deleted`);
    }
  };

  const handleDuplicate = (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDrawing: Drawing = {
      ...drawing,
      id: Date.now().toString(),
      name: `${drawing.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedDrawings = [...drawings, newDrawing];
    saveDrawings(updatedDrawings);
    toast.success(`Duplicated "${drawing.name}"`);
  };

  const handleRenameClick = (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingDrawing(drawing);
    setShowCreateDialog(true);
  };

  const handleRenameConfirm = (newName: string) => {
    if (renamingDrawing) {
      const updatedDrawings = drawings.map(d => 
        d.id === renamingDrawing.id ? { ...d, name: newName, updatedAt: new Date().toISOString() } : d
      );
      saveDrawings(updatedDrawings);
      toast.success(`Renamed to "${newName}"`);
      setRenamingDrawing(null);
    } else {
      createNewDrawing(newName);
    }
    setShowCreateDialog(false);
  };

  const exportDrawing = async () => {
    if (!excalidrawAPI) return;

    try {
      const { elements, appState } = excalidrawStateRef.current;
      
      // For now, just save the drawing data as JSON
      const dataStr = JSON.stringify({ elements, appState }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${currentDrawing?.name || 'drawing'}.excalidraw`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Drawing exported successfully!');
    } catch (error) {
      console.error('Failed to export drawing:', error);
      toast.error('Failed to export drawing');
    }
  };

  const closeEditor = async () => {
    // Save with thumbnail generation before closing
    if (currentDrawing) {
      await saveCurrentDrawing(true, true);
    }
    setShowEditor(false);
    setCurrentDrawing(null);
    setExcalidrawAPI(null);
  };

  if (showEditor) {
    const isDark =resolvedTheme === 'theme-dark-gray';
    
    return (
      <div className={`fixed inset-0 z-[100] bg-[hsl(var(--background))] flex flex-col`}>
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
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-widest bg-[hsl(var(--muted))]/50 px-3 py-1 rounded-md border border-[hsl(var(--border))] mr-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Live
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportDrawing}
              className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] h-9"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveCurrentDrawing(false)}
              isLoading={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 h-9 shadow-sm"
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save
            </Button>
          </div>
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 relative">
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            theme={isDark ? 'dark' : 'light'}
            initialData={currentDrawing?.data ? {
              elements: currentDrawing.data.elements || [],
              appState: {
                ...currentDrawing.data.appState,
                collaborators: new Map(),
                viewBackgroundColor: currentDrawing.data.appState?.viewBackgroundColor || (isDark ? '#18181b' : '#ffffff')
              },
              files: currentDrawing.data.files || {},
              scrollToContent: true
            } : undefined}
            onChange={(elements, appState, files) => {
              // Update ref with latest state
              excalidrawStateRef.current = {
                elements,
                appState,
                files
              };
              
              // Trigger auto-save
              debouncedSave();
            }}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
                export: false,
                saveAsImage: false
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Split drawings into Active (Pinned) and Archive
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

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 py-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
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
                <motion.div
                  key={drawing.id}
                  layoutId={drawing.id}
                  className="group relative aspect-[1.8] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                  onClick={() => openDrawing(drawing)}
                >
                  {/* Workbench Sheet Content */}
                  <div className="absolute inset-0 z-0 bg-[hsl(var(--muted))]/10">
                    {drawing.thumbnail && (
                        <img
                          src={drawing.thumbnail}
                          alt={drawing.name}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))] via-transparent to-transparent opacity-80" />
                  </div>

                  {/* Pinned Indicator */}
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      className="p-2 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-110 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(drawing.id);
                        toast.success("Moved to Library");
                      }}
                      title="Unpin from Workbench"
                    >
                      <PinOff className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  {/* Workbench Info */}
                  <div className="absolute bottom-6 left-6 right-6 z-20">
                     <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">{drawing.name}</h3>
                     <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] font-medium">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[hsl(var(--background))]/50 border border-[hsl(var(--border))] backdrop-blur-md">
                          <Clock className="w-3.5 h-3.5" />
                          Last edited {new Date(drawing.updatedAt).toLocaleDateString()}
                        </span>
                        {cloudSyncedIds.has(drawing.id) && (
                          <span className="flex items-center gap-1.5 text-indigo-500">
                             <Cloud className="w-3.5 h-3.5" />
                             Synced
                          </span>
                        )}
                     </div>
                  </div>
                </motion.div>
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
                <Card
                  variant="default"
                  padding="none"
                  className="group relative aspect-[1.4] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 select-none"
                  onClick={() => openDrawing(drawing)}
                >
                  {/* Sheet Content (Thumbnail) */}
                  <div className="absolute inset-0 z-0 bg-[hsl(var(--muted))]/10 group-hover:bg-[hsl(var(--background))] transition-colors duration-500">
                    {drawing.thumbnail ? (
                      <img
                        src={drawing.thumbnail}
                        alt={drawing.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Palette className="w-12 h-12 text-[hsl(var(--muted-foreground))]/10" />
                      </div>
                    )}
                    
                    {/* Gradient for text readability */}
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[hsl(var(--card))] via-[hsl(var(--card))]/90 to-transparent" />
                  </div>

                  {/* Badges: Recent & Cloud */}
                  <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
                    {cloudSyncedIds.has(drawing.id) && (
                       <div className="bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 text-indigo-500 p-1.5 rounded-lg shadow-sm">
                          <Cloud className="w-3.5 h-3.5" />
                       </div>
                    )}
                    {isRecent && !cloudSyncedIds.has(drawing.id) && (
                      <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        Active
                      </div>
                    )}
                  </div>

                  {/* Sheet Metadata */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-end justify-between">
                      <div className="min-w-0 flex-1 mr-4">
                        <h4 className="text-[hsl(var(--foreground))] font-semibold text-base leading-tight truncate group-hover:text-indigo-500 transition-colors">
                          {drawing.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Clock className="w-3 h-3" />
                            {new Date(drawing.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Floating Tools */}
                      <div className="flex items-center gap-0.5 bg-[hsl(var(--foreground))]/5 backdrop-blur-md border border-[hsl(var(--border))]/50 rounded-lg p-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                        <button
                          className={cn(
                            "p-1.5 rounded-md transition-all hover:bg-[hsl(var(--background))]",
                            drawing.isPinned
                                ? "text-indigo-500 bg-indigo-500/10"
                                : "text-[hsl(var(--muted-foreground))] hover:text-indigo-500"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(drawing.id);
                            toast.success("Pinned to Workbench");
                          }}
                          title="Pin to Workbench"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-3 bg-[hsl(var(--border))]/50 mx-0.5" />
                        <button
                          className={cn(
                            "p-1.5 rounded-md transition-all hover:bg-[hsl(var(--background))]",
                            cloudSyncedIds.has(drawing.id) 
                              ? "text-indigo-500" 
                              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!cloudSyncedIds.has(drawing.id)) {
                              setDrawingToSync(drawing);
                              setShowCloudSyncModal(true);
                            }
                          }}
                          title="Sync to Cloud"
                        >
                          <Cloud className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-all"
                          onClick={(e) => handleDuplicate(drawing, e)}
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-all"
                          onClick={(e) => handleRenameClick(drawing, e)}
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-500/10 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDrawing(drawing.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
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

      <CloudSyncModal
        isOpen={showCloudSyncModal}
        onClose={() => {
          setShowCloudSyncModal(false);
          setDrawingToSync(null);
        }}
        drawing={drawingToSync}
        onSyncComplete={(drawingId) => {
          setCloudSyncedIds(prev => new Set([...prev, drawingId]));
          // Update the drawing in the store to mark as synced
          updateDrawing(drawingId, { isCloudSynced: true });
        }}
      />
    </div>
  );
}
