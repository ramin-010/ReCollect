'use client';

import React, { useState } from 'react';
import { GripVertical, X, Palette } from 'lucide-react';
import { EmbedBlock } from '../EmbedBlock';
import { CodeBlock } from '../CodeBlock';
import { BlockEditor } from '../BlockEditor';
import { cn } from '@/lib/utils';
import { TaskStats } from './types';
import { CALLOUT_READ_STYLES } from '../CalloutExtension';

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
    "rounded-full border border-[hsl(var(--brand-primary))]/30 bg-[hsl(var(--card))] z-[999] cursor-crosshair transition-all duration-200",
    isDragging ? "w-4 h-4 ring-2 ring-[hsl(var(--brand-primary))]/10 shadow-[0_0_10px_hsl(var(--brand-primary))/20]" : "w-3 h-3",
    isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
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
  language?: string;
  isEditing: boolean;
  onUpdate: (content: string) => void;
  onBlur: () => void;
  onDelete?: () => void;
  onLanguageChange?: (language: string) => void;
}

export const BlockContent: React.FC<BlockContentProps> = ({ 
  type, 
  content, 
  url, 
  language,
  isEditing, 
  onUpdate, 
  onBlur,
  onDelete,
  onLanguageChange
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
      <>
      <div className="notion-editor h-full w-full" style={{ color: 'inherit', fontSize: 'inherit' }}>
        <div 
          className="ProseMirror preview-prosemirror select-none pointer-events-none h-full w-full"
          style={{ 
            maxWidth: '100%', 
            margin: 0, 
            paddingLeft: '4px', 
            paddingRight: '4px',
            paddingTop: '2px',
            paddingBottom: '2px',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: 'inherit',
            fontSize: 'inherit',
          }}
          dangerouslySetInnerHTML={{ __html: content || '' }}
        />
      </div>
      {/* Force color inheritance only on elements without inline styles (so TipTap color spans are preserved) */}
      <style>{`
        .notion-editor .preview-prosemirror *:not([style]) {
          color: inherit;
        }
        .notion-editor .preview-prosemirror > *:first-child {
          margin-top: 0;
        }
        .notion-editor .preview-prosemirror > *:last-child {
          margin-bottom: 0;
        }
      `}</style>
      {/* Callout styles for read-only rendering */}
      <style>{CALLOUT_READ_STYLES}</style>
      </>
    );
  }

  if (type === 'image') {
    const imgSrc = url || content;
    if (!imgSrc) {
      // Image not yet restored from IndexedDB or cloud — show placeholder
      return (
        <div className="w-full h-full flex items-center justify-center bg-[hsl(var(--muted))]/20 rounded-lg">
          <span className="text-xs text-[hsl(var(--muted-foreground))]/50">Loading image...</span>
        </div>
      );
    }
    return (
      <img 
        src={imgSrc} 
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
        <CodeBlock 
          code={content} 
          language={language}
          editable={true}
          onUpdate={onUpdate}
          onLanguageChange={onLanguageChange}
        />
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
    onDragStart={(e) => { e.stopPropagation(); onDragStart(e, index); }}
    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); onDragEnter(index); }}
    onDragOver={(e) => { e.stopPropagation(); onDragOver(e); }}
    onDrop={(e) => { e.stopPropagation(); onDrop(e, index); }}
    onDragEnd={(e) => { e.stopPropagation(); }}
    onMouseDown={(e) => { e.stopPropagation(); }}
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