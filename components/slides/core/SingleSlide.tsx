'use client';

import React, { useRef } from 'react';
import { SlideBlockData, SLIDE_WIDTH, SLIDE_MIN_HEIGHT, GUIDE_LINE_SPACING, DEFAULT_FONT_SIZE } from './types';
import { Connection } from '@/types/canvas';
import { SlideBlockLayer } from '../blocks/SlideBlockLayer';
import { InlineCursor } from '../blocks/InlineCursor';
import { SlideBlockMenu } from '../blocks/SlideBlockMenu';
import { NativeConnectionLayer } from '@/components/slides/rendering/NativeConnectionLayer';
import { ConnectionLayer } from '@/components/slides/rendering/ConnectionLayer';
import { SlideHeader } from './SlideHeader';
import { useSingleSlideHandlers } from './useSingleSlideHandlers';

export const TITLE_HEIGHT = 105; // px reserved for heading area when title is visible
export const COVER_HEIGHT = 192; // px reserved for cover image when present
export const SIDE_PADDING = 40; // matches the px-10 (40px) padding of the title container
export const VERTICAL_PADDING = 25; // min top/bottom padding when no cover/title is present

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
  coverImage?: string | null;
  hideCoverImage?: boolean;
  onTitleChange?: (title: string) => void;
  onToggleTitle?: (show: boolean) => void;
  onCoverChange?: (url: string | null) => void;
  zoom: number;

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
  coverImage,
  hideCoverImage,
  onTitleChange,
  onToggleTitle,
  onCoverChange,
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
  const headerRef = useRef<HTMLDivElement>(null);

  const h = useSingleSlideHandlers({
    slideId,
    blocks,
    connections,
    selectedBlockId,
    selectedConnectionId,
    isActive,
    showTitle,
    zoom,
    onSelectBlock,
    onUpdateBlock,
    onDeleteBlock,
    onAddBlock,
    onSlideClick,
    onConnectionsChange,
    onSelectConnection,
    containerRef,
    headerRef,
  });

  return (
    <div
      className={`relative group transition-all duration-200 rounded-lg ${
        isActive
          ? 'ring-1 ring-blue-500/40 '
          : ''
      }`}
      style={{ width: SLIDE_WIDTH }}
    >
      {/* Slide Number Badge */}
      {!readOnly && (
        <div className="absolute -left-10 top-2 flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs font-bold opacity-60 group-hover:opacity-100 transition-opacity">
          {slideOrder + 1}
        </div>
      )}

      {/* Slide Container */}
      <div
        ref={containerRef}
        onClick={h.handleSingleClick}
        onDoubleClick={h.handleDoubleClick}
        className="relative rounded-lg"
        style={{
          width: SLIDE_WIDTH,
          minHeight: SLIDE_MIN_HEIGHT,
          height: h.computedHeight,
          backgroundColor: backgroundColor || 'hsl(var(--card-bg))',
          overflow: 'hidden',
        }}
      >
        {/* Header (Cover + Title + Actions) */}
        <SlideHeader
          coverImage={coverImage}
          hideCoverImage={hideCoverImage}
          showTitle={showTitle}
          title={title}
          readOnly={readOnly}
          showCoverPicker={h.showCoverPicker}
          setShowCoverPicker={h.setShowCoverPicker}
          onTitleChange={onTitleChange}
          onToggleTitle={onToggleTitle}
          onCoverChange={onCoverChange}
          headerRef={headerRef}
        />

        {/* Guide lines — visible ONLY when dragging a block */}
        <div 
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            h.isDraggingBlock ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {Array.from({ length: h.guideLineCount }, (_, i) => {
            const y = (i + 1) * GUIDE_LINE_SPACING;
            return (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: y,
                  height: '1px',
                  background: 'hsl(var(--muted-foreground))',
                  opacity: 0.05,
                }}
              />
            );
          })}
        </div>

        {/* Native Connection Layer (SVG) */}
        <NativeConnectionLayer
          connections={connections}
          blocks={h.blockDims}
          dragController={h.dragControllerInstance}
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={h.handleSelectConnectionWrapper}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          zoom={zoom}
        />

        {/* Blocks */}
        <SlideBlockLayer
          blocks={h.cursorPos && h.editingBlockId ? blocks.filter(b => b.blockId !== h.editingBlockId) : blocks}
          connections={connections}
          selectedBlockId={selectedBlockId}
          readOnly={readOnly}
          onDragStop={h.handleDragStopWithController}
          onDragStart={h.handleDragStart}
          onUpdateBlock={onUpdateBlock}
          onDeleteBlock={onDeleteBlock}
          onSelectBlock={onSelectBlock}
          onDimensionsChange={h.handleDimensionsChange}
          onAnchorMouseDown={h.handleAnchorMouseDown}
          isConnectionDragging={!!h.activeDragStart}
          dragController={h.dragControllerInstance}
          zoom={zoom}
          onEditRequest={h.handleEditRequest}
          editingBlockId={h.editingBlockId}
        />

        {/* Connection Layer (draft connections during anchor drag) */}
        <ConnectionLayer
          connections={connections}
          setConnections={h.setConnections as any}
          blocks={h.blockDims}
          activeDragStart={h.activeDragStart}
          onDragComplete={h.handleConnectionDragComplete}
          getCanvasPoint={h.getCanvasPoint}
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
            setConnections={h.setConnections as any}
            blocks={h.blockDims}
            activeDragStart={null}
            onDragComplete={() => {}}
            getCanvasPoint={h.getCanvasPoint}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={(id: string) => onSelectConnection(id)}
            variant="controls"
            zoom={zoom}
          />
        )}

        {/* Block Creation FAB */}
        {!readOnly && (
          <SlideBlockMenu
            onAddBlock={h.handleAddBlockFromMenu}
            onAddImage={onAddImage ? (file) => onAddImage(slideId, file) : undefined}
          />
        )}

        {/* Inline Cursor (naked text input) */}
        {h.cursorPos && (
          <InlineCursor
            key={h.cursorKeyRef.current} 
            x={h.cursorPos.x}
            y={h.cursorPos.y}
            initialContent={h.editingBlockContent}
            color={h.editingBlockData?.color}
            textColor={h.editingBlockData?.textColor}
            fontSize={h.editingBlockData?.fontSize}
            initialMinWidth={h.editingBlockId && !h.isNewBlockEditing ? h.editingBlockData?.width : undefined}
            onCommit={h.handleCursorCommit}
            onDiscard={h.handleCursorDiscard}
            onChange={(html) => {
              const currentEditingId = h.editingBlockIdRef.current;
              if (!currentEditingId && h.cursorPos && h.isNewBlockEditing) {
                const newBlockId = onAddBlock(slideId, 'text', h.cursorPos.x, h.cursorPos.y);
                if (newBlockId) {
                  h.setEditingBlockId(newBlockId);
                  onUpdateBlock(newBlockId, { content: html });
                }
                return;
              }
              if (currentEditingId) {
                onUpdateBlock(currentEditingId, { content: html });
              }
            }}
            onDimensionsChange={(w, h_) => h.setEditingDims({ width: w, height: h_ })}
            zoom={zoom}
            onMoveCursor={h.handleMoveCursor}
          />
        )}

        {/* Empty state — click hint */}
        {!readOnly && blocks.length === 0 && !h.cursorPos && !h.editingBlockId && (
          <div className="absolute inset-0 flex items-center justify-center cursor-text empty-slide-placeholder">
            <p className="text-sm text-[hsl(var(--muted-foreground))]/30 font-medium pointer-events-none">
              Click anywhere to start typing, or use the + button
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
