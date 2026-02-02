'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

interface ExcalidrawYjsEditorProps {
  drawingId: string;
  theme?: 'light' | 'dark';
  onReady?: () => void;
  onStateChange?: (hasUnsavedChanges: boolean) => void;
}

/**
 * Excalidraw editor with Yjs persistence via IndexedDB.
 * Uses Y.Array of Y.Maps for proper delta sync (collaboration-ready).
 */
export function ExcalidrawYjsEditor({
  drawingId,
  theme = 'dark',
  onReady,
  onStateChange,
}: ExcalidrawYjsEditorProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [initialElements, setInitialElements] = useState<any[]>([]);
  const [initialAppState, setInitialAppState] = useState<any>(null);
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStateSizeRef = useRef<number>(0);

  // Initialize Yjs doc and IndexedDB persistence
  useEffect(() => {
    if (!drawingId) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const persistence = new IndexeddbPersistence(`drawing_${drawingId}`, ydoc);
    persistenceRef.current = persistence;

    persistence.on('synced', () => {
      // Load elements from Y.Array of Y.Maps
      const yElements = ydoc.getArray<Y.Map<any>>('elements');
      const yAppState = ydoc.getMap<any>('appState');
      
      // Convert Y.Maps to plain objects
      const elements = yElements.toArray().map(yMap => yMap.toJSON());
      
      // Load appState
      let appState: any = null;
      if (yAppState.size > 0) {
        appState = yAppState.toJSON();
      }
      
      console.log(`[YjsEditor] Loaded ${elements.length} elements for ${drawingId}`);
      
      // Store initial state size for delta calculation
      prevStateSizeRef.current = Y.encodeStateAsUpdate(ydoc).byteLength;
      
      setInitialElements(elements);
      setInitialAppState(appState);
      setIsSynced(true);
      setIsLoading(false);
    });

    return () => {
      // Cleanup
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      persistence.destroy();
      persistenceRef.current = null;
      ydoc.destroy();
      ydocRef.current = null;
      setIsSynced(false);
    };
  }, [drawingId]);

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
    
    // Filter out soft-deleted elements
    const activeElements = elements.filter(el => !el.isDeleted);
    
    // Build lookup of current Yjs elements by ID
    const yElementMap = new Map<string, { index: number; yMap: Y.Map<any>; version: number }>();
    yElements.forEach((yMap, index) => {
      const id = yMap.get('id');
      const version = yMap.get('version') || 0;
      if (id) {
        yElementMap.set(id, { index, yMap, version });
      }
    });
    
    // Track changes for logging
    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    const processedIds = new Set<string>();
    
    ydoc.transact(() => {
      // Process each active element
      activeElements.forEach(element => {
        processedIds.add(element.id);
        const existing = yElementMap.get(element.id);
        
        if (!existing) {
          // ADD: New element - create Y.Map and push to array
          const yMap = new Y.Map();
          for (const [key, value] of Object.entries(element)) {
            yMap.set(key, value);
          }
          yElements.push([yMap]);
          addedCount++;
        } else if (existing.version !== element.version) {
          // UPDATE: Element changed - update individual properties
          for (const [key, value] of Object.entries(element)) {
            if (existing.yMap.get(key) !== value) {
              existing.yMap.set(key, value);
            }
          }
          updatedCount++;
        }
        // else: Unchanged, skip
      });
      
      // DELETE: Find elements in Yjs that are no longer in activeElements
      const indicesToDelete: number[] = [];
      yElementMap.forEach(({ index }, id) => {
        if (!processedIds.has(id)) {
          indicesToDelete.push(index);
          deletedCount++;
        }
      });
      
      // Delete in reverse order to maintain valid indices
      indicesToDelete.sort((a, b) => b - a);
      indicesToDelete.forEach(index => {
        yElements.delete(index, 1);
      });
      
      // Sync appState properties
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
    
    // Calculate and log delta size
    const newStateSize = Y.encodeStateAsUpdate(ydoc).byteLength;
    const deltaSize = Math.abs(newStateSize - prevStateSizeRef.current);
    prevStateSizeRef.current = newStateSize;
    
    // Only log if there were actual changes
    if (addedCount > 0 || updatedCount > 0 || deletedCount > 0) {
      console.log(
        `[YjsEditor] Delta: +${addedCount} ~${updatedCount} -${deletedCount} | ` +
        `${(deltaSize / 1024).toFixed(2)} KB delta | ` +
        `${(newStateSize / 1024).toFixed(2)} KB total (${activeElements.length} elements)`
      );
    }
    
    onStateChange?.(true);
  }, [onStateChange]);

  // Debounced save handler
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      syncToYjs(elements, appState);
    }, 300); // Save 300ms after last change
  }, [syncToYjs]);

  // Cleanup save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading drawing...</div>
      </div>
    );
  }

  // Build initial data
  const initialData: any = {};
  if (initialElements.length > 0) {
    initialData.elements = initialElements;
  }
  if (initialAppState) {
    initialData.appState = initialAppState;
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
    </div>
  );
}
