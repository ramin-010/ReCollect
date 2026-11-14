'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileImage, FileCode2, Minimize2, Minus, Plus, Scan } from 'lucide-react';
import { rcScope } from '@/components/rc-ui';
import { BarButton, BarSep } from './canvas/CanvasBars';
import { downloadPng, downloadSvg, sizedSvg } from '@/lib/editor/diagramExport';

type View = { x: number; y: number; k: number };

const ZOOM = { min: 0.1, max: 8 };
const clampK = (k: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, k));

/**
 * A drawn diagram in full screen, the same float layer as a canvas: the wheel zooms around the
 * pointer, a drag pans, the bar zooms, fits and saves it as SVG or PNG. Escape closes it.
 */
export function DiagramFull({ svg, name, onClose }: { svg: string; name: string; onClose: () => void }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [failed, setFailed] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // Drawn at its own size inside the stage; the stage's transform does the zoom.
  const sized = useMemo(() => sizedSvg(svg), [svg]);

  const fit = useCallback(() => {
    const el = viewRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const k = clampK(Math.min((r.width - 96) / sized.w, (r.height - 120) / sized.h, 1.5));
    setView({ k, x: (r.width - sized.w * k) / 2, y: (r.height - sized.h * k) / 2 - 20 });
  }, [sized]);

  useLayoutEffect(() => fit(), [fit]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const el = viewRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = px ?? r.width / 2;
    const cy = py ?? r.height / 2;
    setView((v) => {
      const k = clampK(v.k * factor);
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });
  }, []);

  // The wheel zooms (a listener that may prevent the page from scrolling, which React's isn't).
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') zoomAt(1.2);
      else if (e.key === '-') zoomAt(1 / 1.2);
      else if (e.key === '0') fit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomAt, fit]);

  const background = () => getComputedStyle(viewRef.current ?? document.body).getPropertyValue('--rc-surface').trim() || '#ffffff';
  const savePng = async () => {
    try {
      setFailed(null);
      await downloadPng(svg, name, background());
    } catch {
      setFailed('This browser would not turn the diagram into a PNG. Save it as SVG instead.');
    }
  };

  return createPortal(
    <div
      className={`${rcScope} doc-canvas-full`}
      role="dialog"
      aria-modal="true"
      aria-label="Diagram, full screen"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="doc-canvas-full-panel doc-diagram-full">
        <div
          ref={viewRef}
          className="doc-diagram-view"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          <div
            ref={stageRef}
            className="doc-diagram-stage"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
            // Mermaid's strict security level sanitised this SVG (no scripts, no HTML labels).
            dangerouslySetInnerHTML={{ __html: sized.text }}
          />
        </div>
        {failed && <p className="doc-diagram-full-note">{failed}</p>}
        <div className="cv-bar cv-bar--view doc-diagram-full-bar" role="toolbar" aria-label="Diagram view">
          <BarButton label="Zoom out" onClick={() => zoomAt(1 / 1.2)}>
            <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
          <BarButton label="Zoom to 100%" wide onClick={() => zoomAt(1 / view.k)}>
            <span className="cv-zoom">{Math.round(view.k * 100)}%</span>
          </BarButton>
          <BarButton label="Zoom in" onClick={() => zoomAt(1.2)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
          <BarButton label="Fit the diagram in view" onClick={fit}>
            <Scan className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
          <BarSep />
          <BarButton label="Save as SVG" onClick={() => downloadSvg(svg, name, background())}>
            <FileCode2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
          <BarButton label="Save as PNG" onClick={() => void savePng()}>
            <FileImage className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
          <BarSep />
          <BarButton label="Exit full screen" onClick={onClose}>
            <Minimize2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
