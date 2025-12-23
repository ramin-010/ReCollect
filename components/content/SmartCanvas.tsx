'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { SmartBlock } from './SmartBlock';
import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { imageStorage } from '@/lib/storage/imageStorage';

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

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

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

  // Initialize blocks
  useEffect(() => {
    if (initialContent) {
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed)) {
          // Ensure legacy blocks map to new structure if needed, or just validate
          setBlocks(parsed);
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
  }, []);

  // Optimization: Commit-on-Stop for Drag, Debounce for Resize
  const updateBlock = useCallback((blockId: string, updates: Partial<BlockData>) => {
    setBlocks(prev => prev.map(b => b.blockId === blockId ? { ...b, ...updates } : b));
    if (onChange) {
         // Naive onChange sync
         setBlocks(prev => {
             // Side-effect only, returning same
             return prev;
         });
    }
  }, [onChange]);

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

  const handleDragStop = (blockId: string, x: number, y: number) => {
    // Check for collision with other blocks to form a Stack
    const draggedBlock = blocks.find(b => b.blockId === blockId);
    if (!draggedBlock) return;

    // Calculate center of dragged block (assuming min height 150 if auto)
    const draggedHeight = typeof draggedBlock.height === 'number' ? draggedBlock.height : 150;
    const draggedCenterX = x + (draggedBlock.width / 2);
    const draggedCenterY = y + (draggedHeight / 2);

    const targetBlock = blocks.find(b => {
        if (b.blockId === blockId) return false;
        
        // Calculate center of target block
        const bHeight = typeof b.height === 'number' ? b.height : 150;
        const bCenterX = b.x + (b.width / 2);
        const bCenterY = b.y + (bHeight / 2);
        
        // Simple Euclidean distance check
        // If centers are within 150px of each other -> Stack 'em
        const dist = Math.sqrt(Math.pow(draggedCenterX - bCenterX, 2) + Math.pow(draggedCenterY - bCenterY, 2));
        return dist < 150;
    });

    if (targetBlock) {
        console.log("Collision detected! Merging into stack.", targetBlock.blockId);
        // Merge into stack!
        const newStackItems = [
            ...(targetBlock.type === 'stack' ? (targetBlock.stackItems || []) : [targetBlock]),
            draggedBlock
        ];

        const newStackBlock: BlockData = {
            ...targetBlock,
            type: 'stack',
            stackItems: newStackItems,
            content: '', // Container content unused
            height: 'auto' // Force auto height so it grows
        };

        // Remove both old blocks and add new stack
        const newBlocks = blocks.filter(b => b.blockId !== blockId && b.blockId !== targetBlock.blockId);
        setBlocks([...newBlocks, newStackBlock]);
        onChange?.(JSON.stringify([...newBlocks, newStackBlock]));
        return;
    }

    let closestX = x;
    let minDistance = Infinity;
    
    // Check reasonable number of columns (e.g., 10 columns width)
    for (let i = 0; i < 10; i++) {
        const colX = GAP + i * (COLUMN_WIDTH + GAP);
        const dist = Math.abs(x - colX);
        if (dist < minDistance) {
            minDistance = dist;
            closestX = colX;
        }
    }

    // Apply snap if within threshold
    const finalX = minDistance < SNAP_THRESHOLD ? closestX : x;
    
    updateBlock(blockId, { x: finalX, y: y });
  };

  const handleUnstack = (stackBlock: BlockData) => {
    if (!stackBlock.stackItems) return;
    
    // Fan out items around the stack position
    const unstackedItems = stackBlock.stackItems.map((item, index) => ({
        ...item,
        x: stackBlock.x + (index * 20) + 20, // Offset each item slightly
        y: stackBlock.y + (index * 20) + 20,
    }));
    
    // Remove stack, add items
    const newBlocks = blocks.filter(b => b.blockId !== stackBlock.blockId).concat(unstackedItems);
    setBlocks(newBlocks);
    onChange?.(JSON.stringify(newBlocks));
  };

  /* Canvas Expansion Logic */
  const [canvasSize, setCanvasSize] = useState({ width: '100%', height: '100%' }); // Start relative
  const containerRef = useRef<HTMLDivElement>(null);

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

    // 2. Check against current container size
    if (containerRef.current) {
        const currentW = containerRef.current.clientWidth;
        const currentH = containerRef.current.clientHeight;

        // Thresholds (80%)
        const thresholdX = currentW * 0.8;
        const thresholdY = currentH * 0.8;

        let newW = currentW;
        let newH = currentH;
        let needsUpdate = false;

        // If content pushes past 80%, expand to give 20% more padding relative to content
        // Or simply expand the container by a chunk.
        // User asked: "when more than 70-80% full"
        
        if (maxX > thresholdX) {
            // New width = maxX + 20% buffer (or just ensure maxX is at 80% marks?)
            // let's just add 500px buffer to ensure smooth drag space
            newW = Math.max(currentW, maxX + 400); 
            needsUpdate = true;
        }

        if (maxY > thresholdY) {
            newH = Math.max(currentH, maxY + 400); 
            needsUpdate = true;
        }

        if (needsUpdate) {
            // Apply new size as pixel values
            // We switch from % to px once we start expanding
            setCanvasSize({ 
                width: `${newW}px`, 
                height: `${newH}px` 
            });
        }
    }
  }, [blocks]); // Run whenever blocks move/resize

  return (
    <div className="relative w-full h-full bg-[hsl(var(--background))] overflow-auto" id="smart-canvas-viewport">
      <div 
        ref={containerRef}
        className="relative min-w-full min-h-full transition-[width,height] duration-300 ease-out"
        style={{ width: canvasSize.width, height: canvasSize.height }}
        onClick={() => setSelectedId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        onDoubleClick={(e) => {
           // Only allow if clicking directly on the background
           if (e.target === containerRef.current) {
               addBlock(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
           }
        }}
      >
      
      {/* Background Dots/Grid for reference */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* Magnetic Columns Guides (Visible only when needed? Or subtle always?) */}
      <div className="absolute inset-0 pointer-events-none flex gap-[24px] pl-[24px]">
         {/* Generate guides based on width? Fixed 6 for now */}
         {[...Array(12)].map((_, i) => (
            <div key={i} className="h-full border-r border-dashed border-primary/5 last:border-0" style={{ width: 300 }} />
         ))}
      </div>

      {blocks.map(block => (
        <Rnd
          key={block.blockId}
          position={{ x: block.x, y: block.y }}
          size={{ width: block.width, height: block.height === 'auto' ? 'auto' : block.height }}
          onDragStop={(e, d) => handleDragStop(block.blockId, d.x, d.y)}
          onDragStart={() => setSelectedId(block.blockId)}
          dragHandleClassName="smart-block-drag-handle"
          bounds="parent"
          enableResizing={{ 
            top:false, right:true, bottom:true, left:false, 
            topRight:false, bottomRight:true, bottomLeft:false, topLeft:false 
          }}
          onResize={(e, direction, ref, delta, position) => {
              handleResizeThrottled(block.blockId, { 
                width: ref.offsetWidth,
                height: ref.offsetHeight,
                x: position.x,
                y: position.y
             });
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
             updateBlock(block.blockId, { 
                width: ref.offsetWidth,
                height: ref.offsetHeight,
                x: position.x,
                y: position.y
             });
          }}
          className="z-10" // Blocks
          style={{ zIndex: selectedId === block.blockId ? 20 : 10 }}
        >
          <SmartBlock
            id={block.blockId}
            type={block.type}
            content={block.content}
            url={block.url}
            width={block.width}
            height={block.height}
            x={block.x}
            y={block.y}
            isSelected={selectedId === block.blockId}
            stackItems={block.stackItems}
            onUpdate={(content) => updateBlock(block.blockId, { content })}
            onStackUpdate={(items) => updateBlock(block.blockId, { stackItems: items })}
            onDelete={() => setBlocks(blocks.filter(b => b.blockId !== block.blockId))}
            onUnstack={() => handleUnstack(block)}
            onFocus={() => setSelectedId(block.blockId)}
            readOnly={readOnly}
          />
        </Rnd>
      ))}

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
