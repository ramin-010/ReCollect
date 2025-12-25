'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui-base/Button';
import { ConnectionLayer } from '../ConnectionLayer';
import { BlocksLayer } from '../BlocksLayer';
import { Connection } from '@/types/canvas';
import { DragController } from '../DragController';
import { NativeConnectionLayer } from '../NativeConnectionLayer';


// Types
import { SmartCanvasProps, BlockData, ActiveDragStart } from './types';

// Hooks
import { usePasteHandler } from './usePasteHandler';
import { useCanvasExpansion } from './useCanvasExpansion';
import { useCanvasHandlers } from './useCanvasHandlers';

// Storage
import { imageStorage } from '@/lib/storage/imageStorage';

// Utility Functions
const getCanvasPointUtil = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  e: { clientX: number; clientY: number }
) => {
  if (!containerRef.current) return { x: 0, y: 0 };
  const rect = containerRef.current.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
};

const prepareBlockDims = (blocks: BlockData[], renderedDims: Record<string, {width: number, height: number}>) => {
  return blocks.map(b => ({
    id: b.blockId,
    x: b.x,
    y: b.y,
    width: renderedDims[b.blockId]?.width || (typeof b.width === 'number' ? b.width : 300),
    height: renderedDims[b.blockId]?.height || (typeof b.height === 'number' ? b.height : 200)
  }));
};

export function SmartCanvas({ initialContent, onChange, readOnly }: SmartCanvasProps) {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [renderedDims, setRenderedDims] = useState<Record<string, { width: number, height: number }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // ZOOM STATE
  const [zoom, setZoom] = useState(1);
  const minZoom = 0.4; // 0.4 as requested (was 0.1)
  const maxZoom = 1.0; // 1.0 as requested (was 2.0)

  const [activeDragStart, setActiveDragStart] = useState<ActiveDragStart | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<{ id: string, x: number, y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragController = useRef(new DragController()).current;

  // Zoom Handlers
  const handleZoom = (delta: number) => {
    setZoom(z => {
        const newZoom = z + delta;
        // Float precision fix
        const rounded = Math.round(newZoom * 100) / 100;
        return Math.min(maxZoom, Math.max(minZoom, rounded));
    });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001; 
        setZoom(z => Math.min(maxZoom, Math.max(minZoom, z + delta)));
    }
  }, []);
// ...


  // Helper: Get mouse/touch coordinates relative to the canvas container (Unscaled)
  const getCanvasPoint = useCallback((e: { clientX: number, clientY: number }) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  }, [zoom]);

  // Helper: Prepare Blocks data for ConnectionLayer
  const blockDims = useMemo(() => {
    return prepareBlockDims(blocks, renderedDims);
  }, [blocks, renderedDims]);

  const handleDimensionsChange = useCallback((id: string, w: number, h: number) => {
    setRenderedDims(prev => {
        if (prev[id]?.width === w && prev[id]?.height === h) return prev;
        return { ...prev, [id]: { width: w, height: h } };
    });
  }, []);

  // Initialize canvas handlers
  const {
    updateBlock,
    handleDeleteBlock,
    handleResize,
    handleResizeStop,
    handleDragStop,
    handleUnstack,
    handleAddBlock,
    handleAnchorMouseDown,
    handleCanvasDrop
  } = useCanvasHandlers(
    setBlocks,
    setSelectedId,
    setActiveDragStart,
    setConnections,
    getCanvasPoint,
    connections,
    activeDragStart,
    setDraggingBlock
  );

  // Custom Hooks
  usePasteHandler(setBlocks);
  const canvasSize = useCanvasExpansion(blocks, containerRef);
  
  // Track if we've initialized from initialContent
  const initializedRef = useRef(false);
  const lastInitialContentRef = useRef<string | undefined>(undefined);
  
  // Stringify initialContent for stable comparison
  const initialContentStr = typeof initialContent === 'string' 
    ? initialContent 
    : JSON.stringify(initialContent);
  
  // Initialization Logic with Image Rehydration
  useEffect(() => {
    const loadContent = async () => {
      // Skip if content hasn't changed (prevents infinite loops from onChange updates)
      if (lastInitialContentRef.current === initialContentStr && initializedRef.current) {
        return;
      }
      
      // Skip if no content
      if (!initialContentStr || initialContentStr === '[]' || initialContentStr === '{}' || initialContentStr === '{"blocks":[],"connections":[]}') {
        // Only reset if we had content before
        if (lastInitialContentRef.current && lastInitialContentRef.current !== '[]' && lastInitialContentRef.current !== '{"blocks":[],"connections":[]}') {
          setBlocks([]);
          setConnections([]);
        }
        lastInitialContentRef.current = initialContentStr;
        initializedRef.current = true;
        return;
      }
      
      lastInitialContentRef.current = initialContentStr;

      try {
        let parsedBlocks: BlockData[] = [];
        let parsedConnections: Connection[] = [];

        const parsed = JSON.parse(initialContentStr);
        if (Array.isArray(parsed)) {
          parsedBlocks = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (parsed.blocks) parsedBlocks = parsed.blocks;
          if (parsed.connections) parsedConnections = parsed.connections;
        }

        // Rehydrate Images from IndexedDB
        const hydratedBlocks = await Promise.all(
          parsedBlocks.map(async (block) => {
            // Check if it's a pending image (has ID but not uploaded)
            if (block.type === 'image' && block.imageId && !block.isUploaded) {
               // Try to get blob from local storage
               try {
                  const blob = await imageStorage.getImage(block.imageId);
                  if (blob) {
                    const objectUrl = imageStorage.createObjectURL(blob);
                    return { ...block, url: objectUrl };
                  }
               } catch (err) {
                 console.warn("Failed to load local image:", block.imageId, err);
               }
            }
            return block;
          })
        );

        setBlocks(hydratedBlocks);
        setConnections(parsedConnections);
        initializedRef.current = true;

      } catch (e) {
        if (initialContentStr.trim()) {
           // ... (fallback logic) ...
           setBlocks([{
            blockId: uuidv4(),
            type: 'text',
            content: initialContentStr,
            x: 100,
            y: 100,
            width: 320,
            height: 'auto'
          }]);
        }
        initializedRef.current = true;
      }
    };

    loadContent();

    // Cleanup Blob URLs on unmount
    return () => {
        // We can't access 'blocks' state here easily due to closure, 
        // but we can trust the garbage collector or revoked manually if tracked.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContentStr]); // Stable string dependency

  // Autosave Logic
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (blocks.length > 0 || connections.length > 0) {
        onChangeRef.current?.(JSON.stringify({ blocks, connections }));
      }
    }, 1000); // Debounce 1s for autosave
    return () => clearTimeout(timer);
  }, [blocks, connections]);

  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // Stable handlers
  const handleConnectionUpdate = useCallback((updated: Connection) => {
    setConnections(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, []);

  const handleConnectionRemove = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleBlockDragStart = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedConnectionId(null);
  }, []);

  const handleDragComplete = useCallback(() => {
    setActiveDragStart(null);
  }, []);

  // KeyDown Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedId) {
            handleDeleteBlock(selectedId);
            setSelectedId(null);
        }
        if (selectedConnectionId) {
            handleConnectionRemove(selectedConnectionId);
            setSelectedConnectionId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedConnectionId, handleDeleteBlock, handleConnectionRemove]);

  return (
    <div className="relative w-full h-full bg-[hsl(var(--background))]/50 overflow-auto" id="smart-canvas-viewport">
      <div 
        ref={containerRef}
        className="relative min-w-full min-h-full transition-transform duration-75 ease-out origin-top-left"
        style={{ 
            width: canvasSize.width, 
            height: canvasSize.height,
            transform: `scale(${zoom})`,
            // Ensure the container takes up the visual space so scrolling works?
            // "transform" doesn't affect flow. We might need a wrapper if we want perfect scrollbars.
            // For now, let's keep it simple. Standard CSS transform zoom often relies on an infinite canvas approach.
        }}
        onClick={() => {
            setSelectedId(null);
            setSelectedConnectionId(null);
        }}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        onDoubleClick={(e) => {
          if (e.target === containerRef.current) {
            handleAddBlock(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
          }
        }}
      >
      
        {/* Background Dots - Scale Inverse? No, letting them scale looks natural like a map. */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        {/* NATIVE CONNECTION LAYER (Background - Matrix Mode) */}
        <NativeConnectionLayer 
            connections={connections} 
            blocks={blockDims} 
            dragController={dragController}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={(id, e) => {
                setSelectedConnectionId(id);
                setSelectedId(null);
            }}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
            zoom={zoom}
        />

        {/* Blocks Layer (Memoized) */}
        <BlocksLayer 
          blocks={blocks}
          selectedId={selectedId}
          readOnly={readOnly}
          onDragStop={handleDragStop}
          onDragStart={handleBlockDragStart}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          onUpdateBlock={updateBlock}
          onDeleteBlock={handleDeleteBlock}
          onUnstack={handleUnstack}
          onAnchorMouseDown={handleAnchorMouseDown}
          onAnchorMouseUp={() => {}} 
          onDimensionsChange={handleDimensionsChange}
          isConnectionDragging={!!activeDragStart}
          dragController={dragController}
          scale={zoom}
        />

        {/* DRAFT CONNECTION LAYER (Foreground - Creation Mode) */}
        {activeDragStart && (
            <ConnectionLayer 
                variant="default"
                connections={[]} 
                setConnections={setConnections} 
                blocks={blockDims} 
                fullBlocks={blocks}
                activeDragStart={activeDragStart}
                onDragComplete={handleDragComplete}
                getCanvasPoint={getCanvasPoint}
                selectedConnectionId={null}
                onSelectConnection={() => {}}
            />
        )}

        {/* Connection Layer (CONTROLS - Foreground) */}
        <ConnectionLayer 
          variant="controls"
          connections={connections}
          setConnections={setConnections} 
          blocks={blockDims} 
          activeDragStart={null} 
          onDragComplete={() => {}} 
          getCanvasPoint={getCanvasPoint}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={() => {}} 
          onUpdateConnection={handleConnectionUpdate}
        />

      </div>

      {/* FAB to add Note */}
      <div className="fixed bottom-6 right-6 z-50">
          <Button 
            onClick={(e) => { e.stopPropagation(); handleAddBlock(); }}
            className="rounded-full h-14 w-14 shadow-xl bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </Button>
      </div>

      {/* ZOOM CONTROLS (Floating UI) */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-background/80 backdrop-blur border border-border rounded-lg p-1.5 shadow-lg">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleZoom(-0.1)}>
             <span className="text-xl pb-1">-</span>
        </Button>
        <span className="text-xs font-mono font-medium min-w-[3ch] text-center">
            {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleZoom(0.1)}>
             <span className="text-xl pb-1">+</span>
        </Button>
      </div>

    </div>
  );
}