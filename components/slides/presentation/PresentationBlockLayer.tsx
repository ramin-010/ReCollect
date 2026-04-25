'use client';

import React from 'react';
import { SlideBlockData, DEFAULT_FONT_SIZE } from '../core/types';
import { Connection } from '@/types/canvas';
import { BlockContent } from '../blocks/BlockComponents';
import { cn } from '@/lib/utils';

interface PresentationBlockLayerProps {
  blocks: SlideBlockData[];
  connections: Connection[];
  /** How much to subtract from each block's stored Y to account for the
   *  editor header (cover + title) that isn't rendered inside this container. */
  yOffset: number;
}

/**
 * Lightweight read-only block renderer for presentation mode.
 * Renders each block at its absolute position (adjusted by yOffset)
 * using BlockContent directly — no Rnd, no drag handles, no anchors.
 */
export function PresentationBlockLayer({ blocks, connections, yOffset }: PresentationBlockLayerProps) {
  return (
    <>
      {blocks.map(block => {
        const isText = block.type === 'text';
        const fontSize = (isText && block.fontSize) ? block.fontSize : DEFAULT_FONT_SIZE;
        
        const hasConnections = connections.some(
          c => c.fromBlock === block.blockId || c.toBlock === block.blockId
        );

        const isMinimalText = block.type === 'text' && !hasConnections && !block.color;

        return (
          <div
            key={block.blockId}
            id={block.blockId}
            className={cn(
              "absolute flex flex-col group transition-all duration-200",
              isMinimalText
                ? "rounded-none border-transparent bg-transparent shadow-none"
                : "rounded-md border backdrop-blur-sm shadow-none",
              hasConnections && !isMinimalText
                ? "border-[hsl(var(--border-light))]/50 bg-[var(--surface-raised)]/60" 
                : !isMinimalText ? "border-[var(--border-strong)]" : "",
              !isMinimalText && block.color
            )}
             style={{
              left: block.x,
              top: block.y - yOffset,
              width: block.width,
              height: isText ? 'auto' : (block.height === 'auto' ? 'auto' : block.height),
              color: block.textColor || undefined,
            }}
          >

            {/* Actual visual content - Mirrors SmartBlock's inner div exact styling */}
            <div 
              className="flex-1 overflow-hidden relative z-10 transition-colors duration-200 rounded-lg"
              style={{
                fontSize: isText ? `${fontSize}px` : undefined,
                color: block.textColor || undefined,
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
              }}
            >
              <BlockContent
                type={block.type}
                content={block.content || ''}
                url={block.url}
                language={block.language}
                isEditing={false}
                onUpdate={() => {}}
                onBlur={() => {}}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
