'use client';

import React, { useState } from 'react';
import { GripVertical, X, Palette } from 'lucide-react';
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
    "absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-lg z-[100] cursor-grab active:cursor-grabbing transition-opacity",
    isVisible ? "opacity-100" : "opacity-0"
  )}>
    <GripVertical className="w-3 h-3" />
  </div>
);

interface ControlsOverlayProps {
  isVisible: boolean;
  onDelete?: () => void;
  onUpdateColor?: (color: string) => void;
  currentColor?: string;
}

// Revert ControlsOverlay to just Delete
export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({ isVisible, onDelete }) => (
  <div className={cn(
    "absolute -top-2 -right-2 flex items-center gap-1 transition-opacity z-[100]",
    isVisible ? "opacity-100" : "opacity-0"
  )}>
    <button 
      onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
      className="p-1 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
      title="Delete Note"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

interface ColorControlProps {
    isVisible: boolean;
    onUpdateColor?: (color: string) => void;
    currentColor?: string;
}

export const ColorControl: React.FC<ColorControlProps> = ({ isVisible, onUpdateColor, currentColor }) => {
    const [showPalette, setShowPalette] = useState(false);
  
    const COLORS = [
      { name: 'Default', value: 'bg-[hsl(var(--card-bg))]' }, // Default
      { name: 'Blue', value: 'bg-blue-500/10 border-blue-500/20' },
      { name: 'Green', value: 'bg-green-500/10 border-green-500/20' },
      { name: 'Amber', value: 'bg-amber-500/10 border-amber-500/20' },
      { name: 'Red', value: 'bg-red-500/10 border-red-500/20' },
      { name: 'Violet', value: 'bg-violet-500/10 border-violet-500/20' },
    ];
  
    return (
      <div className={cn(
        "absolute top-1 left-1 flex flex-col items-end gap-1 transition-opacity z-[100] pointer-events-auto",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center gap-1">
            {/* Color Palette Toggle - Inside Top Right */}
            <button 
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); }}
              className={cn(
                  "p-1 rounded-full text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors border border-transparent backdrop-blur-sm bg-background/30",
                  showPalette && "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
              )}
              title="Change Background Color"
            >
              <Palette className="w-3 h-3" />
            </button>
        </div>
  
        {/* Expanded Color Swatches - Slide Left */}
        {showPalette && (
            <div className="absolute top-0 right-8 flex items-center gap-1 p-1 bg-background/90 backdrop-blur-md rounded-full border border-border/50 shadow-sm animate-in fade-in slide-in-from-right-1 w-max">
                {COLORS.map((c) => (
                   <button
                     key={c.name}
                     className={cn(
                        "w-3 h-3 rounded-full border border-transparent transition-all hover:scale-110",
                        "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]",
                        c.name === 'Default' ? 'bg-[hsl(var(--muted-foreground))]/20' : '',
                        c.name === 'Blue' ? 'bg-blue-400' : '',
                        c.name === 'Green' ? 'bg-green-400' : '',
                        c.name === 'Amber' ? 'bg-amber-400' : '',
                        c.name === 'Red' ? 'bg-red-400' : '',
                        c.name === 'Violet' ? 'bg-violet-400' : '',
                        currentColor === c.value && "ring-2 ring-[hsl(var(--foreground))] ring-offset-1"
                     )}
                     onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                     onClick={(e) => { 
                         e.stopPropagation(); 
                         onUpdateColor?.(c.value); 
                     }}
                     title={c.name}
                   />
                ))}
            </div>
        )}
      </div>
    );
};

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
  onDelete?: () => void;
}

export const BlockContent: React.FC<BlockContentProps> = ({ 
  type, 
  content, 
  url, 
  isEditing, 
  onUpdate, 
  onBlur,
  onDelete
}) => {
  if (type === 'text') {
    if (isEditing) {
      return (
        <BlockEditor 
          content={content} 
          onChange={onUpdate}
          autoFocus={true}
          onBlur={onBlur}
          onDelete={onDelete}
        />
      );
    }
    return (
      <div 
        className={`
          prose prose-sm  border-none dark:prose-invert max-w-none leading-normal 
          text-[hsl(var(--foreground))] select-none pointer-events-none
          
          /* Headings */
          [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-2 [&>h1]:mt-0
          [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:mt-0
          [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-1.5 [&>h3]:mt-0
          
          /* Lists */
          [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-1
          [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-1
          [&_li]:my-0.5
          
          /* Blockquote - Left border line */
          [&>blockquote]:border-l-4 [&>blockquote]:border-l-[hsl(var(--brand-primary))]
          [&>blockquote]:border-t-0 [&>blockquote]:border-r-0 [&>blockquote]:border-b-0
          [&>blockquote]:shadow-none [&>blockquote]:outline-none
          [&>blockquote]:pl-4 [&>blockquote]:py-1 [&>blockquote]:my-2
          [&>blockquote]:bg-transparent
          [&>blockquote]:italic [&>blockquote]:text-[hsl(var(--muted-foreground))]
          
          /* Inline Code */
          [&_code:not(pre_code)]:bg-[hsl(var(--muted))] [&_code:not(pre_code)]:px-1.5 
          [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:rounded 
          [&_code:not(pre_code)]:text-[0.85em] [&_code:not(pre_code)]:font-mono
          [&_code:not(pre_code)]:text-[hsl(var(--brand-primary))]
          
          /* Code Block */
          [&>pre]:bg-[hsl(var(--muted))]/50 [&>pre]:p-3 [&>pre]:rounded-lg
          [&>pre]:overflow-x-auto [&>pre]:my-2 [&>pre]:text-sm [&>pre]:font-mono
          [&>pre_code]:bg-transparent [&>pre_code]:p-0
          
          /* Task List */
          [&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:pl-0
          [&_li[data-type="taskItem"]]:flex [&_li[data-type="taskItem"]]:items-start [&_li[data-type="taskItem"]]:gap-2
          [&_li[data-type="taskItem"]_input]:mt-1 [&_li[data-type="taskItem"]_input]:accent-[hsl(var(--brand-primary))]
          [&_li[data-checked="true"]]:line-through [&_li[data-checked="true"]]:opacity-60
          
          /* Highlight */
          [&_mark]:bg-yellow-200/80 [&_mark]:dark:bg-yellow-500/40 [&_mark]:px-0.5 [&_mark]:rounded-sm
          
          /* Links */
          [&_a]:text-blue-500 [&_a]:underline [&_a]:cursor-pointer
          
          /* Horizontal Rule */
          [&>hr]:border-[hsl(var(--border))] [&>hr]:my-3
          
          /* Strong/Bold and Emphasis/Italic */
          [&_strong]:font-bold
          [&_em]:italic
          [&_u]:underline
          
          /* Paragraph spacing */
          [&>p]:my-1
        `}
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
  totalItems: number;
}

// Color palette for stack items - subtle accent borders only
const getItemAccentColor = (index: number): string => {
  const colors = [
    'border-l-blue-500/50',
    'border-l-purple-500/50',
    'border-l-emerald-500/50',
    'border-l-amber-500/50',
    'border-l-rose-500/50',
    'border-l-cyan-500/50',
  ];
  return colors[index % colors.length];
};

export const StackItem: React.FC<StackItemProps> = ({
  item,
  index,
  stackId,
  totalItems,
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
    className={`
      relative group/item
      bg-[hsl(var(--card))]
      border border-[hsl(var(--border))]/40 
      border-l-[3px] ${getItemAccentColor(index)}
      rounded-lg p-3 
      shadow-sm hover:shadow-md
      hover:border-[hsl(var(--foreground))]/20 
      transition-all duration-200
      cursor-grab active:cursor-grabbing
    `}
  >
    {/* Stack Index Badge - Top Right */}
    <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))]/50 shadow-sm">
      <span className="text-[8px] font-mono font-bold text-[hsl(var(--muted-foreground))]">
        {index + 1}/{totalItems}
      </span>
    </div>

    {/* Drag indicator - Left side */}
    <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-40 transition-opacity">
      <div className="flex flex-row gap-0.5">
        <div className="flex flex-col gap-0.5">
          <div className="w-1 h-1 rounded-full bg-[hsl(var(--foreground))]" />
          <div className="w-1 h-1 rounded-full bg-[hsl(var(--foreground))]" />
          <div className="w-1 h-1 rounded-full bg-[hsl(var(--foreground))]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="w-1 h-1 rounded-full bg-[hsl(var(--foreground))]" />
          <div className="w-1 h-1 rounded-full bg-[hsl(var(--foreground))]" />
          <div className="w-1 h-1 rounded-full bg-[hsl(var(--foreground))]" />
        </div>
      </div>
    </div>

    {/* Content with padding for drag indicator */}
    <div className="ml-2">
      {item.type === 'text' && (
        <div 
          className={`
            prose prose-sm dark:prose-invert line-clamp-[6] text-sm leading-relaxed
            [&>blockquote]:border-l-4 [&>blockquote]:border-[hsl(var(--brand-primary))]
            [&>blockquote]:pl-3 [&>blockquote]:py-0.5 [&>blockquote]:italic
            [&_code:not(pre_code)]:bg-[hsl(var(--muted))] [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:text-xs
            [&>pre]:bg-[hsl(var(--muted))]/50 [&>pre]:p-2 [&>pre]:rounded [&>pre]:text-xs [&>pre]:font-mono
            [&_mark]:bg-yellow-200/80 [&_mark]:dark:bg-yellow-500/40
            [&_a]:text-blue-500 [&_a]:underline
            [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4
          `}
          dangerouslySetInnerHTML={{ __html: item.content }} 
        />
      )}
      {item.type === 'image' && (
        <div className="rounded-md overflow-hidden w-full">
          <img src={item.url || item.content} className="w-full h-auto object-contain max-h-32" alt="" />
        </div>
      )}
      {item.type === 'embed' && (
        <div className="rounded-md overflow-hidden pointer-events-none">
          <EmbedBlock url={item.content} />
        </div>
      )}
      {item.type === 'code' && (
        <div className="rounded-md overflow-hidden pointer-events-none max-h-28">
          <CodeBlock code={item.content} />
        </div>
      )}
    </div>
  </div>
);