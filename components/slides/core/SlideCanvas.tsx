'use client';

import React, { useCallback, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SlideCanvasProps, SlideBlockData, SlideData, SLIDE_WIDTH, SLIDE_GAP, MIN_ZOOM, MAX_ZOOM } from './types';
import { Connection } from '@/types/canvas';
import { useSlideState } from './useSlideState';
import { SingleSlide, TITLE_HEIGHT, COVER_HEIGHT } from './SingleSlide';
import { SlideNavPanel } from './SlideNavPanel';
import { Button } from '@/components/ui-base/Button';
import { EditorStyles } from '@/components/docs/doc_editor/EditorStyles';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Public ref API exposed to parent
// ---------------------------------------------------------------------------
export interface SlideCanvasHandle {
  updateSelectedBlock: (updates: Partial<SlideBlockData>) => void;
}

// ---------------------------------------------------------------------------
// SlideCanvas — Main Entry Point
// ---------------------------------------------------------------------------

export const SlideCanvas = forwardRef<SlideCanvasHandle, SlideCanvasProps>(function SlideCanvas(
  { initialContent, onChange, readOnly, onSelectionChange },
  ref
) {
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
    shiftBlocksY,
    addImageBlock,
    updateSlide,
  } = useSlideState(initialContent, onChange);

  // Report selection changes to parent (for navbar controls)
  // Optimize: only fire when relevant fields change to prevent per-keystroke re-rendering of the entire SlidesView
  const lastReportedSelectionRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedBlockId) {
      const block = blocks.find(b => b.blockId === selectedBlockId);
      if (block) {
        const payload = {
          blockId: block.blockId,
          type: block.type,
          fontSize: block.fontSize,
          textColor: block.textColor,
          color: block.color,
        };
        const payloadString = JSON.stringify(payload);
        if (lastReportedSelectionRef.current !== payloadString) {
          lastReportedSelectionRef.current = payloadString;
          onSelectionChange?.(payload);
        }
      }
    } else {
      if (lastReportedSelectionRef.current !== null) {
        lastReportedSelectionRef.current = null;
        onSelectionChange?.(null);
      }
    }
  }, [selectedBlockId, blocks, onSelectionChange]);

  // Expose updateSelectedBlock to parent via ref
  useImperativeHandle(ref, () => ({
    updateSelectedBlock: (updates: Partial<SlideBlockData>) => {
      if (selectedBlockId) {
        updateBlock(selectedBlockId, updates);
      }
    },
  }), [selectedBlockId, updateBlock]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);

  // ---- Paste support — slide-specific (uses slideImageStorage via addImageBlock) ----
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 100, y: 100 });
  const activeSlideIdRef = useRef(activeSlideId);
  activeSlideIdRef.current = activeSlideId;

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept paste inside editable elements
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const slideId = activeSlideIdRef.current;
      if (!slideId) return;

      // Handle image paste
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) {
              // Routes through addImageBlock → slideImageStorage (correct DB!)
              await addImageBlock(slideId, file);
              console.log('[SlideCanvas] Pasted image via addImageBlock (slideImageStorage)');
            }
            return;
          }
        }

        // Handle text paste — add as text block  
        const textItem = Array.from(items).find(item => item.type === 'text/plain');
        if (textItem) {
          e.preventDefault();
          textItem.getAsString((text) => {
            if (text.trim()) {
              const blockId = addBlock(slideId, 'text', mousePositionRef.current.x, mousePositionRef.current.y);
              if (blockId) {
                updateBlock(blockId, { content: text });
              }
            }
          });
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImageBlock, addBlock, updateBlock]);

  // Track mouse for paste-at-cursor
  const handleViewportMouseMove = useCallback((e: React.MouseEvent) => {
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      mousePositionRef.current = {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
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

  const handleUpdateSlide = useCallback((slideId: string, updates: Partial<SlideData>) => {
    updateSlide(slideId, updates);
  }, [updateSlide]);

  const handleAddImage = useCallback(async (slideId: string, file: File) => {
    await addImageBlock(slideId, file);
  }, [addImageBlock]);

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
    <div className="w-full h-full relative overflow-hidden bg-background select-none touch-none flex flex-row">
      <style jsx global>{`
        #slide-canvas-viewport,
        #slide-canvas-viewport input,
        #slide-canvas-viewport button,
        #slide-canvas-viewport textarea,
        #slide-canvas-viewport .ProseMirror {
          font-family: var(--font-inter), system-ui, sans-serif !important;
        }
      `}</style>
      <EditorStyles />
      
      {/* Left Navigation Panel */}
      <SlideNavPanel
        slides={sortedSlides}
        blocks={blocks}
        activeSlideId={activeSlideId}
        onSlideClick={(slideId) => {
          setActiveSlideId(slideId);
        }}
      />
      
      <div className="flex-1 overflow-y-auto relative bg-[hsl(var(--background))]/50">
      <div 
        ref={viewportRef}
        className="flex flex-col items-center py-8 min-h-max transition-transform duration-75 ease-out origin-top"
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

          return (
            <div key={slide.slideId} id={`slide-${slide.slideId}`} className="relative" style={{ marginBottom: SLIDE_GAP }}>
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
                title={slide.title}
                showTitle={slide.showTitle}
                coverImage={slide.coverImage}
                onTitleChange={(title) => handleUpdateSlide(slide.slideId, { title })}
                onToggleTitle={(show) => {
                  const isCurrentlyShown = slide.showTitle !== false;
                  const hasCover = !!slide.coverImage;
                  // When cover is present, title has no mt-6 (24px), so shift is smaller
                  const titleShift = hasCover ? TITLE_HEIGHT - 24 : TITLE_HEIGHT;
                  if (show && !isCurrentlyShown) {
                    shiftBlocksY(slide.slideId, titleShift);
                  } else if (!show && isCurrentlyShown) {
                    shiftBlocksY(slide.slideId, -titleShift);
                  }
                  handleUpdateSlide(slide.slideId, { showTitle: show });
                }}
                onCoverChange={(url) => {
                  const hasTitle = slide.showTitle !== false;
                  // When title is visible, adding cover removes title's mt-6 (24px)
                  // so the net shift is COVER_HEIGHT - 24, not the full COVER_HEIGHT
                  const coverShift = hasTitle ? COVER_HEIGHT - 24 : COVER_HEIGHT;
                  if (!slide.coverImage && url) {
                    shiftBlocksY(slide.slideId, coverShift);
                  } else if (slide.coverImage && !url) {
                    shiftBlocksY(slide.slideId, -coverShift);
                  }
                  handleUpdateSlide(slide.slideId, { coverImage: url });
                }}
                onSelectBlock={handleSelectBlock}
                onUpdateBlock={handleUpdateBlock}
                onDeleteBlock={handleDeleteBlock}
                onAddBlock={handleAddBlock}
                onSlideClick={handleSlideClick}
                onConnectionsChange={(conns) => handleConnectionsChange(slide.slideId, conns)}
                onSelectConnection={handleSelectConnection}
                onAddImage={handleAddImage}
                zoom={zoom}
              />

            </div>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="fixed bottom-6 left-[164px] z-50 flex items-center gap-2 bg-background/80 backdrop-blur border border-border rounded-lg p-1.5 shadow-lg">
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
    </div>
  );
});
