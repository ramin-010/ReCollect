'use client';

import React, { useState } from 'react';
import { GripVertical, X, Palette } from 'lucide-react';
import { EmbedBlock } from '@/components/content/newCanvas/EmbedBlock';
import { CodeBlock } from '@/components/content/newCanvas/CodeBlock';
import { BlockEditor } from '@/components/content/newCanvas/BlockEditor';
import { cn } from '@/lib/utils';
import { TaskStats } from './smartBlockTypes';

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
    );
  }

  if (type === 'image') {
    const imgSrc = url || content;
    if (!imgSrc) {
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


