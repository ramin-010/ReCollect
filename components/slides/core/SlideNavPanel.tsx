'use client';

import React, { useMemo, useCallback } from 'react';
import { SlideData, SlideBlockData } from './types';
import { ChevronLeft, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';

interface SlideNavPanelProps {
  slides: SlideData[];
  blocks: SlideBlockData[];
  activeSlideId: string | null;
  onSlideClick: (slideId: string) => void;
}
import {Logo} from '@/components/brand/Logo'

function SlideNavPanelComponent({ slides, blocks, activeSlideId, onSlideClick }: SlideNavPanelProps) {
  const sortedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  // Pre-compute block map: O(N) once instead of O(N×M) per render
  const blocksBySlide = useMemo(() => {
    const map = new Map<string, SlideBlockData[]>();
    for (const b of blocks) {
      const arr = map.get(b.slideId!) || [];
      arr.push(b);
      map.set(b.slideId!, arr);
    }
    return map;
  }, [blocks]);

  const handleClick = useCallback((slideId: string) => {
    onSlideClick(slideId);
    const el = document.getElementById(`slide-${slideId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [onSlideClick]);

  return (
    <div 
      className="sticky top-0 h-screen flex flex-col w-[140px] min-w-[140px] bg-[hsl(var(--sidebar-bg))] border-r border-border-subtle shrink-0 z-20"
      style={{ backgroundImage: 'linear-gradient(color-mix(in srgb, var(--surface-elevated) 40%, transparent), color-mix(in srgb, var(--surface-elevated) 40%, transparent))' }}
    >
      
      {/* Brand Header & Back Button */}
      <div className="px-3 h-12  flex items-center justify-between shrink-0">
        {/* Back Link */}
       
       
        <div className="flex items-center gap-1.5 opacity-80 cursor-default">
          <div className="w-4 h-4  flex items-center justify-center ">
            <Logo size='md' showText={false} />
          </div>
          <span className="text-[13px] ml-1.5 font-medium tracking-wide uppercase text-[hsl(var(--foreground))] font-sans antialiased">SLIDES</span>
        </div>
      </div>

      {/* Slide Thumbnails Scroll Area */}
      <div className="flex-1 overflow-y-auto flex flex-col p-2 pt-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="m-auto flex flex-col gap-2 w-full max-h-full">
          {sortedSlides.map((slide, index) => {
            const isActive = slide.slideId === activeSlideId;
            const slideBlocks = blocksBySlide.get(slide.slideId) || [];
            const hasContent = slideBlocks.length > 0 || !!slide.title;
            const isPhantom = index === sortedSlides.length - 1 && !hasContent;

            return (
              <button
                key={slide.slideId}
                onClick={() => handleClick(slide.slideId)}
              className={`
                group relative w-full shrink-0 rounded-lg border transition-all duration-200 text-left overflow-hidden 
                ${isActive
                  ? 'border-[hsl(var(--brand-primary))] ring-2 ring-[hsl(var(--brand-primary))]/20 bg-[hsl(var(--brand-primary))]/5'
                  : 'border-[hsl(var(--border))]/40 hover:border-[hsl(var(--muted-foreground))]/40 bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)]'
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
    </div>
  );
}

export const SlideNavPanel = React.memo(SlideNavPanelComponent);
