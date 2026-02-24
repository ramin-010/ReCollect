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
  language,
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
  color,
  textColor,
  onEditRequest,
  fontSize,
  contentRef,
  isConnected,
}: SmartBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
    const bgColor = color; 

  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  
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

  // ---- Font sizing ----
  // Use explicit fontSize prop, or default to 16px.
  const currentFontSize = (type === 'text' && fontSize) ? fontSize : 16;

  // ---- Minimal text preview (no box when not editing AND not connected AND no color) ----
  // If color is set, we treat it as a "card" regardless of connection or edit state
  const isMinimalText = type === 'text' && !isEditing && !isConnected && !color;

  return (
    <motion.div
      ref={blockRef}
      id={`smart-block-${id}`}       initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative transition-all duration-200 group flex flex-col",
        // Text blocks: minimal in preview, boxed in edit
        isMinimalText
          ? "rounded-none border-transparent bg-transparent shadow-none"
          : "rounded-md border backdrop-blur-sm " + (isEditing ? "shadow-md" : "shadow-none"),
        // Selection highlight (always, even for minimal text)
        isSelected && !isMinimalText
          ? "border-[hsl(var(--brand-primary))] ring-1 ring-[hsl(var(--brand-primary))]/20"
          : isSelected && isMinimalText
            ? "ring-1 ring-[hsl(var(--brand-primary))]/40 rounded-md"
            // If connected (and thus !isMinimalText), use full opacity border. specific check for isConnected
            : isConnected 
              ? "border-[hsl(var(--border-light))]" 
              : "border-white/50",
        !isEditing && "smart-block-drag-handle cursor-grab active:cursor-grabbing",
        !isMinimalText && bgColor
      )}
      style={{
        width: '100%',
        height: '100%',
        color: textColor || undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        onFocus?.(id);
      }}
      onDoubleClick={(e) => {
        if (type === 'text') {
          e.stopPropagation();
          if (onEditRequest) {
            onEditRequest(id);
          } else {
            setIsEditing(true);
          }
        }
      }}
    >
      <DragHandle isVisible={isHovered || isSelected} />
      


      {/* Anchor Points (Visible on Hover or dragging) */}
      <AnchorPoints 
        isVisible={isHovered || !!isConnectionDragging}
        isDragging={!!isConnectionDragging}
        readOnly={readOnly}
        onAnchorMouseDown={(side, e) => onAnchorMouseDown?.(id, side, e)}
        onAnchorMouseUp={(side, e) => onAnchorMouseUp?.(id, side, e)}
      />

      {/* Color Control - Visible on Selection or Editing */}
      {(isSelected || isEditing) && type !== 'stack' && (
            <ColorControl 
            isVisible={true} 
            currentColor={color}
            onUpdateColor={(c) => onUpdateBlock?.(id, { color: c })}
        />
      )}
      {/* Content Area */}
      <div 
        className={cn(
          "flex-1 overflow-hidden relative z-10 transition-colors duration-200 rounded-lg", 
          (type === 'text' && !isEditing) ? 'p-0' : (type === 'text' ? 'p-0' : 'p-0')
          // Removed inner color application to avoid double-stacking intensity
          // color is now handled exclusively by the outer container when !isMinimalText
        )}
        style={{
          fontSize: type === 'text' ? `${currentFontSize}px` : undefined,
          color: textColor || undefined,
        }}
      >
        {type !== 'stack' ? (
          <>
            <BlockContent 
              type={type}
              content={content}
              url={url}
              language={language}
              isEditing={isEditing}
              onUpdate={(newContent) => onUpdateBlock?.(id, { content: newContent })}
              onBlur={() => setIsEditing(false)}
              onLanguageChange={(lang) => onUpdateBlock?.(id, { language: lang })}
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
    prev.textColor === next.textColor &&
    prev.fontSize === next.fontSize &&
    prev.stackItems === next.stackItems &&
    prev.onEditRequest === next.onEditRequest &&
    prev.isConnected === next.isConnected
  );
};

export const SmartBlock = React.memo(SmartBlockComponent, arePropsEqual);