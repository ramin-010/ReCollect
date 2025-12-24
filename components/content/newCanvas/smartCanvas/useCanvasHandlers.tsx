import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BlockData, ActiveDragStart } from './types';
import { Connection } from '@/types/canvas';


// Snap Columns Configuration
const COLUMN_WIDTH = 300;
const GAP = 24;
const SNAP_THRESHOLD = 50; // px distance to trigger snap

export const useCanvasHandlers = (
  setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>,
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>,
  setActiveDragStart: React.Dispatch<React.SetStateAction<ActiveDragStart | null>>, // Updated type
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  getCanvasPoint: (e: { clientX: number; clientY: number }) => { x: number; y: number },
  connections: Connection[], 
  activeDragStart: ActiveDragStart | null,
  setDraggingBlock: React.Dispatch<React.SetStateAction<{ id: string, x: number, y: number } | null>>
) => {
  const lastResizeTime = useRef<number>(0);
  const resizeTimeout = useRef<any>(null);
  const dragRafId = useRef<number | null>(null);
  
  // We no longer need to strictly sync a ref for 'draftConnection' here because 
  // the continuous dragging is handled in ConnectionLayer. 
  // However, for the initial click logic constraints, activeDragStart is enough.

  const updateBlock = useCallback((blockId: string, updates: Partial<BlockData>) => {
    setBlocks(prev => prev.map(b => b.blockId === blockId ? { ...b, ...updates } : b));
  }, [setBlocks]);

  const handleDeleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => prev.filter(b => b.blockId !== blockId));
    setConnections(prev => prev.filter(c => c.fromBlock !== blockId && c.toBlock !== blockId));
  }, [setBlocks, setConnections]);

  const handleResize = useCallback((_id: string, _ref: any, _position: any) => {
  }, []);

  const handleResizeStop = useCallback((id: string, ref: any, position: any) => {
    updateBlock(id, { 
      width: ref.offsetWidth,
      height: ref.offsetHeight,
      x: position.x,
      y: position.y
    });
  }, [updateBlock]);

  const handleResizeThrottled = useCallback((id: string, updates: Partial<BlockData>) => {
    const now = Date.now();
    if (now - lastResizeTime.current > 60) {
      updateBlock(id, updates);
      lastResizeTime.current = now;
    } else {
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(() => {
        updateBlock(id, updates);
      }, 60);
    }
  }, [updateBlock]);

  const handleDragStop = useCallback((blockId: string, x: number, y: number) => {
    // Cancel any pending drag frame
    if (dragRafId.current) {
        cancelAnimationFrame(dragRafId.current);
        dragRafId.current = null;
    }
    // Clear ephemeral drag state immediately
    setDraggingBlock(null);

    setBlocks(prevBlocks => {
      const draggedBlock = prevBlocks.find(b => b.blockId === blockId);
      if (!draggedBlock) return prevBlocks;

      const draggedHeight = typeof draggedBlock.height === 'number' ? draggedBlock.height : 150;
      const draggedCenterX = x + (draggedBlock.width / 2);
      const draggedCenterY = y + (draggedHeight / 2);

      const targetBlock = prevBlocks.find(b => {
        if (b.blockId === blockId) return false;
        const bHeight = typeof b.height === 'number' ? b.height : 150;
        const bCenterX = b.x + (b.width / 2);
        const bCenterY = b.y + (bHeight / 2);
        const dist = Math.sqrt(Math.pow(draggedCenterX - bCenterX, 2) + Math.pow(draggedCenterY - bCenterY, 2));
        return dist < 150;
      });

      if (targetBlock) {
        const newStackItems = [
          ...(targetBlock.type === 'stack' ? (targetBlock.stackItems || []) : [targetBlock]),
          draggedBlock
        ];
        const newStackBlock: BlockData = {
          ...targetBlock,
          type: 'stack',
          stackItems: newStackItems as BlockData[],
          content: '',
          width: 450,
          height: 'auto'
        };
        return [...prevBlocks.filter(b => b.blockId !== blockId && b.blockId !== targetBlock.blockId), newStackBlock];
      }

      let closestX = x;
      let minDistance = Infinity;
      for (let i = 0; i < 10; i++) {
        const colX = GAP + i * (COLUMN_WIDTH + GAP);
        const dist = Math.abs(x - colX);
        if (dist < minDistance) {
          minDistance = dist;
          closestX = colX;
        }
      }
      const finalX = minDistance < SNAP_THRESHOLD ? closestX : x;

      return prevBlocks.map(b => b.blockId === blockId ? { ...b, x: finalX, y: y } : b);
    });
  }, [setBlocks, setDraggingBlock]);

  const handleDragThrottled = useCallback((blockId: string, x: number, y: number) => {
    // rAF Throttling: Update strictly next frame (60fps/144fps sync)
    if (dragRafId.current) return;

    dragRafId.current = requestAnimationFrame(() => {
        setDraggingBlock({ id: blockId, x, y });
        dragRafId.current = null;
    });
  }, [setDraggingBlock]);

  const handleUnstack = useCallback((stackBlock: BlockData) => {
    if (!stackBlock.stackItems) return;
    const unstackedItems = stackBlock.stackItems.map((item, index) => ({
      ...item,
      x: stackBlock.x + (index * 20) + 20, 
      y: stackBlock.y + (index * 20) + 20,
    }));
    setBlocks(prev => prev.filter(b => b.blockId !== stackBlock.blockId).concat(unstackedItems));
  }, [setBlocks]);

  const handleAddBlock = useCallback((x?: number, y?: number) => {
    const newBlock: BlockData = {
      blockId: uuidv4(),
      type: 'text',
      content: '',
      x: x ?? 100, 
      y: y ?? 100,
      width: 300,
      height: 'auto'
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.blockId);
  }, [setBlocks, setSelectedId]);

  const handleAnchorMouseDown = useCallback((blockId: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => {
    // Constraint: Check if this anchor is already used
    const isOccupied = connections.some(c => 
      (c.fromBlock === blockId && c.fromSide === side) || 
      (c.toBlock === blockId && c.toSide === side)
    );

    if (isOccupied) {
      e.stopPropagation();
      return; // Do nothing if occupied
    }

    const { x, y } = getCanvasPoint(e);
    e.preventDefault(); // Prevent native drag/selection interference
    e.stopPropagation();
    
    // Set the START of dragging. Updates will be handled internally by ConnectionLayer.
    setActiveDragStart({
      blockId,
      side,
      startX: x,
      startY: y
    });
  }, [getCanvasPoint, setActiveDragStart, connections]);

  // handleAnchorMouseUpStable is removed/unused because logic is now in ConnectionLayer
  
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    const stackData = e.dataTransfer.getData('application/recollect-stack-item');
    if (stackData) {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        const { stackId, itemIndex, itemData } = JSON.parse(stackData);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const dropX = e.clientX - rect.left - (itemData.width || 300) / 2;
        const dropY = e.clientY - rect.top;

        setBlocks(prev => {
          // 1. Remove item from old stack
          const newBlocks = prev.map(b => {
            if (b.blockId === stackId && b.stackItems) {
              const newItems = b.stackItems.filter((_, i) => i !== itemIndex);
              if (newItems.length === 0) return null;
              if (newItems.length === 1) return { ...newItems[0], x: b.x, y: b.y };
              return { ...b, stackItems: newItems };
            }
            return b;
          }).filter(Boolean) as BlockData[];

          // 2. Add new item
          const newBlock: BlockData = {
            ...itemData,
            blockId: uuidv4(),
            x: dropX,
            y: dropY,
            width: itemData.width || 300,
            height: 'auto'
          };

          return [...newBlocks, newBlock];
        });
      } catch (err) {
        console.error("Failed to process stack drop", err);
      }
    }
  }, [setBlocks]);

  return {
    updateBlock,
    handleDeleteBlock,
    handleResize,
    handleResizeStop,
    handleResizeThrottled,
    handleDragStop,
    handleDragThrottled,
    handleUnstack,
    handleAddBlock,
    handleAnchorMouseDown,
    handleCanvasDrop
  };
};