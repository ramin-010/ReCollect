'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui-base/Button';
import { ConnectionLayer } from '../ConnectionLayer';
import { BlocksLayer } from '../BlocksLayer';
import { Connection } from '@/types/canvas';

// Types
import { SmartCanvasProps, BlockData, DraftConnection, ActiveDragStart } from './types';

// Hooks
import { usePasteHandler } from './usePasteHandler';
import { useConnectionDrag } from './useConnectionDrag';
import { useCanvasExpansion } from './useCanvasExpansion';
import { useCanvasHandlers } from './useCanvasHandlers';



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
  // Optimization: Only track the START of a drag here. The continuous updates happen in ConnectionLayer.
  const [activeDragStart, setActiveDragStart] = useState<ActiveDragStart | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Get mouse/touch coordinates relative to the canvas container
  const getCanvasPoint = useCallback((e: { clientX: number, clientY: number }) => {
    return getCanvasPointUtil(containerRef, e);
  }, []);

  // Helper: Prepare Blocks data for ConnectionLayer
  const blockDims = useMemo(() => prepareBlockDims(blocks, renderedDims), [blocks, renderedDims]);

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
    handleDragThrottled,
    handleUnstack,
    handleAddBlock,
    handleAnchorMouseDown,
    handleCanvasDrop
  } = useCanvasHandlers(
    setBlocks,
    setSelectedId,
    setActiveDragStart, // Renamed from setDraftConnection
    setConnections,
    getCanvasPoint,
    connections,
    activeDragStart // Renamed
  );

  // Custom Hooks
  usePasteHandler(setBlocks);
  // useConnectionDrag removed from here - moved to ConnectionLayer
  const canvasSize = useCanvasExpansion(blocks, containerRef);
  
  // Initialization Logic (Consolidated)
  useEffect(() => {
    if (initialContent) {
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
        } else if (parsed && typeof parsed === 'object') {
          // New format { blocks, connections }
          if (parsed.blocks) setBlocks(parsed.blocks);
          if (parsed.connections) setConnections(parsed.connections);
        }
      } catch (e) {
        // If simple string, create one block
        if (initialContent.trim()) {
          setBlocks([{
            blockId: uuidv4(),
            type: 'text',
            content: initialContent,
            x: 100,
            y: 100,
            width: 320,
            height: 'auto'
          }]);
        }
      }
    }
  }, []); // Run once on mount

  // Autosave Logic (Consolidated)
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (blocks.length > 0 || connections.length > 0) {
        onChangeRef.current?.(JSON.stringify({ blocks, connections }));
      }
    }, 1000); 
    return () => clearTimeout(timer);
  }, [blocks, connections]); // Trigger only on data change, not callback change

  // Stable handlers for Memoized Components
  const handleConnectionUpdate = useCallback((updated: Connection) => {
    setConnections(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, []);

  const handleConnectionRemove = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleBlockDragStart = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // Callback for when drag ends (success or cancel)
  const handleDragComplete = useCallback(() => {
    setActiveDragStart(null);
  }, []);

  return (
    <div className="relative w-full h-full bg-[hsl(var(--background))]/50 overflow-auto" id="smart-canvas-viewport">
      <div 
        ref={containerRef}
        className="relative min-w-full min-h-full transition-[width,height] duration-300 ease-out"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onClick={() => setSelectedId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        onDoubleClick={(e) => {
          if (e.target === containerRef.current) {
            handleAddBlock(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
          }
        }}
      >
      
        {/* Background Dots */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        {/* Connection Layer */}
        <ConnectionLayer 
          connections={connections}
          setConnections={setConnections} 
          blocks={blockDims} // Pass simplified blocks for snapping logic
          fullBlocks={blocks} // Pass full blocks for useConnectionDrag logic if needed (or refactor useConnectionDrag to use blockDims)
          onUpdateConnection={handleConnectionUpdate}
          onRemoveConnection={handleConnectionRemove}
          activeDragStart={activeDragStart}
          onDragComplete={handleDragComplete}
          getCanvasPoint={getCanvasPoint}
        />

        {/* Blocks Layer (Memoized) */}
        <BlocksLayer 
          blocks={blocks}
          selectedId={selectedId}
          readOnly={readOnly}
          onDragStop={handleDragStop}
          onDrag={handleDragThrottled}
          onDragStart={handleBlockDragStart}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          onUpdateBlock={updateBlock}
          onDeleteBlock={handleDeleteBlock}
          onUnstack={handleUnstack}
          onAnchorMouseDown={handleAnchorMouseDown}
          // onAnchorMouseUp is handled by ConnectionLayer logic predominantly, but we might keep it or refactor. 
          // Actually, useConnectionDrag handles mouseup on Window.
          // handleAnchorMouseUpStable was used for CLICK-to-connect or just cleanup?
          // It was used in useCanvasHandlers for constraints. Let's keep it if regular usage requires it, 
          // but drag logic is now in ConnectionLayer. 
          // Check if handleAnchorMouseUpStable is passed?
          // We removed it from destructuring in this edit, need to remove from Props too or keeping it?
          // Let's pass a no-op or handle connection logic purely in ConnectionLayer?
          // For now, let's keep the prop but maybe pass null if not needed?
          // Actually, let's just not pass it if we removed it from handler.
          onAnchorMouseUp={() => {}} 
          onDimensionsChange={handleDimensionsChange}
          isConnectionDragging={!!activeDragStart}
        />

        {/* FAB to add Note */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            onClick={(e) => { e.stopPropagation(); handleAddBlock(); }}
            className="rounded-full h-14 w-14 shadow-xl bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}