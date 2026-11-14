'use client';

import { memo, useEffect, useRef } from 'react';
import { Handle, NodeResizer, type NodeProps } from '@xyflow/react';
import { focusWhenVisible, useCanvasCtx } from './canvasContext';
import { SIDES } from './ShapeNode';
import type { FlowNode } from './useCanvasBoard';

function TitleEditor({ id, text }: { id: string; text: string }) {
  const { api, setEditingId, focusBoard } = useCanvasCtx();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => focusWhenVisible(ref.current, 'all'), []);
  return (
    <input
      ref={ref}
      className="cv-zone-title cv-zone-title-edit nodrag nopan"
      value={text}
      placeholder="Zone name"
      aria-label="Zone name"
      onChange={(e) => api.updateNodes([id], { text: e.target.value.slice(0, 200) })}
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

/**
 * A zone: a frame that holds boxes ("API tier", "VPC"). Moving it by its title moves what it holds.
 * Its inside lets the pointer through, so you can pan, select and add boxes in it as on the board.
 */
export const ZoneNode = memo(function ZoneNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { editable, editingId, setEditingId, multi } = useCanvasCtx();
  const editing = editingId === id;
  return (
    <div className="cv-zone" data-color={data.color} data-selected={selected || undefined}>
      {editing ? (
        <TitleEditor id={id} text={data.text} />
      ) : (
        <div
          className="cv-zone-title"
          title={editable ? 'Drag to move the zone · double-click to rename' : undefined}
          onDoubleClick={(e) => {
            if (!editable) return;
            e.stopPropagation();
            setEditingId(id);
          }}
        >
          {data.text || (editable ? 'Untitled zone' : '')}
        </div>
      )}
      {editable && !multi && (
        <NodeResizer
          isVisible={!!selected && !editing}
          minWidth={120}
          minHeight={80}
          handleClassName="cv-resize-handle"
          lineClassName="cv-resize-line"
        />
      )}
      {SIDES.map((s) => (
        <Handle key={s.id} id={s.id} type="source" position={s.position} isConnectable={editable && !multi} className="cv-handle cv-handle--zone" />
      ))}
    </div>
  );
});
