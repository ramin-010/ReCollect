'use client';

import React from 'react';
import { SlideBlockData, SLIDE_WIDTH } from './types';
import { Connection } from '@/types/canvas';
import { SingleSlide, COVER_HEIGHT } from './SingleSlide';

interface GammaPresentationSlideProps {
  slideId: string;
  slideOrder: number;
  blocks: SlideBlockData[];
  connections: Connection[];
  backgroundColor?: string;
  title?: string;
  showTitle?: boolean;
  coverImage?: string | null;
}

/**
 * GammaPresentationSlide — Gamma-style presentation wrapper.
 *
 * Strategy: Render the cover image OUTSIDE (full-bleed, 100% viewport width),
 * then render SingleSlide in read-only mode WITHOUT its cover image.
 * This gives us pixel-perfect block/connection rendering from SingleSlide
 * while achieving the full-width cover Gamma aesthetic.
 */
export function GammaPresentationSlide({
  slideId,
  slideOrder,
  blocks,
  connections,
  backgroundColor,
  title,
  showTitle,
  coverImage,
}: GammaPresentationSlideProps) {
  const shiftedBlocks = React.useMemo(() => {
    if (!coverImage) return blocks;
    // The cover inside SingleSlide is visually hidden (`display: none`), removing its 192px 
    // footprint from the document layout. Since blocks are absolutely positioned based on 
    // editor coordinates (where the cover *did* take up space), we must shift them UP by 192px 
    // to maintain the correct visual distance from the title.
    return blocks.map(b => ({ ...b, y: b.y - COVER_HEIGHT }));
  }, [blocks, coverImage]);

  return (
    <div 
      className="w-full relative flex flex-col items-center"
      style={{ backgroundColor: backgroundColor || 'hsl(var(--background))' }}
    >
      {/* 1. Full-Bleed Cover Image (rendered OUTSIDE SingleSlide) */}
      {coverImage && (
        <div className="w-full h-[30vh] min-h-[220px] max-h-[500px] relative overflow-hidden">
          <img 
            src={coverImage} 
            alt="Slide cover" 
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}

      {/* 2. SingleSlide — read-only, no cover (cover is rendered above full-bleed) */}
      <div className="w-full flex justify-center">
        <SingleSlide
          slideId={slideId}
          slideOrder={slideOrder}
          blocks={shiftedBlocks}
          connections={connections}
          selectedBlockId={null}
          selectedConnectionId={null}
          isActive={false}
          readOnly={true}
          backgroundColor={backgroundColor}
          title={title}
          showTitle={showTitle}
          coverImage={coverImage}
          hideCoverImage={true}
          zoom={1}
          onSelectBlock={() => {}}
          onUpdateBlock={() => {}}
          onDeleteBlock={() => {}}
          onAddBlock={() => ''}
          onSlideClick={() => {}}
          onConnectionsChange={() => {}}
          onSelectConnection={() => {}}
        />
      </div>
    </div>
  );
}
