'use client';

import React, { memo, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { SmartBlock } from '@/components/content/newCanvas/smartBlock/index';
import { DragController } from '@/components/content/newCanvas/DragController';
import { SlideBlockData } from '../core/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SlideBlockLayerProps {
  blocks: SlideBlockData[];
  selectedBlockId: string | null;
  readOnly?: boolean;
  onDragStop: (id: string, x: number, y: number) => void;
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
  readOnly?: boolean;
  onDragStop: (id: string, x: number, y: number) => void;
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
  readOnly,
  onDragStop,
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

  const handleRndDragStop = useCallback((_e: any, d: any) => {
    onDragStop(block.blockId, d.x, d.y);
    dragController?.stopDrag();
  }, [block.blockId, onDragStop, dragController]);

  const handleRndDragStart = useCallback(() => {
    onDragStart?.(block.blockId);
    dragController?.startDrag(block.blockId);
  }, [block.blockId, onDragStart, dragController]);

  const handleResizeStop = useCallback((_e: any, _dir: any, ref: any, _delta: any, position: any) => {
    const isText = block.type === 'text';
    const newWidth = ref.offsetWidth;
    const newHeight = isText ? 'auto' : ref.offsetHeight;

    const updates: Partial<SlideBlockData> = {
      width: newWidth,
      height: newHeight,
      x: position.x,
      y: position.y,
    };

    // Scale font size if text block (Excalidraw style)
    if (isText && block.width) {
      const scale = newWidth / block.width;
      const currentFontSize = block.fontSize || 14;
      updates.fontSize = Math.round(currentFontSize * scale * 10) / 10; // Round to 1 decimal
    }

    onUpdateBlock(block.blockId, updates);
  }, [block.blockId, block.type, block.width, block.fontSize, onUpdateBlock]);

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
      onDragStart={handleRndDragStart}
      dragHandleClassName="smart-block-drag-handle"
      bounds="parent"
      enableResizing={{
        top: false, right: isText, bottom: !isText, left: false,
        topRight: false, bottomRight: !isText, bottomLeft: false, topLeft: false,
      }}
      onResizeStop={handleResizeStop}
      className="z-10"
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
        onUpdateBlock={onUpdateBlock}
        onDeleteBlock={onDeleteBlock}
        onFocus={onSelectBlock}
        onAnchorMouseDown={onAnchorMouseDown}
        onAnchorMouseUp={onAnchorMouseUp}
        isConnectionDragging={isConnectionDragging}
        color={block.color}
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
  selectedBlockId,
  readOnly,
  onDragStop,
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
          readOnly={readOnly}
          onDragStop={onDragStop}
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
