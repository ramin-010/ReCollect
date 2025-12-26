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
    console.log('[PERF] handleDragStop', { blockId, x, y });
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
        // Generate a NEW unique ID for the stack (don't reuse targetBlock.blockId!)
        const newStackId = uuidv4();
        
        // Get all block IDs that will be merged into the stack
        const targetStackItems = targetBlock.type === 'stack' ? (targetBlock.stackItems || []) : [targetBlock];
        const mergedBlockIds = [
          ...targetStackItems.map(item => item.blockId),
          draggedBlock.blockId
        ];
        
        // If target was already a stack, include its ID in merged list
        if (targetBlock.type === 'stack') {
          mergedBlockIds.push(targetBlock.blockId);
        }
        
        const newStackItems = [
          ...targetStackItems,
          draggedBlock
        ];
        const newStackBlock: BlockData = {
          blockId: newStackId, // New unique ID!
          type: 'stack',
          x: targetBlock.x,
          y: targetBlock.y,
          stackItems: newStackItems as BlockData[],
          content: '',
          width: 450,
          height: 'auto'
        };
        
        // Handle connections: hide original connections, create merged stack connections
        setConnections(prevConnections => {
          const newConnections: Connection[] = [];
          const externalTargets = new Map<string, { side: 'top' | 'right' | 'bottom' | 'left', fromOrTo: 'from' | 'to' }>();
          
          const updatedConnections = prevConnections.map(conn => {
            const fromInStack = mergedBlockIds.includes(conn.fromBlock);
            const toInStack = mergedBlockIds.includes(conn.toBlock);
            
            // Connection between two blocks that are both being stacked - just hide it
            if (fromInStack && toInStack) {
              return { ...conn, hidden: true, originalBlockId: conn.fromBlock };
            }
            
            // Connection from a stacked block to an external block
            if (fromInStack && !toInStack) {
              // Deduplicate by TARGET BLOCK only (one merged connection per external target)
              const key = `to-${conn.toBlock}`;
              if (!externalTargets.has(key)) {
                externalTargets.set(key, { side: conn.toSide, fromOrTo: 'to' });
                // Create a new connection from the stack to this external block
                newConnections.push({
                  id: uuidv4(),
                  fromBlock: newStackBlock.blockId,
                  fromSide: 'right', // Default side for stack connections
                  toBlock: conn.toBlock,
                  toSide: conn.toSide
                });
              }
              return { ...conn, hidden: true, originalBlockId: conn.fromBlock };
            }
            
            // Connection from an external block to a stacked block
            if (!fromInStack && toInStack) {
              // Deduplicate by SOURCE BLOCK only
              const key = `from-${conn.fromBlock}`;
              if (!externalTargets.has(key)) {
                externalTargets.set(key, { side: conn.fromSide, fromOrTo: 'from' });
                // Create a new connection from the external block to the stack
                newConnections.push({
                  id: uuidv4(),
                  fromBlock: conn.fromBlock,
                  fromSide: conn.fromSide,
                  toBlock: newStackBlock.blockId,
                  toSide: 'left' // Default side for stack connections
                });
              }
              return { ...conn, hidden: true, originalBlockId: conn.toBlock };
            }
            
            return conn;
          });
          
          return [...updatedConnections, ...newConnections];
        });
        
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
  }, [setBlocks, setDraggingBlock, setConnections]);

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
    
    // Get all block IDs that were in the stack
    const stackItemIds = stackBlock.stackItems.map(item => item.blockId);
    
    // Restore hidden connections and remove stack connections
    setConnections(prev => {
      return prev
        // Remove connections from/to the stack itself (the merged connections)
        .filter(c => c.fromBlock !== stackBlock.blockId && c.toBlock !== stackBlock.blockId)
        // Restore hidden connections that belonged to stack items
        .map(c => {
          if (c.hidden && c.originalBlockId && stackItemIds.includes(c.originalBlockId)) {
            // Restore this connection
            const { hidden, originalBlockId, ...restoredConn } = c;
            return restoredConn;
          }
          return c;
        });
    });
    
    // Extract blocks from the stack
    const unstackedItems = stackBlock.stackItems.map((item, index) => ({
      ...item,
      x: stackBlock.x + (index * 20) + 20, 
      y: stackBlock.y + (index * 20) + 20,
    }));
    setBlocks(prev => prev.filter(b => b.blockId !== stackBlock.blockId).concat(unstackedItems));
  }, [setBlocks, setConnections]);

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
    // Constraint: An anchor can have multiple OUTGOING connections (as source)
    // BUT if it's ever been a TARGET (incoming), it can't become a source
    const isIncomingTarget = connections.some(c => 
      c.toBlock === blockId && c.toSide === side && !c.hidden
    );

    if (isIncomingTarget) {
      e.stopPropagation();
      return; // Can't start connection from an anchor that receives connections
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
        
        // Get the original blockId from itemData (preserve it!)
        const originalBlockId = itemData.blockId;

        setBlocks(prev => {
          let remainingStackItemIds: string[] = [];
          let stackWasFullyDissolved = false;
          
          // 1. Remove item from old stack
          const newBlocks = prev.map(b => {
            if (b.blockId === stackId && b.stackItems) {
              const newItems = b.stackItems.filter((_, i) => i !== itemIndex);
              remainingStackItemIds = newItems.map(item => item.blockId);
              
              if (newItems.length === 0) {
                stackWasFullyDissolved = true;
                return null;
              }
              if (newItems.length === 1) {
                // Stack dissolves into single item - handle connections
                stackWasFullyDissolved = true;
                return { ...newItems[0], x: b.x, y: b.y };
              }
              return { ...b, stackItems: newItems };
            }
            return b;
          }).filter(Boolean) as BlockData[];

          // 2. Add the dragged item (preserve original blockId!)
          const newBlock: BlockData = {
            ...itemData,
            blockId: originalBlockId, // Keep original ID for connection restoration
            x: dropX,
            y: dropY,
            width: itemData.width || 300,
            height: 'auto'
          };
          
          // 3. Restore connections for the extracted item
          setConnections(prevConns => {
            let result = prevConns;
            
            // Restore hidden connections for this specific block
            result = result.map(c => {
              if (c.hidden && c.originalBlockId === originalBlockId) {
                const { hidden, originalBlockId: _, ...restoredConn } = c;
                return restoredConn;
              }
              return c;
            });
            
            // If stack was fully dissolved, restore all its connections and remove stack connections
            if (stackWasFullyDissolved) {
              const allRestoredIds = [...remainingStackItemIds, originalBlockId];
              result = result
                .filter(c => c.fromBlock !== stackId && c.toBlock !== stackId)
                .map(c => {
                  if (c.hidden && c.originalBlockId && allRestoredIds.includes(c.originalBlockId)) {
                    const { hidden, originalBlockId: _, ...restoredConn } = c;
                    return restoredConn;
                  }
                  return c;
                });
            }
            
            return result;
          });

          return [...newBlocks, newBlock];
        });
      } catch (err) {
        console.error("Failed to process stack drop", err);
      }
    }
  }, [setBlocks, setConnections]);

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