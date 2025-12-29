import React, { memo, useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { SmartBlock } from './smartBlock/index';
import { DragController } from './DragController';

// Define the Props expected by the layer
interface BlocksLayerProps {
    blocks: any[]; 
    selectedId: string | null;
    readOnly?: boolean;
    // Handlers
    onDragStop: (id: string, x: number, y: number) => void;
    onDragStart: (id: string) => void;
    onResize: (id: string, ref: any, position: any) => void;
    onResizeStop: (id: string, ref: any, position: any) => void;
    onUpdateBlock: (id: string, data: any) => void;
    onDeleteBlock: (id: string) => void;
    onUnstack: (block: any) => void;
    onFocus: (id: string) => void;
    onAnchorMouseDown: (id: string, side: any, e: any) => void;
    onAnchorMouseUp: (id: string, side: any, e: any) => void;
    onDimensionsChange?: (id: string, width: number, height: number) => void;
    isConnectionDragging?: boolean;
    dragController?: DragController;
    scale?: number; 
}

interface BlockWrapperProps {
    block: any;
    isSelected: boolean;
    readOnly?: boolean;
    isConnectionDragging?: boolean;
    dragController?: DragController;
    scale?: number;
    // Handlers (passed down as stable references)
    onDragStop: (id: string, x: number, y: number) => void;
    onDragStart: (id: string) => void;
    onResize: (id: string, ref: any, position: any) => void;
    onResizeStop: (id: string, ref: any, position: any) => void;
    onUpdateBlock: (id: string, data: any) => void;
    onDeleteBlock: (id: string) => void;
    onUnstack: (block: any) => void;
    onFocus: (id: string) => void;
    onAnchorMouseDown: (id: string, side: any, e: any) => void;
    onAnchorMouseUp: (id: string, side: any, e: any) => void;
    onDimensionsChange?: (id: string, width: number, height: number) => void;
}

// -----------------------------------------------------------------------------
// BlockWrapper Component
// -----------------------------------------------------------------------------
// This component wraps the Rnd + SmartBlock for a SINGLE block.
// It is memoized so that if the parent renders but THIS block's props haven't changed,
// it will NOT re-render. This solves the performance issue.
const BlockWrapperComponent = ({
    block,
    isSelected,
    readOnly,
    isConnectionDragging,
    dragController,
    scale,
    onDragStop,
    onDragStart,
    onResize,
    onResizeStop,
    onUpdateBlock,
    onDeleteBlock,
    onUnstack,
    onFocus,
    onAnchorMouseDown,
    onAnchorMouseUp,
    onDimensionsChange
}: BlockWrapperProps) => {

    // Helper functions to bridge Rnd signature to our stable handlers
    // We use useCallback but since this component shouldn't render often, inline is 'okay' 
    // BUT inline creates new function for Rnd, so Rnd might re-render. 
    // Rnd is expensive. So we should memoize these callbacks.
    
    const handleRndDragStop = useCallback((e: any, d: any) => {
        onDragStop(block.blockId, d.x, d.y);
        dragController?.stopDrag(); 
    }, [block.blockId, onDragStop, dragController]);

    const handleRndDragStart = useCallback(() => {
        onDragStart(block.blockId);
        dragController?.startDrag(block.blockId); 
    }, [block.blockId, onDragStart, dragController]);

    const handleRndResize = useCallback((e: any, direction: any, ref: any, delta: any, position: any) => {
        onResize(block.blockId, ref, position);
    }, [block.blockId, onResize]);

    const handleRndResizeStop = useCallback((e: any, direction: any, ref: any, delta: any, position: any) => {
        onResizeStop(block.blockId, ref, position);
    }, [block.blockId, onResizeStop]);


    // Determine zIndex
    const zIndex = isSelected ? 20 : 10;

    return (
        <Rnd
            key={block.blockId}
            id={block.blockId} 
            scale={scale} 
            position={{ x: block.x, y: block.y }}
            size={{ width: block.width, height: block.height === 'auto' ? 'auto' : block.height }}
            onDragStop={handleRndDragStop}
            onDragStart={handleRndDragStart}
            dragHandleClassName="smart-block-drag-handle"
            bounds="parent"
            enableResizing={{ 
                top:false, right:false, bottom:false, left:false, 
                topRight:false, bottomRight:true, bottomLeft:false, topLeft:false 
            }}
            onResize={handleRndResize}
            onResizeStop={handleRndResizeStop}
            className="z-10"
            style={{ zIndex }}
        >
            <SmartBlock
                id={block.blockId}
                type={block.type}
                content={block.content}
                url={block.url}
                stackItems={block.stackItems}
                width={block.width}
                height={block.height}
                x={block.x}
                y={block.y}
                isSelected={isSelected}
                onUpdateBlock={onUpdateBlock}
                onDeleteBlock={onDeleteBlock}
                onFocus={onFocus}
                onUnstack={onUnstack}
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

// Check for prop equality.
// We only need shallow comparison for most things.
// Handlers are stable. Block object reference is stable if unchanged.
const BlockWrapper = memo(BlockWrapperComponent);

// -----------------------------------------------------------------------------
// BlocksLayer Component
// -----------------------------------------------------------------------------
const BlocksLayerComponent = ({
    blocks,
    selectedId,
    readOnly,
    onDragStop,
    onDragStart,
    onResize,
    onResizeStop,
    onUpdateBlock,
    onDeleteBlock,
    onUnstack,
    onFocus,
    onAnchorMouseDown,
    onAnchorMouseUp,
    // onDrag,
    onDimensionsChange,
    isConnectionDragging,
    dragController,
    scale = 1
}: BlocksLayerProps) => {
    
    return (
        <>
            {blocks.map(block => (
                <BlockWrapper
                    key={block.blockId}
                    block={block}
                    isSelected={selectedId === block.blockId}
                    readOnly={readOnly}
                    isConnectionDragging={isConnectionDragging}
                    dragController={dragController}
                    scale={scale}
                    // Pass Handlers
                    onDragStop={onDragStop}
                    onDragStart={onDragStart}
                    onResize={onResize}
                    onResizeStop={onResizeStop}
                    onUpdateBlock={onUpdateBlock}
                    onDeleteBlock={onDeleteBlock}
                    onUnstack={onUnstack}
                    onFocus={onFocus}
                    onAnchorMouseDown={onAnchorMouseDown}
                    onAnchorMouseUp={onAnchorMouseUp}
                    // onDrag={onDrag}
                    onDimensionsChange={onDimensionsChange}
                />
            ))}
        </>
    );
};

export const BlocksLayer = memo(BlocksLayerComponent);
