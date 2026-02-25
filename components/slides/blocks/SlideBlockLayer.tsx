'use client';

import React, { memo, useCallback, useState, useRef , useEffect} from 'react';
import { Rnd } from 'react-rnd';
import { SmartBlock } from '@/components/content/newCanvas/smartBlock/index';
import { DragController } from '@/components/content/newCanvas/DragController';
import { SlideBlockData, Connection } from '../core/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SlideBlockLayerProps {
  blocks: SlideBlockData[];
  connections: Connection[];
  selectedBlockId: string | null;
  readOnly?: boolean;
  onDragStop: (id: string, x: number, y: number) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onDragStart?: (id: string) => void;
  onUpdateBlock: (id: string, data: Partial<SlideBlockData>) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (id: string) => void;
  onDimensionsChange?: (id: string, width: number, height: number) => void;
  onAnchorMouseDown?: (id: string, side: any, e: any) => void;
  onAnchorMouseUp?: (id: string, side: any, e: any) => void;
  isConnectionDragging?: boolean;
  dragController?: DragController;
  zoom?: number;
  onEditRequest?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Single Block Wrapper (Memoized)
// ---------------------------------------------------------------------------

interface BlockWrapperProps {
  block: SlideBlockData;
  isSelected: boolean;
  isConnected: boolean;
  readOnly?: boolean;
  onDragStop: (id: string, x: number, y: number) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onDragStart?: (id: string) => void;
  onUpdateBlock: (id: string, data: Partial<SlideBlockData>) => void;
  onDeleteBlock: (id: string) => void;
  onSelectBlock: (id: string) => void;
  onDimensionsChange?: (id: string, width: number, height: number) => void;
  onAnchorMouseDown?: (id: string, side: any, e: any) => void;
  onAnchorMouseUp?: (id: string, side: any, e: any) => void;
  isConnectionDragging?: boolean;
  dragController?: DragController;
  zoom?: number;
  onEditRequest?: (id: string) => void;
}

const BlockWrapperComponent = ({
  block,
  isSelected,
  isConnected,
  readOnly,
  onDragStop,
  onDrag,
  onDragStart,
  onUpdateBlock,
  onDeleteBlock,
  onSelectBlock,
  onDimensionsChange,
  onAnchorMouseDown,
  onAnchorMouseUp,
  isConnectionDragging,
  dragController,
  zoom,
  onEditRequest,
  editingBlockId,
}: BlockWrapperProps & { editingBlockId?: string | null }) => {
  const smartBlockRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  const handleRndDragStop = useCallback((_e: any, d: any) => {
    onDragStop(block.blockId, d.x, d.y);
    dragController?.stopDrag();
  }, [block.blockId, onDragStop, dragController]);

  const handleRndDragStart = useCallback(() => {
    onDragStart?.(block.blockId);
    dragController?.startDrag(block.blockId);
  }, [block.blockId, onDragStart, dragController]);

  const handleRndDrag = useCallback((_e: any, d: any) => {
    onDrag?.(block.blockId, d.x, d.y);
    // Notify controller of live position
    dragController?.update(block.blockId, d.x, d.y);
  }, [block.blockId, onDrag, dragController]);

  const handleResizeStart = useCallback(() => {
    isResizingRef.current = true;
  }, []);

  const handleResizeStop = useCallback((_e: any, _dir: any, ref: any, _delta: any, position: any) => {
    isResizingRef.current = false;
    const isText = block.type === 'text';
    const newWidth = ref.offsetWidth;
    // Always store the numeric height, even for text blocks (so parent can calculate slide height)
    // Rnd will still render 'auto' for text due to the specific prop logic below, allowing flow.
    const newHeight = ref.offsetHeight;

    const updates: Partial<SlideBlockData> = {
      width: newWidth,
      height: newHeight,
      x: position.x,
      y: position.y,
    };

    onUpdateBlock(block.blockId, updates);
  }, [block.blockId, block.type, block.width, onUpdateBlock]);

  // Auto-measure content height (important for text blocks flow)
  useEffect(() => {
    if (!smartBlockRef.current || !onDimensionsChange) return;
    
    // Only auto-update if:
    // 1. It's a text block (dynamic height)
    // 2. OR explicit 'auto' height
    // 3. OR stored height is missing
    const shouldObserve = block.type === 'text' || block.height === 'auto' || !block.height;
    if (!shouldObserve) return;

    const observer = new ResizeObserver((entries) => {
      // Bail out if the user is manually resizing via react-rnd handles. 
      // If we don't, this observer will fire continuously, updating parent state,
      // causing react-rnd's size props to change mid-drag, breaking its internal mouseup listeners.
      if (isResizingRef.current) return;

      for (const entry of entries) {
        const height = entry.contentRect.height;
        // Check if cached height is significantly different to avoid loop/thrashing
        // (Use a small threshold like 2px)
        const currentHeight = typeof block.height === 'number' ? block.height : 0;
        
        // If stored is 'auto', we definitely update.
        // If stored is number, update if diff > 5px (to allow small sub-pixel diffs without thrashing)
        const diff = Math.abs(height - currentHeight);
        
        if (block.height === 'auto' || diff > 5) {
          // Use onDimensionsChange if available, or direct update
          // Note: using contentRect.height. offsetHeight includes border/padding? 
          // Rnd uses offsetHeight usually. entry.contentRect is inner.
          // Let's use smartBlockRef.current.offsetHeight for consistency with Rnd.
          const offsetH = smartBlockRef.current?.offsetHeight || height;
          
          // Debounce? Maybe not needed if we have the threshold check.
          // But 'block' prop changes will re-trigger effect.
          // We need to be careful.
          // If we update, 'block' changes. Effect runs.
          // If 'block.height' matches now, we stop.
          onDimensionsChange(block.blockId, block.width || entry.contentRect.width, offsetH);
        }
      }
    });
    
    observer.observe(smartBlockRef.current);
    return () => observer.disconnect();
  }, [block.blockId, block.type, block.height, block.width, onDimensionsChange]);

  const handleResize = useCallback((_e: any, _dir: any, ref: any, _delta: any, position: any) => {
    const isText = block.type === 'text';
    // Direct DOM manipulation for performance (avoids React render loop)
    // For text blocks, only update width
    if (isText && smartBlockRef.current) {
      // No font size update, just ensure width is applied if needed
      // The actual width update will happen in handleResizeStop
    }
  }, [block.type]); // Removed block.width, block.fontSize as they are no longer used here

  const zIndex = isSelected ? 20 : 10;
  const isText = block.type === 'text';

  return (
    <Rnd
      key={block.blockId}
      id={block.blockId}
      scale={zoom || 1}
      position={{ x: block.x, y: block.y }}
      size={{
        width: block.width,
        height: isText ? 'auto' : (block.height === 'auto' ? 'auto' : block.height),
      }}
      onDragStop={handleRndDragStop}
      onDrag={handleRndDrag}
      onDragStart={handleRndDragStart}
      dragHandleClassName="smart-block-drag-handle"
      bounds="parent"
      enableResizing={{
        top: false, right: isText, bottom: !isText, left: false,
        topRight: false, bottomRight: !isText, bottomLeft: false, topLeft: false,
      }}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      className="z-100"
      style={{ zIndex, opacity: editingBlockId === block.blockId ? 0 : 1, pointerEvents: editingBlockId === block.blockId ? 'none' : 'auto' }}
    >
      <SmartBlock
        id={block.blockId}
        type={block.type}
        contentRef={smartBlockRef}
        content={block.content}
        language={block.language}
        url={block.url}
        width={block.width}
        height={block.height}
        x={block.x}
        y={block.y}
        isSelected={isSelected}
        isConnected={isConnected}
        onUpdateBlock={onUpdateBlock}
        onDeleteBlock={onDeleteBlock}
        onFocus={onSelectBlock}
        onAnchorMouseDown={onAnchorMouseDown}
        onAnchorMouseUp={onAnchorMouseUp}
        isConnectionDragging={isConnectionDragging}
        color={block.color}
        textColor={block.textColor}
        fontSize={block.fontSize}
        onEditRequest={onEditRequest}
      />
    </Rnd>
  );
};

const BlockWrapper = memo(BlockWrapperComponent, (prev, next) => {
  return (
    prev.block === next.block &&
    prev.isSelected === next.isSelected &&
    prev.isConnected === next.isConnected &&
    prev.readOnly === next.readOnly &&
    prev.isConnectionDragging === next.isConnectionDragging &&
    prev.zoom === next.zoom &&
    prev.onEditRequest === next.onEditRequest &&
    prev.editingBlockId === next.editingBlockId &&
    prev.block.fontSize === next.block.fontSize
  );
});

// ---------------------------------------------------------------------------
// SlideBlockLayer Component
// ---------------------------------------------------------------------------

function SlideBlockLayerComponent({
  blocks,
  connections,
  selectedBlockId,
  readOnly,
  onDragStop,
  onDrag,
  onDragStart,
  onUpdateBlock,
  onDeleteBlock,
  onSelectBlock,
  onDimensionsChange,
  onAnchorMouseDown,
  onAnchorMouseUp,
  isConnectionDragging,
  dragController,
  zoom,
  onEditRequest,
  editingBlockId,
}: SlideBlockLayerProps & { editingBlockId?: string | null }) {
  return (
    <>
      {blocks.map(block => (
        <BlockWrapper
          key={block.blockId}
          block={block}
          isSelected={block.blockId === selectedBlockId}
          isConnected={connections?.some(c => c.fromBlock === block.blockId || c.toBlock === block.blockId)}
          readOnly={readOnly}
          onDragStop={onDragStop}
          onDrag={onDrag}
          onDragStart={onDragStart}
          onUpdateBlock={onUpdateBlock}
          onDeleteBlock={onDeleteBlock}
          onSelectBlock={onSelectBlock}
          onDimensionsChange={onDimensionsChange}
          onAnchorMouseDown={onAnchorMouseDown}
          onAnchorMouseUp={onAnchorMouseUp}
          isConnectionDragging={isConnectionDragging}
          dragController={dragController}
          zoom={zoom}
          onEditRequest={onEditRequest}
          editingBlockId={editingBlockId}
        />
      ))}
    </>
  );
}

export const SlideBlockLayer = memo(SlideBlockLayerComponent);
