'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useWhiteboardStore, Drawing } from '@/lib/store/whiteboardStore';
import { useViewStore } from '@/lib/store/viewStore';
import { 
  getAllDrawingMetadata, 
  saveDrawingMetadata, 
  deleteDrawingMetadata,
  createDrawingMetadata,
} from '@/lib/storage/drawingMetadata';

export function useDrawingDashboard() {
  const { 
    drawings, 
    setDrawings, 
    isLoading, 
    setLoading, 
    isInitialized,
    updateDrawing,
    addDrawing,
    deleteDrawing: removeDrawingFromStore,
    togglePin
  } = useWhiteboardStore();

  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [renamingDrawing, setRenamingDrawing] = useState<Drawing | null>(null);
  
  const { setCurrentView } = useViewStore();
  
  /* Local state for UI indicators */
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load saved drawings on mount
  useEffect(() => {
    const loadDrawings = async () => {
      if (isInitialized) return;
  
      try {
        setLoading(true);
        
        const metadata = await getAllDrawingMetadata();
        // Convert DrawingMetadata to Drawing (without data - Yjs handles that)
        const localDrawings: Drawing[] = metadata.map(m => ({
          id: m.id,
          name: m.name,
          data: {}, // Data is now managed by Yjs
          thumbnail: m.thumbnail,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          isPinned: m.isPinned
        }));
        
        setDrawings(localDrawings);
      } catch (error) {
        console.error('Failed to load drawings:', error);
        setLoading(false);
      }
    };

    loadDrawings();
  }, [isInitialized, setDrawings, setLoading]);

  const createNewDrawing = async (name: string) => {
    const newId = Date.now().toString();
    
    // Create metadata entry (Yjs handles the actual drawing data)
    const metadata = createDrawingMetadata(newId, name);
    await saveDrawingMetadata(metadata);
    
    // Add to store for UI
    const newDrawing: Drawing = {
      id: newId,
      name: name,
      data: {}, // Yjs manages data
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    };
    
    addDrawing(newDrawing);
    setCurrentDrawing(newDrawing);
    setShowEditor(true);
    toast.success(`Created "${name}"`);
  };

  const openDrawing = (drawing: Drawing) => {
    setCurrentDrawing(drawing);
    setShowEditor(true);
  };

  /* Save metadata on close - Yjs handles drawing data automatically */
  const saveMetadataOnClose = async () => {
    if (!currentDrawing) return;
    
    await saveDrawingMetadata({
      id: currentDrawing.id,
      name: currentDrawing.name,
      thumbnail: currentDrawing.thumbnail,
      createdAt: currentDrawing.createdAt,
      updatedAt: new Date().toISOString(),
      isPinned: currentDrawing.isPinned,
    });
    
    updateDrawing(currentDrawing.id, { 
      updatedAt: new Date().toISOString() 
    });
  };

  const closeEditor = async () => {
    if (currentDrawing) {
      await saveMetadataOnClose();
    }
    setShowEditor(false);
    setCurrentDrawing(null);
  };

  const handleDeleteDrawing = async (drawingId: string) => {
    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;
    
    if (confirm(`Delete "${drawing.name}"? This action cannot be undone.`)) {
      // Delete metadata
      await deleteDrawingMetadata(drawingId);
      
      // Also delete Yjs IndexedDB data
      try {
        const databases = await indexedDB.databases();
        const yjsDbName = `drawing_${drawingId}`;
        if (databases.some(db => db.name === yjsDbName)) {
          await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(yjsDbName);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      } catch (err) {
        console.warn('Failed to delete Yjs database:', err);
      }
      
      removeDrawingFromStore(drawingId);
      toast.success(`"${drawing.name}" deleted`);
    }
  };

  const handleDuplicate = async (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = Date.now().toString();
    
    // Create new metadata entry
    const metadata = createDrawingMetadata(newId, `${drawing.name} (Copy)`);
    metadata.thumbnail = drawing.thumbnail;
    await saveDrawingMetadata(metadata);
    
    // For Yjs data: need to copy from source to new drawing
    // This will be empty initially - user can open and it will sync
    const newDrawing: Drawing = {
      id: newId,
      name: metadata.name,
      data: {}, // Yjs manages data
      thumbnail: drawing.thumbnail,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt
    };
    
    addDrawing(newDrawing);
    toast.success(`Duplicated "${drawing.name}"`);
  };

  const handleRenameClick = (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingDrawing(drawing);
    setShowCreateDialog(true);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (renamingDrawing) {
      // Update metadata
      await saveDrawingMetadata({
        id: renamingDrawing.id,
        name: newName,
        thumbnail: renamingDrawing.thumbnail,
        createdAt: renamingDrawing.createdAt,
        updatedAt: new Date().toISOString(),
        isPinned: renamingDrawing.isPinned,
      });
      
      updateDrawing(renamingDrawing.id, { 
        name: newName, 
        updatedAt: new Date().toISOString() 
      });
      
      toast.success(`Renamed to "${newName}"`);
      setRenamingDrawing(null);
    } else {
      createNewDrawing(newName);
    }
    setShowCreateDialog(false);
  };

  return {
    // State
    drawings,
    isLoading,
    currentDrawing,
    showEditor,
    showCreateDialog,
    renamingDrawing,
    isSaving,
    hasUnsavedChanges,
    
    // Setters
    setShowCreateDialog,
    setRenamingDrawing,
    setCurrentDrawing,
    setHasUnsavedChanges,
    setIsSaving,
    setCurrentView,
    
    // Actions
    createNewDrawing,
    openDrawing,
    closeEditor,
    handleDeleteDrawing,
    handleDuplicate,
    handleRenameClick,
    handleRenameConfirm,
    togglePin
  };
}
