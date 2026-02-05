'use client';

import React, { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ExcalidrawYjsEditorProps } from './types';
import { useExcalidrawYjs } from './hooks';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

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
  const {
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
  } = useExcalidrawYjs(
    drawingId,
    drawingName,
    isOwner,
    collaborationEnabled,
    onReady,
    onStateChange,
    onSyncStatusChange,
    onCollaboratorCountChange
  );

  // Memoized pointer update handler to avoid inline function recreation
  const handlePointerUpdate = useCallback((payload: any) => {
    providerRef.current?.awareness?.setLocalStateField('pointer', payload.pointer);
    providerRef.current?.awareness?.setLocalStateField('selectedElementIds', 
      excalidrawAPIRef.current?.getAppState()?.selectedElementIds || {}
    );
  }, [providerRef, excalidrawAPIRef]);

  // Memoize initialData to avoid object reconstruction on every render
  const initialData = useMemo(() => {
    const data: any = {};
    if (initialElements.length > 0) {
      data.elements = initialElements;
    }
    if (initialAppState) {
      data.appState = initialAppState;
    }
    if (Object.keys(initialFiles).length > 0) {
      data.files = initialFiles;
    }
    return Object.keys(data).length > 0 ? data : undefined;
  }, [initialElements, initialAppState, initialFiles]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading drawing...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        theme={theme}
        initialData={initialData}
        onChange={(elements, appState) => handleChange(elements, appState)}
        onPointerUpdate={collaborationEnabled && providerRef.current ? handlePointerUpdate : undefined}
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