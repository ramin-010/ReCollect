
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { drawingApi } from '@/lib/api/drawingApi';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';


const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);
import '@excalidraw/excalidraw/index.css';

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
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const isRemoteUpdateRef = useRef(false); // Prevent echo when receiving remote updates
  const lastElementCountRef = useRef(0); // Track element count to detect real changes
  

  useEffect(() => {
    excalidrawAPIRef.current = excalidrawAPI;

  }, [excalidrawAPI]);


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
        setCollaborators(newCollaborators);
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

    yElements.observeDeep((events) => {
      const api = excalidrawAPIRef.current;
      const isLocal = events.some(e => e.transaction.local);
      
      if (!api) return;
      if (isLocal) return;
      
      isRemoteUpdateRef.current = true;
      
      const elements = yElements.toArray().map((yMap: any) => yMap.toJSON());
      lastElementCountRef.current = elements.length;
      api.updateScene({ elements });
      
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 200);
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

  // Update collaborators in Excalidraw when they change
  useEffect(() => {
    if (excalidrawAPI && collaborators.size >= 0) {
      excalidrawAPI.updateScene({ collaborators });
    }
  }, [excalidrawAPI, collaborators]);

  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (isRemoteUpdateRef.current) {
      return;
    }
    
    if (!ydocRef.current || !isConnected) return;
    
    const activeElements = elements.filter(el => !el.isDeleted);
    const yElements = ydocRef.current.getArray<Y.Map<any>>('elements');
    
    const yElementCount = yElements.length;
    const localCount = activeElements.length;
    
    // Build map once for O(1) lookups - the real perf win was removing O(n²) nested loops    
    const yElementMap = new Map<string, { index: number; yMap: Y.Map<any>; version: number }>();
    yElements.forEach((yMap, index) => {
      const id = yMap.get('id');
      const version = yMap.get('version') || 0;
      if (id) {
        yElementMap.set(id, { index, yMap, version });
      }
    });
    
    // Check for new elements or edits using O(1) Map lookup
    let hasLocalNewElements = false;
    let hasLocalEdits = false;
    
    for (const el of activeElements) {
      const existing = yElementMap.get(el.id);
      if (!existing) {
        hasLocalNewElements = true;
        break;
      } else if (el.version > existing.version) {
        hasLocalEdits = true;
        break;
      }
    }
    
    // Check for deletions
    const hasDeletions = yElementCount > localCount;

    // Only sync if user is actively creating, editing, OR deleting
    if (!hasLocalNewElements && !hasLocalEdits && !hasDeletions) {
      return; // Skip - this is just an echo of remote update
    }
    
    lastElementCountRef.current = activeElements.length;

    
    const ydoc = ydocRef.current;
    const yAppState = ydoc.getMap<any>('appState');
    
    const processedIds = new Set<string>();
    
    ydoc.transact(() => {
      // Add new or update existing elements
      activeElements.forEach(element => {
        processedIds.add(element.id);
        const existing = yElementMap.get(element.id);
        
        if (!existing) {
          // New element
          const yMap = new Y.Map();
          for (const [key, value] of Object.entries(element)) {
            yMap.set(key, value);
          }
          yElements.push([yMap]);
        } else if (existing.version !== element.version) {
          // Updated element
          for (const [key, value] of Object.entries(element)) {
            if (existing.yMap.get(key) !== value) {
              existing.yMap.set(key, value);
            }
          }
        }
      });
      
      // Delete removed elements
      const indicesToDelete: number[] = [];
      yElementMap.forEach(({ index }, id) => {
        if (!processedIds.has(id)) {
          indicesToDelete.push(index);
        }
      });
      
      indicesToDelete.sort((a, b) => b - a);
      indicesToDelete.forEach(index => {
        yElements.delete(index, 1);
      });
      
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

  // Build initial data from Y.Doc once synced
  const getInitialData = useCallback(() => {
    if (!ydocRef.current || !isYjsSynced) return undefined;
    
    const ydoc = ydocRef.current;
    const yElements = ydoc.getArray('elements');
    const yAppState = ydoc.getMap('appState');
    
    const elements = yElements.toArray().map((yMap: any) => yMap.toJSON());
    const appState = yAppState.size > 0 ? yAppState.toJSON() : {};
    
    const theme = (resolvedTheme === 'dark' || resolvedTheme === 'theme-dark-gray' ? 'dark' : 'light') as 'dark' | 'light';
    
    return {
      elements,
      appState: {
        ...appState,
        theme,
        viewModeEnabled: false,
        zenModeEnabled: false,
      },
      files: initialFiles,
    };
  }, [isYjsSynced, resolvedTheme, initialFiles]);

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

  const initialData = getInitialData();

  return (
    <div className="fixed inset-0 z-[100] bg-[hsl(var(--background))] flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-[hsl(var(--border))] flex items-center justify-between px-4 bg-[hsl(var(--background))]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg px-2"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          </Link>
          <div className="h-4 w-px bg-[hsl(var(--border))]" />
          <span className="text-[hsl(var(--foreground))] font-medium text-sm truncate max-w-[200px] md:max-w-md">
            {drawing.name}
          </span>
          <div className="hidden md:flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] ml-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Shared by {drawing.owner.name}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
             isConnected 
               ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
               : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
           }`}>
             <Users className="w-3 h-3" />
             <span>{connectedUsers} Online</span>
           </div>
           

        </div>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {isYjsSynced && initialData && (
          <Excalidraw
            excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
            theme={resolvedTheme === 'dark' || resolvedTheme === 'theme-dark-gray' ? 'dark' : 'light'}
            initialData={initialData as any}
            onChange={handleChange}
            langCode="en"
            onPointerUpdate={providerRef.current ? (payload: any) => {
              providerRef.current?.awareness?.setLocalStateField('pointer', payload.pointer);
              providerRef.current?.awareness?.setLocalStateField('selectedElementIds', 
                excalidrawAPI?.getAppState()?.selectedElementIds || {}
              );
            } : undefined}
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
        
        {/* Collaboration Indicator */}
        <div className="absolute bottom-4 right-14 pointer-events-none">
          <div className="bg-[hsl(var(--card))]/90 backdrop-blur-sm border border-[hsl(var(--border))] rounded-full px-4 py-1.5 shadow-xl">
             <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest flex items-center gap-2">
               <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
               {isConnected ? 'Real-time Sync Active' : 'Connecting...'}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
