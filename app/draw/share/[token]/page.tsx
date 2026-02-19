
'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui-base/Button';
import { 
  Globe, 
  ArrowRight,
  Eye,
  Users,
  Loader2,
  ArrowLeft,
  MoreVertical
} from 'lucide-react';
import { drawingApi } from '@/lib/api/drawingApi';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui-base/DropdownMenu';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';


const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);
import '@excalidraw/excalidraw/index.css';

// Helper to compare collaborator Maps (shallow pointer comparison)
function areCollaboratorsEqual(a: Map<string, any>, b: Map<string, any>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, val] of a) {
    const bVal = b.get(key);
    if (!bVal) return false;
    if (val?.pointer?.x !== bVal?.pointer?.x || val?.pointer?.y !== bVal?.pointer?.y) return false;
  }
  return true;
}

interface SharedDrawingData {
  _id: string;
  name: string;
  owner: { name: string; email: string; avatar?: string };
  cloudImages?: Array<{ imageId: string; cloudUrl: string; cloudPublicId: string }>;
}

interface ExcalidrawFile {
  id: string;
  mimeType: string;
  dataURL: string;
  created?: number;
  isCloudUploaded?: boolean;
}

export default function SharedDrawingPage() {
  const params = useParams();
  const shareToken = params.token as string;
  const { resolvedTheme } = useTheme();
  
  const [drawing, setDrawing] = useState<SharedDrawingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(1);
  const [isYjsSynced, setIsYjsSynced] = useState(false);
  
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const [initialFiles, setInitialFiles] = useState<Record<string, ExcalidrawFile>>({});

  
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const isRemoteUpdateRef = useRef(false); // Prevent echo when receiving remote updates
  const lastElementCountRef = useRef(0); // Track element count to detect real changes
  const collaboratorsRef = useRef<Map<string, any>>(new Map());
  const pendingRafRef = useRef<number | null>(null);
  

  // Fix infinite loop: Excalidraw calls this callback on EVERY render with a new
  // object reference. Using setState here would trigger re-render → infinite loop.
  // Since excalidrawAPI state is not used in JSX, we just set the ref directly.
  const handleExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
  }, []);

  const handlePointerUpdate = useCallback((payload: any) => {
    if (providerRef.current) {
        providerRef.current.awareness?.setLocalStateField('pointer', payload.pointer);
        providerRef.current.awareness?.setLocalStateField('selectedElementIds', 
          excalidrawAPIRef.current?.getAppState()?.selectedElementIds || {}
        );
    }
  }, []);

  // Ref is now set directly in handleExcalidrawAPI — no sync needed


  useEffect(() => {
    if (!shareToken) return;

    const loadDrawing = async () => {

      setIsLoading(true);
      
      try {
        const result = await drawingApi.getSharedDrawing(shareToken);
        
        if (!result.success || !result.data) {
          throw new Error('Drawing not found or sharing is disabled');
        }
        

        setDrawing(result.data);

        // Build files from cloudImages for images
        if (result.data.cloudImages && result.data.cloudImages.length > 0) {
          const files: Record<string, ExcalidrawFile> = {};
          for (const img of result.data.cloudImages) {
            files[img.imageId] = {
              id: img.imageId,
              mimeType: 'image/webp',
              dataURL: img.cloudUrl,
              isCloudUploaded: true,
            };
          }
          setInitialFiles(files);

        }
        

        connectToCollab(result.data._id);
        
      } catch (err: any) {
        console.error('[SharedDraw] Failed to load:', err);
        setError(err.message || 'Failed to load drawing');
        setIsLoading(false);
      }
    };

    loadDrawing();
    
    return () => {
      if (pendingRafRef.current !== null) cancelAnimationFrame(pendingRafRef.current);
      if (providerRef.current) providerRef.current.destroy();
      if (ydocRef.current) ydocRef.current.destroy();
    };
  }, [shareToken]);

  const connectToCollab = useCallback((drawingId: string) => {
    const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:1234';
    const fullUrl = `${collabUrl}?shareToken=${shareToken}`;
    const documentName = `drawing_${drawingId}`;
    

    

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    
    const provider = new HocuspocusProvider({
      url: fullUrl,
      name: documentName,
      document: ydoc,
      onConnect: () => {
        setIsConnected(true);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onAuthenticationFailed: (data: any) => {
        setError('Failed to authenticate: ' + (data?.reason || 'Unknown error'));
        setIsLoading(false);
      },
      onSynced: ({ state }) => {
        const yElements = ydoc.getArray('elements');
        const elements = yElements.toArray().map((item: any) => item?.toJSON ? item.toJSON() : item);
        
        setIsYjsSynced(true);
        setIsLoading(false);
      },
      onAwarenessUpdate: ({ states }) => {
        const userCount = states.length;
        
        // Only update count if it changed (avoid unnecessary re-renders)
        setConnectedUsers(prev => prev !== userCount ? userCount : prev);
        
        // Update collaborators for cursor presence
        const newCollaborators = new Map<string, any>();
        states.forEach((state: any) => {
          if (state.user && state.clientId !== provider.awareness?.clientID) {
            newCollaborators.set(state.user.id || state.clientId, {
              pointer: state.pointer,
              username: state.user.name || 'Owner',
              color: { 
                background: state.user.color || '#6366F1', 
                stroke: state.user.color || '#6366F1' 
              },
              selectedElementIds: state.selectedElementIds || {},
            });
          }
        });
        
        // Only update if collaborators actually changed — update Excalidraw directly via ref
        // to avoid React state → useEffect → updateScene → awareness infinite loop
        if (!areCollaboratorsEqual(newCollaborators, collaboratorsRef.current)) {
          collaboratorsRef.current = newCollaborators;
          const api = excalidrawAPIRef.current;
          if (api) {
            api.updateScene({ collaborators: newCollaborators });
          }
        }
      },
    });
    
    providerRef.current = provider;
    
    // Set local user awareness (Guest with random color)
    const guestColors = ['#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#EF4444'];
    const randomColor = guestColors[Math.floor(Math.random() * guestColors.length)];
    provider.awareness?.setLocalStateField('user', {
      id: `guest-${Date.now()}`,
      name: 'Guest',
      color: randomColor,
    });

    const yElements = ydoc.getArray('elements');
    const yAppState = ydoc.getMap('appState');

    // rAF batching: coalesce multiple Yjs updates into one scene update per frame
    yElements.observeDeep((events: any[]) => {
      const api = excalidrawAPIRef.current;
      const isLocal = events.some((e: any) => e.transaction.local);
      
      if (!api) return;
      if (isLocal) return;
      
      // Schedule ONE scene update per animation frame
      // Multiple Yjs updates arriving within the same frame get coalesced
      if (pendingRafRef.current === null) {
        pendingRafRef.current = requestAnimationFrame(() => {
          pendingRafRef.current = null;
          const currentApi = excalidrawAPIRef.current;
          if (!currentApi) return;
          
          isRemoteUpdateRef.current = true;
          const elements = yElements.toArray().map((yMap: any) => yMap.toJSON());
          lastElementCountRef.current = elements.length;
          currentApi.updateScene({ elements });
          // Clear flag on NEXT frame — ensures React's async onChange is covered
          requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
        });
      }
    });

    yAppState.observe((event) => {
      const api = excalidrawAPIRef.current;
      if (!api || event.transaction.local) return;
      
      const appState = yAppState.toJSON();
      const safeState: any = {};
      if (appState.viewBackgroundColor) safeState.viewBackgroundColor = appState.viewBackgroundColor;
      if (appState.theme) safeState.theme = appState.theme;
      
      if (Object.keys(safeState).length > 0) {
        api.updateScene({ appState: safeState });
      }
    });
  }, [shareToken]);



  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (isRemoteUpdateRef.current) return;
    if (!ydocRef.current || !isConnected) return;
    
    const activeElements = elements.filter(el => !el.isDeleted);
    const yElements = ydocRef.current.getArray<Y.Map<any>>('elements');
    const ydoc = ydocRef.current;
    const yAppState = ydoc.getMap<any>('appState');
    
    // SINGLE-PASS: Build yElementMap once, used for both change detection AND transact
    const yElementMap = new Map<string, { index: number; yMap: Y.Map<any>; version: number }>();
    yElements.forEach((yMap, index) => {
      const id = yMap.get('id');
      const version = yMap.get('version') || 0;
      if (id) {
        yElementMap.set(id, { index, yMap, version });
      }
    });
    
    // Single-pass: detect changes AND collect work items simultaneously
    const newElements: any[] = [];
    const updatedElements: { element: any; yMap: Y.Map<any> }[] = [];
    const processedIds = new Set<string>();
    
    for (const el of activeElements) {
      processedIds.add(el.id);
      const existing = yElementMap.get(el.id);
      if (!existing) {
        newElements.push(el);
      } else if (el.version > existing.version) {
        updatedElements.push({ element: el, yMap: existing.yMap });
      }
    }
    
    // Collect deletions
    const indicesToDelete: number[] = [];
    yElementMap.forEach(({ index }, id) => {
      if (!processedIds.has(id)) {
        indicesToDelete.push(index);
      }
    });
    
    // Skip if nothing changed
    if (newElements.length === 0 && updatedElements.length === 0 && indicesToDelete.length === 0) {
      return;
    }
    
    lastElementCountRef.current = activeElements.length;
    
    // Single transact with pre-computed work — no redundant iteration
    ydoc.transact(() => {
      // Add new elements
      for (const element of newElements) {
        const yMap = new Y.Map();
        for (const [key, value] of Object.entries(element)) {
          yMap.set(key, value);
        }
        yElements.push([yMap]);
      }
      
      // Update changed elements
      for (const { element, yMap } of updatedElements) {
        for (const [key, value] of Object.entries(element)) {
          if (yMap.get(key) !== value) {
            yMap.set(key, value);
          }
        }
      }
      
      // Delete removed elements (reverse order to preserve indices)
      indicesToDelete.sort((a, b) => b - a);
      for (const index of indicesToDelete) {
        yElements.delete(index, 1);
      }
      
      // Sync appState
      const persistableState = {
        viewBackgroundColor: appState.viewBackgroundColor,
        theme: appState.theme,
      };
      
      for (const [key, value] of Object.entries(persistableState)) {
        if (yAppState.get(key) !== value) {
          yAppState.set(key, value);
        }
      }
    });
  }, [isConnected]);

  // Memoize initialData to avoid re-creating object on every render
  const initialData = useMemo(() => {
    if (!ydocRef.current || !isYjsSynced) return undefined;
    
    const ydoc = ydocRef.current;
    const yElements = ydoc.getArray('elements');
    const yAppState = ydoc.getMap('appState');
    
    const elements = yElements.toArray().map((yMap: any) => yMap.toJSON());
    const appState = yAppState.size > 0 ? yAppState.toJSON() : {};
    
    // Don't depend on resolvedTheme here to keep initialData stable
    // Theme is handled via the separate theme prop
    
    return {
      elements,
      appState: {
        ...appState,
        // theme is managed by prop
      },
      files: initialFiles,
    };
  }, [isYjsSynced, initialFiles]); // Removed resolvedTheme dependency

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-zinc-400 font-medium">Connecting to session...</p>
        </div>
      </div>
    );
  }

  if (error || !drawing) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Drawing Not Found</h1>
          <p className="text-zinc-400 mb-6 font-medium">
            {error || 'This link may have expired or sharing was disabled.'}
          </p>
          <Link href="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

//   const initialData = getInitialData(); // Removed function call since we use useMemo now

  return (
    <div className="fixed inset-0 z-[100] bg-[hsl(var(--background))]">
      {/* Header removed to avoid duplication with custom overlay */}

      {/* Editor Canvas */}
      <div className="flex-1 relative h-full w-full">
        {/* Responsive Header Container */}
        <div className="z-[5] pointer-events-none lg:absolute lg:inset-x-0 lg:top-[16px] flex items-center justify-between gap-4 p-4 lg:p-0">
          
          {/* Left Controls */}
          <div className="flex items-center gap-3 pointer-events-auto lg:ml-[71px]">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 lg:px-3 gap-2 rounded-lg bg-[#232329] hover:bg-muted border border-border/40 hover:border-border/60 text-muted-foreground hover:text-foreground transition-all font-medium backdrop-blur-sm shadow-sm"
                title="Back to Home"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden lg:inline">Back</span>
              </Button>
            </Link>
            <div className="h-5 w-px bg-border/40 hidden lg:block" />
            <span className="text-sm font-medium opacity-90 select-none text-foreground tracking-wide py-1.5 rounded-lg truncate max-w-[150px] lg:max-w-none">
              {drawing.name}
            </span>
          </div>

          {/* Right Controls - Desktop (Visible on LG+) */}
          <div className="hidden lg:flex items-center gap-3 pointer-events-auto lg:mr-[155px]">
            <div className="flex items-center gap-2 rounded-lg p-1 transition-all">
              {isConnected && (
                 <div className="flex items-center pl-3 rounded-md">
                   <div className="relative flex items-center justify-center h-3 w-3 mr-1" title="Broadcasting">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                   </div>
                   <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                     {connectedUsers > 1 ? `${connectedUsers} online` : ''}
                   </span>
                 </div>
               )}
            </div>
          </div>

          {/* Right Controls - Mobile (Dropdown) */}
          <div className="lg:hidden pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 bg-[#232329] border border-border/40">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isConnected && (
                  <div className="px-2 py-2 text-xs flex items-center justify-between text-muted-foreground border-b border-border/50 mb-1">
                    <span>Collaboration</span>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center h-2 w-2">
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </div>
                      <span className="text-green-500 font-medium">{connectedUsers} Online</span>
                    </div>
                  </div>
                )}
                
                <DropdownMenuSeparator />
                <Link href="/">
                  <DropdownMenuItem>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {isYjsSynced && initialData && (
          <Excalidraw
            excalidrawAPI={handleExcalidrawAPI}
            initialData={initialData as any}
            onChange={handleChange}
            langCode="en"
            onPointerUpdate={handlePointerUpdate}
            // theme={resolvedTheme === 'dark' || resolvedTheme === 'theme-dark-gray' ? 'dark' : 'light'}
            UIOptions={{
              canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
                export: false, 
                saveAsImage: false
              }
            }}
          />
        )}
        

      </div>
    </div>
  );
}
