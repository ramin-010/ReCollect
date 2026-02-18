'use client';

import React, { useCallback, useRef, useMemo } from 'react';
import { SlideCanvasProps, SlideBlockData, SLIDE_WIDTH, SLIDE_GAP, MIN_ZOOM, MAX_ZOOM } from './types';
import { Connection } from '@/types/canvas';
import { useSlideState } from './useSlideState';
import { SingleSlide } from './SingleSlide';
import { Button } from '@/components/ui-base/Button';
import { EditorStyles } from '@/components/docs/doc_editor/EditorStyles';
import { usePasteHandler } from '@/components/content/newCanvas/smartCanvas/usePasteHandler';
import { BlockData } from '@/components/content/newCanvas/smartCanvas/types';

// ---------------------------------------------------------------------------
// SlideCanvas — Main Entry Point
// ---------------------------------------------------------------------------

export function SlideCanvas({ initialContent, onChange, readOnly }: SlideCanvasProps) {
  const {
    slides,
    blocks,
    activeSlideId,
    selectedBlockId,
    selectedConnectionId,
    setActiveSlideId,
    setSelectedBlockId,
    setSelectedConnectionId,
    addSlide,
    deleteSlide,
    addBlock,
    updateBlock,
    deleteBlock,
    getBlocksForSlide,
    getConnectionsForSlide,
    setConnectionsForSlide,
    setBlocks,
  } = useSlideState(initialContent, onChange);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);

  // ---- Paste support (reuse SmartCanvas paste handler) ----
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 300, y: 300 });
  const pasteTargetSlideIdRef = useRef<string | null>(null);
  const activeSlideIdRef = useRef(activeSlideId);
  activeSlideIdRef.current = activeSlideId;

  // Wrap setBlocks so pasted BlockData objects get the active/hovered slideId injected with correct coords
  const pasteSetBlocks = useCallback<React.Dispatch<React.SetStateAction<BlockData[]>>>(
    (action) => {
      setBlocks((prev: SlideBlockData[]) => {
        // Prefer hovered slide, fallback to active slide
        const targetSlideId = pasteTargetSlideIdRef.current || activeSlideIdRef.current;
        if (!targetSlideId) return prev;

        const isHovering = !!pasteTargetSlideIdRef.current;

        // Resolve the next value from the action
        const nextBlocks = typeof action === 'function'
          ? (action as (prev: BlockData[]) => BlockData[])(prev)
          : action;

        // Find newly added blocks
        const prevIds = new Set(prev.map(b => b.blockId));
        return nextBlocks.map(b => {
          if (!prevIds.has(b.blockId)) {
            // New block from paste
            let finalX = b.x;
            let finalY = b.y;

            // If we weren't hovering a specific slide, force safe coordinates
            // independent of where the mouse was globally (which could be huge Y value)
            if (!isHovering) {
               finalX = 300;
               finalY = 300;
            }

            return { ...b, slideId: targetSlideId, x: finalX, y: finalY } as SlideBlockData;
          }
          return b as SlideBlockData;
        });
      });
    },
    [setBlocks]
  );

  usePasteHandler(pasteSetBlocks, mousePositionRef);

  // Track mouse relative to hovered slide for paste-at-cursor
  const handleViewportMouseMove = useCallback((e: React.MouseEvent) => {
    // Find closest slide container
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const slideContainer = target?.closest('[data-slide-id]');
    
    if (slideContainer) {
      const slideId = slideContainer.getAttribute('data-slide-id');
      const rect = slideContainer.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      
      mousePositionRef.current = { x, y };
      pasteTargetSlideIdRef.current = slideId;
    } else {
      // Mouse outside slides: reset target
      pasteTargetSlideIdRef.current = null;
    }
  }, [zoom]);

  // ---- Zoom Handlers ----
  const handleZoom = useCallback((delta: number) => {
    setZoom(z => {
      const next = Math.round((z + delta) * 100) / 100;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
    }
  }, []);

  // ---- Block Operation Wrappers ----
  const handleSelectBlock = useCallback((id: string) => {
    setSelectedBlockId(id || null);
    // Deselect connection when selecting a block
    if (id) setSelectedConnectionId(null);
  }, [setSelectedBlockId, setSelectedConnectionId]);

  const handleUpdateBlock = useCallback((blockId: string, updates: Partial<SlideBlockData>) => {
    updateBlock(blockId, updates);
  }, [updateBlock]);

  const handleDeleteBlock = useCallback((blockId: string) => {
    deleteBlock(blockId);
  }, [deleteBlock]);

  const handleAddBlock = useCallback((slideId: string, type: SlideBlockData['type'], x?: number, y?: number) => {
    return addBlock(slideId, type, x, y);
  }, [addBlock]);

  const handleSlideClick = useCallback((slideId: string) => {
    setActiveSlideId(slideId);
  }, [setActiveSlideId]);

  const handleConnectionsChange = useCallback((slideId: string, connections: Connection[]) => {
    setConnectionsForSlide(slideId, connections);
  }, [setConnectionsForSlide]);

  const handleSelectConnection = useCallback((id: string | null) => {
    setSelectedConnectionId(id);
    if (id) setSelectedBlockId(null);
  }, [setSelectedConnectionId, setSelectedBlockId]);

  // ---- Keyboard Shortcuts ----
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected block
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        const el = document.activeElement;
        // More robust check for typing elements
        const isTyping = (el instanceof HTMLInputElement) || 
                         (el instanceof HTMLTextAreaElement) || 
                         (el as HTMLElement)?.isContentEditable;
        
        if (!isTyping) {
          e.preventDefault();
          deleteBlock(selectedBlockId);
        }
      }

      // Delete selected connection
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnectionId && !selectedBlockId) {
        const el = document.activeElement;
        const isTyping = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' ||
          (el as HTMLElement)?.contentEditable === 'true';
        if (!isTyping) {
          e.preventDefault();
          // Find which slide has this connection and remove it
          for (const slide of slides) {
            const conns = getConnectionsForSlide(slide.slideId);
            if (conns.find(c => c.id === selectedConnectionId)) {
              setConnectionsForSlide(
                slide.slideId,
                conns.filter(c => c.id !== selectedConnectionId)
              );
              break;
            }
          }
          setSelectedConnectionId(null);
        }
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
        setSelectedConnectionId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, selectedConnectionId, deleteBlock, setSelectedBlockId, setSelectedConnectionId, slides, getConnectionsForSlide, setConnectionsForSlide]);

  // ---- Sorted slides ----
  const sortedSlides = useMemo(() => {
    return [...slides].sort((a, b) => a.order - b.order);
  }, [slides]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-background select-none touch-none">
      <style jsx global>{`
       
      `}</style>
      <EditorStyles />
      <div 
        ref={viewportRef}
        className="flex flex-col items-center py-8 min-h-full transition-transform duration-75 ease-out origin-top overflow-auto bg-[hsl(var(--background))]/50"
        style={{ transform: `scale(${zoom})` }}
        id="slide-canvas-viewport"
        onWheel={handleWheel}
        onMouseMove={handleViewportMouseMove}
        onClick={(e) => {
          if (e.target === viewportRef.current) {
            setSelectedBlockId(null);
            setSelectedConnectionId(null);
            setActiveSlideId(null);
          }
        }}
      >
        {/* Slides */}
        {sortedSlides.map((slide, index) => {
          const slideBlocks = getBlocksForSlide(slide.slideId);
          const slideConnections = getConnectionsForSlide(slide.slideId);
          const isPhantom = index === sortedSlides.length - 1 && slideBlocks.length === 0;

          return (
            <div key={slide.slideId} className="relative" style={{ marginBottom: SLIDE_GAP }} data-slide-id={slide.slideId}>
              <SingleSlide
                slideId={slide.slideId}
                slideOrder={slide.order}
                blocks={slideBlocks}
                connections={slideConnections}
                selectedBlockId={activeSlideId === slide.slideId ? selectedBlockId : null}
                selectedConnectionId={activeSlideId === slide.slideId ? selectedConnectionId : null}
                isActive={activeSlideId === slide.slideId}
                readOnly={readOnly}
                backgroundColor={slide.backgroundColor}
                onSelectBlock={handleSelectBlock}
                onUpdateBlock={handleUpdateBlock}
                onDeleteBlock={handleDeleteBlock}
                onAddBlock={handleAddBlock}
                onSlideClick={handleSlideClick}
                onConnectionsChange={(conns) => handleConnectionsChange(slide.slideId, conns)}
                onSelectConnection={handleSelectConnection}
                zoom={zoom}
              />

              {/* Phantom slide indicator */}
              {isPhantom && (
                <div className="absolute inset-0 rounded-lg border-2 border-dashed border-[hsl(var(--border))]/30 pointer-events-none flex items-center justify-center">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]/20 font-medium">
                    New slide — start typing here
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-background/80 backdrop-blur border border-border rounded-lg p-1.5 shadow-lg">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleZoom(-0.05)}>
          <span className="text-xl pb-1">−</span>
        </Button>
        <span className="text-xs font-mono font-medium min-w-[3ch] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleZoom(0.05)}>
          <span className="text-xl pb-1">+</span>
        </Button>
      </div>
    </div>
  );
}
