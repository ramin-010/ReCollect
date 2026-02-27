'use client';

import React, { useMemo } from 'react';
import { SlideBlockData } from '../core/types';
import { Connection, BlockDims } from '@/types/canvas';
import { calculateConnectionPath } from '../rendering/connectionGeometry';

interface PresentationConnectionLayerProps {
  connections: Connection[];
  blocks: SlideBlockData[];
  /** Same yOffset used by PresentationBlockLayer so lines match block positions. */
  yOffset: number;
}

/**
 * Static SVG connection lines for presentation mode.
 * No drag interaction, no DragController — just draws the paths.
 */
export function PresentationConnectionLayer({
  connections,
  blocks,
  yOffset,
}: PresentationConnectionLayerProps) {
  // Build adjusted BlockDims with the Y offset applied
  const adjustedBlockDims: BlockDims[] = useMemo(() => {
    return blocks.map(b => ({
      id: b.blockId,
      x: b.x,
      y: b.y - yOffset,
      width: b.width,
      height: typeof b.height === 'number' ? b.height : 200,
    }));
  }, [blocks, yOffset]);

  const visibleConnections = useMemo(
    () => connections.filter(c => !c.hidden),
    [connections]
  );

  if (visibleConnections.length === 0) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full z-0">
      <defs>
        <marker
          id="pres-arrowhead"
          markerWidth="16"
          markerHeight="16"
          refX="16"
          refY="7"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0 0, 19 7, 0 14" fill="context-stroke" />
        </marker>
      </defs>

      {visibleConnections.map(conn => {
        const path = calculateConnectionPath(conn, adjustedBlockDims);
        return (
          <path
            key={conn.id}
            d={path}
            stroke={conn.color || 'hsl(var(--muted-foreground))'}
            strokeWidth={2}
            fill="none"
            markerEnd="url(#pres-arrowhead)"
          />
        );
      })}
    </svg>
  );
}
