'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { SmartBlock } from './SmartBlock';
import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { imageStorage } from '@/lib/storage/imageStorage';
import { ConnectionLayer } from './ConnectionLayer';
import { BlocksLayer } from './BlocksLayer';
import { Connection } from '@/types/canvas';

export interface SmartCanvasProps {
  initialContent?: string; // JSON string of blocks
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

interface BlockData {
  blockId: string;
  type: 'text' | 'image' | 'embed' | 'code' | 'stack';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number | 'auto';
  color?: string;
  // Legacy/Compatibility fields
  url?: string;
  imageId?: string;
  isUploaded?: boolean;
  // Stack Items
  stackItems?: BlockData[];
}

export function SmartCanvas({ initialContent, onChange, readOnly }: SmartCanvasProps) {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Snap Columns Configuration
  const COLUMN_WIDTH = 300;
  const GAP = 24;
  const SNAP_THRESHOLD = 50; // px distance to trigger snap

  // Connection State
  const [connections, setConnections] = useState<Connection[]>([]);
  const [draftConnection, setDraftConnection] = useState<{
      fromBlock: string;
      fromSide: 'top' | 'right' | 'bottom' | 'left';
      currentX: number;
      currentY: number;
  } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Get mouse/touch coordinates relative to the canvas container
  const getCanvasPoint = useCallback((e: { clientX: number, clientY: number }) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      };
  }, []);

  // Helper: Prepare Blocks data for ConnectionLayer (simple map)
  const blockDims = useMemo(() => blocks.map(b => ({
      id: b.blockId,
      x: b.x,
      y: b.y,
      width: b.width,
      height: typeof b.height === 'number' ? b.height : 200 // Approx if auto, but connection layer needs real dims. 
      // Ideally we should track real dims. 
      // For now, let's assume auto height is roughly trackable or we update it?
      // Rnd updates width/height in state? 
      // Checking `handleResizeStop`: it updates width/height.
      // But initial height 'auto' is tricky. 
      // We might need to use a ref to get actual DOM rects? 
      // Or just default to a reasonable value if 'auto'.
  })), [blocks]);


  const handleAnchorMouseDown = useCallback((blockId: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => {
      // Start connection drag
      const { x, y } = getCanvasPoint(e);
      setDraftConnection({
          fromBlock: blockId,
          fromSide: side,
          currentX: x, 
          currentY: y
      });
  }, [getCanvasPoint]);

  // Handle Global Paste (Image / URL detection)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        // If we are editing a text block (textarea focused), let the editor handle it
        const target = e.target as HTMLElement;
        const active = document.activeElement as HTMLElement;
        
        // Check if target or active element is an input/textarea/contentEditable
        if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' ||
            active?.isContentEditable || active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT' ||
            // Also check for ProseMirror specifically just in case
            target.closest('.ProseMirror') || active?.closest('.ProseMirror')) {
            return;
        }

        // Avoid handling paste if we are not the active/focused element context
        // But since this is a global listener, we need to be careful. 
        // Ideally, we should check if the click was within our canvas recently?
        // For now, let's assume if no input is focused, we takeover.
        
        // e.preventDefault(); // CAUTION: preventDefault only if we handle it
        
        // 1. Handle Images
        const items = e.clipboardData?.items;
        if (items) {
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        e.preventDefault();
                        const imageId = uuidv4();
                        await imageStorage.storeImage(imageId, file);
                        const objectURL = imageStorage.createObjectURL(file);
                        
                        const newBlock: BlockData = {
                            blockId: uuidv4(),
                            type: 'image',
                            content: '', // URL is used
                            url: objectURL,
                            imageId: imageId,
                            isUploaded: false,
                            x: 200, 
                            y: 200,
                            width: 300,
                            height: 'auto'
                        };
                        setBlocks(prev => [...prev, newBlock]);
                        return;
                    }
                }
            }
        }

        // 2. Handle Text/URLs
        const text = e.clipboardData?.getData('text/plain');
        if (text) {
             // Check if it's a URL
             const urlPattern = /^(http|https):\/\/[^ "]+$/;
             // Check if it's code (simple heuristic: contains multiple newlines + common keywords or braces)
             const codePattern = /(const|let|var|function|class|import|export|if|for|while|return|=>|{|})/g;
             const isCode = text.split('\n').length > 1 && (text.match(codePattern) || []).length > 3;

             if (urlPattern.test(text.trim())) {
                  e.preventDefault();
                  const newBlock: BlockData = {
                        blockId: uuidv4(),
                        type: 'embed',
                        content: text.trim(),
                        x: 200,
                        y: 200,
                        width: 300,
                        height: 200
                    };
                    setBlocks(prev => [...prev, newBlock]);
             } 
             else if (isCode) {
                 e.preventDefault();
                 const newBlock: BlockData = {
                    blockId: uuidv4(),
                    type: 'code',
                    content: text,
                    x: 200,
                    y: 200,
                    width: 400, // code blocks usually need more width
                    height: 'auto'
                };
                setBlocks(prev => [...prev, newBlock]);
             }
             // If normal text, let it be unless no block is focused? 
             // Actually, if we are not in an editor, we should create a new text block
             else if (document.activeElement === document.body) {
                 e.preventDefault();
                 const newBlock: BlockData = {
                    blockId: uuidv4(),
                    type: 'text',
                    content: `<p>${text.replace(/\n/g, '<br>')}</p>`, 
                    x: 200, 
                    y: 200,
                    width: 300,
                    height: 'auto'
                };
                setBlocks(prev => [...prev, newBlock]);
             }
        }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Connection Drag Global Listeners
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (draftConnection) {
             const { x, y } = getCanvasPoint(e);
             setDraftConnection(prev => prev ? ({ ...prev, currentX: x, currentY: y }) : null);
          }
      };

      const handleMouseUp = (e: MouseEvent) => {
          if (draftConnection) {
              // End drag.
              // If dropped on a valid anchor, SmartBlock's onMouseUp would trigger? 
              // Or we detect intersection?
              // Easier: Add onMouseUp to Anchors in SmartBlock.
              // But SmartBlock anchors can just call a "onConnect" handler passed down.
              // If we drop here, we cancel.
              setDraftConnection(null);
          }
      };

      if (draftConnection) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [draftConnection]);


  const handleCanvasDrop = (e: React.DragEvent) => {
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
  };

  // Initialize blocks and connections
  useEffect(() => {
    if (initialContent) {
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
        } else if (parsed && typeof parsed === 'object') {
            // New format { blocks, connections }
            if (parsed.blocks) setBlocks(parsed.blocks);
            if (parsed.connections) setConnections(parsed.connections);
        }
      } catch (e) {
        // If simple string, create one block
        if (initialContent.trim()) {
            setBlocks([{
                blockId: uuidv4(),
                type: 'text',
                content: initialContent,
                x: 100,
                y: 100,
                width: 320,
                height: 'auto'
            }]);
        }
      }
    }
  }, []); // Run once on mount

  // Debounced Save for Blocks and Connections
  const isLoaded = useRef(false);
  useEffect(() => {
      // Skip the very first render if we want, or just wait for load
      // But typically we want to save subsequent changes.
      // We'll use a timeout to debounce.
      const timer = setTimeout(() => {
           if (blocks.length > 0 || connections.length > 0) {
              // We save as an object now.
              // Logic check: if initialContent was array, we upgrade to object.
             onChange?.(JSON.stringify({ blocks, connections }));
           }
      }, 1000); // 1s debounce for "arrow states" and block moves

      return () => clearTimeout(timer);
  }, [blocks, connections, onChange]);

  // Stable Handlers for BlocksLayer optimization ---------------------------

  const updateBlock = useCallback((blockId: string, updates: Partial<BlockData>) => {
    setBlocks(prev => prev.map(b => b.blockId === blockId ? { ...b, ...updates } : b));
  }, []);

  const handleDeleteBlock = useCallback((blockId: string) => {
      setBlocks(prev => prev.filter(b => b.blockId !== blockId));
      // Also remove connections attached to this block
      setConnections(prev => prev.filter(c => c.fromBlock !== blockId && c.toBlock !== blockId));
  }, []);

  const handleResize = useCallback((id: string, ref: any, position: any) => {
      // This is for live resize if we want live updates in state (throttled)
      // For now Rnd handles visual ref, we update state on Stop typically.
      // But we have `handleResizeThrottled` below.
      // We'll leave the throttled logic or move it here.
  }, []);

  const handleResizeStop = useCallback((id: string, ref: any, position: any) => {
      updateBlock(id, { 
        width: ref.offsetWidth,
        height: ref.offsetHeight,
        x: position.x,
        y: position.y
     });
  }, [updateBlock]);

  // ------------------------------------------------------------------------

  // Debounced Resize Updater
  const lastResizeTime = useRef<number>(0);
  const resizeTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleResizeThrottled = useCallback((id: string, updates: Partial<BlockData>) => {
      const now = Date.now();
      if (now - lastResizeTime.current > 60) { // ~16fps limit for resize reflow
          updateBlock(id, updates);
          lastResizeTime.current = now;
      } else {
          // Trailing update
          if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
          resizeTimeout.current = setTimeout(() => {
              updateBlock(id, updates);
          }, 60);
      }
  }, [updateBlock]);

  const addBlock = (x?: number, y?: number) => {
    const newBlock: BlockData = {
      blockId: uuidv4(),
      type: 'text',
      content: '',
      // Use provided coords or cascade default
      x: x ?? (100 + (blocks.length * 20)),
      y: y ?? (100 + (blocks.length * 20)),
      width: 300,
      height: 'auto'
    };
    setBlocks([...blocks, newBlock]);
    setSelectedId(newBlock.blockId);
  };

  const handleDragStop = useCallback((blockId: string, x: number, y: number) => {
    // We must access current blocks state. 
    // Since we are in a useCallback with [blocks], this updates when blocks update.
    // This implies BlocksLayer WILL re-render when blocks change (fine).
    // It WILL NOT re-render when 'draftConnection' changes (Goal met).
    
    // Logic collision check ...
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
            // Stack logic
            const newStackItems = [
                ...(targetBlock.type === 'stack' ? (targetBlock.stackItems || []) : [targetBlock]),
                draggedBlock
            ];
             const newStackBlock: BlockData = {
                ...targetBlock,
                type: 'stack',
                stackItems: newStackItems,
                content: '',
                width: 450,
                height: 'auto'
            };
            return [...prevBlocks.filter(b => b.blockId !== blockId && b.blockId !== targetBlock.blockId), newStackBlock];
        }

        // Snap Logic
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
  }, [COLUMN_WIDTH, GAP, SNAP_THRESHOLD]); // Removed 'blocks' dependency by using functional state update! 
  // Optimization: handleDragStop is now truly stable!

  /* Handler for Unstacking - Stable */
  const handleUnstack = useCallback((stackBlock: BlockData) => {
    if (!stackBlock.stackItems) return;
    
    const unstackedItems = stackBlock.stackItems.map((item, index) => ({
        ...item,
        x: stackBlock.x + (index * 20) + 20, 
        y: stackBlock.y + (index * 20) + 20,
    }));
    
    setBlocks(prev => prev.filter(b => b.blockId !== stackBlock.blockId).concat(unstackedItems));
  }, []);

  // Handler for adding block (FAB)
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
  }, []);

  
  // Ref approach for Draft Connection to keep handlers stable
  const draftConnectionRef = useRef(draftConnection);
  useEffect(() => { draftConnectionRef.current = draftConnection; }, [draftConnection]);

  const handleAnchorMouseUpStable = useCallback((blockId: string, side: 'top' | 'right' | 'bottom' | 'left', e: any) => {
       const draft = draftConnectionRef.current;
       if (draft && draft.fromBlock !== blockId) {
            setConnections(prev => [...prev, {
                id: uuidv4(),
                fromBlock: draft.fromBlock,
                fromSide: draft.fromSide,
                toBlock: blockId,
                toSide: side
            }]);
            setDraftConnection(null);
       }
  }, []);

  /* Canvas Expansion Logic */
  const [canvasSize, setCanvasSize] = useState({ width: '100%', height: '100%' }); // Start relative

  useEffect(() => {
    if (blocks.length === 0) return;

    // 1. Calculate bounding box of content
    let maxX = 0;
    let maxY = 0;
    
    blocks.forEach(b => {
        const bRight = b.x + b.width;
        const bBottom = b.y + (typeof b.height === 'number' ? b.height : 200); // approx for auto
        if (bRight > maxX) maxX = bRight;
        if (bBottom > maxY) maxY = bBottom;
    });

    if (containerRef.current) {
        const currentW = containerRef.current.clientWidth;
        const currentH = containerRef.current.clientHeight;
        const thresholdX = currentW * 0.8;
        const thresholdY = currentH * 0.8;
        let newW = currentW;
        let newH = currentH;
        let needsUpdate = false;

        if (maxX > thresholdX) {
            newW = Math.max(currentW, maxX + 400); 
            needsUpdate = true;
        }

        if (maxY > thresholdY) {
            newH = Math.max(currentH, maxY + 400); 
            needsUpdate = true;
        }

        if (needsUpdate) {
            setCanvasSize({ 
                width: `${newW}px`, 
                height: `${newH}px` 
            });
        }
    }
  }, [blocks]); // Run whenever blocks move/resize

  return (
    <div className="relative w-full h-full bg-[hsl(var(--background))]/50 overflow-auto" id="smart-canvas-viewport">
      <div 
        ref={containerRef}
        className="relative min-w-full min-h-full transition-[width,height] duration-300 ease-out"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onClick={() => setSelectedId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        onDoubleClick={(e) => {
           if (e.target === containerRef.current) {
               handleAddBlock(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
           }
        }}
      >
      
      {/* Background Dots */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* Connection Layer */}
      <ConnectionLayer 
          connections={connections}
          blocks={blockDims} // Correct type: BlockDims[]
          onUpdateConnection={(updated) => setConnections(prev => prev.map(c => c.id === updated.id ? updated : c))}
          onRemoveConnection={(id) => setConnections(prev => prev.filter(c => c.id !== id))}
          currentDraftConnection={draftConnection}
      />

      {/* Blocks Layer (Memoized) */}
      <BlocksLayer 
          blocks={blocks}
          selectedId={selectedId}
          readOnly={readOnly}
          onDragStop={handleDragStop}
          onDragStart={(id) => setSelectedId(id)}
          onResize={(id, ref, pos) => { /* Optional live update */ }}
          onResizeStop={handleResizeStop}
          onUpdateBlock={updateBlock}
          onDeleteBlock={handleDeleteBlock}
          onUnstack={handleUnstack}
          onAnchorMouseDown={handleAnchorMouseDown}
          onAnchorMouseUp={handleAnchorMouseUpStable}
      />


      {/* FAB to add Note */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
            onClick={(e) => { e.stopPropagation(); addBlock(); }}
            className="rounded-full h-14 w-14 shadow-xl bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white p-0 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
            <Plus className="w-6 h-6" />
        </Button>
      </div>
     </div>
    </div>
  );
}
