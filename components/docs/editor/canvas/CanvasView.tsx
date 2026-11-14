'use client';

import '@xyflow/react/dist/base.css';
import './canvas.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Minimize2 } from 'lucide-react';
import { rcScope } from '@/components/rc-ui';
import { CANVAS_HEIGHT, EMPTY_BOARD, clampCanvasHeight, editorYDoc, sanitizeBoard } from '@/lib/editor/canvasBoard';
import { CanvasBoard } from './CanvasBoard';

/**
 * The canvas block in a doc: the board at the block's height (drag the bottom edge to change
 * it) and a full-screen mode. Live when the editor has the doc's Y.Doc; otherwise the board
 * travels in `attrs.data` and shows read-only.
 */
export function CanvasView({ node, editor, updateAttributes, selected }: NodeViewProps) {
  const canvasId = typeof node.attrs.canvasId === 'string' && node.attrs.canvasId ? (node.attrs.canvasId as string) : null;
  const ydoc = editorYDoc(editor);
  const live = !!ydoc && !!canvasId;
  const rawData = node.attrs.data as unknown;
  const board = useMemo(() => (live || !rawData ? EMPTY_BOARD : sanitizeBoard(rawData)), [live, rawData]);
  const editable = editor.isEditable && live;
  const height = clampCanvasHeight(node.attrs.height);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [full, setFull] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const grip = e.currentTarget;
      const startY = e.clientY;
      const clamp = (y: number) => Math.min(CANVAS_HEIGHT.max, Math.max(CANVAS_HEIGHT.min, Math.round((height + y - startY) / 8) * 8));
      grip.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => setDragHeight(clamp(ev.clientY));
      const up = (ev: PointerEvent) => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        const next = clamp(ev.clientY);
        setDragHeight(null);
        if (next !== height) updateAttributes({ height: next });
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    },
    [height, updateAttributes],
  );

  const exitFull = useCallback(() => {
    setFull(false);
    requestAnimationFrame(() => surfaceRef.current?.querySelector<HTMLElement>('.cv')?.focus({ preventScroll: true }));
  }, []);

  const boardProps = { ydoc: live ? ydoc : null, canvasId: live ? canvasId : null, board, editable };

  return (
    <NodeViewWrapper className="doc-canvas" data-selected={selected || undefined}>
      <div ref={surfaceRef} className="doc-canvas-surface" style={{ height: dragHeight ?? height }}>
        {full ? (
          <div className="doc-canvas-away">
            <p>This canvas is open in full screen.</p>
            <button type="button" className="rc-btn rc-btn--sm" onClick={exitFull}>
              <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Exit full screen
            </button>
          </div>
        ) : (
          <CanvasBoard key={canvasId ?? 'static'} {...boardProps} full={false} onToggleFull={() => setFull(true)} />
        )}
      </div>
      {editable && !full && (
        <div
          className="doc-canvas-grip"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Drag to change the canvas height"
          aria-valuemin={CANVAS_HEIGHT.min}
          aria-valuemax={CANVAS_HEIGHT.max}
          aria-valuenow={dragHeight ?? height}
          onPointerDown={startResize}
        />
      )}
      {full &&
        createPortal(
          <div
            className={`${rcScope} doc-canvas-full`}
            role="dialog"
            aria-modal="true"
            aria-label="Canvas, full screen"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) exitFull();
            }}
          >
            <div className="doc-canvas-full-panel">
              <CanvasBoard key={`full-${canvasId ?? 'static'}`} {...boardProps} full onToggleFull={exitFull} />
            </div>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
