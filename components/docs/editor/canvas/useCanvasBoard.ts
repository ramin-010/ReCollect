'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { applyEdgeChanges, applyNodeChanges, type Edge, type EdgeChange, type Node, type NodeChange } from '@xyflow/react';
import {
  canvasMaps,
  omit,
  orderNodes,
  readBoard,
  withDescendants,
  type CanvasBoard,
  type CanvasEdgeRecord,
  type CanvasNodeRecord,
} from '@/lib/editor/canvasBoard';

export type FlowNode = Node<CanvasNodeRecord, 'shape' | 'zone'>;
export type FlowEdge = Edge<CanvasEdgeRecord, 'canvas'>;

function toNode(rec: CanvasNodeRecord, prev?: FlowNode): FlowNode {
  const zone = rec.shape === 'zone';
  const rest = prev ? omit(prev, 'parentId', 'dragHandle', 'className') : {};
  return {
    ...rest,
    id: rec.id,
    type: zone ? 'zone' : 'shape',
    // Inside a zone the position is relative to it (React Flow's sub-flow rule, as stored).
    ...(rec.parent ? { parentId: rec.parent } : {}),
    position: { x: rec.x, y: rec.y },
    width: rec.w,
    // A box's height follows its text (the record's h is a minimum), so React Flow measures it;
    // a zone is exactly its frame.
    height: zone ? rec.h : undefined,
    data: rec,
    zIndex: rec.z,
    // A zone moves by its title; its inside lets the pointer through (canvas.css).
    ...(zone ? { dragHandle: '.cv-zone-title', className: 'cv-zone-wrap' } : {}),
  } as FlowNode;
}

function toEdge(rec: CanvasEdgeRecord, prev?: FlowEdge): FlowEdge {
  return { ...prev, id: rec.id, type: 'canvas', source: rec.from, target: rec.to, data: rec };
}

/** Folds the board's records into React Flow's nodes, keeping each node's local state (selection, size). */
function mergeNodes(prev: FlowNode[], records: CanvasNodeRecord[]): FlowNode[] {
  const byId = new Map(prev.map((n) => [n.id, n]));
  // Zones before what they hold; a dangling parent is dropped (orderNodes copies only those).
  const sorted = orderNodes(records.filter((r) => r && typeof r.id === 'string'));
  let changed = sorted.length !== prev.length;
  const next = sorted.map((rec, i) => {
    const p = byId.get(rec.id);
    if (p && p.data === rec && p.height === (rec.shape === 'zone' ? rec.h : undefined)) {
      if (prev[i] !== p) changed = true;
      return p;
    }
    changed = true;
    return toNode(rec, p);
  });
  return changed ? next : prev;
}

function mergeEdges(prev: FlowEdge[], records: CanvasEdgeRecord[]): FlowEdge[] {
  const byId = new Map(prev.map((e) => [e.id, e]));
  let changed = records.length !== prev.length;
  const next = records
    .filter((r) => r && typeof r.id === 'string')
    .map((rec, i) => {
      const p = byId.get(rec.id);
      if (p && p.data === rec) {
        if (prev[i] !== p) changed = true;
        return p;
      }
      changed = true;
      return toEdge(rec, p);
    });
  return changed ? next : prev;
}

type Maps = ReturnType<typeof canvasMaps>;

/**
 * The engine's routes stop being true once a box moves: drop them from every arrow touching these
 * boxes or anything inside them (a moved zone carries its boxes), so those arrows are drawn plainly.
 */
function dropRoutes(m: Maps, ids: Iterable<string>) {
  const touched = withDescendants(ids, m.nodes.values());
  for (const [id, e] of m.edges.entries()) {
    if (e.route && (touched.has(e.from) || touched.has(e.to))) {
      m.edges.set(id, omit(e, 'route'));
    }
  }
}

/**
 * A board's state for React Flow. Live (a Y.Doc and an id): the doc's two root maps are the truth,
 * every change you make is one Yjs transaction (so other tabs see it as it happens), and a board's
 * own Y.UndoManager undoes only your board edits. Static (a board from JSON): read-only.
 */
export function useCanvasBoard({
  ydoc,
  canvasId,
  board,
  editable,
}: {
  ydoc: Y.Doc | null;
  canvasId: string | null;
  board: CanvasBoard;
  editable: boolean;
}) {
  const maps = useMemo<Maps | null>(() => (ydoc && canvasId ? canvasMaps(ydoc, canvasId) : null), [ydoc, canvasId]);
  const canWrite = !!maps && editable;
  const origin = useMemo(() => ({ canvas: canvasId }), [canvasId]);

  const [nodes, setNodes] = useState<FlowNode[]>(() => mergeNodes([], maps ? readBoard(ydoc!, canvasId!).nodes : board.nodes));
  const [edges, setEdges] = useState<FlowEdge[]>(() => mergeEdges([], maps ? readBoard(ydoc!, canvasId!).edges : board.edges));

  useEffect(() => {
    if (!maps) return;
    const onNodes = () => setNodes((prev) => mergeNodes(prev, [...maps.nodes.values()]));
    const onEdges = () => setEdges((prev) => mergeEdges(prev, [...maps.edges.values()]));
    maps.nodes.observe(onNodes);
    maps.edges.observe(onEdges);
    return () => {
      maps.nodes.unobserve(onNodes);
      maps.edges.unobserve(onEdges);
    };
  }, [maps]);

  const undoRef = useRef<Y.UndoManager | null>(null);
  useEffect(() => {
    if (!maps) return;
    const um = new Y.UndoManager([maps.nodes, maps.edges], { trackedOrigins: new Set([origin]), captureTimeout: 500 });
    undoRef.current = um;
    return () => {
      um.destroy();
      if (undoRef.current === um) undoRef.current = null;
    };
  }, [maps, origin]);

  const write = useCallback(
    (fn: (m: Maps) => void) => {
      if (!maps || !ydoc || !editable) return;
      ydoc.transact(() => fn(maps), origin);
    },
    [maps, ydoc, editable, origin],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      if (!canWrite) return;
      const persist = changes.filter(
        (c) =>
          (c.type === 'position' && c.position) ||
          (c.type === 'dimensions' && c.dimensions && (c.resizing !== undefined || c.setAttributes)) ||
          c.type === 'remove',
      );
      if (persist.length === 0) return;
      write((m) => {
        const removed = new Set<string>();
        const moved = new Set<string>();
        for (const c of persist) {
          if (c.type === 'remove') {
            m.nodes.delete(c.id);
            removed.add(c.id);
            continue;
          }
          if (c.type === 'position' && c.position) {
            const cur = m.nodes.get(c.id);
            const x = Math.round(c.position.x);
            const y = Math.round(c.position.y);
            if (cur && (x !== cur.x || y !== cur.y)) {
              m.nodes.set(c.id, { ...cur, x, y });
              moved.add(c.id);
            }
          } else if (c.type === 'dimensions' && c.dimensions) {
            const cur = m.nodes.get(c.id);
            const w = Math.max(16, Math.round(c.dimensions.width));
            const h = Math.max(16, Math.round(c.dimensions.height));
            if (cur && (w !== cur.w || h !== cur.h)) {
              m.nodes.set(c.id, { ...cur, w, h });
              moved.add(c.id);
            }
          }
        }
        if (removed.size > 0) {
          for (const [id, e] of m.edges.entries()) if (removed.has(e.from) || removed.has(e.to)) m.edges.delete(id);
        }
        if (moved.size > 0) dropRoutes(m, moved);
      });
    },
    [canWrite, write],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      setEdges((es) => applyEdgeChanges(changes, es));
      if (!canWrite) return;
      const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id);
      if (removed.length > 0) write((m) => removed.forEach((id) => m.edges.delete(id)));
    },
    [canWrite, write],
  );

  const api = useMemo(
    () => ({
      updateNodes(ids: readonly string[], patch: Partial<CanvasNodeRecord> | ((rec: CanvasNodeRecord) => Partial<CanvasNodeRecord>)) {
        write((m) => {
          const moved: string[] = [];
          for (const id of ids) {
            const cur = m.nodes.get(id);
            if (!cur) continue;
            const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch), id };
            // A key patched to undefined is removed (e.g. `parent`, `kind`).
            for (const key of Object.keys(next) as Array<keyof CanvasNodeRecord>) if (next[key] === undefined) delete next[key];
            if (next.x !== cur.x || next.y !== cur.y || next.w !== cur.w || next.h !== cur.h || next.parent !== cur.parent || next.shape !== cur.shape) moved.push(id);
            m.nodes.set(id, next);
          }
          if (moved.length > 0) dropRoutes(m, moved);
        });
      },
      /** A key set to undefined in `patch` is removed (e.g. `route: undefined`). */
      updateEdges(ids: readonly string[], patch: Partial<CanvasEdgeRecord>) {
        write((m) => {
          for (const id of ids) {
            const cur = m.edges.get(id);
            if (!cur) continue;
            const next: Record<string, unknown> = { ...cur, ...patch, id };
            for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
            m.edges.set(id, next as CanvasEdgeRecord);
          }
        });
      },
      /**
       * Takes a laid-out copy of this board (Tidy up): every box keeps its id, text and look; its
       * place, size and zone come from the layout, and every arrow gets the layout's route.
       */
      applyLayout(laid: CanvasBoard) {
        write((m) => {
          for (const n of laid.nodes) {
            const cur = m.nodes.get(n.id);
            if (!cur) continue;
            const next: CanvasNodeRecord = { ...cur, x: n.x, y: n.y, w: n.w, h: n.h };
            if (n.parent) next.parent = n.parent;
            else delete next.parent;
            m.nodes.set(n.id, next);
          }
          for (const e of laid.edges) {
            const cur = m.edges.get(e.id);
            if (!cur) continue;
            if (e.route) m.edges.set(e.id, { ...cur, route: e.route, path: e.path });
            else m.edges.set(e.id, omit(cur, 'route'));
          }
        });
      },
      /** Adds boxes and arrows (already keyed) in one step. */
      insert(part: Partial<CanvasBoard>) {
        write((m) => {
          for (const n of part.nodes ?? []) m.nodes.set(n.id, n);
          for (const e of part.edges ?? []) if (m.nodes.has(e.from) && m.nodes.has(e.to)) m.edges.set(e.id, e);
        });
      },
      remove(nodeIds: readonly string[], edgeIds: readonly string[] = []) {
        write((m) => {
          // A zone goes with everything in it.
          const gone = withDescendants(nodeIds, m.nodes.values());
          for (const id of gone) m.nodes.delete(id);
          for (const id of edgeIds) m.edges.delete(id);
          for (const [id, e] of m.edges.entries()) if (gone.has(e.from) || gone.has(e.to)) m.edges.delete(id);
        });
      },
      record(id: string): CanvasNodeRecord | undefined {
        return maps?.nodes.get(id);
      },
      records(): CanvasBoard {
        return maps && ydoc && canvasId ? readBoard(ydoc, canvasId) : board;
      },
      topZ(): number {
        let z = 0;
        if (maps) for (const n of maps.nodes.values()) z = Math.max(z, n.z);
        return z;
      },
      bottomZ(): number {
        let z = 0;
        if (maps) for (const n of maps.nodes.values()) z = Math.min(z, n.z);
        return z;
      },
      hasEdge(from: string, to: string): boolean {
        if (!maps) return false;
        for (const e of maps.edges.values()) if (e.from === from && e.to === to) return true;
        return false;
      },
      undo() {
        undoRef.current?.undo();
      },
      redo() {
        undoRef.current?.redo();
      },
      /** Ends the current undo step (a drag or a typing burst), so the next edit undoes on its own. */
      stopCapturing() {
        undoRef.current?.stopCapturing();
      },
    }),
    [write, maps, ydoc, canvasId, board],
  );

  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, api, live: !!maps, canWrite };
}

export type CanvasApi = ReturnType<typeof useCanvasBoard>['api'];
