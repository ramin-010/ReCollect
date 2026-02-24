'use client';

import React from 'react';
import { SlideData, SlideBlockData } from './types';

interface SlideNavPanelProps {
  slides: SlideData[];
  blocks: SlideBlockData[];
  activeSlideId: string | null;
  onSlideClick: (slideId: string) => void;
}

export function SlideNavPanel({ slides, blocks, activeSlideId, onSlideClick }: SlideNavPanelProps) {
  const sortedSlides = [...slides].sort((a, b) => a.order - b.order);

  const handleClick = (slideId: string) => {
    onSlideClick(slideId);
    // Scroll the slide into view in the main viewport
    const el = document.getElementById(`slide-${slideId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="sticky top-0 h-screen flex flex-col justify-center w-[140px] min-w-[140px] bg-[hsl(var(--card-bg))]/60 backdrop-blur-md border-r border-[hsl(var(--border))]/50 py-3 px-2 shrink-0 z-20">
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-[hsl(var(--muted))]/30 pr-1">
        {sortedSlides.map((slide, index) => {
          const isActive = slide.slideId === activeSlideId;
          const slideBlocks = blocks.filter(b => b.slideId === slide.slideId);
          const hasContent = slideBlocks.length > 0 || !!slide.title;
          const isPhantom = index === sortedSlides.length - 1 && !hasContent;

          return (
            <button
              key={slide.slideId}
              onClick={() => handleClick(slide.slideId)}
              className={`
                group relative w-full rounded-lg border transition-all duration-200 text-left overflow-hidden
                ${isActive
                  ? 'border-[hsl(var(--brand-primary))] ring-2 ring-[hsl(var(--brand-primary))]/20 bg-[hsl(var(--brand-primary))]/5'
                  : 'border-[hsl(var(--border))]/40 hover:border-[hsl(var(--muted-foreground))]/40 bg-[hsl(var(--card-bg))]/80 hover:bg-[hsl(var(--card-bg))]'
                }
              `}
            >
              {/* Mini slide preview card */}
              <div className="aspect-[16/10] w-full flex flex-col p-2">
                {/* Slide number badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`
                    text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded
                    ${isActive
                      ? 'text-[hsl(var(--brand-primary))] bg-[hsl(var(--brand-primary))]/10'
                      : 'text-[hsl(var(--muted-foreground))]/60 bg-[hsl(var(--muted))]/30'
                    }
                  `}>
                    {index + 1}
                  </span>
                </div>
                
                {/* Mini title preview */}
                <div className="flex-1 flex flex-col justify-start mt-0.5">
                  {slide.title ? (
                    <p className={`text-[9px] font-semibold leading-tight line-clamp-2 ${
                      isActive ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--foreground))]/70'
                    }`}>
                      {slide.title}
                    </p>
                  ) : (
                    <p className="text-[9px] italic text-[hsl(var(--muted-foreground))]/30 leading-tight">
                      {isPhantom ? 'New slide' : 'Untitled'}
                    </p>
                  )}
                  
                  {/* Content indicator lines */}
                  {slideBlocks.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {slideBlocks.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="h-[2px] rounded-full bg-[hsl(var(--muted-foreground))]/10"
                          style={{ width: `${70 - i * 15}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
