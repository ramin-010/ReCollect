'use client';

import { memo, useEffect, useRef } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import type { CanvasShape } from '@/lib/editor/canvasBoard';
import { focusWhenVisible, useCanvasCtx } from './canvasContext';
import { KindIcon } from './kindIcons';
import type { FlowNode } from './useCanvasBoard';

export const SIDES = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
] as const;

/** Ellipse, diamond, cylinder and queue are drawn; the others are the box itself. */
function Outline({ shape }: { shape: CanvasShape }) {
  if (shape !== 'ellipse' && shape !== 'diamond' && shape !== 'cylinder' && shape !== 'queue') return null;
  return (
    <svg className="cv-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {shape === 'ellipse' && <ellipse cx="50" cy="50" rx="49.5" ry="49.5" />}
      {shape === 'diamond' && <polygon points="50,0.6 99.4,50 50,99.4 0.6,50" />}
      {shape === 'cylinder' && (
        <>
          <path d="M0.6,11 C0.6,-1.6 99.4,-1.6 99.4,11 L99.4,89 C99.4,101.6 0.6,101.6 0.6,89 Z" />
          <path className="cv-rim" d="M0.6,11 C0.6,23.6 99.4,23.6 99.4,11" />
        </>
      )}
      {shape === 'queue' && (
        <>
          {/* A pipe lying on its side: the rim is the right end, where messages leave. */}
          <path d="M8,0.6 L92,0.6 C101,0.6 101,99.4 92,99.4 L8,99.4 C-1,99.4 -1,0.6 8,0.6 Z" />
          <path className="cv-rim" d="M92,0.6 C83,0.6 83,99.4 92,99.4" />
        </>
      )}
    </svg>
  );
}

function LabelEditor({ id, text }: { id: string; text: string }) {
  const { api, setEditingId, focusBoard } = useCanvasCtx();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => focusWhenVisible(ref.current), []);
  const done = () => {
    api.stopCapturing();
    setEditingId(null);
    focusBoard();
  };
  return (
    <textarea
      ref={ref}
      className="cv-label cv-label-edit nodrag nopan nowheel"
      value={text}
      rows={1}
      placeholder="Add text"
      aria-label="Box text"
      spellCheck
      onChange={(e) => api.updateNodes([id], { text: e.target.value.slice(0, 1000) })}
      onBlur={() => {
        api.stopCapturing();
        setEditingId(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          e.stopPropagation();
          done();
        }
      }}
    />
  );
}

/** A box on the board: its shape, its text (double-click or Enter to type), side dots to connect, and resize handles. */
export const ShapeNode = memo(function ShapeNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { editable, editingId, addBeside, multi } = useCanvasCtx();
  const editing = editingId === id;
  return (
    <div
      className="cv-node"
      data-shape={data.shape}
      data-color={data.color}
      data-size={data.shape === 'text' ? (data.size ?? 'm') : undefined}
      data-kind={data.kind}
      data-selected={selected || undefined}
      data-editing={editing || undefined}
      style={{ minHeight: data.h }}
    >
      <Outline shape={data.shape} />
      {editing ? (
        <LabelEditor id={id} text={data.text} />
      ) : data.kind ? (
        <div className="cv-label cv-label--kind">
          <KindIcon kind={data.kind} />
          <span>{data.text}</span>
        </div>
      ) : (
        <div className="cv-label">{data.text}</div>
      )}
      {editable && !multi && (
        <NodeResizer
          isVisible={!!selected && !editing}
          minWidth={32}
          minHeight={24}
          handleClassName="cv-resize-handle"
          lineClassName="cv-resize-line"
        />
      )}
      {/* Always there (arrows attach to a box through its handles); shown only where you can connect. */}
      {SIDES.map((s) => (
        <Handle
          key={s.id}
          id={s.id}
          type="source"
          position={s.position}
          isConnectable={editable && !multi}
          className="cv-handle"
          title={editable ? 'Drag to connect · click to add a box here' : undefined}
          onClick={(e) => {
            if (!editable) return;
            e.stopPropagation();
            addBeside(id, s.id);
          }}
        />
      ))}
    </div>
  );
});
