'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PresentationSlide } from '@/components/slides/presentation/PresentationSlide';
import { useSlideState } from '@/components/slides/core/useSlideState';
import { SLIDE_WIDTH } from '@/components/slides/core/types';
import { EditorStyles } from '@/components/docs/doc_editor/EditorStyles';

interface LandingSlideViewerProps {
  content: string;
}

// Safelist for Tailwind JIT (classes used dynamically in DB payloads)
const TAILWIND_SAFELIST = 'bg-blue-500/10 border-blue-500/20';

export function LandingSlideViewer({ content }: LandingSlideViewerProps) {
  const { slides, blocks, getConnectionsForSlide, getBlocksForSlide } = useSlideState(content);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [slideHeight, setSlideHeight] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    let observerId: number;
    let currentZoom = 1;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Measure parent width so we don't trigger infinite loops when we shrink our own container width
        const parentWidth = containerRef.current?.parentElement?.clientWidth || entry.contentRect.width;
        
        // 1. Zoom required to fit perfectly horizontally
        let calcZoom = parentWidth / SLIDE_WIDTH;
        
        if (slides.length > 0) {
            const el = document.getElementById(`presentation-wrapper-${slides[0].slideId}`);
            if (el) {
                // `offsetHeight` gets the raw unscaled height of the DOM node
                const unscaledHeight = el.offsetHeight || 800;
                
                // 2. Zoom required to fit perfectly within 90vh vertically
                const maxAllowedHeight = window.innerHeight * 0.90;
                const heightZoom = maxAllowedHeight / unscaledHeight;
                
                // Apply whichever constraint is tighter
                calcZoom = Math.min(calcZoom, heightZoom);
                
                setSlideHeight(unscaledHeight * calcZoom);
            } else {
                setSlideHeight(800 * calcZoom);
            }
        }
        
        setZoom(calcZoom);
      }
    });

    observer.observe(containerRef.current);
    
    // Poll the height occasionally in case blocks expand or images load
    const interval = setInterval(() => {
        if (slides.length > 0) {
            const el = document.getElementById(`presentation-wrapper-${slides[0].slideId}`);
            if (el) setSlideHeight(el.getBoundingClientRect().height);
        }
    }, 1000);

    return () => {
        observer.disconnect();
        clearInterval(interval);
    };
  }, [slides]);

  if (slides.length === 0) return null;

  const slide = slides[0]; // Render the first slide (which is the demo slide)
  const slideBlocks = getBlocksForSlide(slide.slideId);
  const slideConnections = getConnectionsForSlide(slide.slideId);

  // The exact scaled width the presentation mathematically occupies (so we can tightly hug it)
  const maxBlockX = Math.max(...slideBlocks.map((b) => b.x + (b.width || 0)), SLIDE_WIDTH);
  const scaledWidth = maxBlockX * zoom;

  return (
    <div 
        ref={containerRef} 
        className={`relative flex items-start overflow-hidden rounded-[24px] border border-border/10 shadow-2xl  transition-all duration-300 ${TAILWIND_SAFELIST} hidden-safelist-trigger mx-auto max-w-full`} 
        style={{ 
            height: slideHeight > 0 ? slideHeight : 500,
            width: scaledWidth > 0 ? scaledWidth : '100%',
            color: '#E0E0E0', /* Directly force native CSS inheritance for all child text nodes */
            /* Force dark mode variables perfectly for the Presentation viewer context */
            '--background': '0 0% 9%',
            '--foreground': '0 0% 82%',
            '--card': '0 0% 10%',
            '--card-bg': '0 0% 16%',
            '--muted': '0 0% 14%',
            '--muted-foreground': '0 0% 56%',
            '--border': '0 0% 15%',
            '--surface-light': '0 0% 12%',
        } as React.CSSProperties}
    >
       <style jsx global>{`
        #landing-slide-viewport,
        #landing-slide-viewport input,
        #landing-slide-viewport button,
        #landing-slide-viewport textarea,
        #landing-slide-viewport .ProseMirror {
          font-family: var(--font-inter), system-ui, sans-serif !important;
        }

        /* Enforce heading colors explicitly for the slide rendering */
        #landing-slide-viewport .ProseMirror h1,
        #landing-slide-viewport .ProseMirror h2,
        #landing-slide-viewport .ProseMirror h3 {
           color: #FFFFFF !important;
        }
        
        /* Enforce paragraph colors as fallback against the Light body theme */
        #landing-slide-viewport .ProseMirror p,
        #landing-slide-viewport .ProseMirror li {
           color: #E0E0E0;
        }
      `}</style>
      <EditorStyles />
      
      <div 
        id="landing-slide-viewport"
        className="origin-top-left absolute top-0 left-0 pointer-events-auto"
        style={{ transform: `scale(${zoom })`, width: SLIDE_WIDTH }}
      >
        <div id={`presentation-wrapper-${slide.slideId}`}>
            <PresentationSlide
              slideId={slide.slideId}
              blocks={slideBlocks}
              connections={slideConnections}
              backgroundColor={'#262626'}
              title={slide.title}
              showTitle={slide.showTitle}
              coverImage={slide.coverImage}
              zoom={zoom}
              previewMode={false}
            />
        </div>
      </div>
    </div>
  );
}
