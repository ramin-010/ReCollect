import { Position, getBezierPath, getSmoothStepPath, getStraightPath, type InternalNode } from '@xyflow/react';
import type { CanvasNodeRecord, CanvasPath, CanvasShape } from '@/lib/editor/canvasBoard';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: CanvasShape;
}

export function boxOf(node: InternalNode): Box {
  const { x, y } = node.internals.positionAbsolute;
  return {
    x,
    y,
    w: node.measured.width ?? node.width ?? 0,
    h: node.measured.height ?? node.height ?? 0,
    shape: (node.data as unknown as CanvasNodeRecord).shape,
  };
}

const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Where a line from the box's centre towards `p` crosses the box's outline (its real shape). */
function outlinePoint(b: Box, p: { x: number; y: number }, gap: number) {
  const c = centre(b);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const hw = Math.max(b.w / 2, 1);
  const hh = Math.max(b.h / 2, 1);
  if (dx === 0 && dy === 0) return c;
  let t: number;
  if (b.shape === 'ellipse') t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
  else if (b.shape === 'diamond') t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
  else t = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  const len = Math.hypot(dx, dy);
  const extra = gap / len;
  return { x: c.x + dx * (t + extra), y: c.y + dy * (t + extra) };
}

/** The side of `b` that faces `other` (for curved and elbow lines, which leave from a side's middle). */
function facingSide(b: Box, other: Box): Position {
  const a = centre(b);
  const o = centre(other);
  const dx = (o.x - a.x) / Math.max(b.w + other.w, 1);
  const dy = (o.y - a.y) / Math.max(b.h + other.h, 1);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? Position.Right : Position.Left;
  return dy >= 0 ? Position.Bottom : Position.Top;
}

function sideMiddle(b: Box, side: Position, gap: number) {
  switch (side) {
    case Position.Top:
      return { x: b.x + b.w / 2, y: b.y - gap };
    case Position.Bottom:
      return { x: b.x + b.w / 2, y: b.y + b.h + gap };
    case Position.Left:
      return { x: b.x - gap, y: b.y + b.h / 2 };
    default:
      return { x: b.x + b.w + gap, y: b.y + b.h / 2 };
  }
}

/** The SVG path of an arrow between two boxes, attached to their outlines, and where its label sits. */
export function edgePath(source: InternalNode, target: InternalNode, path: CanvasPath) {
  const s = boxOf(source);
  const t = boxOf(target);
  if (path === 'straight') {
    const a = outlinePoint(s, centre(t), 2);
    const b = outlinePoint(t, centre(s), 3);
    const [d, labelX, labelY] = getStraightPath({ sourceX: a.x, sourceY: a.y, targetX: b.x, targetY: b.y });
    return { d, labelX, labelY };
  }
  const sourcePosition = facingSide(s, t);
  const targetPosition = facingSide(t, s);
  const a = sideMiddle(s, sourcePosition, 2);
  const b = sideMiddle(t, targetPosition, 3);
  const args = { sourceX: a.x, sourceY: a.y, sourcePosition, targetX: b.x, targetY: b.y, targetPosition };
  const [d, labelX, labelY] = path === 'curved' ? getBezierPath(args) : getSmoothStepPath({ ...args, borderRadius: 10, offset: 24 });
  return { d, labelX, labelY };
}

/**
 * The SVG path of an arrow along the layout engine's route (right-angle segments, corners rounded
 * by up to `radius`), and where its label sits: the engine's spot, else halfway along the path.
 */
export function routePath(points: ReadonlyArray<readonly [number, number]>, label?: readonly [number, number], radius = 8) {
  const pts = points.filter((p, i) => i === 0 || p[0] !== points[i - 1]![0] || p[1] !== points[i - 1]![1]);
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x, y] = pts[i]!;
    const next = pts[i + 1];
    if (!next) {
      d += ` L${x},${y}`;
      break;
    }
    const [px, py] = pts[i - 1]!;
    const inLen = Math.hypot(x - px, y - py);
    const outLen = Math.hypot(next[0] - x, next[1] - y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (r < 0.5) {
      d += ` L${x},${y}`;
      continue;
    }
    const ax = x - ((x - px) / inLen) * r;
    const ay = y - ((y - py) / inLen) * r;
    const bx = x + ((next[0] - x) / outLen) * r;
    const by = y + ((next[1] - y) / outLen) * r;
    d += ` L${ax},${ay} Q${x},${y} ${bx},${by}`;
  }
  if (label) return { d, labelX: label[0], labelY: label[1] };
  // Halfway along the path.
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) total += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  let left = total / 2;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len >= left && len > 0) return { d, labelX: x0 + ((x1 - x0) * left) / len, labelY: y0 + ((y1 - y0) * left) / len };
    left -= len;
  }
  const [lx, ly] = pts[pts.length - 1]!;
  return { d, labelX: lx, labelY: ly };
}

/** Where a new box goes when you click a box's side dot: beside it, clear of other boxes. */
export function besidePosition(
  from: { x: number; y: number; w: number; h: number },
  side: 't' | 'r' | 'b' | 'l',
  size: { w: number; h: number },
  others: ReadonlyArray<{ x: number; y: number; w: number; h: number }>,
) {
  const gapX = 96;
  const gapY = 72;
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  let x = side === 'r' ? from.x + from.w + gapX : side === 'l' ? from.x - gapX - size.w : cx - size.w / 2;
  let y = side === 'b' ? from.y + from.h + gapY : side === 't' ? from.y - gapY - size.h : cy - size.h / 2;
  const overlaps = (px: number, py: number) =>
    others.some((o) => px < o.x + o.w + 16 && px + size.w + 16 > o.x && py < o.y + o.h + 16 && py + size.h + 16 > o.y);
  for (let i = 0; i < 12 && overlaps(x, y); i += 1) {
    if (side === 'r' || side === 'l') y += size.h + 24;
    else x += size.w + 24;
  }
  return { x: snap(x), y: snap(y) };
}

export const snap = (v: number) => Math.round(v / 8) * 8;
