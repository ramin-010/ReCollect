'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { drawingOfflineStorage } from '@/lib/storage/drawingOfflineStorage';
import { drawingApi, ServerDrawing, ExcalidrawFile } from '@/lib/api/drawingApi';
import { toast } from 'sonner';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

interface ExcalidrawYjsEditorProps {
  drawingId: string;
  drawingName: string;
  isOwner?: boolean;  // For cloud sync conflict detection
  theme?: 'light' | 'dark';
  onReady?: () => void;
  onStateChange?: (hasUnsavedChanges: boolean) => void;
  onSyncStatusChange?: (status: 'synced' | 'unsynced' | 'offline') => void;
}

interface ConflictData {
  localUpdatedAt: number;
  serverUpdatedAt: number;
  serverDrawing: ServerDrawing;
}

/**
 * Excalidraw editor with Yjs persistence via IndexedDB.
 * Supports cloud sync with conflict detection for owners.
 */
export function ExcalidrawYjsEditor({
  drawingId,
  drawingName,
  isOwner = true,
  theme = 'dark',
  onReady,
  onStateChange,
  onSyncStatusChange,
}: ExcalidrawYjsEditorProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [initialElements, setInitialElements] = useState<any[]>([]);
  const [initialAppState, setInitialAppState] = useState<any>(null);
  const [initialFiles, setInitialFiles] = useState<Record<string, ExcalidrawFile>>({});
  const [syncStatus, setSyncStatus] = useState<'synced' | 'unsynced' | 'offline'>('synced');
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cloudSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStateSizeRef = useRef<number>(0);
  const nameRef = useRef(drawingName);
  const serverFilesRef = useRef<Record<string, ExcalidrawFile>>({});

  // Helper: Get current yjsState as base64 (handles large arrays)
  const getYjsStateBase64 = useCallback(() => {
    if (!ydocRef.current) return null;
    const state = Y.encodeStateAsUpdate(ydocRef.current);
    
    // Use chunked encoding to avoid stack overflow on large arrays
    const CHUNK_SIZE = 8192;
    let binary = '';
    for (let i = 0; i < state.length; i += CHUNK_SIZE) {
      const chunk = state.subarray(i, Math.min(i + CHUNK_SIZE, state.length));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }, []);

  // Helper: Apply yjsState from base64
  const applyYjsStateFromBase64 = useCallback((base64: string) => {
    if (!ydocRef.current) return;
    const binary = atob(base64);
    const state = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      state[i] = binary.charCodeAt(i);
    }
    Y.applyUpdate(ydocRef.current, state);
  }, []);

  // Initialize Yjs doc and IndexedDB persistence, then check cloud
  useEffect(() => {
    if (!drawingId) return;
    nameRef.current = drawingName;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const persistence = new IndexeddbPersistence(`drawing_${drawingId}`, ydoc);
    persistenceRef.current = persistence;

    persistence.on('synced', async () => {
      // Load elements from Y.Array of Y.Maps
      const yElements = ydoc.getArray<Y.Map<any>>('elements');
      const yAppState = ydoc.getMap<any>('appState');
      
      // Initial load from local
      let elements = yElements.toArray().map(yMap => yMap.toJSON());
      let appState: any = yAppState.size > 0 ? yAppState.toJSON() : null;
      
      console.log(`[YjsEditor] Local: ${elements.length} elements for ${drawingId}`);
      
      // Store initial state size
      prevStateSizeRef.current = Y.encodeStateAsUpdate(ydoc).byteLength;
      
      // Check offline storage for sync status
      const offlineData = await drawingOfflineStorage.loadDrawing(drawingId);
      
      // If owner, check server for newer version
      if (isOwner) {
        try {
          const serverData = await drawingApi.fetchDrawing(drawingId);
          console.log(`[YjsEditor] Server fetch: ${serverData ? 'found' : 'not found'}, yjsState: ${serverData?.yjsState ? 'yes' : 'no'}, cloudImages: ${serverData?.cloudImages?.length || 0}`);
          
          // Build files from cloudImages
          const cloudFiles: Record<string, ExcalidrawFile> = {};
          if (serverData?.cloudImages && serverData.cloudImages.length > 0) {
            for (const img of serverData.cloudImages) {
              cloudFiles[img.imageId] = {
                id: img.imageId,
                mimeType: 'image/webp',
                dataURL: img.cloudUrl,
                isCloudUploaded: true,
              };
            }
            console.log(`[YjsEditor] Built ${Object.keys(cloudFiles).length} files from cloudImages`);
            serverFilesRef.current = cloudFiles;
          }
          
          // KEY FIX: If local is empty and server has data, always apply server state
          const localIsEmpty = elements.length === 0;
          
          if (serverData?.yjsState && localIsEmpty) {
            // Local is empty, server has data - apply server state
            console.log('[YjsEditor] Local empty, applying server state...');
            applyYjsStateFromBase64(serverData.yjsState);
            elements = yElements.toArray().map(yMap => yMap.toJSON());
            appState = yAppState.size > 0 ? yAppState.toJSON() : null;
            console.log(`[YjsEditor] After server apply: ${elements.length} elements`);
            
            // Update offline storage to mark as synced
            await drawingOfflineStorage.saveDrawing(
              drawingId,
              serverData.yjsState,
              serverData.name,
              serverData.thumbnail,
              'synced',
              new Date(serverData.updatedAt).getTime()
            );
            setSyncStatus('synced');
            
            // Set cloud files will be done after all conditions
          } else if (serverData && offlineData) {
            const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
            const localUpdatedAt = offlineData.updatedAt;
            const isPending = offlineData.syncStatus === 'pending';
            
            // Conflict: Server newer AND local has pending changes
            if (serverUpdatedAt > localUpdatedAt && isPending) {
              console.log('[YjsEditor] Conflict detected - server newer + local pending');
              setConflictData({
                localUpdatedAt,
                serverUpdatedAt,
                serverDrawing: serverData,
              });
              setShowConflictDialog(true);
              // Still load local for now, wait for user decision
            } else if (serverUpdatedAt > localUpdatedAt && serverData.yjsState) {
              // Server newer, no local changes - accept server
              console.log('[YjsEditor] Server newer, applying...');
              applyYjsStateFromBase64(serverData.yjsState);
              elements = yElements.toArray().map(yMap => yMap.toJSON());
              appState = yAppState.size > 0 ? yAppState.toJSON() : null;
              
              // Update offline storage
              await drawingOfflineStorage.saveDrawing(
                drawingId,
                serverData.yjsState,
                serverData.name,
                serverData.thumbnail,
                'synced',
                serverUpdatedAt
              );
              setSyncStatus('synced');
            } else if (isPending) {
              // Local newer with pending changes
              setSyncStatus('unsynced');
            } else {
              setSyncStatus('synced');
            }
          } else if (serverData?.yjsState && !offlineData) {
            // No local offlineData, apply server
            console.log('[YjsEditor] No offlineData, applying server...');
            applyYjsStateFromBase64(serverData.yjsState);
            elements = yElements.toArray().map(yMap => yMap.toJSON());
            appState = yAppState.size > 0 ? yAppState.toJSON() : null;
            
            await drawingOfflineStorage.saveDrawing(
              drawingId,
              serverData.yjsState,
              serverData.name,
              serverData.thumbnail,
              'synced',
              new Date(serverData.updatedAt).getTime()
            );
            setSyncStatus('synced');
          }
        } catch (err) {
          console.warn('[YjsEditor] Cloud check failed, offline mode:', err);
          setSyncStatus('offline');
        }
        
        // ALWAYS set cloud files from server (fixes second open bug)
        if (Object.keys(serverFilesRef.current).length > 0) {
          console.log(`[YjsEditor] Setting initialFiles from cloudImages: ${Object.keys(serverFilesRef.current).length} files`);
          setInitialFiles(serverFilesRef.current);
        }
      }
      
      setInitialElements(elements);
      setInitialAppState(appState);
      setIsSynced(true);
      setIsLoading(false);
    });

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (cloudSaveTimeoutRef.current) clearTimeout(cloudSaveTimeoutRef.current);
      persistence.destroy();
      persistenceRef.current = null;
      ydoc.destroy();
      ydocRef.current = null;
      setIsSynced(false);
    };
  }, [drawingId, drawingName, isOwner, applyYjsStateFromBase64]);

  // Notify sync status changes
  useEffect(() => {
    onSyncStatusChange?.(syncStatus);
  }, [syncStatus, onSyncStatusChange]);

  // Notify when ready
  useEffect(() => {
    if (excalidrawAPI && isSynced) {
      onReady?.();
    }
  }, [excalidrawAPI, isSynced, onReady]);

  // Sync elements to Yjs with delta tracking
  const syncToYjs = useCallback((elements: readonly any[], appState: any) => {
    if (!ydocRef.current) return;
    
    const ydoc = ydocRef.current;
    const yElements = ydoc.getArray<Y.Map<any>>('elements');
    const yAppState = ydoc.getMap<any>('appState');
    
    const activeElements = elements.filter(el => !el.isDeleted);
    
    const yElementMap = new Map<string, { index: number; yMap: Y.Map<any>; version: number }>();
    yElements.forEach((yMap, index) => {
      const id = yMap.get('id');
      const version = yMap.get('version') || 0;
      if (id) {
        yElementMap.set(id, { index, yMap, version });
      }
    });
    
    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    const processedIds = new Set<string>();
    
    ydoc.transact(() => {
      activeElements.forEach(element => {
        processedIds.add(element.id);
        const existing = yElementMap.get(element.id);
        
        if (!existing) {
          const yMap = new Y.Map();
          for (const [key, value] of Object.entries(element)) {
            yMap.set(key, value);
          }
          yElements.push([yMap]);
          addedCount++;
        } else if (existing.version !== element.version) {
          for (const [key, value] of Object.entries(element)) {
            if (existing.yMap.get(key) !== value) {
              existing.yMap.set(key, value);
            }
          }
          updatedCount++;
        }
      });
      
      const indicesToDelete: number[] = [];
      yElementMap.forEach(({ index }, id) => {
        if (!processedIds.has(id)) {
          indicesToDelete.push(index);
          deletedCount++;
        }
      });
      
      indicesToDelete.sort((a, b) => b - a);
      indicesToDelete.forEach(index => {
        yElements.delete(index, 1);
      });
      
      const persistableState = {
        viewBackgroundColor: appState.viewBackgroundColor,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
        theme: appState.theme,
        gridSize: appState.gridSize,
      };
      
      for (const [key, value] of Object.entries(persistableState)) {
        if (yAppState.get(key) !== value) {
          yAppState.set(key, value);
        }
      }
    });
    
    const newStateSize = Y.encodeStateAsUpdate(ydoc).byteLength;
    const deltaSize = Math.abs(newStateSize - prevStateSizeRef.current);
    prevStateSizeRef.current = newStateSize;
    
    if (addedCount > 0 || updatedCount > 0 || deletedCount > 0) {
      console.log(
        `[YjsEditor] Delta: +${addedCount} ~${updatedCount} -${deletedCount} | ` +
        `${(deltaSize / 1024).toFixed(2)} KB delta | ` +
        `${(newStateSize / 1024).toFixed(2)} KB total (${activeElements.length} elements)`
      );
      
      // Mark as unsynced and save to offline storage
      if (isOwner) {
        setSyncStatus('unsynced');
        const yjsState = getYjsStateBase64();
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
  }, [drawingId, isOwner, getYjsStateBase64, onStateChange]);

  // Debounced local save
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      syncToYjs(elements, appState);
    }, 300);
  }, [syncToYjs]);

  // Save to cloud (with image upload support)
  const saveToCloud = useCallback(async () => {
    if (!isOwner || !excalidrawAPI) return;
    
    const yjsState = getYjsStateBase64();
    if (!yjsState) return;
    
    try {
      // Get current elements and files
      const elements = excalidrawAPI.getSceneElements();
      const files = excalidrawAPI.getFiles() as Record<string, ExcalidrawFile>;
      
      // IMPORTANT: Calculate which fileIds are ACTUALLY used by image elements on canvas
      // This is different from getFiles() which returns cached files even after deletion
      const usedFileIds = new Set<string>();
      for (const element of elements) {
        // Image elements have a fileId property
        if (element.type === 'image' && element.fileId && !element.isDeleted) {
          usedFileIds.add(element.fileId);
        }
      }
      
      const allFileIds = Array.from(usedFileIds);
      console.log(`[YjsEditor] Cloud save: ${Object.keys(files).length} files in cache, ${allFileIds.length} actually used by elements`);
      
      // Find pending files (only from used files, dataURL starts with 'data:' and not cloudUploaded)
      const pendingFiles: ExcalidrawFile[] = [];
      for (const fileId of allFileIds) {
        const fileData = files[fileId];
        if (fileData && 
            fileData.dataURL && 
            fileData.dataURL.startsWith('data:') && 
            !fileData.isCloudUploaded) {
          pendingFiles.push({ ...fileData, id: fileId });
        }
      }
      
      console.log(`[YjsEditor] Cloud save: ${pendingFiles.length} pending upload`);
      
      const result = await drawingApi.saveDrawing(
        drawingId, 
        {
          yjsState,
          name: nameRef.current,
        },
        pendingFiles,
        allFileIds
      );
      
      if (result.success) {
        // Update files with cloud URLs if any were uploaded
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
          // Update Excalidraw with cloud URLs
          excalidrawAPI.addFiles(Object.values(updatedFiles));
          console.log(`[YjsEditor] Updated ${Object.keys(result.imageUrlMap).length} files with cloud URLs`);
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
  }, [drawingId, isOwner, excalidrawAPI, getYjsStateBase64]);

  // Conflict resolution handlers
  const handleKeepLocal = useCallback(async () => {
    setShowConflictDialog(false);
    setConflictData(null);
    setSyncStatus('unsynced');
    toast.success('Keeping local changes. Press Ctrl+S to sync.');
  }, []);

  const handleAcceptServer = useCallback(async () => {
    if (!conflictData?.serverDrawing.yjsState) return;
    
    applyYjsStateFromBase64(conflictData.serverDrawing.yjsState);
    
    // Reload elements
    if (ydocRef.current) {
      const yElements = ydocRef.current.getArray<Y.Map<any>>('elements');
      const yAppState = ydocRef.current.getMap<any>('appState');
      
      const elements = yElements.toArray().map(yMap => yMap.toJSON());
      const appState = yAppState.size > 0 ? yAppState.toJSON() : null;
      
      setInitialElements(elements);
      setInitialAppState(appState);
      
      if (excalidrawAPI) {
        excalidrawAPI.updateScene({ elements });
      }
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
  }, [conflictData, drawingId, excalidrawAPI, applyYjsStateFromBase64]);

  // Keyboard shortcut for cloud save
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (cloudSaveTimeoutRef.current) clearTimeout(cloudSaveTimeoutRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading drawing...</div>
      </div>
    );
  }

  const initialData: any = {};
  if (initialElements.length > 0) {
    initialData.elements = initialElements;
  }
  if (initialAppState) {
    initialData.appState = initialAppState;
  }
  // Include files from server cloudImages
  if (Object.keys(initialFiles).length > 0) {
    initialData.files = initialFiles;
  }

  return (
    <div className="flex-1 relative">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        theme={theme}
        initialData={Object.keys(initialData).length > 0 ? initialData : undefined}
        onChange={(elements, appState) => handleChange(elements, appState)}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false
          }
        }}
      />
      
      {/* Conflict Dialog */}
      {showConflictDialog && conflictData && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Sync Conflict</h3>
            <p className="text-muted-foreground mb-4">
              This drawing was modified on another device while you were offline.
              What would you like to do?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleKeepLocal}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Keep My Changes
              </button>
              <button
                onClick={handleAcceptServer}
                className="px-4 py-2 border rounded hover:bg-accent"
              >
                Accept Server Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
