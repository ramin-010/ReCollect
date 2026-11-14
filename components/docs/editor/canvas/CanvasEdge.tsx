'use client';

import { memo, useEffect, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, useInternalNode, type EdgeProps } from '@xyflow/react';
import { ArrowLeftRight, ArrowRight, CornerDownRight, Minus, Slash, Spline } from 'lucide-react';
import type { CanvasArrow, CanvasLine, CanvasPath } from '@/lib/editor/canvasBoard';
import { focusWhenVisible, useCanvasCtx } from './canvasContext';
import { edgePath, routePath } from './canvasGeometry';
import type { FlowEdge } from './useCanvasBoard';

export function LineIcon({ dashed }: { dashed?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M2.5 8h11" strokeDasharray={dashed ? '2.5 2.5' : undefined} />
    </svg>
  );
}

export const LINES: Array<{ value: CanvasLine; label: string; icon: React.ReactNode }> = [
  { value: 'solid', label: 'Solid line', icon: <LineIcon /> },
  { value: 'dashed', label: 'Dashed line', icon: <LineIcon dashed /> },
];
export const ARROWS: Array<{ value: CanvasArrow; label: string; icon: React.ReactNode }> = [
  { value: 'end', label: 'Arrow at the end', icon: <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
  { value: 'both', label: 'Arrows at both ends', icon: <ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
  { value: 'none', label: 'No arrowheads', icon: <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
];
export const PATHS: Array<{ value: CanvasPath; label: string; icon: React.ReactNode }> = [
  { value: 'straight', label: 'Straight', icon: <Slash className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
  { value: 'curved', label: 'Curved', icon: <Spline className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
  { value: 'elbow', label: 'Elbow', icon: <CornerDownRight className="h-4 w-4" strokeWidth={1.75} aria-hidden /> },
];

function EdgeLabelInput({ id, label }: { id: string; label: string }) {
  const { api, setEditingId, focusBoard } = useCanvasCtx();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => focusWhenVisible(ref.current, 'all'), []);
  return (
    <input
      ref={ref}
      className="cv-edge-input nodrag nopan"
      value={label}
      placeholder="Label"
      aria-label="Arrow label"
      size={Math.max(6, label.length + 1)}
      onChange={(e) => api.updateEdges([id], { label: e.target.value.slice(0, 200) })}
      onBlur={() => {
        api.stopCapturing();
        setEditingId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          api.stopCapturing();
          setEditingId(null);
          focusBoard();
        }
      }}
    />
  );
}

/** An arrow between two boxes: it leaves and meets their outlines wherever they sit, with an optional label. */
export const CanvasEdge = memo(function CanvasEdge({ id, source, target, data, selected }: EdgeProps<FlowEdge>) {
  const ctx = useCanvasCtx();
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t || !data) return null;
  // The layout engine's route while its boxes stay put (the board drops it when one moves).
  const { d, labelX, labelY } = data.route ? routePath(data.route.points, data.route.label) : edgePath(s, t, data.path);
  const editing = ctx.editingId === id;
  const marker = `url(#${selected ? ctx.markers.selected : ctx.markers.normal})`;

  return (
    <>
      <BaseEdge
        id={id}
        path={d}
        className={data.line === 'dashed' ? 'cv-edge-path cv-edge-dashed' : 'cv-edge-path'}
        markerEnd={data.arrow !== 'none' ? marker : undefined}
        markerStart={data.arrow === 'both' ? marker : undefined}
        interactionWidth={18}
      />
      {(data.label || editing) && (
        <EdgeLabelRenderer>
          <div
            className="cv-edge-label nodrag nopan"
            data-selected={selected || undefined}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onDoubleClick={(e) => {
              if (!ctx.editable) return;
              e.stopPropagation();
              ctx.setEditingId(id);
            }}
          >
            {editing ? <EdgeLabelInput id={id} label={data.label} /> : data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
