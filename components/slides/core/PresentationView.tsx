'use client';

import React, { useEffect, useState, useRef } from 'react';
import { GammaPresentationSlide } from './GammaPresentationSlide';
import { SlideData, SlideBlockData, Connection, SLIDE_WIDTH, SLIDE_GAP } from './types';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface PresentationViewProps {
  slides: SlideData[];
  getBlocksForSlide: (slideId: string) => SlideBlockData[];
  getConnectionsForSlide: (slideId: string) => Connection[];
  onClose: () => void;
}

export function PresentationView({ slides, getBlocksForSlide, getConnectionsForSlide, onClose }: PresentationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // (Optional) We could still auto-scale the content *inside* the Gamma view if it's on a very small screen, 
  // but Gamma typically uses responsive CSS. For now let's just use CSS padding & centering.
  // We'll keep scale for potential future use or mobile, but default to 1 for the wrapper.

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sortedSlides = [...slides].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-[1000] bg-[hsl(var(--background))] flex flex-col overflow-hidden">
      {/* Top Bar - Hidden by default, shows on hover or always slightly visible */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/20 to-transparent z-[1010] flex items-center justify-end px-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
        >
          <X className="w-4 h-4" />
          <span className="text-sm font-medium">Exit Presentation</span>
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-[hsl(var(--background))] dark:bg-black"
        style={{ scrollSnapType: 'y proximity' }}
      >
        <div className="flex flex-col w-full" style={{ gap: SLIDE_GAP }}>
          {sortedSlides.map((slide, index) => {
            const slideBlocks = getBlocksForSlide(slide.slideId);
            const slideConnections = getConnectionsForSlide(slide.slideId);

            return (
              <div 
                key={slide.slideId}
                className="w-full shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                <GammaPresentationSlide
                  slideId={slide.slideId}
                  slideOrder={slide.order}
                  blocks={slideBlocks}
                  connections={slideConnections}
                  backgroundColor={slide.backgroundColor}
                  title={slide.title}
                  showTitle={slide.showTitle}
                  coverImage={slide.coverImage}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
