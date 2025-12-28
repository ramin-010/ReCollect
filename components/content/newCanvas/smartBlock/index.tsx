'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SmartBlockProps } from './types';
import { calculateTaskStats, handleStackDrop, handleStackItemDrop } from './utils';
import {
  DragHandle,
  ControlsOverlay,
  ColorControl,
  AnchorPoints,
  TaskProgressBar,
  BlockContent,
  StackItem
} from './BlockComponents';

function SmartBlockComponent({
  id,
  type = 'text',
  content,
  url,
  stackItems,
  width,
  height,
  x,
  y,
  isSelected = false,
  onUpdateBlock,
  onDeleteBlock,
  onFocus,
  onUnstack,
  onAnchorMouseDown,
  onAnchorMouseUp,
  onDimensionsChange,
  readOnly,
  isConnectionDragging,
  color // Background color class
}: SmartBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Use prop color or default
  const bgColor = color || 'bg-[hsl(var(--card-bg))]'; 

  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  
  // Monitor Dimensions with Throttle (Reverted from Debounce)
  const lastDimUpdate = useRef<number>(0);
  const dimUpdateTimeout = useRef<any>(null);

  useEffect(() => {
    if (!blockRef.current || !onDimensionsChange) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        
        const now = Date.now();
        if (now - lastDimUpdate.current > 30) {
           onDimensionsChange(id, width, height);
           lastDimUpdate.current = now;
        } else {
           if (dimUpdateTimeout.current) clearTimeout(dimUpdateTimeout.current);
           dimUpdateTimeout.current = setTimeout(() => {
             onDimensionsChange(id, width, height);
             lastDimUpdate.current = Date.now();
           }, 30);
        }
      }
    });

    observer.observe(blockRef.current);
    return () => {
      observer.disconnect();
      if (dimUpdateTimeout.current) clearTimeout(dimUpdateTimeout.current);
    };
  }, [id, onDimensionsChange]);

  // Calculate progress if tasks exist
  const taskStats = useMemo(() => calculateTaskStats(content), [content]);

  const handleStackItemDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    const data = {
      stackId: id,
      itemIndex: index,
      itemData: stackItems?.[index]
    };
    e.dataTransfer.setData('application/recollect-stack-item', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <motion.div
      ref={blockRef}
      id={`smart-block-${id}`} // Updated ID to avoid collision with Rnd wrapper (which will have the naked ID)
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-xl border transition-all duration-200 group flex flex-col backdrop-blur-sm",
        isEditing ? "shadow-md" : "shadow-none",
        isSelected ? "border-[hsl(var(--brand-primary))] ring-1 ring-[hsl(var(--brand-primary))]/20" : "border-[hsl(var(--border))]/50",
        !isEditing && "smart-block-drag-handle cursor-grab active:cursor-grabbing",
        bgColor
      )}
      style={{
        width: '100%',
        height: '100%',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        onFocus?.(id);
        // Only enter editing mode for text blocks - images/embeds/code/stacks don't need it
        if (type === 'text') {
          setIsEditing(true);
        }
      }}
    >
      <DragHandle isVisible={isHovered || isSelected} />
      
      {/* Controls Overlay (Delete) - Top Right (Outside) */}
      <ControlsOverlay isVisible={isHovered || isSelected} onDelete={() => onDeleteBlock?.(id)} />

      {/* Anchor Points (Visible on Hover or dragging) */}
      <AnchorPoints 
        isVisible={isHovered || !!isConnectionDragging}
        isDragging={!!isConnectionDragging}
        readOnly={readOnly}
        onAnchorMouseDown={(side, e) => onAnchorMouseDown?.(id, side, e)}
        onAnchorMouseUp={(side, e) => onAnchorMouseUp?.(id, side, e)}
      />

      {/* Color Control - Floating "Inside" Top Right (Only when Editing, not for stacks) */}
      {isEditing && type !== 'stack' && (
            <ColorControl 
            isVisible={true} 
            currentColor={color}
            onUpdateColor={(c) => onUpdateBlock?.(id, { color: c })}
        />
      )}

      {/* Content Area */}
      <div className={cn("flex-1  overflow-hidden relative z-10", (type === 'text' && !isEditing) ? 'p-4' : 'p-0')}>
        {type !== 'stack' ? (
          <>
            <BlockContent 
              type={type}
              content={content}
              url={url}
              isEditing={isEditing}
              onUpdate={(newContent) => onUpdateBlock?.(id, { content: newContent })}
              onBlur={() => setIsEditing(false)}
              onDelete={() => onDeleteBlock?.(id)}
            />
            <TaskProgressBar taskStats={type === 'text' ? taskStats : null} />
          </>
        ) : (
          stackItems && stackItems.length > 0 && (
            <div className="w-full h-full flex flex-col bg-gradient-to-b from-[hsl(var(--card))]/80 to-[hsl(var(--muted))]/30 backdrop-blur-sm rounded-lg overflow-hidden">
              {/* Stack Header - Premium glassmorphism style */}
              <div className="px-4 py-2.5 bg-gradient-to-r from-[hsl(var(--brand-primary))]/15 to-transparent border-b border-[hsl(var(--brand-primary))]/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Animated stack icon */}
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand-primary))] animate-pulse" />
                    <div className="absolute -inset-1 rounded-full bg-[hsl(var(--brand-primary))]/20 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--foreground))]/80">
                    Stack
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[hsl(var(--brand-primary))]/20 text-[hsl(var(--brand-primary))]">
                    {stackItems.length}
                  </span>
                </div>
              </div>

              {/* Vertical Stream of Items with improved spacing */}
              <div 
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2.5 relative"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  handleStackDrop(e, dropTargetIndex, id, stackItems, (items) => onUpdateBlock?.(id, { stackItems: items }));
                  setDropTargetIndex(null);
                }}
              >
                {stackItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {/* Render Drop Placeholder Line/Gap if this is the target */}
                    {dropTargetIndex === index && (
                      <div className="h-14 rounded-lg border-2 border-dashed border-[hsl(var(--brand-primary))]/50 bg-[hsl(var(--brand-primary))]/5 flex items-center justify-center transition-all duration-200 animate-pulse">
                        <span className="text-[10px] text-[hsl(var(--brand-primary))] font-medium">Drop here</span>
                      </div>
                    )}

                    <StackItem 
                      item={item}
                      index={index}
                      stackId={id}
                      totalItems={stackItems.length}
                      onDragStart={handleStackItemDragStart}
                      onDragEnter={(idx) => setDropTargetIndex(idx)}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e, idx) => {
                        handleStackItemDrop(e, idx, id, stackItems, (items) => onUpdateBlock?.(id, { stackItems: items }));
                        setDropTargetIndex(null);
                      }}
                    />
                  </React.Fragment>
                ))}

                {/* Bottom Drop Zone to allow appending to end */}
                <div 
                  className="h-6 w-full transparent transition-all"
                  onDragEnter={() => setDropTargetIndex(stackItems.length)}
                >
                  {dropTargetIndex === stackItems.length && (
                    <div className="h-14 rounded-lg border-2 border-dashed border-[hsl(var(--brand-primary))]/50 bg-[hsl(var(--brand-primary))]/5 flex items-center justify-center animate-pulse">
                      <span className="text-[10px] text-[hsl(var(--brand-primary))] font-medium">Drop at end</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </motion.div>
  );
}

// Custom comparison for React.memo - only re-render when data props change
// Callbacks are stable (useCallback in parent) so we don't compare them
const arePropsEqual = (prev: SmartBlockProps, next: SmartBlockProps) => {
  return (
    prev.id === next.id &&
    prev.type === next.type &&
    prev.content === next.content &&
    prev.url === next.url &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.isSelected === next.isSelected &&
    prev.isConnectionDragging === next.isConnectionDragging &&
    prev.readOnly === next.readOnly &&
    prev.color === next.color &&
    prev.stackItems === next.stackItems // Reference equality for array
  );
};

export const SmartBlock = React.memo(SmartBlockComponent, arePropsEqual);