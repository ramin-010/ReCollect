'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
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
  isOwner?: boolean;
  collaborationEnabled?: boolean;
  theme?: 'light' | 'dark';
  onReady?: () => void;
  onStateChange?: (hasUnsavedChanges: boolean) => void;
  onSyncStatusChange?: (status: 'synced' | 'unsynced' | 'offline') => void;
  onCollaboratorCountChange?: (count: number) => void;
}

interface ConflictData {
  localUpdatedAt: number;
  serverUpdatedAt: number;
  serverDrawing: ServerDrawing;
}


export function ExcalidrawYjsEditor({
  drawingId,
  drawingName,
  isOwner = true,
  collaborationEnabled = false,
  theme = 'dark',
  onReady,
  onStateChange,
  onSyncStatusChange,
  onCollaboratorCountChange,
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
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prevStateSizeRef = useRef<number>(0);
  const nameRef = useRef(drawingName);
  const isRemoteUpdateRef = useRef(false);
  
  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;
  }, [excalidrawAPI]);
  const serverFilesRef = useRef<Record<string, ExcalidrawFile>>({});

  const getYjsStateBase64 = useCallback(() => {
    if (!ydocRef.current) return null;
    const state = Y.encodeStateAsUpdate(ydocRef.current);
    const CHUNK_SIZE = 8192;
    let binary = '';
    for (let i = 0; i < state.length; i += CHUNK_SIZE) {
      const chunk = state.subarray(i, Math.min(i + CHUNK_SIZE, state.length));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }, []);

  const applyYjsStateFromBase64 = useCallback((base64: string) => {
    if (!ydocRef.current) return;
    const binary = atob(base64);
    const state = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      state[i] = binary.charCodeAt(i);
    }
    Y.applyUpdate(ydocRef.current, state);
  }, []);

    useEffect(() => {
    if (!drawingId) return;
    nameRef.current = drawingName;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;


    const persistence = new IndexeddbPersistence(`drawing_${drawingId}`, ydoc);
    persistenceRef.current = persistence;

    persistence.on('synced', async () => {
      const yElements = ydoc.getArray<Y.Map<any>>('elements');
      const yAppState = ydoc.getMap<any>('appState');
      
      let elements = yElements.toArray().map(yMap => yMap.toJSON());
      let appState: any = yAppState.size > 0 ? yAppState.toJSON() : null;
      
      prevStateSizeRef.current = Y.encodeStateAsUpdate(ydoc).byteLength;
      
            const offlineData = await drawingOfflineStorage.loadDrawing(drawingId);
      
            if (isOwner) {
        try {
          const serverData = await drawingApi.fetchDrawing(drawingId);

          
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

            serverFilesRef.current = cloudFiles;
          }
          
                    const localIsEmpty = elements.length === 0;
          
          if (serverData?.yjsState && localIsEmpty) {
            
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
            
                      } else if (serverData && offlineData) {
            const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
            const localUpdatedAt = offlineData.updatedAt;
            const isPending = offlineData.syncStatus === 'pending';
            
                        if (serverUpdatedAt > localUpdatedAt && isPending) {

              setConflictData({
                localUpdatedAt,
                serverUpdatedAt,
                serverDrawing: serverData,
              });
              setShowConflictDialog(true);
                          } else if (serverUpdatedAt > localUpdatedAt && serverData.yjsState) {
              
              applyYjsStateFromBase64(serverData.yjsState);
              elements = yElements.toArray().map(yMap => yMap.toJSON());
              appState = yAppState.size > 0 ? yAppState.toJSON() : null;
              
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
                            setSyncStatus('unsynced');
            } else {
              setSyncStatus('synced');
            }
          } else if (serverData?.yjsState && !offlineData) {
            
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
        
                if (Object.keys(serverFilesRef.current).length > 0) {

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

      persistence.destroy();
      persistenceRef.current = null;
      ydoc.destroy();
      ydocRef.current = null;
      setIsSynced(false);
    };
  }, [drawingId, drawingName, isOwner, applyYjsStateFromBase64]);

    const hasShownCollabToastRef = useRef(false);
  const onCollaboratorCountChangeRef = useRef(onCollaboratorCountChange);
  
    useEffect(() => {
    onCollaboratorCountChangeRef.current = onCollaboratorCountChange;
  }, [onCollaboratorCountChange]);
  
  useEffect(() => {
    if (!collaborationEnabled || !drawingId || !ydocRef.current) return;
    
    const ydoc = ydocRef.current;
const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:1234';
    const documentName = `drawing_${drawingId}`;
    
    const provider = new HocuspocusProvider({
      url: collabUrl,
      name: documentName,
      document: ydoc,
            onConnect: () => {
        if (!hasShownCollabToastRef.current) {
          hasShownCollabToastRef.current = true;
          toast.success('Real-time collaboration connected!');
        }
      },
      onSynced: () => {
        const yElements = ydoc.getArray('elements');
        const currentElements = yElements.toArray();
        
        ydoc.transact(() => {
          const marker = ydoc.getMap('_syncMarker');
          marker.set('lastSync', Date.now());
        });
      },
      onDisconnect: () => {},
      onAuthenticationFailed: (data: any) => {
        toast.error('Collaboration auth failed: ' + (data?.reason || 'Unknown'));
      },
      onAwarenessUpdate: ({ states }) => {
        onCollaboratorCountChangeRef.current?.(states.length);
        
        // Update collaborators for cursor presence
        const newCollaborators = new Map<string, any>();
        states.forEach((state: any) => {
          if (state.user && state.clientId !== provider.awareness?.clientID) {
            newCollaborators.set(state.user.id || state.clientId, {
              pointer: state.pointer,
              username: state.user.name || 'Anonymous',
              color: { 
                background: state.user.color || '#6366F1', 
                stroke: state.user.color || '#6366F1' 
              },
              selectedElementIds: state.selectedElementIds || {},
            });
          }
        });
        setCollaborators(newCollaborators);
      },
    });
    
    providerRef.current = provider;
    
    // Set local user awareness
    provider.awareness?.setLocalStateField('user', {
      id: `owner-${drawingId}`,
      name: 'You',
      color: '#6366F1', // Indigo
    });
    
    const yElements = ydoc.getArray<Y.Map<any>>('elements');
    const yAppState = ydoc.getMap<any>('appState');
    
    const elementsObserver = (events: Y.YEvent<any>[]) => {
      const api = excalidrawAPIRef.current;
      const isLocal = events.some(e => e.transaction.local);
      
      if (!api || isLocal) return;
      
      isRemoteUpdateRef.current = true;
      const elements = yElements.toArray().map((yMap) => yMap.toJSON());
      api.updateScene({ elements });
      
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 50);
    };
    
    const appStateObserver = (event: Y.YMapEvent<any>) => {
      const api = excalidrawAPIRef.current;
      if (!api || event.transaction.local) return;
      
      isRemoteUpdateRef.current = true;
      const appState = yAppState.toJSON();
      const safeState: any = {};
      if (appState.viewBackgroundColor) safeState.viewBackgroundColor = appState.viewBackgroundColor;
      if (appState.theme) safeState.theme = appState.theme;
      
      if (Object.keys(safeState).length > 0) {
        api.updateScene({ appState: safeState });
      }
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 50);
    };
    
    yElements.observeDeep(elementsObserver);
    yAppState.observe(appStateObserver);
    
    return () => {
      yElements.unobserveDeep(elementsObserver);
      yAppState.unobserve(appStateObserver);
      provider.destroy();
      providerRef.current = null;
    };
  }, [collaborationEnabled, drawingId]); 

  // Update collaborators in Excalidraw when they change
  useEffect(() => {
    if (collaborationEnabled && excalidrawAPI && collaborators.size >= 0) {
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

    const handleChange = useCallback((elements: readonly any[], appState: any) => {
        if (isRemoteUpdateRef.current) {
      return;
    }
    
        if (collaborationEnabled) {
      syncToYjs(elements, appState);
      return;
    }
    
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      syncToYjs(elements, appState);
    }, 300);
  }, [syncToYjs, collaborationEnabled]);

      useEffect(() => {
    if (!collaborationEnabled || !excalidrawAPI) return;
    
    const pollInterval = setInterval(() => {
      if (isRemoteUpdateRef.current) return;       
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      
            if (appState.editingElement || appState.draggingElement || appState.resizingElement) {
        syncToYjs(elements, appState);
      }
    }, 100);     
    return () => clearInterval(pollInterval);
  }, [collaborationEnabled, excalidrawAPI, syncToYjs]);

    const saveToCloud = useCallback(async () => {
    if (!isOwner || !excalidrawAPI) return;
    
    const yjsState = getYjsStateBase64();
    if (!yjsState) return;
    
    try {
            const elements = excalidrawAPI.getSceneElements();
      const files = excalidrawAPI.getFiles() as Record<string, ExcalidrawFile>;
      
                  const usedFileIds = new Set<string>();
      for (const element of elements) {
                if (element.type === 'image' && element.fileId && !element.isDeleted) {
          usedFileIds.add(element.fileId);
        }
      }
      
      const allFileIds = Array.from(usedFileIds);

      
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
  }, [drawingId, isOwner, excalidrawAPI, getYjsStateBase64]);

    const handleKeepLocal = useCallback(async () => {
    setShowConflictDialog(false);
    setConflictData(null);
    setSyncStatus('unsynced');
    toast.success('Keeping local changes. Press Ctrl+S to sync.');
  }, []);

  const handleAcceptServer = useCallback(async () => {
    if (!conflictData?.serverDrawing.yjsState) return;
    
    applyYjsStateFromBase64(conflictData.serverDrawing.yjsState);
    
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
        onPointerUpdate={collaborationEnabled && providerRef.current ? (payload: any) => {
          providerRef.current?.awareness?.setLocalStateField('pointer', payload.pointer);
          providerRef.current?.awareness?.setLocalStateField('selectedElementIds', 
            excalidrawAPI?.getAppState()?.selectedElementIds || {}
          );
        } : undefined}
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
