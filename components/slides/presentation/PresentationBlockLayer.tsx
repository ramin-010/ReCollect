'use client';

import React from 'react';
import { SlideBlockData, DEFAULT_FONT_SIZE } from '../core/types';
import { Connection } from '@/types/canvas';
import { BlockContent } from '../blocks/BlockComponents';

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

        return (
          <div
            key={block.blockId}
            id={block.blockId}
            className={`absolute flex flex-col group transition-all duration-200 ${
              hasConnections 
                ? 'rounded-md border border-[hsl(var(--border-light))] shadow-sm backdrop-blur-sm bg-[#303030]/50' 
                : 'rounded-none border-transparent bg-transparent shadow-none'
            }`}
             style={{
              left: block.x,
              top: block.y - yOffset,
              width: block.width,
              height: isText ? 'auto' : (block.height === 'auto' ? 'auto' : block.height),
              color: block.textColor || undefined,
            }}
          >
            {/* Background color chip (for blocks that have an explicitly chosen color tint) */}
            {block.color && (
              <div
                className={`absolute inset-0 rounded-md border pointer-events-none ${block.color}`}
              />
            )}

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
