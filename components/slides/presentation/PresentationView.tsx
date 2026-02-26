'use client';

import React, { useEffect, useMemo } from 'react';
import { SlideData, SlideBlockData, SLIDE_GAP } from '../core/types';
import { Connection } from '@/types/canvas';
import { X } from 'lucide-react';
import { PresentationSlide } from './PresentationSlide';

interface PresentationViewProps {
  slides: SlideData[];
  getBlocksForSlide: (slideId: string) => SlideBlockData[];
  getConnectionsForSlide: (slideId: string) => Connection[];
  onClose: () => void;
}

/**
 * Full-screen presentation overlay.
 * Renders a vertically-scrollable list of PresentationSlide components.
 */
export function PresentationView({
  slides,
  getBlocksForSlide,
  getConnectionsForSlide,
  onClose,
}: PresentationViewProps) {
  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.order - b.order),
    [slides]
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-[hsl(var(--background))] flex flex-col overflow-hidden">
      {/* Top bar — visible on hover */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/20 to-transparent z-[1010] flex items-center justify-end px-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors"
        >
          <X className="w-4 h-4" />
          <span className="text-sm font-medium">Exit Presentation</span>
        </button>
      </div>

      {/* Scrollable slide list */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-[hsl(var(--background))] dark:bg-black"
        style={{ scrollSnapType: 'y proximity' }}
      >
        <div className="flex flex-col w-full" style={{ gap: SLIDE_GAP }}>
          {sortedSlides.map(slide => {
            const slideBlocks = getBlocksForSlide(slide.slideId);
            const slideConnections = getConnectionsForSlide(slide.slideId);

            return (
              <div
                key={slide.slideId}
                className="w-full shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                <PresentationSlide
                  slideId={slide.slideId}
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
