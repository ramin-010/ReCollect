'use client';

import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { EmbedBlock } from '../EmbedBlock';
import { CodeBlock } from '../CodeBlock';
import { BlockEditor } from '../BlockEditor';
import { cn } from '@/lib/utils';
import { TaskStats } from './types';

interface DragHandleProps {
  isVisible: boolean;
}

export const DragHandle: React.FC<DragHandleProps> = ({ isVisible }) => (
  <div className={cn(
    "smart-block-drag-handle",
    "absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-lg z-[100] cursor-grab active:cursor-grabbing transition-opacity",
    isVisible ? "opacity-100" : "opacity-0"
  )}>
    <GripVertical className="w-3 h-3" />
  </div>
);

interface ControlsOverlayProps {
  isVisible: boolean;
  onDelete?: () => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({ isVisible, onDelete }) => (
  <div className={cn(
    "absolute -top-2 -right-2 flex items-center gap-1 transition-opacity z-[100]",
    isVisible ? "opacity-100" : "opacity-0"
  )}>
    <button 
      onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
      className="p-1 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

interface AnchorPointsProps {
  isVisible: boolean;
  isDragging?: boolean;
  readOnly?: boolean;
  onAnchorMouseDown?: (side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onAnchorMouseUp?: (side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
}

export const AnchorPoints: React.FC<AnchorPointsProps> = ({ 
  isVisible, 
  isDragging,
  readOnly, 
  onAnchorMouseDown, 
  onAnchorMouseUp 
}) => {
  if (readOnly) return null;

  const anchorClassName = cn(
    "rounded-full border border-[hsl(var(--brand-primary))] bg-[hsl(var(--card))] z-[50] cursor-crosshair transition-all duration-200",
    // Standard size: w-3 h-3. Dragging size: w-4 h-4 with ring.
    isDragging ? "w-4 h-4 ring-2 ring-[hsl(var(--brand-primary))]/30 shadow-[0_0_10px_hsl(var(--brand-primary))/20]" : "w-3 h-3",
    isVisible ? "opacity-100" : "opacity-0 hover:opacity-100"
  );

  return (
    <>
      {/* Top Anchor */}
      <div 
        className={cn(anchorClassName, "absolute -top-1.5 left-1/2 -translate-x-1/2")}
        onMouseDown={(e) => { e.stopPropagation(); onAnchorMouseDown?.('top', e); }}
        onMouseUp={(e) => { e.stopPropagation(); onAnchorMouseUp?.('top', e); }}
      />
      {/* Right Anchor */}
      <div 
        className={cn(anchorClassName, "absolute top-1/2 -translate-y-1/2 -right-1.5")}
        onMouseDown={(e) => { e.stopPropagation(); onAnchorMouseDown?.('right', e); }}
        onMouseUp={(e) => { e.stopPropagation(); onAnchorMouseUp?.('right', e); }}
      />
      {/* Bottom Anchor */}
      <div 
        className={cn(anchorClassName, "absolute -bottom-1.5 left-1/2 -translate-x-1/2")}
        onMouseDown={(e) => { e.stopPropagation(); onAnchorMouseDown?.('bottom', e); }}
        onMouseUp={(e) => { e.stopPropagation(); onAnchorMouseUp?.('bottom', e); }}
      />
      {/* Left Anchor */}
      <div 
        className={cn(anchorClassName, "absolute top-1/2 -translate-y-1/2 -left-1.5")}
        onMouseDown={(e) => { e.stopPropagation(); onAnchorMouseDown?.('left', e); }}
        onMouseUp={(e) => { e.stopPropagation(); onAnchorMouseUp?.('left', e); }}
      />
    </>
  );
};

interface TaskProgressBarProps {
  taskStats: TaskStats | null;
}

export const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ taskStats }) => {
  if (!taskStats) return null;
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[hsl(var(--muted))]/30">
      <div 
        className="h-full bg-green-500/50 transition-all duration-500 ease-out"
        style={{ width: `${taskStats.progress}%` }}
      />
    </div>
  );
};

interface BlockContentProps {
  type: 'text' | 'image' | 'embed' | 'code' | 'stack';
  content: string;
  url?: string;
  isEditing: boolean;
  onUpdate: (content: string) => void;
  onBlur: () => void;
}

export const BlockContent: React.FC<BlockContentProps> = ({ 
  type, 
  content, 
  url, 
  isEditing, 
  onUpdate, 
  onBlur 
}) => {
  if (type === 'text') {
    if (isEditing) {
      return (
        <BlockEditor 
          content={content} 
          onChange={onUpdate}
          autoFocus={true}
          onBlur={onBlur}
        />
      );
    }
    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none leading-normal text-[hsl(var(--foreground))] select-none pointer-events-none [&>ul]:list-disc [&>ol]:list-decimal [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold"
        dangerouslySetInnerHTML={{ __html: content || '<span class="opacity-50 italic">Empty note...</span>' }}
      />
    );
  }

  if (type === 'image') {
    return (
      <img 
        src={url || content} 
        alt="Note attachment"
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable="false"
      />
    );
  }

  if (type === 'embed') {
    return (
      <div className="w-full h-full pointer-events-auto">
        <EmbedBlock url={content} />
      </div>
    );
  }

  if (type === 'code') {
    return (
      <div className="w-full h-full">
        <CodeBlock code={content} />
      </div>
    );
  }

  return null;
};

interface StackItemProps {
  item: any;
  index: number;
  stackId: string;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnter: (index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export const StackItem: React.FC<StackItemProps> = ({
  item,
  index,
  stackId,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop
}) => (
  <div 
    draggable
    onDragStart={(e) => onDragStart(e, index)}
    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); onDragEnter(index); }}
    onDragOver={onDragOver}
    onDrop={(e) => onDrop(e, index)}
    className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/50 rounded-lg p-3 shadow-sm relative group/item hover:border-[hsl(var(--brand-primary))]/30 transition-colors cursor-grab active:cursor-grabbing"
  >
    {/* Stack Index Number - Top Left Outside */}
    <div className="absolute top-0 right-1 text-[8px] font-mono font-medium text-[hsl(var(--muted-foreground))] opacity-50 select-none pointer-events-none">
      {index < 9 ? `0${index + 1}` : index + 1}
    </div>

    {item.type === 'text' && (
      <div className="prose prose-sm dark:prose-invert line-clamp-[8] text-sm" dangerouslySetInnerHTML={{ __html: item.content }} />
    )}
    {item.type === 'image' && (
      <div className="rounded-md overflow-hidden w-full mt-1">
        <img src={item.url || item.content} className="w-full h-auto object-contain" />
      </div>
    )}
    {item.type === 'embed' && (
      <div className="rounded-md overflow-hidden mt-2 pointer-events-none">
        <EmbedBlock url={item.content} />
      </div>
    )}
    {item.type === 'code' && (
      <div className="rounded-md overflow-hidden mt-2 pointer-events-none max-h-32">
        <CodeBlock code={item.content} />
      </div>
    )}
  </div>
);