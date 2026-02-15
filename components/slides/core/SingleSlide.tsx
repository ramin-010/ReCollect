'use client';

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { SlideBlockData, SLIDE_WIDTH, SLIDE_MIN_HEIGHT, GUIDE_LINE_SPACING } from './types';
import { Connection, BlockDims } from '@/types/canvas';
import { SlideBlockLayer } from '../blocks/SlideBlockLayer';
import { InlineCursor } from '../blocks/InlineCursor';
import { SlideBlockMenu } from '../blocks/SlideBlockMenu';
import { NativeConnectionLayer } from '@/components/content/newCanvas/NativeConnectionLayer';
import { ConnectionLayer } from '@/components/content/newCanvas/ConnectionLayer';
import { DragController } from '@/components/content/newCanvas/DragController';
import { ActiveDragStart } from '@/components/content/newCanvas/smartCanvas/types';

// ---------------------------------------------------------------------------
// Snap helper — snaps Y to nearest guide line
// ---------------------------------------------------------------------------

function snapToGuide(y: number): number {
  // Offset -19px so visual text baseline sits closer to the line
  const offset = -20;
  // Snap the "visual baseline" (y - offset) to the nearest grid line, then shift back
  return Math.round((y - offset) / GUIDE_LINE_SPACING) * GUIDE_LINE_SPACING + offset;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SingleSlideProps {
  slideId: string;
  slideOrder: number;
  blocks: SlideBlockData[];
  connections: Connection[];
  selectedBlockId: string | null;
  selectedConnectionId: string | null;
  isActive: boolean;
  readOnly?: boolean;
  backgroundColor?: string;
  zoom: number; // Passed from parent for correct coordinate calculations
  // Handlers
  onSelectBlock: (id: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<SlideBlockData>) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddBlock: (slideId: string, type: SlideBlockData['type'], x?: number, y?: number) => string;
  onSlideClick: (slideId: string) => void;
  onConnectionsChange: (connections: Connection[]) => void;
  onSelectConnection: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SingleSlide({
  slideId,
  slideOrder,
  blocks,
  connections,
  selectedBlockId,
  selectedConnectionId,
  isActive,
  readOnly,
  backgroundColor,
  zoom,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onAddBlock,
  onSlideClick,
  onConnectionsChange,
  onSelectConnection,
}: SingleSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragControllerInstance] = useState(() => new DragController());
  const [activeDragStart, setActiveDragStart] = useState<ActiveDragStart | null>(null);

  // ---- Inline cursor state (naked cursor on click) ----
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  // If editing an existing block, this ID is set. If null, we are creating a new block.
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  
  // Computed: Get data for likely editing block
  const editingBlockData = useMemo(() => {
    if (!editingBlockId) return null;
    return blocks.find(b => b.blockId === editingBlockId);
  }, [editingBlockId, blocks]);

  const editingBlockContent = editingBlockData?.content;
  
  const editingBlockFontSize = useMemo(() => {
    if (!editingBlockData) return 14;
    
    // 1. Use explicit font size if available
    if (editingBlockData.fontSize) return editingBlockData.fontSize;

    // 2. Legacy fallback: Scale based on width (assuming 300px base)
    const width = editingBlockData.width;
    return 14 * Math.max(0.5, (width || 300) / 300);
  }, [editingBlockData]);

  // Slide connections state (local setter that also calls parent)
  const setConnections = useCallback(
    (updater: Connection[] | ((prev: Connection[]) => Connection[])) => {
      if (typeof updater === 'function') {
        const next = updater(connections);
        onConnectionsChange(next);
      } else {
        onConnectionsChange(updater);
      }
    },
    [connections, onConnectionsChange]
  );

  // Calculate min height based on blocks
  const computedHeight = useMemo(() => {
    if (blocks.length === 0) return SLIDE_MIN_HEIGHT;
    let maxBottom = SLIDE_MIN_HEIGHT;
    for (const block of blocks) {
      const blockHeight = typeof block.height === 'number' ? block.height : 200;
      const bottom = block.y + blockHeight + 40;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    return maxBottom;
  }, [blocks]);

  // Guide line count for background rendering
  const guideLineCount = useMemo(() => {
    return Math.floor(computedHeight / GUIDE_LINE_SPACING);
  }, [computedHeight]);

  // Block dims for connection rendering
  const blockDims: BlockDims[] = useMemo(() => {
    return blocks.map(b => ({
      id: b.blockId,
      x: b.x,
      y: b.y,
      width: b.width,
      height: typeof b.height === 'number' ? b.height : 200,
    }));
  }, [blocks]);

  // Canvas point helper for connection layer
  const getCanvasPoint = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const container = containerRef.current;
      if (!container) return { x: e.clientX, y: e.clientY };
      const rect = container.getBoundingClientRect();
      // Important: Divide by zoom to get internal coordinates!
      return {
        x: (e.clientX - rect.left + container.scrollLeft) / zoom,
        y: (e.clientY - rect.top + container.scrollTop) / zoom,
      };
    },
    [zoom]
  );

  // ---- Drag handlers with text-block guide snapping ----
  const handleDragStop = useCallback(
    (id: string, x: number, y: number) => {
      // Find the block to check its type
      const block = blocks.find(b => b.blockId === id);
      const snappedY = block?.type === 'text' ? snapToGuide(y) : y;
      onUpdateBlock(id, { x, y: snappedY });
    },
    [onUpdateBlock, blocks]
  );

  const handleDragStart = useCallback(
    (id: string) => {
      onSelectBlock(id);
      dragControllerInstance.startDrag(id);
    },
    [onSelectBlock, dragControllerInstance]
  );

  const handleDragStopWithController = useCallback(
    (id: string, x: number, y: number) => {
      handleDragStop(id, x, y);
      dragControllerInstance.stopDrag();
    },
    [handleDragStop, dragControllerInstance]
  );

  const handleDimensionsChange = useCallback(
    (id: string, width: number, height: number) => {
      onUpdateBlock(id, { width, height });
    },
    [onUpdateBlock]
  );

  const handleAddBlockFromMenu = useCallback(
    (type: SlideBlockData['type']) => {
       // Global cleanup when adding from menu too
       blocks.forEach(b => {
        if (b.type === 'text' && !b.content?.trim()) {
           onDeleteBlock(b.blockId);
        }
      });
      onAddBlock(slideId, type);
    },
    [slideId, onAddBlock, blocks, onDeleteBlock]
  );

  // ---- Single click spawns inline cursor (snapped to guide) ----
  const handleSingleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only create on direct click on canvas background (not on blocks)
      if (e.target !== containerRef.current) return;

      // 1. GLOBAL CLEANUP: Remove any empty text blocks before creating new one
      blocks.forEach(b => {
        if (b.type === 'text' && !b.content?.trim()) {
           onDeleteBlock(b.blockId);
        }
      });

      onSlideClick(slideId);

      const hadSelection = !!selectedBlockId || !!selectedConnectionId;

      // 2. Deselect everything
      onSelectBlock('');
      onSelectConnection(null);

      // 3. Dismiss existing cursor
      setCursorPos(null);
      setEditingBlockId(null);

      // 4. Spawn inline cursor ONLY if we didn't just deselect something
      if (!hadSelection) {
        const rect = containerRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const rawY = (e.clientY - rect.top) / zoom;
        const y = snapToGuide(rawY);
        setCursorPos({ x, y });
      }
    },
    [slideId, onSlideClick, blocks, onDeleteBlock, onSelectBlock, onSelectConnection, zoom, selectedBlockId, selectedConnectionId]
  );

  // ---- Inline cursor handlers ----
  const handleCursorCommit = useCallback(
    (html: string, dims?: { width: number; height: number }) => {
      // Case A: Editing existing block
      if (editingBlockId) {
        // Only update content. Preserve existing width/fontSize unless we want to "shrink wrap"?
        // If the user typed more text, we generally want the block to grow?
        // Excalidraw: Text block width grows with text (if not manually resized to wrap?)
        // Our InlineCursor grows. If we don't update block width, the block will be too small/large?
        // YES, we MUST update width to match the text width on commit!
        // But what about fontSize? Keep existing.
        
        onUpdateBlock(editingBlockId, { 
          content: html,
          width: dims ? dims.width + 10 : undefined, // Add small buffer
          height: dims ? dims.height : undefined,
        });
        setEditingBlockId(null);
        setCursorPos(null);
        return;
      }

      // Case B: Creating new block
      if (!cursorPos) return;
      const blockId = onAddBlock(slideId, 'text', cursorPos.x, cursorPos.y);
      if (blockId) {
        onUpdateBlock(blockId, { 
          content: html,
          width: dims ? dims.width + 10 : 300, // Start with auto-width
          height: dims ? dims.height : 'auto',
          fontSize: 14,
        });
      }
      setCursorPos(null);
    },
    [cursorPos, slideId, onAddBlock, onUpdateBlock, editingBlockId]
  );

  const handleCursorDiscard = useCallback(() => {
    // If we were creating a NEW block, just discard.
    // If we were editing an EXISTING block, we might want to keep it if it wasn't empty?
    // The InlineCursor only calls onDiscard if content is empty.
    // So if existing block became empty, we should arguably delete it or leave it empty?
    // Excalidraw deletes empty text blocks on blur.
    
    if (editingBlockId) {
       // Optional: Delete existing block if it became empty?
       // For now, let's just exit edit mode. The InlineCursor logic calls onDiscard when *empty*.
       // If user cleared the text, maybe we should delete the block?
       // Let's delete it to match behavior.
       onDeleteBlock(editingBlockId);
    }
    
    setCursorPos(null);
    setEditingBlockId(null);
  }, [editingBlockId, onDeleteBlock]);

  // ---- Handle request to edit existing block (double click) ----
  const handleEditRequest = useCallback((blockId: string) => {
    const block = blocks.find(b => b.blockId === blockId);
    if (block && block.type === 'text') {
      setEditingBlockId(blockId);
      setCursorPos({ x: block.x, y: block.y });
    }
  }, [blocks]);

  // Global keyboard shortcuts (Delete/Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected block
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && !editingBlockId) {
        // Prevent backspace from navigating back or other default actions
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
           return;
        }
        e.preventDefault();
        onDeleteBlock(selectedBlockId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, editingBlockId, onDeleteBlock]);

  // ---- Double click on background (no-op, just prevent default) ----
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only block if clicking directly on canvas background
      if (e.target === containerRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onSlideClick(slideId);
      if (e.target === containerRef.current) {
        onSelectBlock('');
        onSelectConnection(null);
      }
      // Single click handler is attached to the div via onClick={handleSingleClick} 
      // but we also keep this generic click for selection clearing if needed?
      // Actually handleSingleClick does both. Let's redirect onClick to handleSingleClick directly in the JSX.
    },
    [slideId, onSlideClick, onSelectBlock, onSelectConnection]
  );

  // Anchor mouse handlers for connections
  const handleAnchorMouseDown = useCallback(
    (blockId: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => {
      const point = getCanvasPoint(e);
      setActiveDragStart({
        blockId,
        side,
        startX: point.x,
        startY: point.y,
      });
    },
    [getCanvasPoint]
  );

  const handleAnchorMouseUp = useCallback(
    (_blockId: string, _side: any, _e: any) => {
      // Handled by ConnectionLayer's useConnectionDrag
    },
    []
  );

  const handleConnectionDragComplete = useCallback(() => {
    setActiveDragStart(null);
  }, []);

  const handleSelectConnectionWrapper = useCallback(
    (id: string, _e?: React.MouseEvent) => {
      onSelectConnection(id);
    },
    [onSelectConnection]
  );

  return (
    <div
      className={`relative group transition-all duration-200 ${
        isActive
          ? 'ring-2 ring-[hsl(var(--brand-primary))]/40 shadow-lg'
          : 'ring-1 ring-[hsl(var(--border))] hover:ring-[hsl(var(--border))]/80'
      }`}
      style={{ width: SLIDE_WIDTH }}
    >
      {/* Slide Number Badge */}
      <div className="absolute -left-10 top-2 flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs font-bold opacity-60 group-hover:opacity-100 transition-opacity">
        {slideOrder + 1}
      </div>

      {/* Slide Container — overflow-visible so SVG connections are not clipped */}
      <div
        ref={containerRef}
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        className="relative rounded-lg"
        style={{
          width: SLIDE_WIDTH,
          minHeight: SLIDE_MIN_HEIGHT,
          height: computedHeight,
          backgroundColor: backgroundColor || 'hsl(var(--card-bg))',
          overflow: 'visible',
        }}
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Invisible horizontal guide lines — visible on hover */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {Array.from({ length: guideLineCount }, (_, i) => {
            const y = (i + 1) * GUIDE_LINE_SPACING;
            return (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: y,
                  height: '1px',
                  background: 'hsl(var(--muted-foreground))',
                  opacity: 0.04,
                }}
              />
            );
          })}
        </div>

        {/* Native Connection Layer (SVG — always rendered for DragController subscription) */}
        <NativeConnectionLayer
          connections={connections}
          blocks={blockDims}
          dragController={dragControllerInstance}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={handleSelectConnectionWrapper}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          zoom={zoom}
        />

        {/* Blocks */}
        <SlideBlockLayer
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          readOnly={readOnly}
          onDragStop={handleDragStopWithController}
          onDragStart={handleDragStart}
          onUpdateBlock={onUpdateBlock}
          onDeleteBlock={onDeleteBlock}
          onSelectBlock={onSelectBlock}
          onDimensionsChange={handleDimensionsChange}
          onAnchorMouseDown={handleAnchorMouseDown}
          onAnchorMouseUp={handleAnchorMouseUp}
          isConnectionDragging={!!activeDragStart}
          dragController={dragControllerInstance}
          zoom={zoom}
          onEditRequest={handleEditRequest}
          editingBlockId={editingBlockId}
        />

        {/* Connection Layer (draft connections during anchor drag) */}
        <ConnectionLayer
          connections={connections}
          setConnections={setConnections as any}
          blocks={blockDims}
          activeDragStart={activeDragStart}
          onDragComplete={handleConnectionDragComplete}
          getCanvasPoint={getCanvasPoint}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={(id: string) => onSelectConnection(id)}
          variant="default"
          zoom={zoom}
          renderConnections={false}
        />

        {/* Connection Controls Layer (when a connection is selected) */}
        {selectedConnectionId && (
          <ConnectionLayer
            connections={connections}
            setConnections={setConnections as any}
            blocks={blockDims}
            activeDragStart={null}
            onDragComplete={() => {}}
            getCanvasPoint={getCanvasPoint}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={(id: string) => onSelectConnection(id)}
            variant="controls"
            zoom={zoom}
          />
        )}

        {/* Block Creation FAB */}
        {!readOnly && (
          <SlideBlockMenu onAddBlock={handleAddBlockFromMenu} />
        )}

        {/* Inline Cursor (naked text input) */}
        {cursorPos && (
          <InlineCursor
            key={editingBlockId || 'new-cursor'} // Force remount when switching modes
            x={cursorPos.x}
            y={cursorPos.y}
            initialContent={editingBlockContent}
            fontSize={editingBlockFontSize}
            maxWidth={editingBlockData?.width}
            onCommit={handleCursorCommit}
            onDiscard={handleCursorDiscard}
            zoom={zoom}
          />
        )}

        {/* Empty state — click hint */}
        {blocks.length === 0 && !cursorPos && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-text"
            onClick={handleSingleClick}
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))]/30 font-medium pointer-events-none">
              Click anywhere to start typing, or use the + button
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
