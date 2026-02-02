'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useWhiteboardStore, Drawing } from '@/lib/store/whiteboardStore';
import { useViewStore } from '@/lib/store/viewStore';
import { 
  getAllDrawingMetadata, 
  getDrawingMetadata,
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
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetDrawing, setDeleteTargetDrawing] = useState<Drawing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { setCurrentView } = useViewStore();
  
  /* Local state for UI indicators */
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load saved drawings on mount - fetch from server first, then sync
  useEffect(() => {
    const loadDrawings = async () => {
      if (isInitialized) return;
  
      try {
        setLoading(true);
        
        // 1. First fetch from server to get latest data
        const { drawingApi } = await import('@/lib/api/drawingApi');
        let serverDrawings: Drawing[] = [];
        
        try {
          const serverData = await drawingApi.fetchAllDrawings();
          console.log(`[useDrawingDashboard] Fetched ${serverData.length} drawings from server`);
          
          serverDrawings = serverData.map(d => ({
            id: d._id,
            name: d.name,
            data: {},
            thumbnail: d.thumbnail || '',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            isPinned: false, // Will be synced from local
          }));
          
          // Sync server drawings to local metadata storage
          for (const d of serverData) {
            const existingMeta = await getDrawingMetadata(d._id);
            await saveDrawingMetadata({
              id: d._id,
              localId: d.localId,
              name: d.name,
              thumbnail: d.thumbnail || '',
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
              isPinned: existingMeta?.isPinned || false,
              isCloudSynced: true,
            });
          }
        } catch (serverError) {
          console.warn('[useDrawingDashboard] Server fetch failed, using local:', serverError);
        }
        
        // 2. Load local metadata (includes offline-only drawings + pin status)
        const metadata = await getAllDrawingMetadata();
        
        // 3. Merge: prefer server data but keep local-only drawings and local pin status
        const serverIds = new Set(serverDrawings.map(d => d.id));
        const localOnlyDrawings = metadata
          .filter(m => !serverIds.has(m.id))
          .map(m => ({
            id: m.id,
            name: m.name,
            data: {},
            thumbnail: m.thumbnail,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            isPinned: m.isPinned
          }));
        
        // Merge pin status from local to server drawings
        const localMetaMap = new Map(metadata.map(m => [m.id, m]));
        const mergedServerDrawings = serverDrawings.map(d => ({
          ...d,
          isPinned: localMetaMap.get(d.id)?.isPinned || false,
        }));
        
        const allDrawings = [...mergedServerDrawings, ...localOnlyDrawings];
        console.log(`[useDrawingDashboard] Total: ${allDrawings.length} (server: ${serverDrawings.length}, local-only: ${localOnlyDrawings.length})`);
        
        setDrawings(allDrawings);
      } catch (error) {
        console.error('Failed to load drawings:', error);
        setLoading(false);
      }
    };

    loadDrawings();
  }, [isInitialized, setDrawings, setLoading]);

  const createNewDrawing = async (name: string) => {
    const localId = Date.now().toString();
    
    try {
      // Create on server first to get MongoDB _id
      const { drawingApi } = await import('@/lib/api/drawingApi');
      const result = await drawingApi.createDrawing({ name, localId });
      
      if (!result.success || !result.data) {
        throw new Error('Failed to create drawing on server');
      }
      
      const serverDrawing = result.data;
      const drawingId = serverDrawing._id; // Use MongoDB _id as primary ID
      
      // Create metadata entry with server ID
      const metadata = createDrawingMetadata(drawingId, name);
      metadata.localId = localId; // Keep localId for reference
      await saveDrawingMetadata(metadata);
      
      // Add to store for UI
      const newDrawing: Drawing = {
        id: drawingId,
        name: name,
        data: {},
        createdAt: serverDrawing.createdAt,
        updatedAt: serverDrawing.updatedAt
      };
      
      addDrawing(newDrawing);
      setCurrentDrawing(newDrawing);
      setShowEditor(true);
      toast.success(`Created "${name}"`);
      
    } catch (error) {
      console.error('[useDrawingDashboard] Failed to create on server:', error);
      // Fallback to local-only creation
      const metadata = createDrawingMetadata(localId, name);
      await saveDrawingMetadata(metadata);
      
      const newDrawing: Drawing = {
        id: localId,
        name: name,
        data: {},
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt
      };
      
      addDrawing(newDrawing);
      setCurrentDrawing(newDrawing);
      setShowEditor(true);
      toast.warning(`Created "${name}" (offline mode)`);
    }
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

  // Opens delete confirmation dialog
  const handleDeleteDrawing = (drawingId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;
    
    setDeleteTargetDrawing(drawing);
    setDeleteDialogOpen(true);
  };

  // Confirms and performs the actual deletion
  const confirmDeleteDrawing = async () => {
    if (!deleteTargetDrawing) return;
    
    setIsDeleting(true);
    const drawingId = deleteTargetDrawing.id;
    const drawingName = deleteTargetDrawing.name;
    
    console.log(`[useDrawingDashboard] DELETE START: ${drawingId} (${drawingName})`);
    
    try {
      // 1. Delete from server FIRST (handles cloud image cleanup)
      try {
        const { drawingApi } = await import('@/lib/api/drawingApi');
        console.log(`[useDrawingDashboard] Calling server delete API for ${drawingId}`);
        const result = await drawingApi.deleteDrawing(drawingId);
        console.log(`[useDrawingDashboard] Server delete result:`, result);
      } catch (err: any) {
        // If 404, drawing doesn't exist on server - continue with local cleanup
        if (err.response?.status === 404) {
          console.warn(`[useDrawingDashboard] Drawing ${drawingId} not found on server, cleaning up local only`);
        } else {
          console.error('[useDrawingDashboard] Server delete failed:', err);
          throw err; // Re-throw non-404 errors
        }
      }
      
      // 2. Delete local metadata
      console.log(`[useDrawingDashboard] Deleting local metadata for ${drawingId}`);
      await deleteDrawingMetadata(drawingId);
      
      // 3. Delete from drawingOfflineStorage (cloud sync storage)
      try {
        const { drawingOfflineStorage } = await import('@/lib/storage/drawingOfflineStorage');
        await drawingOfflineStorage.deleteDrawing(drawingId);
        console.log(`[useDrawingDashboard] Deleted from offlineStorage`);
      } catch (err) {
        console.warn('Failed to delete from offline storage:', err);
      }
      
      // 4. Delete local images from drawingImageStorage
      try {
        const { drawingImageStorage } = await import('@/lib/storage/drawingImageStorage');
        const allFileIds = await drawingImageStorage.getAllFileIds();
        // Filter for files belonging to this drawing (if we had prefixed naming)
        // For now, we rely on server to track images, local is just cache
        console.log(`[useDrawingDashboard] Local image storage has ${allFileIds.length} total files`);
      } catch (err) {
        console.warn('Failed to check local image storage:', err);
      }
      
      // 5. Delete Yjs IndexedDB data
      try {
        const databases = await indexedDB.databases();
        const yjsDbName = `drawing_${drawingId}`;
        if (databases.some(db => db.name === yjsDbName)) {
          await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(yjsDbName);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
          console.log(`[useDrawingDashboard] Deleted Yjs database: ${yjsDbName}`);
        }
      } catch (err) {
        console.warn('Failed to delete Yjs database:', err);
      }
      
      // 6. Remove from UI store
      removeDrawingFromStore(drawingId);
      console.log(`[useDrawingDashboard] DELETE COMPLETE: ${drawingId}`);
      toast.success(`"${drawingName}" deleted`);
    } catch (err) {
      console.error(`[useDrawingDashboard] DELETE FAILED: ${drawingId}`, err);
      toast.error(`Failed to delete "${drawingName}"`);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTargetDrawing(null);
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
    
    // Delete dialog state
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTargetDrawing,
    isDeleting,
    
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
    confirmDeleteDrawing,
    handleDuplicate,
    handleRenameClick,
    handleRenameConfirm,
    togglePin
  };
}
