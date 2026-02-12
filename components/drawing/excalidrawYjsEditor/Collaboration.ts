import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';

// Helper to compare collaborator Maps (shallow pointer comparison)
function areCollaboratorsEqual(a: Map<string, any>, b: Map<string, any>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, val] of a) {
    const bVal = b.get(key);
    if (!bVal) return false;
    // Compare pointer position (most frequently changing field)
    if (val?.pointer?.x !== bVal?.pointer?.x || val?.pointer?.y !== bVal?.pointer?.y) return false;
  }
  return true;
}

export function useCollaboration(
  collaborationEnabled: boolean,
  drawingId: string,
  ydocRef: React.MutableRefObject<Y.Doc | null>,
  excalidrawAPIRef: React.MutableRefObject<any>,
  isRemoteUpdateRef: React.MutableRefObject<boolean>,
  onCollaboratorCountChange?: (count: number) => void,
  onCollabEnd?: () => void  // Called when transitioning from collab to personal mode
) {
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());
  const [collabUserCount, setCollabUserCount] = useState(0);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const hasShownCollabToastRef = useRef(false);
  const onCollaboratorCountChangeRef = useRef(onCollaboratorCountChange);
  const onCollabEndRef = useRef(onCollabEnd);
  const prevUserCountRef = useRef(0);
  const collaboratorsRef = useRef<Map<string, any>>(new Map());
  
  useEffect(() => {
    onCollaboratorCountChangeRef.current = onCollaboratorCountChange;
  }, [onCollaboratorCountChange]);
  
  useEffect(() => {
    onCollabEndRef.current = onCollabEnd;
  }, [onCollabEnd]);
  
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
      onAuthenticationFailed: (data: any) => {
        toast.error('Collaboration auth failed: ' + (data?.reason || 'Unknown'));
      },
      onAwarenessUpdate: ({ states }) => {
        const userCount = states.length;
        
        // Only update state if count actually changed (avoid unnecessary re-renders)
        if (userCount !== prevUserCountRef.current) {
          setCollabUserCount(userCount);
          onCollaboratorCountChangeRef.current?.(userCount);
          
          // Detect transition: Collab → Personal (all collaborators left)
          if (userCount <= 1 && prevUserCountRef.current > 1) {
            onCollabEndRef.current?.();
          }
          prevUserCountRef.current = userCount;
        }
        
        // Only rebuild collaborators map if there are other users (skip when alone)
        
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
        
        // Only update if collaborators actually changed
        if (!areCollaboratorsEqual(newCollaborators, collaboratorsRef.current)) {
          collaboratorsRef.current = newCollaborators;
          // Update Excalidraw directly via ref — bypasses React render cycle
          // This eliminates ~16-32ms latency per cursor update
          const api = excalidrawAPIRef.current;
          if (api) {
            api.updateScene({ collaborators: newCollaborators });
          }
        }
      },
    });
    
    providerRef.current = provider;
    
    provider.awareness?.setLocalStateField('user', {
      id: `owner-${drawingId}`,
      name: 'You',
      color: '#6366F1',
    });
    
    const yElements = ydoc.getArray<Y.Map<any>>('elements');
    const yAppState = ydoc.getMap<any>('appState');
    
    // rAF batching: coalesce multiple Yjs updates into one scene update per frame
    let pendingRaf: number | null = null;
    
    const elementsObserver = (events: Y.YEvent<any>[]) => {
      const api = excalidrawAPIRef.current;
      const isLocal = events.some(e => e.transaction.local);
      
      if (!api || isLocal) return;
      
      // Schedule ONE scene update per animation frame
      // Multiple Yjs updates arriving within the same frame get coalesced
      if (pendingRaf === null) {
        pendingRaf = requestAnimationFrame(() => {
          pendingRaf = null;
          const currentApi = excalidrawAPIRef.current;
          if (!currentApi) return;
          
          isRemoteUpdateRef.current = true;
          const elements = yElements.toArray().map((yMap) => yMap.toJSON());
          currentApi.updateScene({ elements });
          // Clear flag on NEXT frame — ensures React's async onChange is covered
          requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
        });
      }
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
      // Clear flag on NEXT frame — ensures React's async onChange is covered
      requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
    };
    
    yElements.observeDeep(elementsObserver);
    yAppState.observe(appStateObserver);
    
    return () => {
      if (pendingRaf !== null) cancelAnimationFrame(pendingRaf);
      yElements.unobserveDeep(elementsObserver);
      yAppState.unobserve(appStateObserver);
      provider.destroy();
      providerRef.current = null;
    };
  }, [collaborationEnabled, drawingId]);
  
  // Derived: Are we in active collab mode (more than just self)?
  const isCollabMode = collabUserCount > 1;
  
  return { collaborators, providerRef, collabUserCount, isCollabMode };
}
