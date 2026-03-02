'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SmartBlockProps } from './smartBlockTypes';
import { DEFAULT_FONT_SIZE } from '@/components/slides/core/types';
import { calculateTaskStats } from './smartBlockUtils';
import {
  DragHandle,
  AnchorPoints,
  TaskProgressBar,
  BlockContent
} from './BlockComponents';

function SmartBlockComponent({
  id,
  type = 'text',
  content,
  language,
  url,
  width,
  height,
  x,
  y,
  isSelected = false,
  onUpdateBlock,
  onDeleteBlock,
  onFocus,
  onAnchorMouseDown,
  onAnchorMouseUp,
  onDimensionsChange,
  readOnly,
  isConnectionDragging,
  color,
  textColor,
  onEditRequest,
  fontSize,
  isConnected,
}: SmartBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
    const bgColor = color; 

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

  const currentFontSize = (type === 'text' && fontSize) ? fontSize : DEFAULT_FONT_SIZE;

  const isMinimalText = type === 'text' && !isEditing && !isConnected && !color;

  return (
    <motion.div
      ref={blockRef}
      id={`smart-block-${id}`}       initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative transition-all duration-200 group flex flex-col",
        isMinimalText
          ? "rounded-none border-transparent bg-transparent shadow-none"
          : "rounded-md border backdrop-blur-sm " + (isEditing ? "shadow-md" : "shadow-none"),
        isSelected && !isMinimalText
          ? "border-[hsl(var(--brand-primary))]/50 ring-1 ring-[#1a2735]/20"
          : isSelected && isMinimalText
            ? "ring-1 ring-[hsl(var(--brand-primary))]/40 rounded-md"
            : isConnected 
              ? "border-[hsl(var(--border-light))]/50 bg-[#303030]/50" 
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
      

      {/* Anchor Points */}
      <AnchorPoints 
        isVisible={isSelected || !!isConnectionDragging}
        isDragging={!!isConnectionDragging}
        readOnly={readOnly}
        onAnchorMouseDown={(side, e) => onAnchorMouseDown?.(id, side, e)}
        onAnchorMouseUp={(side, e) => onAnchorMouseUp?.(id, side, e)}
      />


      {/* Content Area */}
      <div 
        className="flex-1 overflow-hidden relative z-10 transition-colors duration-200 rounded-lg"
        style={{
          fontSize: type === 'text' ? `${currentFontSize}px` : undefined,
          color: textColor || undefined,
        }}
      >
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
    prev.onEditRequest === next.onEditRequest &&
    prev.isConnected === next.isConnected
  );
};

export const SmartBlock = React.memo(SmartBlockComponent, arePropsEqual);
