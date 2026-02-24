'use client';

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { SlideBlockData, SLIDE_WIDTH, SLIDE_MIN_HEIGHT, GUIDE_LINE_SPACING, DEFAULT_FONT_SIZE } from './types';
import { Type, Plus } from 'lucide-react';
import { Connection, BlockDims } from '@/types/canvas';
import { SlideBlockLayer } from '../blocks/SlideBlockLayer';
import { InlineCursor } from '../blocks/InlineCursor';
import { SlideBlockMenu } from '../blocks/SlideBlockMenu';
import { NativeConnectionLayer } from '@/components/content/newCanvas/NativeConnectionLayer';
import { ConnectionLayer } from '@/components/content/newCanvas/ConnectionLayer';
import { DragController } from '@/components/content/newCanvas/DragController';
import { ActiveDragStart } from '@/components/content/newCanvas/smartCanvas/types';





const TITLE_HEIGHT = 105; // px reserved for heading area when title is visible
const SIDE_PADDING = 40; // matches the px-10 (40px) padding of the title container

function snapToGuide(y: number): number {

  const offset = -30;
  return Math.round((y - offset) / GUIDE_LINE_SPACING) * GUIDE_LINE_SPACING + offset;
}





interface SingleSlideProps {
  slideId: string;
  slideOrder: number;
  blocks: SlideBlockData[];
  connections: Connection[];
  selectedBlockId: string | null;
  selectedConnectionId: string | null;
  isActive: boolean;
  readOnly?: boolean;
  backgroundColor?: string;
  title?: string;
  showTitle?: boolean;
  onTitleChange?: (title: string) => void;
  onToggleTitle?: (show: boolean) => void;
  zoom: number; // Passed from parent for correct coordinate calculations

  onSelectBlock: (id: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<SlideBlockData>) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddBlock: (slideId: string, type: SlideBlockData['type'], x?: number, y?: number) => string;
  onSlideClick: (slideId: string) => void;
  onConnectionsChange: (connections: Connection[]) => void;
  onSelectConnection: (id: string | null) => void;
  onAddImage?: (slideId: string, file: File) => void;
}





export function SingleSlide({
  slideId,
  slideOrder,
  blocks,
  connections,
  selectedBlockId,
  selectedConnectionId,
  isActive,
  readOnly,
  backgroundColor,
  title,
  showTitle,
  onTitleChange,
  onToggleTitle,
  zoom,
  onSelectBlock,
  onUpdateBlock,
  onDeleteBlock,
  onAddBlock,
  onSlideClick,
  onConnectionsChange,
  onSelectConnection,
  onAddImage,
}: SingleSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragControllerInstance] = useState(() => new DragController());
  const [activeDragStart, setActiveDragStart] = useState<ActiveDragStart | null>(null);


  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isNewBlockEditing, setIsNewBlockEditing] = useState(false);
  const [editingDims, setEditingDims] = useState<{ width: number; height: number } | null>(null);
  

  const editingBlockData = useMemo(() => {
    if (!editingBlockId) return null;
    return blocks.find(b => b.blockId === editingBlockId);
  }, [editingBlockId, blocks]);

  const editingBlockContent = editingBlockData?.content;
  

  const setConnections = useCallback(
    (updater: Connection[] | ((prev: Connection[]) => Connection[])) => {
      if (typeof updater === 'function') {
        const next = updater(connections);
        onConnectionsChange(next);
      } else {
        onConnectionsChange(updater);
      }
    },
    [connections, onConnectionsChange]
  );


  const computedHeight = useMemo(() => {
    let maxBottom = SLIDE_MIN_HEIGHT;
    

    if (blocks.length > 0) {
      for (const block of blocks) {

        let blockHeight = typeof block.height === 'number' ? block.height : 200;
        
        if (block.blockId === editingBlockId && editingDims) {
           blockHeight = editingDims.height;
        }

        const bottom = block.y + blockHeight + 40;
        if (bottom > maxBottom) maxBottom = bottom;
      }
    }
    

    if (!editingBlockId && cursorPos && editingDims) {
      const bottom = cursorPos.y + editingDims.height + 40;
      if (bottom > maxBottom) maxBottom = bottom;
    }

    return maxBottom;
  }, [blocks, editingBlockId, editingDims, cursorPos]);


  const guideLineCount = useMemo(() => {
    return Math.floor(computedHeight / GUIDE_LINE_SPACING);
  }, [computedHeight]);


  const blockDims: BlockDims[] = useMemo(() => {
    return blocks.map(b => {
      let h: number;
      if (typeof b.height === 'number') {
        h = b.height;
      } else {
        // For 'auto' blocks (images, embeds), measure from DOM
        const el = document.getElementById(b.blockId);
        h = el ? el.getBoundingClientRect().height / (zoom || 1) : 200;
      }
      return {
        id: b.blockId,
        x: b.x,
        y: b.y,
        width: b.width,
        height: h,
      };
    });
  }, [blocks, zoom]);


  const getCanvasPoint = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const container = containerRef.current;
      if (!container) return { x: e.clientX, y: e.clientY };
      const rect = container.getBoundingClientRect();

      return {
        x: (e.clientX - rect.left + container.scrollLeft) / zoom,
        y: (e.clientY - rect.top + container.scrollTop) / zoom,
      };
    },
    [zoom]
  );


  const [isDraggingBlock, setIsDraggingBlock] = useState(false);


  const handleDragStop = useCallback(
    (id: string, x: number, y: number) => {
      setIsDraggingBlock(false);

      const block = blocks.find(b => b.blockId === id);
      const snappedY = block?.type === 'text' ? snapToGuide(y) : y;
      // Enforce title boundary: blocks cannot overlap the heading area
      const minY = (showTitle !== false) ? TITLE_HEIGHT : 0;
      const clampedY = Math.max(minY, snappedY);
      
      // Enforce side boundaries so blocks don't go off the edge
      const maxX = SLIDE_WIDTH - SIDE_PADDING - (block?.width || 100);
      const clampedX = Math.max(SIDE_PADDING, Math.min(x, Math.max(SIDE_PADDING, maxX)));
      
      onUpdateBlock(id, { x: clampedX, y: clampedY });
    },
    [onUpdateBlock, blocks, showTitle]
  );

  const handleDragStart = useCallback(
    (id: string) => {
      setIsDraggingBlock(true);
      onSelectBlock(id);
      dragControllerInstance.startDrag(id);
    },
    [onSelectBlock, dragControllerInstance]
  );

  const handleDragStopWithController = useCallback(
    (id: string, x: number, y: number) => {
      handleDragStop(id, x, y);
      dragControllerInstance.stopDrag();
    },
    [handleDragStop, dragControllerInstance]
  );

  const handleDimensionsChange = useCallback(
    (id: string, width: number, height: number) => {
      onUpdateBlock(id, { width, height });
    },
    [onUpdateBlock]
  );

  const handleAddBlockFromMenu = useCallback(
    (type: SlideBlockData['type'], _x?: number, _y?: number, content?: string) => {

       blocks.forEach(b => {
        if (b.type === 'text' && !b.content?.trim()) {
           onDeleteBlock(b.blockId);
        }
      });
      const blockId = onAddBlock(slideId, type);
      if (blockId && content) {
          onUpdateBlock(blockId, { content });
      }
    },
    [slideId, onAddBlock, blocks, onDeleteBlock, onUpdateBlock]
  );


  const handleSingleClick = useCallback(
    (e: React.MouseEvent) => {


      const isPlaceholder = (e.target as HTMLElement).closest('.empty-slide-placeholder');
      if (e.target !== containerRef.current && !isPlaceholder) return;


      blocks.forEach(b => {
        if (b.type === 'text' && !b.content?.trim()) {
           onDeleteBlock(b.blockId);
        }
      });

      onSlideClick(slideId);

      const hadSelection = !!selectedBlockId || !!selectedConnectionId;


      onSelectBlock('');
      onSelectConnection(null);


      const rect = containerRef.current!.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / zoom;
      const newX = Math.max(SIDE_PADDING, Math.min(rawX, SLIDE_WIDTH - SIDE_PADDING - 50));
      const rawY = (e.clientY - rect.top) / zoom;
      const minY = (showTitle !== false) ? TITLE_HEIGHT : 0;
      const newY = Math.max(minY, snapToGuide(rawY));


      if (cursorPos) {



        setEditingBlockId(null);


        setTimeout(() => {
          // Create the text block immediately so onChange syncs per keystroke
          const newBlockId = onAddBlock(slideId, 'text', newX, newY);
          if (newBlockId) {
            setEditingBlockId(newBlockId);
            setIsNewBlockEditing(true);
            onSelectBlock(newBlockId); // Select it so toolbar activates
          }
          setCursorPos({ x: newX, y: newY });
        }, 120); // Slightly after the blur's 100ms setTimeout
      } else if (!hadSelection) {
        // Create the text block immediately so onChange syncs per keystroke
        const newBlockId = onAddBlock(slideId, 'text', newX, newY);
        if (newBlockId) {
          setEditingBlockId(newBlockId);
          setIsNewBlockEditing(true);
          onSelectBlock(newBlockId); // Select it so toolbar activates
        }
        setCursorPos({ x: newX, y: newY });
      } else {

        setCursorPos(null);
        setEditingBlockId(null);
      }
    },
    [slideId, onSlideClick, blocks, onDeleteBlock, onSelectBlock, onSelectConnection, zoom, selectedBlockId, selectedConnectionId, cursorPos, showTitle]
  );


  const handleCursorCommit = useCallback(
    (html: string, dims?: { width: number; height: number }) => {

      if (editingBlockId) {
        // Block already exists (both new and existing blocks) — just update content
        onUpdateBlock(editingBlockId, { 
          content: html,
          width: dims ? dims.width + 10 : undefined, 
          height: dims ? dims.height : undefined,
        });
        setEditingBlockId(null);
        setCursorPos(null);
        setEditingDims(null);
        return;
      }

      // Fallback: block not created yet (shouldn't happen with new flow)
      if (!cursorPos) return;
      const blockId = onAddBlock(slideId, 'text', cursorPos.x, cursorPos.y);
      if (blockId) {
        onUpdateBlock(blockId, { 
          content: html,
          width: dims ? dims.width + 10 : 300, 
          height: dims ? dims.height : 'auto',
          fontSize: DEFAULT_FONT_SIZE,
        });
      }
      setCursorPos(null);
      setEditingDims(null);
    },
    [cursorPos, slideId, onAddBlock, onUpdateBlock, editingBlockId]
  );

  const handleCursorDiscard = useCallback(() => {





    
    if (editingBlockId) {




       onDeleteBlock(editingBlockId);
    }
    
    setCursorPos(null);
    setEditingBlockId(null);
    setEditingDims(null);
  }, [editingBlockId, onDeleteBlock]);


  const handleEditRequest = useCallback((blockId: string) => {
    const block = blocks.find(b => b.blockId === blockId);
    if (block && block.type === 'text') {
      setIsNewBlockEditing(false); // We double-clicked an existing block
      setEditingBlockId(blockId);
      // Wait for React layout before measuring
      setTimeout(() => {
        setCursorPos({ x: block.x, y: block.y });
      }, 0);
      onSelectBlock(blockId); // Select it so toolbar activates
    }
  }, [blocks, onSelectBlock]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && !editingBlockId) {

        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
           return;
        }
        e.preventDefault();
        onDeleteBlock(selectedBlockId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, editingBlockId, onDeleteBlock]);


  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {

      if (e.target === containerRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onSlideClick(slideId);
      if (e.target === containerRef.current) {
        onSelectBlock('');
        onSelectConnection(null);
      }



    },
    [slideId, onSlideClick, onSelectBlock, onSelectConnection]
  );


  const handleAnchorMouseDown = useCallback(
    (blockId: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => {
      const point = getCanvasPoint(e);
      setActiveDragStart({
        blockId,
        side,
        startX: point.x,
        startY: point.y,
      });
    },
    [getCanvasPoint]
  );

  const handleAnchorMouseUp = useCallback(
    (_blockId: string, _side: any, _e: any) => {

    },
    []
  );



  const handleConnectionDragComplete = useCallback(() => {
    setActiveDragStart(null);
  }, []);

  const handleSelectConnectionWrapper = useCallback(
    (id: string, _e?: React.MouseEvent) => {
      onSelectConnection(id);
    },
    [onSelectConnection]
  );

  return (
    <div
      className={`relative group transition-all duration-200 ${
        isActive
          ? 'ring-2 ring-[hsl(var(--brand-primary))]/40 shadow-lg'
          : 'ring-1 ring-[hsl(var(--border))] hover:ring-[hsl(var(--border))]/80'
      }`}
      style={{ width: SLIDE_WIDTH }}
    >
      {/* Slide Number Badge */}
      <div className="absolute -left-10 top-2 flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs font-bold opacity-60 group-hover:opacity-100 transition-opacity">
        {slideOrder + 1}
      </div>

      {/* Slide Container — overflow-visible so SVG connections are not clipped */}
      <div
        ref={containerRef}
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        className="relative rounded-lg"
        style={{
          width: SLIDE_WIDTH,
          minHeight: SLIDE_MIN_HEIGHT,
          height: computedHeight,
          backgroundColor: backgroundColor || 'hsl(var(--card-bg))',
          overflow: 'hidden',
        }}
      >
        {/* Slide Title Heading — only when showTitle is not false */}
        {showTitle !== false && (
          <div
            className="relative z-10 w-full px-10 pt-6 pb-2"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={title || ''}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Untitled card"
              className="w-full bg-transparent text-[62px] font-semibold text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/30 focus:outline-none border-none p-0 leading-tight"
              style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* Toggle title button — top-right corner */}
        {!readOnly && (
          <button
            className={`absolute top-2 right-2 z-20 p-1.5 rounded-md transition-all duration-200
              ${showTitle !== false
                ? 'text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30'
                : 'text-[hsl(var(--muted-foreground))]/20 hover:text-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/10'
              }
            `}
            onClick={(e) => {
              e.stopPropagation();
              onToggleTitle?.(showTitle === false);
            }}
            title={showTitle !== false ? 'Remove title' : 'Add title'}
          >
            {showTitle !== false ? (
              <Type className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-0.5">
                <Plus className="w-3 h-3" />
                <Type className="w-4 h-4" />
              </div>
            )}
          </button>
        )}

        {/* Guide lines — visible ONLY when dragging a block */}
        <div 
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            isDraggingBlock ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {Array.from({ length: guideLineCount }, (_, i) => {
            const y = (i + 1) * GUIDE_LINE_SPACING;
            return (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: y,
                  height: '1px',
                  background: 'hsl(var(--muted-foreground))',
                  opacity: 0.05, // Slightly increased opacity for better visibility when dragging
                }}
              />
            );
          })}
        </div>

        {/* Native Connection Layer (SVG — always rendered for DragController subscription) */}
        <NativeConnectionLayer
          connections={connections}
          blocks={blockDims}
          dragController={dragControllerInstance}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={handleSelectConnectionWrapper}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          zoom={zoom}
        />

        {/* Blocks */}
        <SlideBlockLayer
          blocks={blocks}
          connections={connections}
          selectedBlockId={selectedBlockId}
          readOnly={readOnly}
          onDragStop={handleDragStopWithController}
          onDragStart={handleDragStart}
          onUpdateBlock={onUpdateBlock}
          onDeleteBlock={onDeleteBlock}
          onSelectBlock={onSelectBlock}
          onDimensionsChange={handleDimensionsChange}
          onAnchorMouseDown={handleAnchorMouseDown}
          onAnchorMouseUp={handleAnchorMouseUp}
          isConnectionDragging={!!activeDragStart}
          dragController={dragControllerInstance}
          zoom={zoom}
          onEditRequest={handleEditRequest}
          editingBlockId={editingBlockId}
        />

        {/* Connection Layer (draft connections during anchor drag) */}
        <ConnectionLayer
          connections={connections}
          setConnections={setConnections as any}
          blocks={blockDims}
          activeDragStart={activeDragStart}
          onDragComplete={handleConnectionDragComplete}
          getCanvasPoint={getCanvasPoint}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={(id: string) => onSelectConnection(id)}
          variant="default"
          zoom={zoom}
          renderConnections={false}
        />

        {/* Connection Controls Layer (when a connection is selected) */}
        {selectedConnectionId && (
          <ConnectionLayer
            connections={connections}
            setConnections={setConnections as any}
            blocks={blockDims}
            activeDragStart={null}
            onDragComplete={() => {}}
            getCanvasPoint={getCanvasPoint}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={(id: string) => onSelectConnection(id)}
            variant="controls"
            zoom={zoom}
          />
        )}

        {/* Block Creation FAB */}
        {!readOnly && (
          <SlideBlockMenu
            onAddBlock={handleAddBlockFromMenu}
            onAddImage={onAddImage ? (file) => onAddImage(slideId, file) : undefined}
          />
        )}

        {/* Inline Cursor (naked text input) */}
        {cursorPos && (
          <InlineCursor
            key={editingBlockId || 'new-cursor'} 
            x={cursorPos.x}
            y={cursorPos.y}
            initialContent={editingBlockContent}
            color={editingBlockData?.color}
            textColor={editingBlockData?.textColor}
            fontSize={editingBlockData?.fontSize}

            initialMinWidth={editingBlockId && !isNewBlockEditing ? editingBlockData?.width : undefined}
            onCommit={handleCursorCommit}
            onDiscard={handleCursorDiscard}
            onChange={(html) => {
              // Live update block content per keystroke so autosave captures it
              if (editingBlockId) {
                onUpdateBlock(editingBlockId, { content: html });
              }
            }}
            onDimensionsChange={(w, h) => setEditingDims({ width: w, height: h })}
            zoom={zoom}
          />
        )}

        {/* Empty state — click hint */}
        {blocks.length === 0 && !cursorPos && !editingBlockId && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-text empty-slide-placeholder"
            onClick={handleSingleClick}
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))]/30 font-medium pointer-events-none">
              Click anywhere to start typing, or use the + button
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
