'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type * as Y from 'yjs';
import {
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type ConnectionLineComponentProps,
  type OnConnectEnd,
  type OnConnectStart,
} from '@xyflow/react';
import {
  SHAPE_SIZE,
  newItemId,
  omit,
  rekeyBoard,
  withDescendants,
  type CanvasBoard as Board,
  type CanvasEdgeRecord,
  type CanvasNodeRecord,
  type CanvasShape,
} from '@/lib/editor/canvasBoard';
import { layoutBoard, renderBoard } from '@/lib/api/canvasApi';
import { CanvasContext, type CanvasCtx } from './canvasContext';
import { besidePosition, snap } from './canvasGeometry';
import { ShapeNode } from './ShapeNode';
import { ZoneNode } from './ZoneNode';
import { CanvasEdge } from './CanvasEdge';
import { EdgeBar, NodeBar, ToolBar, ViewBar, type Rect } from './CanvasBars';
import { useCanvasBoard, type FlowEdge, type FlowNode } from './useCanvasBoard';

const NODE_TYPES = { shape: ShapeNode, zone: ZoneNode };
const EDGE_TYPES = { canvas: CanvasEdge };
/** Matches the server's fitted block height (services/docs/canvas.ts FIT_PADDING). */
const FIT = { padding: 0.12, maxZoom: 1 };
type Side = 't' | 'r' | 'b' | 'l';

/** Boxes copied with Ctrl C, shared by every board on the page. */
let clipboard: Board | null = null;

const arrow = (from: string, to: string): CanvasEdgeRecord => ({
  id: newItemId('e'),
  from,
  to,
  label: '',
  line: 'solid',
  arrow: 'end',
  path: 'straight',
});

function pointOf(event: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('changedTouches' in event) {
    const t = event.changedTouches[0];
    return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
  }
  return { x: event.clientX, y: event.clientY };
}

function ConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps<FlowNode>) {
  return <path className="cv-connection" d={`M${fromX},${fromY} L${toX},${toY}`} />;
}

export interface CanvasBoardProps {
  ydoc: Y.Doc | null;
  canvasId: string | null;
  /** The board when there is no live Y.Doc (read-only viewers). */
  board: Board;
  editable: boolean;
  full: boolean;
  onToggleFull: () => void;
}

export function CanvasBoard(props: CanvasBoardProps) {
  return (
    <ReactFlowProvider>
      <BoardInner {...props} />
    </ReactFlowProvider>
  );
}

function BoardInner({ ydoc, canvasId, board, editable, full, onToggleFull }: CanvasBoardProps) {
  const rf = useReactFlow<FlowNode, FlowEdge>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const markers = useMemo(() => ({ normal: `cv-arrow-${uid}`, selected: `cv-arrow-sel-${uid}` }), [uid]);
  const [active, setActive] = useState(full);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, api, canWrite } = useCanvasBoard({ ydoc, canvasId, board, editable });
  const pasteCount = useRef(0);

  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes]);

  // A board that arrives live (an agent's write) mounts before its block has a size or before its
  // boxes arrive, so React Flow's one fit on start lands at the smallest zoom. Fit again when the
  // board gets its size or its first boxes, until the person pans or zooms it themselves.
  const viewTouched = useRef(false);
  const hadNodes = useRef(nodes.length > 0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let wasEmpty = el.clientWidth === 0 || el.clientHeight === 0;
    const ro = new ResizeObserver(() => {
      const empty = el.clientWidth === 0 || el.clientHeight === 0;
      if (wasEmpty && !empty && !viewTouched.current) requestAnimationFrame(() => void rf.fitView(FIT));
      wasEmpty = empty;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rf]);
  useEffect(() => {
    if (hadNodes.current || nodes.length === 0) return;
    hadNodes.current = true;
    // Wait for React Flow to measure the new boxes.
    const t = setTimeout(() => {
      if (!viewTouched.current) void rf.fitView(FIT);
    }, 60);
    return () => clearTimeout(t);
  }, [nodes.length, rf]);

  /** A node's rectangle in board coordinates (a box in a zone is stored relative to it). */
  const absRect = useCallback(
    (id: string): Rect | null => {
      const n = rf.getInternalNode(id);
      if (!n) return null;
      const rec = n.data as CanvasNodeRecord;
      return { x: n.internals.positionAbsolute.x, y: n.internals.positionAbsolute.y, w: n.measured?.width ?? rec.w, h: n.measured?.height ?? rec.h };
    },
    [rf],
  );

  /** The innermost zone under a board point (not `skip` nor anything inside it), or null. */
  const zoneAt = useCallback(
    (p: { x: number; y: number }, skip: readonly string[] = []): { id: string; rect: Rect } | null => {
      const all = api.records().nodes;
      const skipped = withDescendants(skip, all);
      let best: { id: string; rect: Rect } | null = null;
      for (const n of all) {
        if (n.shape !== 'zone' || skipped.has(n.id)) continue;
        const r = absRect(n.id);
        if (!r || p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) continue;
        if (!best || r.w * r.h < best.rect.w * best.rect.h) best = { id: n.id, rect: r };
      }
      return best;
    },
    [api, absRect],
  );

  /** A record placed at a board point: inside the zone there, if any (its position made relative). */
  const placeIn = useCallback(
    (rec: CanvasNodeRecord): CanvasNodeRecord => {
      const zone = zoneAt({ x: rec.x + rec.w / 2, y: rec.y + rec.h / 2 }, [rec.id]);
      return zone ? { ...rec, parent: zone.id, x: snap(rec.x - zone.rect.x), y: snap(rec.y - zone.rect.y) } : rec;
    },
    [zoneAt],
  );
  const selectedEdges = useMemo(() => edges.filter((e) => e.selected), [edges]);
  const soleEdgeId = selectedNodes.length === 0 && selectedEdges.length === 1 ? selectedEdges[0]!.id : null;
  const dragging = selectedNodes.some((n) => n.dragging);

  /** The selection's bounds in flow coordinates (where its bar floats). */
  const nodeAnchor = useMemo<Rect | null>(() => {
    if (selectedNodes.length === 0) return null;
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    for (const n of selectedNodes) {
      const r = absRect(n.id);
      if (!r) continue;
      x1 = Math.min(x1, r.x);
      y1 = Math.min(y1, r.y);
      x2 = Math.max(x2, r.x + r.w);
      y2 = Math.max(y2, r.y + r.h);
    }
    return Number.isFinite(x1) ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : null;
  }, [selectedNodes, absRect]);

  const soleEdge = soleEdgeId ? edges.find((e) => e.id === soleEdgeId) : undefined;
  const edgeAnchor = useMemo<Rect | null>(() => {
    if (!soleEdge) return null;
    // A routed arrow: its label spot (or the middle of its route); else halfway between its boxes.
    const route = soleEdge.data?.route;
    if (route) {
      const [mx, my] = route.label ?? route.points[Math.floor(route.points.length / 2)]!;
      return { x: mx, y: my - 10, w: 0, h: 20 };
    }
    const a = absRect(soleEdge.source);
    const b = absRect(soleEdge.target);
    if (!a || !b) return null;
    const mx = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
    const my = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
    return { x: mx, y: my - 10, w: 0, h: 20 };
    // `nodes` re-runs this when boxes move (absRect reads React Flow's live positions).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soleEdge, nodes, absRect]);

  const focusBoard = useCallback(() => wrapRef.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    if (full) wrapRef.current?.focus({ preventScroll: true });
  }, [full]);

  const selectOnly = useCallback(
    (nodeIds: readonly string[], edgeIds: readonly string[] = []) => {
      const ns = new Set(nodeIds);
      const es = new Set(edgeIds);
      setNodes((nds) => nds.map((n) => (!!n.selected === ns.has(n.id) ? n : { ...n, selected: ns.has(n.id) })));
      setEdges((eds) => eds.map((e) => (!!e.selected === es.has(e.id) ? e : { ...e, selected: es.has(e.id) })));
    },
    [setNodes, setEdges],
  );

  /** The middle of what you see, nudged off any box already sitting there. */
  const viewCentre = useCallback(() => {
    const r = wrapRef.current?.getBoundingClientRect();
    const p = r ? rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : { x: 0, y: 0 };
    const taken = api
      .records()
      .nodes.filter((n) => n.shape !== 'zone')
      .map((n) => absRect(n.id))
      .filter((r): r is Rect => !!r);
    for (let i = 0; i < 20 && taken.some((n) => Math.abs(n.x + n.w / 2 - p.x) < 12 && Math.abs(n.y + n.h / 2 - p.y) < 12); i += 1) {
      p.x += 24;
      p.y += 24;
    }
    return p;
  }, [rf, api, absRect]);

  const newBox = useCallback(
    (shape: CanvasShape, centre: { x: number; y: number }, extra?: Partial<CanvasNodeRecord>): CanvasNodeRecord => {
      const size = SHAPE_SIZE[shape];
      const w = extra?.w ?? size.w;
      const h = extra?.h ?? size.h;
      // A new zone goes behind everything, so it never covers boxes already there.
      const z = shape === 'zone' ? api.bottomZ() - 1 : api.topZ() + 1;
      return { id: newItemId('n'), shape, text: '', x: snap(centre.x - w / 2), y: snap(centre.y - h / 2), w, h, color: 'default', z, ...extra };
    },
    [api],
  );

  /** Adds boxes (and arrows), selects the new box and starts typing in it. */
  const addAndEdit = useCallback(
    (rec: CanvasNodeRecord, edgesToAdd: CanvasEdgeRecord[] = []) => {
      api.stopCapturing();
      api.insert({ nodes: [rec], edges: edgesToAdd });
      api.stopCapturing();
      selectOnly([rec.id]);
      setEditingId(rec.id);
    },
    [api, selectOnly],
  );

  const addShape = useCallback(
    (shape: CanvasShape) => {
      if (!canWrite) return;
      const rec = newBox(shape, viewCentre());
      addAndEdit(shape === 'zone' ? rec : placeIn(rec));
    },
    [canWrite, addAndEdit, newBox, viewCentre, placeIn],
  );

  const addBeside = useCallback(
    (fromId: string, side: Side) => {
      const from = api.record(fromId);
      if (!canWrite || !from) return;
      const plain = from.shape === 'text' || from.shape === 'zone';
      const shape: CanvasShape = plain ? 'rect' : from.shape;
      const size = plain ? SHAPE_SIZE.rect : { w: from.w, h: from.h };
      // Beside it in the same place: its zone (positions there are relative to the zone) or the board.
      const others = api.records().nodes.filter((n) => n.id !== from.id && n.parent === from.parent);
      const at = besidePosition(from, side, size, others);
      const rec: CanvasNodeRecord = {
        ...newBox(shape, { x: 0, y: 0 }, { ...size, color: from.color, ...(from.kind && !plain ? { kind: from.kind } : {}) }),
        x: at.x,
        y: at.y,
        ...(from.parent ? { parent: from.parent } : {}),
      };
      addAndEdit(rec, [arrow(from.id, rec.id)]);
    },
    [canWrite, api, newBox, addAndEdit],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!canWrite || !c.source || !c.target || c.source === c.target || api.hasEdge(c.source, c.target)) return;
      api.insert({ edges: [arrow(c.source, c.target)] });
    },
    [canWrite, api],
  );

  const connectFrom = useRef<string | null>(null);
  const onConnectStart: OnConnectStart = useCallback((_e, params) => {
    connectFrom.current = params.nodeId;
  }, []);

  // A drag from a dot that didn't end on a dot: onto a box (anywhere) connects to it; onto empty
  // space makes a box there, connected.
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, state) => {
      const fromId = connectFrom.current;
      connectFrom.current = null;
      if (!canWrite || !fromId || state.isValid) return;
      const from = api.record(fromId);
      if (!from) return;
      const p = pointOf(event);
      const wrap = wrapRef.current;
      const hit = document
        .elementsFromPoint(p.x, p.y)
        .map((el) => el.closest('.react-flow__node'))
        .find((el): el is Element => !!el && !!wrap?.contains(el));
      const targetId = hit?.getAttribute('data-id');
      if (targetId) {
        if (targetId !== fromId && !api.hasEdge(fromId, targetId)) api.insert({ edges: [arrow(fromId, targetId)] });
        return;
      }
      if (!wrap || !wrap.contains(document.elementFromPoint(p.x, p.y))) return;
      const plain = from.shape === 'text' || from.shape === 'zone';
      const shape: CanvasShape = plain ? 'rect' : from.shape;
      const size = plain ? SHAPE_SIZE.rect : { w: from.w, h: from.h };
      const rec = placeIn(newBox(shape, rf.screenToFlowPosition(p), { ...size, color: from.color }));
      addAndEdit(rec, [arrow(fromId, rec.id)]);
    },
    [canWrite, api, rf, newBox, addAndEdit, placeIn],
  );

  /**
   * After a drag, a box (or zone) belongs to the innermost zone under its centre: dropped into a
   * zone it joins it, dragged out it leaves it. Its place on screen stays the same.
   */
  const regroup = useCallback(
    (dragged: FlowNode[]) => {
      if (!canWrite) return;
      const ids = new Set(dragged.map((n) => n.id));
      for (const n of dragged) {
        // Moved along with its zone: it stays in it.
        if (n.parentId && ids.has(n.parentId)) continue;
        const r = absRect(n.id);
        if (!r) continue;
        const zone = zoneAt({ x: r.x + r.w / 2, y: r.y + r.h / 2 }, [n.id]);
        if ((zone?.id ?? undefined) === n.data.parent) continue;
        api.updateNodes([n.id], () => ({
          parent: zone?.id,
          x: Math.round(zone ? r.x - zone.rect.x : r.x),
          y: Math.round(zone ? r.y - zone.rect.y : r.y),
        }));
      }
    },
    [canWrite, api, absRect, zoneAt],
  );

  const copySelection = useCallback((): Board | null => {
    const all = api.records();
    // A zone comes with what it holds; a box copied without its zone keeps its place on the board.
    const ids = withDescendants(
      selectedNodes.map((n) => n.id),
      all.nodes,
    );
    if (ids.size === 0) return null;
    const nodes = all.nodes
      .filter((n) => ids.has(n.id))
      .map((n) => {
        if (!n.parent || ids.has(n.parent)) return n;
        const r = absRect(n.id);
        const rest = omit(n, 'parent');
        return r ? { ...rest, x: Math.round(r.x), y: Math.round(r.y) } : rest;
      });
    return { nodes, edges: all.edges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
  }, [selectedNodes, api, absRect]);

  const pasteBoard = useCallback(
    (part: Board, offset: number) => {
      const fresh = rekeyBoard(part);
      let z = api.topZ();
      // Only top-level boxes shift; boxes in a copied zone move with it.
      const placed = { nodes: fresh.nodes.map((n) => ({ ...n, x: n.parent ? n.x : n.x + offset, y: n.parent ? n.y : n.y + offset, z: (z += 1) })), edges: fresh.edges };
      api.stopCapturing();
      api.insert(placed);
      api.stopCapturing();
      selectOnly(placed.nodes.map((n) => n.id));
    },
    [api, selectOnly],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea')) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const handled = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (e.key === 'Escape') {
        handled();
        if (selectedNodes.length > 0 || selectedEdges.length > 0) selectOnly([]);
        else if (full) onToggleFull();
        else wrapRef.current?.blur();
        return;
      }
      if (!canWrite) return;
      if (mod && key === 'z') {
        handled();
        if (e.shiftKey) api.redo();
        else api.undo();
      } else if (mod && key === 'y') {
        handled();
        api.redo();
      } else if (mod && key === 'a') {
        handled();
        selectOnly(nodes.map((n) => n.id));
      } else if (mod && key === 'd') {
        handled();
        const part = copySelection();
        if (part) pasteBoard(part, 24);
      } else if (mod && (key === 'c' || key === 'x')) {
        const part = copySelection();
        if (!part) return;
        handled();
        clipboard = part;
        pasteCount.current = 0;
        if (key === 'x') api.remove(part.nodes.map((n) => n.id));
      } else if (mod && key === 'v') {
        if (!clipboard) return;
        handled();
        pasteCount.current += 1;
        pasteBoard(clipboard, 24 * pasteCount.current);
      } else if (e.key === 'Enter' && !mod) {
        if (selectedNodes.length === 1) {
          handled();
          setEditingId(selectedNodes[0]!.id);
        } else if (soleEdgeId) {
          handled();
          setEditingId(soleEdgeId);
        }
      }
    },
    [canWrite, api, nodes, selectedNodes, selectedEdges, soleEdgeId, full, onToggleFull, selectOnly, copySelection, pasteBoard],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canWrite || !(e.target as HTMLElement).classList.contains('react-flow__pane')) return;
      // Inside a zone (its inside lets the pointer through to the pane) the box joins that zone.
      addAndEdit(placeIn(newBox('rect', rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }))));
    },
    [canWrite, addAndEdit, newBox, rf, placeIn],
  );

  const [tidying, setTidying] = useState(false);
  /** Lays the board out again with the server's engine (the agents' layout), as one undoable step. */
  const tidy = useCallback(async () => {
    if (!canWrite || tidying) return;
    const current = api.records();
    if (current.nodes.length === 0) return;
    setTidying(true);
    try {
      const { board: laid } = await layoutBoard(current);
      api.stopCapturing();
      api.applyLayout(laid);
      api.stopCapturing();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(() => void rf.fitView({ ...FIT, duration: reduce ? 0 : 200 }));
    } catch {
      toast.error('The board could not be tidied. Try again in a moment.');
    } finally {
      setTidying(false);
    }
  }, [canWrite, tidying, api, rf]);

  /** The board as an image file, drawn by the server (the same drawing an agent previews). */
  const save = useCallback(
    async (format: 'svg' | 'png') => {
      const current = api.records();
      if (current.nodes.length === 0) return;
      try {
        const theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
        const blob = await renderBoard(current, format, theme);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        toast.error(`The ${format.toUpperCase()} could not be made. Try again in a moment.`);
      }
    },
    [api],
  );

  const ctx = useMemo<CanvasCtx>(
    () => ({ editable: canWrite, editingId, setEditingId, api, markers, focusBoard, addBeside, multi: selectedNodes.length > 1 }),
    [canWrite, editingId, api, markers, focusBoard, addBeside, selectedNodes.length],
  );

  const empty = nodes.length === 0;
  const keys = active && canWrite;

  return (
    <CanvasContext.Provider value={ctx}>
      <div
        ref={wrapRef}
        className="cv"
        data-active={active || undefined}
        data-full={full || undefined}
        data-empty={empty || undefined}
        data-multi={selectedNodes.length > 1 || undefined}
        tabIndex={0}
        role="application"
        aria-label={canWrite ? 'Canvas. Double-click to add a box; Escape to leave.' : 'Canvas'}
        onFocus={() => setActive(true)}
        onBlur={(e) => {
          // Focus going into one of the board's own menus (a picker opens outside the board) stays in it.
          if (full || wrapRef.current?.contains(e.relatedTarget as Node | null) || (e.relatedTarget as Element | null)?.closest?.('.rc-picker')) return;
          setActive(false);
          setEditingId(null);
          selectOnly([]);
        }}
        onKeyDown={onKeyDown}
        onDoubleClick={onDoubleClick}
      >
        <svg className="cv-defs" width="0" height="0" aria-hidden focusable="false">
          <defs>
            {[markers.normal, markers.selected].map((id, i) => (
              <marker key={id} id={id} viewBox="0 0 12 12" refX="10.5" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                <path d="M1.5,2 L10.5,6 L1.5,10 Z" className={i === 0 ? 'cv-arrowhead' : 'cv-arrowhead cv-arrowhead--sel'} />
              </marker>
            ))}
          </defs>
        </svg>
        <ReactFlow<FlowNode, FlowEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDoubleClick={(_e, node) => canWrite && setEditingId(node.id)}
          onEdgeDoubleClick={(_e, edge) => canWrite && setEditingId(edge.id)}
          onNodeDragStart={() => api.stopCapturing()}
          onNodeDragStop={(_e, _node, dragged) => {
            regroup(dragged);
            api.stopCapturing();
          }}
          connectionMode={ConnectionMode.Loose}
          connectionLineComponent={ConnectionLine}
          connectOnClick={false}
          connectionRadius={28}
          fitView
          fitViewOptions={FIT}
          onMoveStart={(event) => {
            // Only the person's own pan or zoom (an event) stops the refits above; our fitView has none.
            if (event) viewTouched.current = true;
          }}
          minZoom={0.2}
          maxZoom={2}
          snapToGrid
          snapGrid={[8, 8]}
          nodesDraggable={canWrite}
          nodesConnectable={canWrite}
          elementsSelectable={canWrite}
          zoomOnDoubleClick={false}
          zoomOnScroll={false}
          panOnScroll={active}
          zoomOnPinch={active}
          preventScrolling={active}
          panOnDrag
          panActivationKeyCode={null}
          selectionKeyCode={keys ? 'Shift' : null}
          multiSelectionKeyCode={keys ? ['Shift', 'Meta', 'Control'] : null}
          deleteKeyCode={keys && !editingId ? ['Backspace', 'Delete'] : null}
          elevateNodesOnSelect={false}
          proOptions={{ hideAttribution: true }}
        />
        {canWrite && !editingId && !dragging && nodeAnchor && (
          <NodeBar
            selected={selectedNodes.map((n) => n.data)}
            anchor={nodeAnchor}
            onChange={(patch) => api.updateNodes(selectedNodes.map((n) => n.id), patch)}
            onDelete={() => api.remove(selectedNodes.map((n) => n.id))}
          />
        )}
        {canWrite && !editingId && soleEdge?.data && edgeAnchor && (
          <EdgeBar
            edge={soleEdge.data}
            anchor={edgeAnchor}
            // Choosing a path style replaces the engine's route with that style.
            onChange={(patch) => api.updateEdges([soleEdge.id], patch.path ? { ...patch, route: undefined } : patch)}
            onLabel={() => setEditingId(soleEdge.id)}
            onDelete={() => api.remove([], [soleEdge.id])}
          />
        )}
        {canWrite && <ToolBar onAdd={addShape} onTidy={empty ? undefined : () => void tidy()} tidying={tidying} />}
        <ViewBar full={full} onToggleFull={onToggleFull} onSave={empty ? undefined : (f) => void save(f)} />
        {empty && (
          <p className="cv-empty" aria-hidden>
            {canWrite ? 'Double-click to add a box, then drag from its dots to connect' : 'This canvas is empty'}
          </p>
        )}
      </div>
    </CanvasContext.Provider>
  );
}
