import type { Editor } from '@tiptap/core';
import * as Y from 'yjs';
import { customAlphabet } from 'nanoid';

/**
 * A canvas block's board: boxes and arrows kept in two root maps of the doc's Y.Doc
 * (`canvas:<id>:nodes`, `canvas:<id>:edges`), one plain record per entry, so moving a box rewrites
 * one entry and every open tab sees it live. The block itself only holds the id and its height.
 * Contract: context/specs/CANVAS_BLOCK_SPEC.md (the backend's services/docs/canvas.ts mirrors it).
 */

export const CANVAS_SHAPES = ['rect', 'rounded', 'pill', 'ellipse', 'diamond', 'cylinder', 'queue', 'sticky', 'text', 'zone'] as const;
export type CanvasShape = (typeof CANVAS_SHAPES)[number];

/** What a box is (agents set it; it gives the box its icon). Spec §9. */
export const CANVAS_KINDS = [
  'client', 'user', 'mobile', 'service', 'worker', 'function', 'database', 'cache', 'queue', 'stream', 'storage',
  'search', 'cdn', 'dns', 'gateway', 'lb', 'auth', 'external', 'monitor', 'scheduler', 'notify', 'model',
] as const;
export type CanvasKind = (typeof CANVAS_KINDS)[number];

export const CANVAS_COLORS = ['default', 'gray', 'blue', 'green', 'yellow', 'red'] as const;
export type CanvasColor = (typeof CANVAS_COLORS)[number];

export type CanvasTextSize = 's' | 'm' | 'l';
export type CanvasLine = 'solid' | 'dashed';
export type CanvasArrow = 'end' | 'both' | 'none';
export type CanvasPath = 'straight' | 'curved' | 'elbow';

export type CanvasNodeRecord = {
  id: string;
  shape: CanvasShape;
  text: string;
  x: number;
  y: number;
  w: number;
  /** A minimum: longer text makes the box taller on screen. */
  h: number;
  color: CanvasColor;
  z: number;
  size?: CanvasTextSize;
  kind?: CanvasKind;
  /** The zone this box sits in; x and y are then relative to that zone's top-left. */
  parent?: string;
};

/** The layout engine's path in board coordinates; true only while neither end moves. */
export type CanvasRoute = {
  points: Array<[number, number]>;
  label?: [number, number];
};

export type CanvasEdgeRecord = {
  id: string;
  from: string;
  to: string;
  label: string;
  line: CanvasLine;
  arrow: CanvasArrow;
  path: CanvasPath;
  route?: CanvasRoute;
};

export type CanvasBoard = {
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
};

export const EMPTY_BOARD: CanvasBoard = { nodes: [], edges: [] };

export const SHAPE_SIZE: Record<CanvasShape, { w: number; h: number }> = {
  rect: { w: 160, h: 64 },
  rounded: { w: 160, h: 64 },
  pill: { w: 160, h: 56 },
  ellipse: { w: 140, h: 80 },
  diamond: { w: 140, h: 100 },
  cylinder: { w: 120, h: 96 },
  queue: { w: 160, h: 64 },
  sticky: { w: 200, h: 140 },
  text: { w: 200, h: 40 },
  zone: { w: 360, h: 240 },
};

export const CANVAS_HEIGHT = { initial: 440, min: 240, max: 1400 } as const;

export const clampCanvasHeight = (h: unknown): number => {
  const n = Number(h);
  return Number.isFinite(n) ? Math.min(CANVAS_HEIGHT.max, Math.max(CANVAS_HEIGHT.min, Math.round(n))) : CANVAS_HEIGHT.initial;
};

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const canvasSuffix = customAlphabet(`${ALPHABET}_-`, 12);
const itemSuffix = customAlphabet(ALPHABET, 8);

export const newCanvasId = (): string => `cv_${canvasSuffix()}`;
export const newItemId = (prefix: 'n' | 'e'): string => `${prefix}_${itemSuffix()}`;

export const nodesRoot = (canvasId: string) => `canvas:${canvasId}:nodes`;
export const edgesRoot = (canvasId: string) => `canvas:${canvasId}:edges`;

export function canvasMaps(ydoc: Y.Doc, canvasId: string) {
  return {
    nodes: ydoc.getMap<CanvasNodeRecord>(nodesRoot(canvasId)),
    edges: ydoc.getMap<CanvasEdgeRecord>(edgesRoot(canvasId)),
  };
}

const byZ = (a: CanvasNodeRecord, b: CanvasNodeRecord) => a.z - b.z || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** A copy of `obj` without these keys. */
export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

const withoutParent = (n: CanvasNodeRecord): CanvasNodeRecord => omit(n, 'parent');

/**
 * Nodes in z order, but every zone before what it holds (React Flow needs a parent listed before
 * its children). A `parent` that is not a zone on this board, or a loop of parents, is dropped:
 * that box is top level.
 */
export function orderNodes(records: CanvasNodeRecord[]): CanvasNodeRecord[] {
  const sorted = [...records].sort(byZ);
  const byId = new Map(sorted.map((n) => [n.id, n]));
  const clean = sorted.map((n) => {
    if (n.parent === undefined) return n;
    const p = byId.get(n.parent);
    return p && p.shape === 'zone' && p.id !== n.id ? n : withoutParent(n);
  });
  const cleanById = new Map(clean.map((n) => [n.id, n]));
  const out: CanvasNodeRecord[] = [];
  const placed = new Set<string>();
  const visiting = new Set<string>();
  const place = (n: CanvasNodeRecord) => {
    if (placed.has(n.id) || visiting.has(n.id)) return;
    visiting.add(n.id);
    const p = n.parent ? cleanById.get(n.parent) : undefined;
    if (p) place(p);
    visiting.delete(n.id);
    if (!placed.has(n.id)) {
      placed.add(n.id);
      out.push(n.parent && !placed.has(n.parent) ? withoutParent(n) : n);
    }
  };
  clean.forEach(place);
  return out;
}

export function readBoard(ydoc: Y.Doc, canvasId: string): CanvasBoard {
  const { nodes, edges } = canvasMaps(ydoc, canvasId);
  return {
    nodes: orderNodes([...nodes.values()].filter(isNodeRecord)),
    edges: [...edges.values()].filter(isEdgeRecord),
  };
}

/** The ids of every node inside these zones (any depth), the given ids included. */
export function withDescendants(ids: Iterable<string>, nodes: Iterable<CanvasNodeRecord>): Set<string> {
  const children = new Map<string, string[]>();
  for (const n of nodes) if (n.parent) children.set(n.parent, [...(children.get(n.parent) ?? []), n.id]);
  const out = new Set<string>();
  const stack = [...ids];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

export function boardIsEmpty(ydoc: Y.Doc, canvasId: string): boolean {
  const { nodes, edges } = canvasMaps(ydoc, canvasId);
  return nodes.size === 0 && edges.size === 0;
}

/** Replaces a board's content (one transaction). */
export function writeBoard(ydoc: Y.Doc, canvasId: string, board: CanvasBoard, origin?: unknown) {
  const { nodes, edges } = canvasMaps(ydoc, canvasId);
  ydoc.transact(() => {
    nodes.clear();
    edges.clear();
    for (const n of board.nodes) nodes.set(n.id, n);
    for (const e of board.edges) edges.set(e.id, e);
  }, origin);
}

// ─── Reading untrusted boards (clipboard HTML, older content) ─────────

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const isPoint = (p: unknown): p is [number, number] =>
  Array.isArray(p) && p.length === 2 && p.every((c) => typeof c === 'number' && Number.isFinite(c));

function routeOf(v: unknown): CanvasRoute | undefined {
  const r = v as Partial<CanvasRoute> | null | undefined;
  if (!r || !Array.isArray(r.points) || r.points.length < 2 || !r.points.every(isPoint)) return undefined;
  const points = r.points.map(([x, y]) => [x, y] as [number, number]);
  return isPoint(r.label) ? { points, label: [r.label[0], r.label[1]] } : { points };
}

function isNodeRecord(v: unknown): v is CanvasNodeRecord {
  const n = v as CanvasNodeRecord | null;
  return !!n && typeof n.id === 'string' && typeof n.x === 'number' && typeof n.y === 'number';
}

function isEdgeRecord(v: unknown): v is CanvasEdgeRecord {
  const e = v as CanvasEdgeRecord | null;
  return !!e && typeof e.id === 'string' && typeof e.from === 'string' && typeof e.to === 'string';
}

/** A board from JSON we didn't write ourselves: bad records go, missing fields get defaults. */
export function sanitizeBoard(input: unknown): CanvasBoard {
  const raw = (input ?? {}) as { nodes?: unknown; edges?: unknown };
  const nodes: CanvasNodeRecord[] = [];
  const ids = new Set<string>();
  (Array.isArray(raw.nodes) ? raw.nodes : []).forEach((v, i) => {
    const n = (v ?? {}) as Partial<CanvasNodeRecord>;
    const id = typeof n.id === 'string' && n.id && !ids.has(n.id) ? n.id : newItemId('n');
    const shape = pick(n.shape, CANVAS_SHAPES, 'rect');
    const size = SHAPE_SIZE[shape];
    ids.add(id);
    nodes.push({
      id,
      shape,
      text: typeof n.text === 'string' ? n.text.slice(0, 1000) : '',
      x: num(n.x, i * 40),
      y: num(n.y, i * 40),
      w: Math.max(16, num(n.w, size.w)),
      h: Math.max(16, num(n.h, size.h)),
      color: pick(n.color, CANVAS_COLORS, 'default'),
      z: num(n.z, i),
      ...(n.size === 's' || n.size === 'l' ? { size: n.size } : {}),
      ...(typeof n.kind === 'string' && (CANVAS_KINDS as readonly string[]).includes(n.kind) ? { kind: n.kind } : {}),
      ...(typeof n.parent === 'string' && n.parent ? { parent: n.parent } : {}),
    });
  });
  const edges: CanvasEdgeRecord[] = [];
  const edgeIds = new Set<string>();
  for (const v of Array.isArray(raw.edges) ? raw.edges : []) {
    const e = (v ?? {}) as Partial<CanvasEdgeRecord>;
    if (typeof e.from !== 'string' || typeof e.to !== 'string' || !ids.has(e.from) || !ids.has(e.to)) continue;
    const id = typeof e.id === 'string' && e.id && !edgeIds.has(e.id) ? e.id : newItemId('e');
    edgeIds.add(id);
    edges.push({
      id,
      from: e.from,
      to: e.to,
      label: typeof e.label === 'string' ? e.label.slice(0, 200) : '',
      line: pick(e.line, ['solid', 'dashed'] as const, 'solid'),
      arrow: pick(e.arrow, ['end', 'both', 'none'] as const, 'end'),
      path: pick(e.path, ['straight', 'curved', 'elbow'] as const, 'straight'),
      ...(routeOf(e.route) ? { route: routeOf(e.route) } : {}),
    });
  }
  return { nodes: orderNodes(nodes), edges };
}

/**
 * Copies a board under fresh box and arrow ids (a duplicated block, pasted boxes). Zones keep
 * their boxes; a box whose zone was not copied becomes top level. Routes are kept only when the
 * copy sits exactly where the original did (a duplicated block), not for pasted boxes.
 */
export function rekeyBoard(board: CanvasBoard, keepRoutes = false): CanvasBoard {
  const map = new Map(board.nodes.map((n) => [n.id, newItemId('n')]));
  return {
    nodes: board.nodes.map((n) => {
      const rest = withoutParent(n);
      const p = n.parent ? map.get(n.parent) : undefined;
      return { ...rest, id: map.get(n.id)!, ...(p ? { parent: p } : {}) };
    }),
    edges: board.edges
      .filter((e) => map.has(e.from) && map.has(e.to))
      .map((e) => {
        const { route, ...rest } = e;
        return { ...rest, id: newItemId('e'), from: map.get(e.from)!, to: map.get(e.to)!, ...(keepRoutes && route ? { route } : {}) };
      }),
  };
}

// ─── JSON with boards (read-only viewers) ─────────────────────────────

interface JsonNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
}

/** TipTap JSON whose canvas blocks carry their board in `attrs.data` (for editors without the Y.Doc). */
export function withCanvasData<T>(json: T, ydoc: Y.Doc): T {
  const visit = (node: JsonNode): JsonNode => {
    if (node?.type === 'canvas' && typeof node.attrs?.canvasId === 'string') {
      return { ...node, attrs: { ...node.attrs, data: readBoard(ydoc, node.attrs.canvasId) } };
    }
    return Array.isArray(node?.content) ? { ...node, content: node.content.map(visit) } : node;
  };
  return visit(json as JsonNode) as T;
}

/** The live doc's Y.Doc (the Collaboration extension's), or null in editors without one. */
export function editorYDoc(editor: Editor): Y.Doc | null {
  const collab = editor.extensionManager.extensions.find((e) => e.name === 'collaboration');
  return (collab?.options as { document?: Y.Doc | null } | undefined)?.document ?? null;
}
