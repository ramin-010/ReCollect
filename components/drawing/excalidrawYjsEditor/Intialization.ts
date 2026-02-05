import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { drawingOfflineStorage } from '@/lib/storage/drawingOfflineStorage';
import { drawingApi, ExcalidrawFile } from '@/lib/api/drawingApi';
import { ConflictData, SyncStatus } from './types';
import { applyYjsStateFromBase64 } from './Utils';

export function useYjsInitialization(
  drawingId: string,
  drawingName: string,
  isOwner: boolean,
  ydocRef: React.MutableRefObject<Y.Doc | null>,
  persistenceRef: React.MutableRefObject<IndexeddbPersistence | null>,
  serverFilesRef: React.MutableRefObject<Record<string, ExcalidrawFile>>,
  nameRef: React.MutableRefObject<string>
) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [initialElements, setInitialElements] = useState<any[]>([]);
  const [initialAppState, setInitialAppState] = useState<any>(null);
  const [initialFiles, setInitialFiles] = useState<Record<string, ExcalidrawFile>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  useEffect(() => {
    if (!drawingId) return;
    nameRef.current = drawingName;

    // Track if component is still mounted for async safety
    let isMounted = true;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const persistence = new IndexeddbPersistence(`drawing_${drawingId}`, ydoc);
    persistenceRef.current = persistence;

    persistence.on('synced', async () => {
      // Wrap entire async callback in try-catch for safety
      try {
        const yElements = ydoc.getArray<Y.Map<any>>('elements');
        const yAppState = ydoc.getMap<any>('appState');
        
        let elements = yElements.toArray().map(yMap => yMap.toJSON());
        let appState: any = yAppState.size > 0 ? yAppState.toJSON() : null;
        
        const offlineData = await drawingOfflineStorage.loadDrawing(drawingId);
        
        // Check if still mounted after async operation
        if (!isMounted) return;
        
        if (isOwner) {
          try {
            const serverData = await drawingApi.fetchDrawing(drawingId);
            
            // Check if still mounted after async operation
            if (!isMounted) return;

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
            
            // Cache date conversion to avoid repeated parsing
            const serverUpdatedAt = serverData?.updatedAt 
              ? new Date(serverData.updatedAt).getTime() 
              : 0;
            
            if (serverData?.yjsState && localIsEmpty) {
              applyYjsStateFromBase64(ydoc, serverData.yjsState);
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
              if (isMounted) setSyncStatus('synced');
            } else if (serverData && offlineData) {
              const localUpdatedAt = offlineData.updatedAt;
              const isPending = offlineData.syncStatus === 'pending';
              
              if (serverUpdatedAt > localUpdatedAt && isPending) {
                if (isMounted) {
                  setConflictData({
                    localUpdatedAt,
                    serverUpdatedAt,
                    serverDrawing: serverData,
                  });
                  setShowConflictDialog(true);
                }
              } else if (serverUpdatedAt > localUpdatedAt && serverData.yjsState) {
                applyYjsStateFromBase64(ydoc, serverData.yjsState);
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
                if (isMounted) setSyncStatus('synced');
              } else if (isPending) {
                if (isMounted) setSyncStatus('unsynced');
              } else {
                if (isMounted) setSyncStatus('synced');
              }
            } else if (serverData?.yjsState && !offlineData) {
              applyYjsStateFromBase64(ydoc, serverData.yjsState);
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
              if (isMounted) setSyncStatus('synced');
            }
          } catch (err) {
            console.warn('[YjsEditor] Cloud check failed, offline mode:', err);
            if (isMounted) setSyncStatus('offline');
          }
          
          if (isMounted && Object.keys(serverFilesRef.current).length > 0) {
            setInitialFiles(serverFilesRef.current);
          }
        }
        
        if (isMounted) {
          setInitialElements(elements);
          setInitialAppState(appState);
          setIsSynced(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[YjsEditor] Initialization failed:', err);
        if (isMounted) {
          setIsLoading(false);
          setSyncStatus('offline');
        }
      }
    });

    return () => {
      isMounted = false;
      persistence.destroy();
      persistenceRef.current = null;
      ydoc.destroy();
      ydocRef.current = null;
      setIsSynced(false);
    };
  }, [drawingId, drawingName, isOwner]);

  return {
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
  };
}