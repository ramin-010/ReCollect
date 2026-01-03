// ReCollect - Excalidraw Dashboard Integration
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { useTheme } from 'next-themes';
import { debounce } from 'lodash';

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
  CloudOff
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
    deleteDrawing: removeDrawingStore 
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
      <div className={`fixed inset-0 z-[100] bg-white ${isDark ? 'dark:bg-zinc-900' : ''} flex flex-col`}>
        {/* Editor Header */}
        <div className="h-14 border-b border-[hsl(var(--border))] flex items-center justify-between px-4 bg-[hsl(var(--surface))]">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEditor}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <span className="font-medium">{currentDrawing?.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground mr-2">
              Auto-save enabled
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportDrawing}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveCurrentDrawing(false)}
              isLoading={isLoading}
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

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Drawing Board</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Create and manage your visual notes and diagrams
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowCreateDialog(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Drawing
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('dashboard')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Drawings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Existing Drawings */}
        {drawings.map((drawing, index) => (
          <motion.div
            key={drawing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card
              variant="interactive"
              padding="none"
              className="cursor-pointer group overflow-hidden flex flex-col h-[400px] relative transition-shadow duration-300 hover:shadow-2xl border-0 ring-1 ring-black/5 dark:ring-white/10 rounded-xl"
              onClick={() => openDrawing(drawing)}
            >
            {/* Thumbnail */}
            <div className="w-full h-full bg-[hsl(var(--muted))]/20 relative bg-[radial-gradient(#00000015_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px]">
              {drawing.thumbnail ? (
                <img
                  src={drawing.thumbnail}
                  alt={drawing.name}
                  className="w-full h-full object-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                </div>
              )}
              
              {/* Hover Overlay */}

            </div>

            {/* Drawing Info - Positioned at Bottom with Dark Background */}
            {/* Drawing Info - Floating Glass Bar */}
            <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-white/10 shadow-lg transform transition-transform duration-200">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium text-sm truncate flex-1 text-white" title={drawing.name}>
                  {drawing.name}
                </h4>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-300">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(drawing.updatedAt).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-1 opacity-100">
                  {/* Cloud Sync Button */}
                  <button
                    className={`p-1 rounded transition-colors ${cloudSyncedIds.has(drawing.id) ? 'text-green-400' : 'hover:bg-white/20 text-blue-400'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!cloudSyncedIds.has(drawing.id)) {
                        setDrawingToSync(drawing);
                        setShowCloudSyncModal(true);
                      }
                    }}
                    title={cloudSyncedIds.has(drawing.id) ? 'Synced to Cloud' : 'Sync to Cloud'}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    onClick={(e) => handleDuplicate(drawing, e)}
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    onClick={(e) => handleRenameClick(drawing, e)}
                    title="Rename"
                  >
                    <PenTool className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDrawing(drawing.id);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
          </motion.div>
        ))}
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
