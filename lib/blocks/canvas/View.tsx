'use client';

import '@xyflow/react/dist/base.css';
import '@/components/docs/editor/canvas/canvas.css';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createReactBlockSpec } from '@blocknote/react';
import { Minimize2 } from 'lucide-react';
import type * as Y from 'yjs';
import { rcScope } from '@/components/rc-ui';
import { CANVAS_HEIGHT, EMPTY_BOARD, clampCanvasHeight } from '@/lib/editor/canvasBoard';
import { CanvasBoard } from '@/components/docs/editor/canvas/CanvasBoard';
import { canvasBlockConfig } from './spec';

/** The doc's live Y.Doc, for blocks whose data lives in root maps beside the block fragment. */
export const BlockDocContext = createContext<Y.Doc | null>(null);

/** The Y.Doc behind the editor's collaboration fragment (works even where React context doesn't reach). */
function editorYDoc(editor: unknown): Y.Doc | null {
  const ext = (editor as { getExtension?: (k: string) => unknown }).getExtension?.('collaboration') as { fragment?: Y.XmlFragment } | undefined;
  return ext?.fragment?.doc ?? null;
}

/**
 * The board at the block's height (drag the bottom edge: 8 px steps, kept within CANVAS_HEIGHT)
 * and full screen on the float layer, as in the old editor's canvas (components/docs/editor/canvas).
 */
function CanvasBlockView({ canvasId, height, editable, ydoc, onHeight }: { canvasId: string; height: number; editable: boolean; ydoc: Y.Doc | null; onHeight: (h: number) => void }) {
  const live = !!ydoc && !!canvasId;
  const canEdit = editable && live;
  const shown = clampCanvasHeight(height);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [full, setFull] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const grip = e.currentTarget;
      const startY = e.clientY;
      const clamp = (y: number) => Math.min(CANVAS_HEIGHT.max, Math.max(CANVAS_HEIGHT.min, Math.round((shown + y - startY) / 8) * 8));
      grip.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => setDragHeight(clamp(ev.clientY));
      const up = (ev: PointerEvent) => {
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        const next = clamp(ev.clientY);
        setDragHeight(null);
        if (next !== shown) onHeight(next);
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    },
    [shown, onHeight],
  );

  const exitFull = useCallback(() => {
    setFull(false);
    requestAnimationFrame(() => surfaceRef.current?.querySelector<HTMLElement>('.cv')?.focus({ preventScroll: true }));
  }, []);

  const boardProps = { ydoc: live ? ydoc : null, canvasId: live ? canvasId : null, board: EMPTY_BOARD, editable: canEdit };

  return (
    <div className={`${rcScope} doc-canvas`} contentEditable={false} data-canvas-id={canvasId || undefined} data-live={live || undefined}>
      <div ref={surfaceRef} className="doc-canvas-surface" style={{ height: dragHeight ?? shown }}>
        {full ? (
          <div className="doc-canvas-away">
            <p>This canvas is open in full screen.</p>
            <button type="button" className="rc-btn rc-btn--sm" onClick={exitFull}>
              <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Exit full screen
            </button>
          </div>
        ) : (
          <CanvasBoard key={canvasId || 'static'} {...boardProps} full={false} onToggleFull={() => setFull(true)} />
        )}
      </div>
      {canEdit && !full && (
        <div
          className="doc-canvas-grip"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Drag to change the canvas height"
          aria-valuemin={CANVAS_HEIGHT.min}
          aria-valuemax={CANVAS_HEIGHT.max}
          aria-valuenow={dragHeight ?? shown}
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
              <CanvasBoard key={`full-${canvasId || 'static'}`} {...boardProps} full onToggleFull={exitFull} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

type CanvasEditor = { isEditable: boolean; updateBlock: (id: string, update: { props: { height: number } }) => void };

function CanvasBlock({ blockId, canvasId, height, editor }: { blockId: string; canvasId: string; height: number; editor: CanvasEditor }) {
  const fromContext = useContext(BlockDocContext);
  const onHeight = useCallback((h: number) => editor.updateBlock(blockId, { props: { height: h } }), [editor, blockId]);
  return <CanvasBlockView canvasId={canvasId} height={height} editable={editor.isEditable} ydoc={fromContext ?? editorYDoc(editor)} onHeight={onHeight} />;
}

/** The canvas as a BlockNote block: the same board component the old editor uses, its height grip and full screen. */
export const canvasBlock = createReactBlockSpec(canvasBlockConfig, {
  render: ({ block, editor }) => (
    <CanvasBlock blockId={block.id} canvasId={String(block.props.canvasId ?? '')} height={Number(block.props.height ?? 440)} editor={editor as unknown as CanvasEditor} />
  ),
});
