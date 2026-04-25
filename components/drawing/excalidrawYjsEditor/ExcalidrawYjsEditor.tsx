'use client';

import React, { useCallback, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ExcalidrawYjsEditorProps } from './types';
import { useExcalidrawYjs } from './hooks';
import { Button } from '@/components/ui-base/Button';
import { useTheme } from 'next-themes';
import { ArrowLeft, Share2, MoreVertical, Sparkles, Loader2, X } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui-base/DropdownMenu';
import '@excalidraw/excalidraw/index.css';
import { drawingApi } from '@/lib/api/drawingApi';
import { toast } from 'sonner';

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
  onBack,
  onShare,
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

  // Fix infinite loop: Excalidraw calls this callback on EVERY render
  // with a new API object reference. Unguarded setState would trigger
  // re-render → callback called again → infinite loop.
  // Guard: only set state once (null → api), then use ref for updates.
  const handleExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
    setExcalidrawAPI((prev: any) => prev ? prev : api);
  }, [setExcalidrawAPI, excalidrawAPIRef]);

  const { resolvedTheme } = useTheme();

  // ========== AI Drawing Generation ==========    comming soon for now !
  // const [showAIPrompt, setShowAIPrompt] = useState(false);
  // const [aiPrompt, setAiPrompt] = useState('');
  // const [aiLoading, setAiLoading] = useState(false);
  // const [aiError, setAiError] = useState<string | null>(null);
  // const aiInputRef = useRef<HTMLInputElement>(null);

  // const handleAIGenerate = useCallback(async () => {
  //   if (!aiPrompt.trim() || aiLoading || !excalidrawAPIRef.current) return;

  //   setAiLoading(true);
  //   setAiError(null);

  //   try {
  //     // 1. Call backend to get Mermaid syntax
  //     const result = await drawingApi.generateAIDrawing(aiPrompt.trim());

  //     if (!result.success || !result.mermaidSyntax) {
  //       setAiError('AI returned an empty response. Try a different prompt.');
  //       return;
  //     }

  //     console.log(`[AI Drawing] Got Mermaid from ${result.provider}:`, result.mermaidSyntax.slice(0, 200));

  //     // 2. Convert Mermaid → Excalidraw elements (dynamic import to keep bundle small)
  //     const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
  //     const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');

  //     const { elements: skeletonElements, files } = await parseMermaidToExcalidraw(
  //       result.mermaidSyntax,
  //       { themeVariables: { fontSize: '16px' } }
  //     );

  //     const excalidrawElements = convertToExcalidrawElements(skeletonElements);

  //     console.log(`[AI Drawing] Converted to ${excalidrawElements.length} Excalidraw elements`);

  //     // 3. Get existing elements and merge
  //     const api = excalidrawAPIRef.current;
  //     const existingElements = api.getSceneElements() || [];

  //     // Offset new elements to avoid overlapping with existing content
  //     const offsetX = existingElements.length > 0 ? 100 : 0;
  //     const offsetY = existingElements.length > 0 ? 100 : 0;

  //     const offsetElements = excalidrawElements.map((el: any) => ({
  //       ...el,
  //       x: (el.x || 0) + offsetX,
  //       y: (el.y || 0) + offsetY,
  //     }));

  //     // 4. Inject into the canvas
  //     api.updateScene({
  //       elements: [...existingElements, ...offsetElements],
  //     });

  //     // Select the new elements so the user can move them
  //     const newElementIds = offsetElements.reduce((acc: Record<string, boolean>, el: any) => {
  //       acc[el.id] = true;
  //       return acc;
  //     }, {} as Record<string, boolean>);

  //     api.updateScene({
  //       appState: { selectedElementIds: newElementIds },
  //     });

  //     // Scroll to fit the new elements
  //     api.scrollToContent(offsetElements, { fitToContent: true, animate: true });

  //     // Close the prompt bar on success
  //     setShowAIPrompt(false);
  //     setAiPrompt('');

  //     console.log('[AI Drawing] Successfully injected elements into canvas!');
  //   } catch (err: any) {
  //     console.error('[AI Drawing] Error:', err);
  //     setAiError(err?.response?.data?.message || err?.message || 'Failed to generate diagram. Try again.');
  //   } finally {
  //     setAiLoading(false);
  //   }
  // }, [aiPrompt, aiLoading, excalidrawAPIRef]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading drawing...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative h-full w-full">
      {/* Responsive Header Container */}
      <div className="z-[5] pointer-events-none lg:absolute lg:inset-x-0 lg:top-[16px] flex items-center justify-between gap-4 p-4 lg:p-0">
        
        {/* Left Controls */}
        <div className="flex items-center gap-3 pointer-events-auto lg:ml-[71px]">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-9 px-2 lg:px-3 gap-2 rounded-lg bg-[#1e1e1e]/80 hover:bg-[#2d2d2d] border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all font-medium backdrop-blur-sm shadow-sm"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden lg:inline">Back</span>
            </Button>
          )}
          <div className="h-5 w-px bg-border/40 hidden lg:block" />
          <span className="text-sm font-medium select-none text-white/80 tracking-wide py-1.5 rounded-lg truncate max-w-[150px] lg:max-w-none">
            {drawingName}
          </span>
        </div>

        {/* Right Controls - Desktop (Visible on LG+) */}
        <div className="hidden lg:flex items-center gap-3 pointer-events-auto lg:mr-[155px]">
          <div className="flex items-center gap-2 rounded-lg p-1 transition-all">
            {collaborationEnabled && (
               <div className="flex items-center pl-3 rounded-md">
                 <div className="relative flex items-center justify-center h-3 w-3 mr-1" title="Broadcasting">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                 </div>
                 <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                   {collaborators.size > 1 ? `${collaborators.size} online` : ''}
                 </span>
               </div>
             )}
             
             {(syncStatus === 'unsynced') && (
                <span className="px-2 text-xs text-blue-500 animate-pulse font-medium">Saving...</span>
             )}
          
             {onShare && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={onShare}
                 className="h-7 gap-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-md px-3"
               >
                 <Share2 className="w-3.5 h-3.5" />
                 <span>Share</span>
               </Button>
             )}

              {/* AI Generate Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  toast.info('✨ AI layout and architecture generation is coming soon!');
                }}
                className="h-7 gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md px-3 transition-colors"
                title="Generate diagram with AI (Coming Soon)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI</span>
              </Button>
          </div>
        </div>

        {/* Right Controls - Mobile (Dropdown) */}
        <div className="lg:hidden pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 bg-[#1e1e1e]/80 border border-white/10 text-white/70 hover:text-white hover:bg-[#2d2d2d]">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {collaborationEnabled && (
                <div className="px-2 py-2 text-xs flex items-center justify-between text-muted-foreground border-b border-border/50 mb-1">
                  <span>Collaboration</span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center h-2 w-2">
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </div>
                    <span className="text-green-500 font-medium">{collaborators.size} Online</span>
                  </div>
                </div>
              )}
              
              {syncStatus === 'unsynced' && (
                 <div className="px-2 py-1 text-xs text-blue-500 animate-pulse mb-1">
                   Saving changes...
                 </div>
              )}

              {onShare && (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Drawing
                </DropdownMenuItem>
              )}
              
              {onBack && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}

        initialData={initialData}
        onChange={handleChange}
        onPointerUpdate={collaborationEnabled && providerRef.current ? handlePointerUpdate : undefined}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
          
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