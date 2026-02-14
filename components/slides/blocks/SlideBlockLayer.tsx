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
}: BlockWrapperProps) => {

  const handleRndDragStop = useCallback((_e: any, d: any) => {
    onDragStop(block.blockId, d.x, d.y);
    dragController?.stopDrag();
  }, [block.blockId, onDragStop, dragController]);

  const handleRndDragStart = useCallback(() => {
    onDragStart?.(block.blockId);
    dragController?.startDrag(block.blockId);
  }, [block.blockId, onDragStart, dragController]);

  const handleResizeStop = useCallback((_e: any, _dir: any, ref: any, _delta: any, position: any) => {
    onUpdateBlock(block.blockId, {
      width: ref.offsetWidth,
      height: ref.offsetHeight,
      x: position.x,
      y: position.y,
    });
  }, [block.blockId, onUpdateBlock]);

  const zIndex = isSelected ? 20 : 10;

  return (
    <Rnd
      key={block.blockId}
      id={block.blockId}
      scale={zoom || 1}
      position={{ x: block.x, y: block.y }}
      size={{
        width: block.width,
        height: block.height === 'auto' ? 'auto' : block.height,
      }}
      onDragStop={handleRndDragStop}
      onDragStart={handleRndDragStart}
      dragHandleClassName="smart-block-drag-handle"
      bounds="parent"
      enableResizing={{
        top: false, right: false, bottom: false, left: false,
        topRight: false, bottomRight: true, bottomLeft: false, topLeft: false,
      }}
      onResizeStop={handleResizeStop}
      className="z-10"
      style={{ zIndex }}
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
        onDimensionsChange={onDimensionsChange}
        readOnly={readOnly}
        isConnectionDragging={isConnectionDragging}
        color={block.color}
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
    prev.zoom === next.zoom
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
}: SlideBlockLayerProps) {
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
        />
      ))}
    </>
  );
}

export const SlideBlockLayer = memo(SlideBlockLayerComponent);
