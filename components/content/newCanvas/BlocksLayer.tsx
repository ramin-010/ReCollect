import React, { memo } from 'react';
import { Rnd } from 'react-rnd';
import { SmartBlock } from './smartBlock/index';
import { DragController } from './DragController';

// Define the Props expected by the layer
interface BlocksLayerProps {
    blocks: any[]; // Using any[] to avoid circular dep issues or duplicating BlockData def. Ideally import shared type.
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
    onAnchorMouseDown: (id: string, side: any, e: any) => void;
    onAnchorMouseUp: (id: string, side: any, e: any) => void;
    onDrag?: (id: string, x: number, y: number) => void;
    onDimensionsChange?: (id: string, width: number, height: number) => void;
    isConnectionDragging?: boolean;
    dragController?: DragController;
    scale?: number; // Add scale prop
}

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
    onAnchorMouseDown,
    onAnchorMouseUp,
    onDrag,
    onDimensionsChange,
    isConnectionDragging,
    dragController,
    scale = 1 // default
}: BlocksLayerProps) => {
    return (
        <>
            {blocks.map(block => (
                <Rnd
                    key={block.blockId}
                    id={block.blockId} 
                    scale={scale} // Pass scale to Rnd
                    position={{ x: block.x, y: block.y }}
                    size={{ width: block.width, height: block.height === 'auto' ? 'auto' : block.height }}
                    onDragStop={(e, d) => {
                        onDragStop(block.blockId, d.x, d.y);
                        dragController?.stopDrag(); 
                    }}
                    onDrag={(e, d) => onDrag?.(block.blockId, d.x, d.y)}
                    onDragStart={() => {
                        onDragStart(block.blockId);
                        dragController?.startDrag(block.blockId); 
                    }}
                    dragHandleClassName="smart-block-drag-handle"
                    bounds="parent"
                    enableResizing={{ 
                        top:false, right:false, bottom:false, left:false, 
                        topRight:false, bottomRight:true, bottomLeft:false, topLeft:false 
                    }}
                    onResize={(e, direction, ref, delta, position) => {
                        onResize(block.blockId, ref, position);
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                        onResizeStop(block.blockId, ref, position);
                    }}
                    className="z-10"
                    style={{ zIndex: selectedId === block.blockId ? 20 : 10 }}
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
                        isSelected={selectedId === block.blockId}
                        onUpdate={(content) => onUpdateBlock(block.blockId, { content })}
                        onUpdateBlock={onUpdateBlock}
                        onDelete={() => onDeleteBlock(block.blockId)}
                        onFocus={() => {
                           // Logic handled by SmartCanvas click mainly, 
                           // but we could lift specific focus logic here if needed.
                        }}
                        onUnstack={() => onUnstack(block.blockId)}
                        onStackUpdate={(items) => onUpdateBlock(block.blockId, { stackItems: items })}
                        onAnchorMouseDown={(side, e) => onAnchorMouseDown && onAnchorMouseDown(block.blockId, side, e)}
                        onAnchorMouseUp={(side, e) => onAnchorMouseUp && onAnchorMouseUp(block.blockId, side, e)}
                        onDimensionsChange={onDimensionsChange}
                        readOnly={readOnly}
                        isConnectionDragging={isConnectionDragging}
                        color={block.color}
                    />
                </Rnd>
            ))}
        </>
    );
};

// Memoize the component
// It will only re-render if props change.
// Since 'blocks' is the main data, if 'draftConnection' changes in Parent, 'blocks' prop stats EQUAL.
// But we must ensure the *handlers* passed down are stable (useCallback) in parent.
// If parent re-renders, inline functions become new references => Props change => Re-render.
// So parent MUST use useCallback for all these handlers.
export const BlocksLayer = memo(BlocksLayerComponent);
