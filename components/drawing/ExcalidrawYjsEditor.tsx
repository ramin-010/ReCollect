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
 * Uses simple JSON storage for maximum compatibility.
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

  // Initialize Yjs doc and IndexedDB persistence
  useEffect(() => {
    if (!drawingId) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const persistence = new IndexeddbPersistence(`drawing_${drawingId}`, ydoc);
    persistenceRef.current = persistence;

    persistence.on('synced', () => {
      // Load elements from simple JSON storage
      const yData = ydoc.getMap<any>('data');
      const elementsJson = yData.get('elements');
      const appStateJson = yData.get('appState');
      
      let elements: any[] = [];
      let appState: any = null;
      
      if (elementsJson) {
        try {
          elements = JSON.parse(elementsJson);
          console.log(`[YjsEditor] Loaded ${elements.length} elements for ${drawingId}`);
        } catch (e) {
          console.error('[YjsEditor] Failed to parse elements:', e);
        }
      } else {
        console.log(`[YjsEditor] No saved elements for ${drawingId}`);
      }
      
      if (appStateJson) {
        try {
          appState = JSON.parse(appStateJson);
        } catch (e) {
          console.error('[YjsEditor] Failed to parse appState:', e);
        }
      }
      
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

  // Save elements to Yjs (debounced)
  const saveToYjs = useCallback((elements: readonly any[], appState: any) => {
    if (!ydocRef.current) return;
    
    const ydoc = ydocRef.current;
    const yData = ydoc.getMap<any>('data');
    
    // Filter out soft-deleted elements (Excalidraw marks deleted items with isDeleted: true)
    const activeElements = elements.filter(el => !el.isDeleted);
    
    ydoc.transact(() => {
      // Save only active (non-deleted) elements as JSON string
      yData.set('elements', JSON.stringify(activeElements));
      
      // Save only persistable appState properties
      const persistableState = {
        viewBackgroundColor: appState.viewBackgroundColor,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
        theme: appState.theme,
        gridSize: appState.gridSize,
      };
      yData.set('appState', JSON.stringify(persistableState));
    });
    
    // Log state size for benchmarking (collaboration strategy decision)
    const stateSize = Y.encodeStateAsUpdate(ydoc).byteLength;
    console.log(`[YjsEditor] State size: ${(stateSize / 1024).toFixed(2)} KB (${activeElements.length} active / ${elements.length} total elements)`);
    
    onStateChange?.(true);
  }, [onStateChange]);

  // Debounced save handler
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveToYjs(elements, appState);
    }, 300); // Save 300ms after last change
  }, [saveToYjs]);

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
