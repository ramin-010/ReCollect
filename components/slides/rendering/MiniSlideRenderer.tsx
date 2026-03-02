'use client';

import React, { useRef, useState, useEffect } from 'react';
import { SlideBlockData, SlideData, SLIDE_WIDTH } from '../core/types';
import { PresentationSlide } from '../presentation/PresentationSlide';
import { EditorStyles } from '@/components/docs/doc_editor/EditorStyles';
import { Connection } from '@/types/canvas';

interface MiniSlideRendererProps {
  slide: SlideData | null;
  blocks: SlideBlockData[];
  connections: Connection[];
}

export const MiniSlideRenderer = ({ slide, blocks, connections }: MiniSlideRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.65);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Automatically scale to exactly fit the container's width
        setScale(entry.contentRect.width / SLIDE_WIDTH);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const safeSlideId = slide?.slideId || 'preview-slide';

  return (
    <>
    <EditorStyles />
    <div ref={containerRef} className="w-full h-full bg-transparent relative overflow-hidden pointer-events-none select-none">
      <div 
        id="slide-canvas-viewport"
        className="absolute top-0 left-0 transform-gpu shadow-sm border border-black/10 dark:border-white/5 origin-top-left"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_WIDTH * 0.5625,
          transform: `scale(${scale})`,
          backgroundColor: slide?.backgroundColor || 'hsl(var(--card-bg))'
        }}
      >
        <PresentationSlide
          slideId={safeSlideId}
          blocks={blocks}
          connections={connections}
          title={slide?.title}
          showTitle={slide?.showTitle}
          coverImage={slide?.coverImage}
          previewMode={true}
          backgroundColor="transparent"
          zoom={scale}
        />
      </div>
    </div>
    </>
  );
};
