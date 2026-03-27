'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { SlideBlockData, SLIDE_WIDTH, SLIDE_MIN_HEIGHT } from '../core/types';
import { Connection } from '@/types/canvas';
import { COVER_HEIGHT, TITLE_HEIGHT, VERTICAL_PADDING } from '../core/SingleSlide';
import { PresentationBlockLayer } from './PresentationBlockLayer';
import { NativeConnectionLayer } from '../rendering/NativeConnectionLayer';

interface PresentationSlideProps {
  slideId: string;
  blocks: SlideBlockData[];
  connections: Connection[];
  backgroundColor?: string;
  title?: string;
  showTitle?: boolean;
  coverImage?: string | null;
  previewMode?: boolean;
  zoom?: number;
}

/**
 * A single slide rendered in Gamma-style presentation mode.
 *
 * Layout strategy:
 * 1. Full-bleed cover image (100% viewport width)
 * 2. Constrained content area (SLIDE_WIDTH) with title + blocks
 * 3. Block Y coordinates are offset by the editor's header height so they
 *    align correctly relative to the presentation title.
 *
 * Connection rendering uses a hybrid approach:
 * - A short delay before mounting NativeConnectionLayer lets blocks finish
 *   their initial async text/font reflow.
 * - NativeConnectionLayer's internal ResizeObserver then handles any
 *   subsequent size changes (window resize, lazy image load, etc.).
 */
export function PresentationSlide({
  blocks,
  connections,
  backgroundColor,
  title,
  showTitle,
  coverImage,
  previewMode,
  zoom,
}: PresentationSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectionsReady, setConnectionsReady] = useState(false);

  // Delay connection layer mount so blocks can finish initial reflow.
  // Once mounted, NativeConnectionLayer's ResizeObserver handles ongoing changes.
  useEffect(() => {
    const timer = setTimeout(() => setConnectionsReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // The editor header height that blocks' Y coords were relative to
  const editorHeaderHeight = useMemo(() => {
    let h = 0;
    if (coverImage) h += COVER_HEIGHT;
    if (showTitle !== false) h += TITLE_HEIGHT;
    return h || VERTICAL_PADDING;
  }, [coverImage, showTitle]);

  // Compute content area height from adjusted block positions
  const contentHeight = useMemo(() => {
    let maxBottom = SLIDE_MIN_HEIGHT - editorHeaderHeight;
    for (const block of blocks) {
      const bh = typeof block.height === 'number' ? block.height : 200;
      const adjustedY = block.y - editorHeaderHeight;
      const bottom = adjustedY + bh + 40;
      if (bottom > maxBottom) maxBottom = bottom;
    }
    return Math.max(maxBottom, 100);
  }, [blocks, editorHeaderHeight]);

  return (
    <div
      className="w-full relative flex flex-col items-center bg-[var(--slide-bg)]"
      style={{ backgroundColor: backgroundColor || undefined }}
    >
      {/* 1. Full-bleed cover image */}
      {coverImage && !previewMode && (
        <div className="w-full h-[30vh] min-h-[220px] max-h-[500px] relative overflow-hidden">
          <img
            src={coverImage}
            alt="Slide cover"
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}

      {/* 2. Constrained content */}
      <div
        className="relative w-full px-6 md:px-0 pb-16"
        style={{ maxWidth: SLIDE_WIDTH }}
      >
        {/* Title */}
        {showTitle !== false && (
          <div className={`w-full px-10 ${previewMode ? 'pb-0' : 'pb-8'} ${coverImage ? 'pt-5' : previewMode ? 'mt-5' : 'mt-15'}`}>
            <h1
              className="w-full text-[62px] font-bold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-inter), sans-serif' }}
            >
              {title || ''}
            </h1>
          </div>
        )}

        {/* 3. Blocks + connections area */}
        <div ref={containerRef} className="relative w-full mt-4" style={{ height: contentHeight }}>
          {connectionsReady && (
            <NativeConnectionLayer
              connections={connections.map(c => ({
                ...c,
                controlPoint1: c.controlPoint1 ? {
                  x: c.controlPoint1.x,
                  y: c.controlPoint1.y - editorHeaderHeight
                } : undefined,
                controlPoint2: c.controlPoint2 ? {
                  x: c.controlPoint2.x,
                  y: c.controlPoint2.y - editorHeaderHeight
                } : undefined,
              }))}
              blocks={blocks.map(b => ({
                id: b.blockId,
                x: b.x,
                y: b.y - editorHeaderHeight,
                width: b.width,
                height: typeof b.height === 'number' ? b.height : 200,
              }))}
              selectedConnectionId={null}
              onSelectConnection={() => {}}
              containerRef={containerRef as React.RefObject<HTMLDivElement>}
              zoom={zoom || 1}
              dragController={null as any}
            />
          )}
          <PresentationBlockLayer
            blocks={blocks}
            connections={connections}
            yOffset={editorHeaderHeight}
          />
        </div>
      </div>
    </div>
  );
}
