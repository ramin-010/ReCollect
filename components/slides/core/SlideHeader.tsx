'use client';

import React from 'react';
import { Type, Plus, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { CoverPicker } from '@/components/docs/doc_editor/CoverPicker';

interface SlideHeaderProps {
  coverImage?: string | null;
  showTitle?: boolean;
  title?: string;
  readOnly?: boolean;
  showCoverPicker: boolean;
  setShowCoverPicker: (show: boolean) => void;
  onTitleChange?: (title: string) => void;
  onToggleTitle?: (show: boolean) => void;
  onCoverChange?: (url: string | null) => void;
  headerRef: React.RefObject<HTMLDivElement | null>;
}

export function SlideHeader({
  coverImage,
  showTitle,
  title,
  readOnly,
  showCoverPicker,
  setShowCoverPicker,
  onTitleChange,
  onToggleTitle,
  onCoverChange,
  headerRef,
}: SlideHeaderProps) {
  return (
    <>
      {/* Slide Header Area (Cover + Title) for dynamic height measurement */}
      <div ref={headerRef} className="w-full flex flex-col shrink-0 z-10 relative">
        {/* Slide Cover Image */}
        {coverImage ? (
          <div className="w-full h-48  relative group">
            <img 
              src={coverImage} 
              alt="Slide cover" 
              className="w-full h-full object-cover object-[0_50%]"
            />
            
            {!readOnly && (
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowCoverPicker(true); }}
                  className="bg-black/50 hover:bg-black/70 text-white text-xs backdrop-blur-sm"
                >
                  Change cover
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCoverChange?.(null); }}
                  className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {/* Slide Title Heading */}
        {showTitle !== false && (
          <div
            className={`relative z-10 w-full px-10 pb-5 ${coverImage ? 'my-0' : 'mt-6'}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={title || ''}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Untitled card"
              className={`w-full bg-transparent text-[62px] font-bold tracking-tight text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/30 focus:outline-none border-none p-0 leading-tight ${readOnly ? 'pointer-events-none' : ''}`}
              style={{ fontFamily: 'var(--font-inter), sans-serif' }}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* Cover Picker Modal */}
      <CoverPicker
        show={showCoverPicker}
        onClose={() => setShowCoverPicker(false)}
        currentCover={coverImage || null}
        onSelect={(url) => {
          onCoverChange?.(url);
          setShowCoverPicker(false);
        }}
      />

      {/* Slide Actions (Top Right OR Below Cover) */}
      {!readOnly && (
        <div 
          className={`absolute right-3 z-20 flex items-center gap-1 transition-all duration-200
            ${coverImage ? 'top-[204px] opacity-100' : 'top-3 opacity-0 group-hover:opacity-100'}
          `}
        >
          {/* Add Cover Button (only if no cover) */}
          {!coverImage && (
            <button
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all duration-200 text-sm font-medium
                text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30
              `}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowCoverPicker(true); }}
            >
              <ImagePlus className="w-4 h-4" />
              Add cover
            </button>
          )}

          {/* Toggle title button */}
          <button
            className={`p-1.5 rounded-md transition-all duration-200 flex items-center justify-center
              ${showTitle !== false
                ? 'text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/30'
                : 'text-[hsl(var(--muted-foreground))]/20 hover:text-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/10'
              }
            `}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleTitle?.(showTitle === false);
            }}
            title={showTitle !== false ? 'Remove title' : 'Add title'}
          >
            {showTitle !== false ? (
              <Type className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-0.5">
                <Plus className="w-3 h-3" />
                <Type className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      )}
    </>
  );
}
