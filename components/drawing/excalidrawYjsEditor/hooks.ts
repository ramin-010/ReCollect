import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { drawingOfflineStorage } from '@/lib/storage/drawingOfflineStorage';
import { drawingApi, ExcalidrawFile } from '@/lib/api/drawingApi';
import { toast } from 'sonner';
import { getYjsStateBase64, syncElementsToYjs, extractUsedFiles, applyYjsStateFromBase64 } from './Utils';
import { useCollaboration } from './Collaboration';
import { useYjsInitialization } from './Intialization';

export function useExcalidrawYjs(
  drawingId: string,
  drawingName: string,
  isOwner: boolean,
  collaborationEnabled: boolean,
  onReady?: () => void,
  onStateChange?: (hasUnsavedChanges: boolean) => void,
  onSyncStatusChange?: (status: 'synced' | 'unsynced' | 'offline') => void,
  onCollaboratorCountChange?: (count: number) => void
) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStateSizeRef = useRef<number>(0);
  const nameRef = useRef(drawingName);
  const isRemoteUpdateRef = useRef(false);
  const serverFilesRef = useRef<Record<string, ExcalidrawFile>>({});
  
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);

  const {
    isLoading,
    isSynced,
    initialElements,
    initialAppState,
    initialFiles,
    syncStatus,
    setSyncStatus,
    showConflictDialog,
    setShowConflictDialog,
    conflictData,
    setConflictData,
  } = useYjsInitialization(
    drawingId,
    drawingName,
    isOwner,
    ydocRef,
    persistenceRef,
    prevStateSizeRef,
    serverFilesRef,
    nameRef
  );

  // Save current state to IndexedDB (used for collab end and beforeunload)
  const saveToIndexedDB = useCallback(() => {
    if (!isOwner || !ydocRef.current) return;
    const yjsState = getYjsStateBase64(ydocRef.current);
    if (yjsState) {
      drawingOfflineStorage.saveDrawing(
        drawingId,
        yjsState,
        nameRef.current,
        '',
        'synced',
        Date.now()
      );
    }
  }, [drawingId, isOwner]);

  // Called when collab mode ends (all users left)
  const handleCollabEnd = useCallback(() => {
    saveToIndexedDB();
    if (process.env.NODE_ENV === 'development') {
      console.log('[YjsEditor] Collab ended, saved to IndexedDB');
    }
  }, [saveToIndexedDB]);

  const { collaborators, providerRef, isCollabMode } = useCollaboration(
    collaborationEnabled,
    drawingId,
    ydocRef,
    excalidrawAPIRef,
    isRemoteUpdateRef,
    onCollaboratorCountChange,
    handleCollabEnd  // Save to IndexedDB when collab ends
  );

  useEffect(() => {
    // Update scene when collaborators change (including when they leave)
    if (collaborationEnabled && excalidrawAPI) {
      excalidrawAPI.updateScene({ collaborators });
    }
  }, [collaborationEnabled, excalidrawAPI, collaborators]);

  useEffect(() => {
    onSyncStatusChange?.(syncStatus);
  }, [syncStatus, onSyncStatusChange]);

  useEffect(() => {
    if (excalidrawAPI && isSynced) {
      onReady?.();
    }
  }, [excalidrawAPI, isSynced, onReady]);

  const syncToYjs = useCallback((elements: readonly any[], appState: any) => {
    if (!ydocRef.current) return;
    
    const { addedCount, updatedCount, deletedCount, deltaSize } = syncElementsToYjs(
      ydocRef.current,
      elements,
      appState,
      prevStateSizeRef
    );
    
    if (addedCount > 0 || updatedCount > 0 || deletedCount > 0) {
      // Only log in development to avoid production overhead
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[YjsEditor] Delta: +${addedCount} ~${updatedCount} -${deletedCount} | ` +
          `${(deltaSize / 1024).toFixed(2)} KB delta`
        );
      }
      
      // Skip IndexedDB during active collab - Hocuspocus handles persistence
      // Only save to IndexedDB when in personal mode (not collaborating)
      if (isOwner && !isCollabMode) {
        setSyncStatus('unsynced');
        const yjsState = getYjsStateBase64(ydocRef.current);
        if (yjsState) {
          drawingOfflineStorage.saveDrawing(
            drawingId,
            yjsState,
            nameRef.current,
            '',
            'pending'
          );
        }
      }
    }
    
    onStateChange?.(true);
  }, [drawingId, isOwner, isCollabMode, onStateChange, setSyncStatus]);

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (isRemoteUpdateRef.current) {
      return;
    }
    
    // Use isCollabMode (derived from actual user count > 1) instead of collaborationEnabled
    // This ensures we only do immediate sync when there are actual collaborators
    if (isCollabMode) {
      syncToYjs(elements, appState);
      return;
    }
    
    // Personal mode (alone or sharing disabled) - use debounced sync
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      syncToYjs(elements, appState);
    }, 300);
  }, [syncToYjs, isCollabMode]);

  // NOTE: Polling removed - Hocuspocus WebSocket handles real-time sync
  // onChange already fires during drag/resize operations

  const saveToCloud = useCallback(async () => {
    if (!isOwner || !excalidrawAPI) return;
    
    const yjsState = getYjsStateBase64(ydocRef.current);
    if (!yjsState) return;
    
    try {
      const elements = excalidrawAPI.getSceneElements();
      const files = excalidrawAPI.getFiles() as Record<string, ExcalidrawFile>;
      
      const { usedFileIds, pendingFiles } = extractUsedFiles(elements, files);
      
      const result = await drawingApi.saveDrawing(
        drawingId, 
        { yjsState, name: nameRef.current },
        pendingFiles,
        usedFileIds
      );
      
      if (result.success) {
        if (result.imageUrlMap && Object.keys(result.imageUrlMap).length > 0) {
          const updatedFiles = { ...files };
          for (const [imageId, data] of Object.entries(result.imageUrlMap)) {
            if (updatedFiles[imageId]) {
              updatedFiles[imageId] = {
                ...updatedFiles[imageId],
                dataURL: data.url,
                isCloudUploaded: true,
              };
            }
          }
          excalidrawAPI.addFiles(Object.values(updatedFiles));
        }
        
        const serverUpdatedAt = new Date(result.updatedAt).getTime();
        await drawingOfflineStorage.saveDrawing(
          drawingId,
          yjsState,
          nameRef.current,
          '',
          'synced',
          serverUpdatedAt
        );
        setSyncStatus('synced');
        toast.success('Saved to cloud');
      }
    } catch (err) {
      console.error('[YjsEditor] Cloud save failed:', err);
      toast.error('Failed to save to cloud');
    }
  }, [drawingId, isOwner, excalidrawAPI, setSyncStatus]);

  const handleKeepLocal = useCallback(async () => {
    setShowConflictDialog(false);
    setConflictData(null);
    setSyncStatus('unsynced');
    toast.success('Keeping local changes. Press Ctrl+S to sync.');
  }, [setShowConflictDialog, setConflictData, setSyncStatus]);

  const handleAcceptServer = useCallback(async () => {
    if (!conflictData?.serverDrawing.yjsState) return;
    
    applyYjsStateFromBase64(ydocRef.current, conflictData.serverDrawing.yjsState);
    
    if (ydocRef.current && excalidrawAPI) {
      const yElements = ydocRef.current.getArray<Y.Map<any>>('elements');
      const elements = yElements.toArray().map(yMap => yMap.toJSON());
      excalidrawAPI.updateScene({ elements });
    }
    
    await drawingOfflineStorage.saveDrawing(
      drawingId,
      conflictData.serverDrawing.yjsState,
      conflictData.serverDrawing.name,
      conflictData.serverDrawing.thumbnail,
      'synced',
      conflictData.serverUpdatedAt
    );
    
    setSyncStatus('synced');
    setShowConflictDialog(false);
    setConflictData(null);
    toast.success('Loaded server version');
  }, [conflictData, drawingId, excalidrawAPI, setShowConflictDialog, setConflictData, setSyncStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToCloud();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveToCloud]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Save to IndexedDB before browser closes (graceful shutdown)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToIndexedDB();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveToIndexedDB]);

  return {
    excalidrawAPI,
    setExcalidrawAPI,
    isLoading,
    initialElements,
    initialAppState,
    initialFiles,
    syncStatus,
    showConflictDialog,
    conflictData,
    collaborators,
    providerRef,
    excalidrawAPIRef,
    handleChange,
    handleKeepLocal,
    handleAcceptServer,
  };
}