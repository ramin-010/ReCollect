/**
 * Connection Geometry Utilities
 * 
 * Shared math for computing connection line paths, anchor positions,
 * control points, and Bézier curves. Used by:
 * - ConnectionLine.tsx (static rendering)
 * - NativeConnectionLayer.tsx (live drag updates)
 * - ConnectionLayer.tsx (draft connections + controls)
 */

import { Connection, BlockDims } from '@/types/canvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal rectangle for anchor position calculation */
export interface BlockRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

// ---------------------------------------------------------------------------
// Core Geometry
// ---------------------------------------------------------------------------

/** Get the anchor point position for a given side of a block */
export function getAnchorPos(block: BlockRect, side: AnchorSide): { x: number; y: number } {
  const { x, y, width: w, height: h } = block;
  switch (side) {
    case 'top':    return { x: x + w / 2, y };
    case 'right':  return { x: x + w, y: y + h / 2 };
    case 'bottom': return { x: x + w / 2, y: y + h };
    case 'left':   return { x, y: y + h / 2 };
  }
}

/** Evaluate a point on a cubic Bézier curve at parameter t ∈ [0, 1] */
export function getPointOnBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
  return { x, y };
}

/** Generate a Catmull-Rom spline SVG path through a set of points */
export function getSplinePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
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
}

// ---------------------------------------------------------------------------
// Control Points
// ---------------------------------------------------------------------------

/**
 * Calculate control points for a connection.
 * If the connection already has custom control points, return those.
 * Otherwise, compute automatic ones based on the anchor sides.
 */
export function calculateControlPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  fromSide: AnchorSide,
  toSide: AnchorSide,
  existingCP1?: { x: number; y: number },
  existingCP2?: { x: number; y: number }
): { cp1: { x: number; y: number }; cp2: { x: number; y: number } } {
  if (existingCP1 && existingCP2) {
    return { cp1: existingCP1, cp2: existingCP2 };
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  const offset = Math.min(Math.max(dist * 0.5, 30), 200);

  const h1 = { ...start };
  if (fromSide === 'top') h1.y -= offset;
  else if (fromSide === 'bottom') h1.y += offset;
  else if (fromSide === 'left') h1.x -= offset;
  else if (fromSide === 'right') h1.x += offset;

  const h2 = { ...end };
  if (toSide === 'top') h2.y -= offset;
  else if (toSide === 'bottom') h2.y += offset;
  else if (toSide === 'left') h2.x -= offset;
  else if (toSide === 'right') h2.x += offset;

  const cp1 = existingCP1 || getPointOnBezier(0.33, start, h1, h2, end);
  const cp2 = existingCP2 || getPointOnBezier(0.66, start, h1, h2, end);

  return { cp1, cp2 };
}

// ---------------------------------------------------------------------------
// Composite Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the full SVG path for a connection given block dimensions.
 * Used by static renderers (ConnectionLine, NativeConnectionLayer initial).
 */
export function calculateConnectionPath(conn: Connection, blocks: BlockDims[]): string {
  const fromBlock = blocks.find(b => b.id === conn.fromBlock);
  const toBlock = blocks.find(b => b.id === conn.toBlock);
  if (!fromBlock || !toBlock) return '';

  const start = getAnchorPos(fromBlock, conn.fromSide);
  const end = getAnchorPos(toBlock, conn.toSide);
  const { cp1, cp2 } = calculateControlPoints(
    start, end, conn.fromSide, conn.toSide,
    conn.controlPoint1, conn.controlPoint2
  );
  return getSplinePath([start, cp1, cp2, end]);
}

/**
 * Calculate the full SVG path for a connection using raw BlockRect geometry.
 * Used by the drag-update loop in NativeConnectionLayer where we have
 * pre-computed geometry (not BlockDims from state).
 */
export function calculatePathFromRects(
  conn: Connection,
  fromRect: BlockRect,
  toRect: BlockRect
): string {
  const start = getAnchorPos(fromRect, conn.fromSide);
  const end = getAnchorPos(toRect, conn.toSide);
  const { cp1, cp2 } = calculateControlPoints(
    start, end, conn.fromSide, conn.toSide,
    conn.controlPoint1, conn.controlPoint2
  );
  return getSplinePath([start, cp1, cp2, end]);
}
