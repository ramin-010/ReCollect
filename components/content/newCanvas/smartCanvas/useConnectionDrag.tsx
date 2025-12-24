import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DraftConnection } from './types';
import { Connection, BlockDims } from '@/types/canvas';

// Helper to get anchor coordinates
export const SNAP_RADIUS = 20;

const getAnchorPosition = (block: BlockDims, side: 'top' | 'right' | 'bottom' | 'left'): { x: number, y: number } => {
  // BlockDims always has number width/height, so no fallback needed
  const { x, y, width: w, height: h } = block;
  
  switch (side) {
    case 'top': return { x: x + w / 2, y: y };
    case 'right': return { x: x + w, y: y + h / 2 };
    case 'bottom': return { x: x + w / 2, y: y + h };
    case 'left': return { x: x, y: y + h / 2 };
  }
};

export const useConnectionDrag = (
  draftConnection: DraftConnection | null,
  setDraftConnection: React.Dispatch<React.SetStateAction<DraftConnection | null>>,
  getCanvasPoint: (e: { clientX: number; clientY: number }) => { x: number; y: number },
  blocks: BlockDims[],
  connections: Connection[],
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
) => {
  const snappedAnchorRef = useRef<{ blockId: string, side: 'top' | 'right' | 'bottom' | 'left' } | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const moveTimeoutRef = useRef<any>(null);
  
  // Create a ref to access the latest draftConnection inside effects without triggering re-runs
  const draftConnectionRef = useRef(draftConnection);
  useEffect(() => {
    draftConnectionRef.current = draftConnection;
  }, [draftConnection]);

  // Stable Refs for Props that might change but shouldn't re-bind listeners
  const blocksRef = useRef(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  
  const connectionsRef = useRef(connections);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);

  const isDragging = !!draftConnection;

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Clean previous timeout if any
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = null;
      }

      const now = Date.now();
      const timeSinceLast = now - lastMoveTimeRef.current;

      const performUpdate = () => {
        const currentDraft = draftConnectionRef.current;
        if (!currentDraft) return;
        
        lastMoveTimeRef.current = Date.now();
        const { x, y } = getCanvasPoint(e);
        
        let closestAnchor: { blockId: string; side: 'top' | 'right' | 'bottom' | 'left'; x: number; y: number } | null = null;
        let minDist = SNAP_RADIUS;

        // Use refs for latest data
        const currentBlocks = blocksRef.current;
        const currentConnections = connectionsRef.current;

        // Find closest valid anchor
        for (const block of currentBlocks) {
          if (block.id === currentDraft.fromBlock) continue;

          const sides = ['top', 'right', 'bottom', 'left'] as const;
          for (const side of sides) {
            // Check constraints: Is this anchor occupied?
            const isOccupied = currentConnections.some(c => 
               (c.fromBlock === block.id && c.fromSide === side) || 
               (c.toBlock === block.id && c.toSide === side)
            );
            
            if (isOccupied) continue;

            const pos = getAnchorPosition(block, side);
            const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            
            if (dist < minDist) {
              minDist = dist;
              closestAnchor = { blockId: block.id, side, x: pos.x, y: pos.y };
            }
          }
        }

        if (closestAnchor) {
          const anchor = closestAnchor; 
          snappedAnchorRef.current = { blockId: anchor.blockId, side: anchor.side };
          
          setDraftConnection(prev => {
             if (!prev) return null;
             // Determine if update is needed (optional opt)
             return { ...prev, currentX: anchor.x, currentY: anchor.y };
          });
        } else {
          snappedAnchorRef.current = null;
          setDraftConnection(prev => prev ? ({ ...prev, currentX: x, currentY: y }) : null);
        }
      };

      if (timeSinceLast >= 24) {
        performUpdate();
      } else {
        moveTimeoutRef.current = setTimeout(performUpdate, 24 - timeSinceLast);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const currentDraft = draftConnectionRef.current;
      if (currentDraft) {
        if (snappedAnchorRef.current) {
          const { blockId, side } = snappedAnchorRef.current;
          
          const currentConnections = connectionsRef.current;
          // Re-validate constraint
           const isOccupied = currentConnections.some(c => 
             (c.fromBlock === blockId && c.fromSide === side) || 
             (c.toBlock === blockId && c.toSide === side)
          );

          if (!isOccupied) {
            setConnections(prev => [...prev, {
              id: uuidv4(),
              fromBlock: currentDraft.fromBlock,
              fromSide: currentDraft.fromSide,
              toBlock: blockId,
              toSide: side
            }]);
          }
        }
        setDraftConnection(null);
        snappedAnchorRef.current = null;
      }
    };

    // Attach listeners ONCE when dragging starts
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { capture: true }); // Capture phase to ensure we catch it

    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [isDragging, getCanvasPoint, setDraftConnection, setConnections]); // Only re-run if drag status toggles
};