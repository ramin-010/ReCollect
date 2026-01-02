'use client';

import React, { useMemo } from 'react';
import { Eye, Layers } from 'lucide-react';

interface Block {
  _id?: string;
  blockId?: string;
  type: 'text' | 'image' | 'embed' | 'code' | 'stack';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  url?: string;
  color?: string;
  fontSize?: number | string;
  stackItems?: any[];
}

interface Connection {
  id?: string;
  fromBlock: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  toBlock: string;
  toSide: 'top' | 'right' | 'bottom' | 'left';
}

interface CanvasPreviewProps {
  blocks: Block[];
  connections?: Connection[];
  containerHeight?: number;
  containerWidth?: number;
}

// Default dimensions
const DEFAULT_TEXT_WIDTH = 200;
const DEFAULT_TEXT_HEIGHT = 60;
const DEFAULT_IMAGE_WIDTH = 150;
const DEFAULT_IMAGE_HEIGHT = 120;
const DEFAULT_STACK_WIDTH = 200;
const DEFAULT_STACK_HEIGHT = 150;
const PREVIEW_PADDING = 12;

// Strip HTML tags for text preview
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').slice(0, 100);
};

// Tailwind color map - maps color names to actual hex values
const TAILWIND_COLORS: Record<string, string> = {
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
};

// Parse Tailwind color class to get actual color
const parseTailwindColor = (colorClass: string | undefined): string | null => {
  if (!colorClass) return null;
  
  // Match patterns like 'bg-violet-500/10' or 'bg-green-500'
  const match = colorClass.match(/bg-(\w+)-(\d+)/);
  if (match) {
    const colorName = match[1];
    return TAILWIND_COLORS[colorName] || null;
  }
  return null;
};

// --- Helper Functions copied from NativeConnectionLayer.tsx ---

// Get anchor position on block edge
const getAnchorPos = (block: {x: number, y: number, w: number, h: number}, side: 'top' | 'right' | 'bottom' | 'left') => {
  const { x, y, w, h } = block;
  switch (side) {
    case 'top': return { x: x + w / 2, y };
    case 'right': return { x: x + w, y: y + h / 2 };
    case 'bottom': return { x: x + w / 2, y: y + h };
    case 'left': return { x, y: y + h / 2 };
  }
};

// Generate smooth Catmull-Rom spline path
const getSplinePath = (points: {x: number, y: number}[]) => {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  const t = 0.5; 
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;
    const cp1x = p1.x + (p2.x - p0.x) * t / 3;
    const cp1y = p1.y + (p2.y - p0.y) * t / 3;
    const cp2x = p2.x - (p3.x - p1.x) * t / 3;
    const cp2y = p2.y - (p3.y - p1.y) * t / 3;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
};

// Calculate point on bezier curve at parameter t
const getPointOnBezier = (t: number, p0: {x:number,y:number}, p1: {x:number,y:number}, p2: {x:number,y:number}, p3: {x:number,y:number}) => {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
  return { x, y };
};

// Calculate connection path with proper control points
const calculateConnectionPath = (
  conn: Connection,
  fromBlock: { x: number; y: number; width: number; height: number },
  toBlock: { x: number; y: number; width: number; height: number },
  scale: number,
  offsetX: number,
  offsetY: number,
  minX: number,
  minY: number
): string => {
  // Transform to preview coordinates
  const fromGeo = {
    x: offsetX + (fromBlock.x - minX) * scale,
    y: offsetY + (fromBlock.y - minY) * scale,
    w: fromBlock.width * scale,
    h: fromBlock.height * scale
  };
  const toGeo = {
    x: offsetX + (toBlock.x - minX) * scale,
    y: offsetY + (toBlock.y - minY) * scale,
    w: toBlock.width * scale,
    h: toBlock.height * scale
  };

  const start = getAnchorPos(fromGeo, conn.fromSide);
  const end = getAnchorPos(toGeo, conn.toSide);

  // Calculate control points for smooth curve
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  const offset = Math.min(Math.max(dist * 0.5, 20), 100);

  const h1 = { ...start };
  if (conn.fromSide === 'top') h1.y -= offset;
  else if (conn.fromSide === 'bottom') h1.y += offset;
  else if (conn.fromSide === 'left') h1.x -= offset;
  else if (conn.fromSide === 'right') h1.x += offset;

  const h2 = { ...end };
  if (conn.toSide === 'top') h2.y -= offset;
  else if (conn.toSide === 'bottom') h2.y += offset;
  else if (conn.toSide === 'left') h2.x -= offset;
  else if (conn.toSide === 'right') h2.x += offset;

  const cp1 = getPointOnBezier(0.33, start, h1, h2, end);
  const cp2 = getPointOnBezier(0.66, start, h1, h2, end);

  return getSplinePath([start, cp1, cp2, end]);
};

export function CanvasPreview({ 
  blocks, 
  connections = [], 
  containerHeight = 280,
  containerWidth = 500 
}: CanvasPreviewProps) {
  
  const previewData = useMemo(() => {
    // Filter to include text (with content), image, and stack blocks
    const filteredBlocks = blocks.filter(b => 
      (b.type === 'text' && b.content) || 
      b.type === 'image' || 
      b.type === 'stack'
    );
    
    if (filteredBlocks.length === 0) return null;

    // Calculate bounds for each block
    const blockBounds = filteredBlocks.map(block => {
      const x = typeof block.x === 'number' ? block.x : parseFloat(String(block.x)) || 0;
      const y = typeof block.y === 'number' ? block.y : parseFloat(String(block.y)) || 0;
      const width = typeof block.width === 'number' ? block.width : parseFloat(String(block.width) ) || 400;
      let height = typeof block.height === 'number' ? block.height : 0;
      
      // If height is 'auto' (string) or 0, calculate based on content (same as Rnd auto-sizing)
      const isAutoHeight = height === 0 || String(block.height) === 'auto';
      if (isAutoHeight) {
        if (block.type === 'text') {
          // Text blocks auto-size based on content
          // Base block has ~48px padding (p-4 = 16px * 2 + borders)
          // Content renders with ~24px line-height
          const contentText = stripHtml(block.content || '');
          const charsPerLine = Math.floor(width / 7); // ~7px per char average
          const numLines = Math.max(1, Math.ceil(contentText.length / charsPerLine));
          // 48px padding + 24px per line (approximate)
          height = 48 + numLines * 24;
        } else if (block.type === 'stack') {
          // Stack: header (~50px) + each item (~55px) + footer padding (~15px)
          const itemCount = block.stackItems?.length || 1;
          height = 50 + itemCount * 55 + 15;
        } else if (block.type === 'image') {
          // Images maintain rough aspect ratio, default to 4:3
          height = width * 0.75;
        }
      }

      // Fallback for height only if still 0
      height = height || 100;

      return { x, y, width, height, block };
    });

    // Calculate content bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    blockBounds.forEach(({ x, y, width, height }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Available preview area
    const previewWidth = containerWidth - PREVIEW_PADDING * 1;
    const previewHeight = containerHeight - PREVIEW_PADDING * 1;

    // Calculate scale to fit (don't scale up)
    const scaleX = contentWidth > 0 ? previewWidth / contentWidth : 1;
    const scaleY = contentHeight > 0 ? previewHeight / contentHeight : 1;
    const scale = Math.min(scaleX, scaleY, 1);

    // Scaled dimensions
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;

    // Center offset
    const offsetX = (previewWidth - scaledWidth) / 2;
    const offsetY = (previewHeight - scaledHeight) / 2;

    // Transform blocks to preview coordinates
    const transformedBlocks = blockBounds.map(({ x, y, width, height, block }) => ({
      block,
      left: offsetX + (x - minX) * scale,
      top: offsetY + (y - minY) * scale,
      width: width * scale,
      height: height * scale,
      originalBounds: { x, y, width, height }
    }));

    // Create block lookup for connections
    const blockLookup = new Map<string, { x: number; y: number; width: number; height: number }>();
    blockBounds.forEach(({ x, y, width, height, block }) => {
      const id = block.blockId || block._id;
      if (id) blockLookup.set(id, { x, y, width, height });
    });

    return { 
      transformedBlocks, 
      scale, 
      blockLookup,
      minX,
      minY,
      offsetX,
      offsetY
    };
  }, [blocks, containerWidth, containerHeight]);

  // Empty state
  if (!previewData || previewData.transformedBlocks.length === 0) {
    return (
      <div 
        className="w-full bg-gradient-to-br from-[hsl(var(--muted))]/30 to-[hsl(var(--muted))]/10 flex flex-col items-center justify-center border-b border-[hsl(var(--border))]/40"
        style={{ height: containerHeight }}
      >
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))]/40 flex items-center justify-center mb-3">
          <Layers className="h-6 w-6 text-[hsl(var(--muted-foreground))]/50" />
        </div>
        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]/50 uppercase tracking-widest">
          Empty Canvas
        </span>
      </div>
    );
  }

  const { transformedBlocks, scale, blockLookup, minX, minY, offsetX, offsetY } = previewData;

  return (
    <div 
      className="w-full bg-[#1a1a1a] relative overflow-hidden border-b border-[hsl(var(--border))]/40 rounded-lg"
      style={{ height: containerHeight }}
    >
      {/* Dot pattern background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* SVG Connections Layer */}
      <svg 
        className="absolute inset-0 pointer-events-none overflow-visible" 
        style={{ 
          width: '100%',
          height: '100%'
        }}
      >
        <defs>
          <marker 
            id="preview-arrowhead" 
            markerWidth="12" 
            markerHeight="10" 
            refX="12" 
            refY="5" 
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 14 5, 0 10" fill="rgba(181, 176, 176, 0.9)" />
          </marker>
        </defs>
        <g style={{ transform: `translate(${PREVIEW_PADDING}px, ${PREVIEW_PADDING}px)` }}>
          {connections.map((conn, index) => {
            const fromBlockData = blockLookup.get(conn.fromBlock);
            const toBlockData = blockLookup.get(conn.toBlock);
            if (!fromBlockData || !toBlockData) return null;

            const path = calculateConnectionPath(
              conn,
              fromBlockData,
              toBlockData,
              scale,
              offsetX,
              offsetY,
              minX,
              minY
            );

            return (
              <path
                key={index}
                d={path}
                fill="none"
                stroke="rgba(177, 168, 168, 0.75)"
                strokeWidth={2}
                strokeLinecap="round"
                markerEnd="url(#preview-arrowhead)"
              />
            );
          })}
        </g>
      </svg>

      {/* Blocks Layer */}
      <div className="absolute inset-0" style={{ padding: PREVIEW_PADDING }}>
        <div className="relative w-full h-full">
          {transformedBlocks.map(({ block, left, top, width, height }, index) => {
            const blockId = block.blockId || block._id || index;
            
            // TEXT BLOCK
            if (block.type === 'text') {
              const colorClasses = block.color || 'bg-gray-700';
              const fontSize = Math.max(8, (typeof block.fontSize === 'number' ? block.fontSize : 14) * scale);
              
              return (
                <div
                  key={blockId}
                  className={`absolute rounded-lg overflow-hidden shadow-lg border ${colorClasses}`}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    fontSize: `${fontSize}px`,
                  }}
                >
                  <div className="p-2 text-white leading-snug line-clamp-5 overflow-hidden font-medium">
                    {stripHtml(block.content || '')}
                  </div>
                </div>
              );
            }

            // STACK BLOCK
            if (block.type === 'stack') {
              const stackItems = block.stackItems || [];
              return (
                <div
                  key={blockId}
                  className="absolute bg-[#2a2a2a] rounded-lg border-2 border-cyan-500/60 overflow-hidden shadow-lg"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                >
                  {/* Stack Header */}
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-900/40 border-b border-cyan-500/30">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wide">Stack</span>
                    <span className="text-[8px] text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded-full ml-auto">
                      {stackItems.length}
                    </span>
                  </div>
                  {/* Stack Items Preview */}
                  <div className="p-1.5 space-y-1 overflow-hidden">
                    {stackItems.slice(0, 3).map((item: any, idx: number) => (
                      <div 
                        key={item.blockId || idx} 
                        className="text-[8px] text-gray-300 bg-[#383838] rounded px-2 py-1 truncate border-l-2 border-blue-500/50"
                      >
                        {item.content ? stripHtml(item.content).slice(0, 30) : `Item ${idx + 1}`}
                      </div>
                    ))}
                    {stackItems.length > 3 && (
                      <div className="text-[7px] text-gray-500 text-center">
                        +{stackItems.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // IMAGE BLOCK
            const hasImage = Boolean(block.url);
            return (
              <div
                key={blockId}
                className="absolute bg-[#2a2a2a] rounded-lg border border-gray-600/50 flex items-center justify-center overflow-hidden shadow-lg"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                }}
              >
                {hasImage ? (
                  <img
                    src={block.url!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Item count badge */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[9px] font-bold text-gray-300 bg-[#2a2a2a]/90 backdrop-blur-sm border border-gray-600 rounded-full px-2 py-1 shadow-md">
        <div className="w-1 h-1 rounded-full bg-cyan-400" />
        {blocks.length} {blocks.length === 1 ? 'ITEM' : 'ITEMS'}
      </div>
    </div>
  );
}
