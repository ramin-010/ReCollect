'use client';

import React, { memo, useCallback,useRef} from 'react';
import { Rnd } from 'react-rnd';
import { SmartBlock } from '@/components/slides/blocks/SmartBlock';
import { DragController } from '@/components/slides/rendering/DragController';
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
      onResizeStop={handleResizeStop}
      className="z-100"
      style={{ zIndex, opacity: editingBlockId === block.blockId ? 0 : 1, pointerEvents: editingBlockId === block.blockId ? 'none' : 'auto' }}
    >
      <SmartBlock
        id={block.blockId}
        type={block.type}

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
          isSelected={block.blockId === selectedBlockId || selectedBlockId === 'ALL'}
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
