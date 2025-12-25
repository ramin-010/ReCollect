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
  
  // Optimization: Only track the START of a drag here. The continuous updates happen in ConnectionLayer/NativeLayer.
  const [activeDragStart, setActiveDragStart] = useState<ActiveDragStart | null>(null);
  
  // Ephemeral drag state is NO LONGER USED for React updates (Plan C), but we keep the state hook if generic handlers need it?
  // Actually, useCanvasHandlers still calls setDraggingBlock.
  // We can pass a dummy setter or let it update state that we ignore in rendering (perf hit?).
  // To avoid perf hit, `setDraggingBlock` should be a dummy function or we refactor handlers.
  // For now, let's keep it but NOT use it in `blockDims` memoization to prevent re-renders.
  const [draggingBlock, setDraggingBlock] = useState<{ id: string, x: number, y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragController = useRef(new DragController()).current;

  // Helper: Get mouse/touch coordinates relative to the canvas container
  const getCanvasPoint = useCallback((e: { clientX: number, clientY: number }) => {
    return getCanvasPointUtil(containerRef, e);
  }, []);

  // Helper: Prepare Blocks data for ConnectionLayer
  const blockDims = useMemo(() => {
    const dims = prepareBlockDims(blocks, renderedDims);
    // PLAN C: We DO NOT merge draggingBlock state here.
    // The visual update is handled by DOM manipulation (Rnd + NativeConnectionLayer).
    // React sees the block at its original position until drag stops.
    return dims;
  }, [blocks, renderedDims]); // Removed draggingBlock from deps

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
    setActiveDragStart,
    setConnections,
    getCanvasPoint,
    connections,
    activeDragStart,
    // We pass the real setter, but since we don't use 'draggingBlock' state in render, it's fine.
    // Actually, setting state triggers re-render regardless of usage.
    // We should STOP `useCanvasHandlers` from calling it, OR pass a no-op.
    // But `handleDragThrottled` is only called if WE call it.
    // In `BlocksLayer`, we removed the `onDrag` call to `handleDragThrottled`.
    // So this setter is effectively unused during drag! Perfect.
    setDraggingBlock
  );

  // Custom Hooks
  usePasteHandler(setBlocks);
  const canvasSize = useCanvasExpansion(blocks, containerRef);
  
  // Initialization Logic
  useEffect(() => {
    if (initialContent) {
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
        } else if (parsed && typeof parsed === 'object') {
          if (parsed.blocks) setBlocks(parsed.blocks);
          if (parsed.connections) setConnections(parsed.connections);
        }
      } catch (e) {
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
  }, []);

  // Autosave Logic
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (blocks.length > 0 || connections.length > 0) {
        onChangeRef.current?.(JSON.stringify({ blocks, connections }));
      }
    }, 1000); 
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
        className="relative min-w-full min-h-full transition-[width,height] duration-300 ease-out"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onClick={() => {
            setSelectedId(null);
            setSelectedConnectionId(null);
        }}
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
            containerRef={containerRef}
        />

        {/* Blocks Layer (Memoized) */}
        <BlocksLayer 
          blocks={blocks}
          selectedId={selectedId}
          readOnly={readOnly}
          onDragStop={handleDragStop}
          // We intentionally omit onDrag to prevent React state updates during drag
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
        />

        {/* DRAFT CONNECTION LAYER (Foreground - Creation Mode) */}
        {/* We use the standard React Layer for the creation drag because it involves state (activeDragStart) and following mouse */}
        {activeDragStart && (
            <ConnectionLayer 
                variant="default"
                connections={[]} // Don't render existing connections here (handled by NativeLayer)
                setConnections={setConnections} 
                blocks={blockDims} 
                fullBlocks={blocks}
                activeDragStart={activeDragStart}
                onDragComplete={handleDragComplete}
                getCanvasPoint={getCanvasPoint}
                selectedConnectionId={null}
                onSelectConnection={() => {}}
                // This layer is ephemeral and only exists while creating a connection
            />
        )}

        {/* Connection Layer (CONTROLS - Foreground) */}
        {/* This layer renders handles for selecting/editing connections which are static/interactive */}
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