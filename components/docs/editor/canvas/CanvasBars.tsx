'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Check, ChevronDown, FileCode2, FileImage, Maximize2, Minimize2, Minus, Plus, Scan, StickyNote, Tag, Trash2, Type, WandSparkles } from 'lucide-react';
import { ARROWS, LINES, PATHS } from './CanvasEdge';
import { KIND_ICONS, KIND_LABEL } from './kindIcons';
import { RcPicker, type PickerOption } from '@/components/rc-ui/RcPicker';
import {
  CANVAS_COLORS,
  CANVAS_KINDS,
  type CanvasColor,
  type CanvasEdgeRecord,
  type CanvasKind,
  type CanvasNodeRecord,
  type CanvasShape,
  type CanvasTextSize,
} from '@/lib/editor/canvasBoard';

const NO_KIND = 'none';

/** "What is it": the icon a box shows (an agent sets it with `kind`; Ramin picks it here). */
const KIND_OPTIONS: PickerOption[] = [
  { value: NO_KIND, label: 'No icon' },
  ...CANVAS_KINDS.map((k) => {
    const Icon = KIND_ICONS[k];
    return { value: k, label: KIND_LABEL[k], icon: <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden /> };
  }),
];

// ─── Parts ─────────────────────────────────────────────────────────────

export function BarButton({
  label,
  pressed,
  onClick,
  children,
  wide,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      className={wide ? 'cv-btn cv-btn--wide' : 'cv-btn'}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export const BarSep = () => <span className="cv-sep" aria-hidden />;

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** Shape icons, drawn on the same 16 px grid and stroke as lucide's. */
export function ShapeIcon({ shape }: { shape: CanvasShape }) {
  if (shape === 'sticky') return <StickyNote className="h-4 w-4" strokeWidth={1.75} aria-hidden />;
  if (shape === 'text') return <Type className="h-4 w-4" strokeWidth={1.75} aria-hidden />;
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden {...stroke}>
      {shape === 'rect' && <rect x="2.25" y="3.75" width="11.5" height="8.5" rx="1.75" />}
      {shape === 'rounded' && <rect x="2.25" y="3.75" width="11.5" height="8.5" rx="3.25" />}
      {shape === 'pill' && <rect x="1.5" y="4.5" width="13" height="7" rx="3.5" />}
      {shape === 'queue' && (
        <>
          <path d="M3.75 4.25h8.5c1.05 0 1.9 1.68 1.9 3.75s-.85 3.75-1.9 3.75h-8.5c-1.05 0-1.9-1.68-1.9-3.75s.85-3.75 1.9-3.75Z" />
          <path d="M12.25 4.25c-1.05 0-1.9 1.68-1.9 3.75s.85 3.75 1.9 3.75" />
        </>
      )}
      {shape === 'zone' && (
        <>
          <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
          <path d="M4.5 5.75h3.5" />
        </>
      )}
      {shape === 'ellipse' && <ellipse cx="8" cy="8" rx="6.25" ry="4.5" />}
      {shape === 'diamond' && <path d="M8 2.25 13.75 8 8 13.75 2.25 8Z" />}
      {shape === 'cylinder' && (
        <>
          <ellipse cx="8" cy="4.25" rx="5" ry="1.9" />
          <path d="M3 4.25v7.5c0 1.05 2.24 1.9 5 1.9s5-.85 5-1.9v-7.5" />
        </>
      )}
    </svg>
  );
}

export const SHAPE_LABEL: Record<CanvasShape, string> = {
  rect: 'Box',
  rounded: 'Rounded box',
  pill: 'Pill',
  ellipse: 'Ellipse',
  diamond: 'Decision',
  cylinder: 'Database',
  queue: 'Queue',
  sticky: 'Sticky note',
  text: 'Text',
  zone: 'Zone',
};

const COLOR_LABEL: Record<CanvasColor, string> = {
  default: 'Default',
  gray: 'Gray',
  blue: 'Blue',
  green: 'Green',
  yellow: 'Yellow',
  red: 'Red',
};

/** The shapes you can add from the tool bar (the others come from a box's shape menu), then a zone. */
export const TOOL_SHAPES: CanvasShape[] = ['rect', 'ellipse', 'diamond', 'cylinder', 'sticky', 'text'];
const SHAPE_MENU: CanvasShape[] = ['rect', 'rounded', 'pill', 'ellipse', 'diamond', 'cylinder', 'queue', 'sticky', 'text'];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A bar that floats over the selection (flow coordinates in `anchor`): centred above it, or below
 * when there is no room above, and always kept inside the board.
 */
function FloatingBar({ anchor, className, label, children }: { anchor: Rect; className: string; label: string; children: ReactNode }) {
  const [tx, ty, zoom] = useStore((s) => s.transform);
  const boardW = useStore((s) => s.width);
  const boardH = useStore((s) => s.height);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const left = anchor.x * zoom + tx;
  const top = anchor.y * zoom + ty;
  const gap = 12;
  const x = Math.max(8, Math.min(left + (anchor.w * zoom) / 2 - size.w / 2, boardW - size.w - 8));
  let y = top - size.h - gap;
  if (y < 8) y = top + anchor.h * zoom + gap;
  y = Math.max(8, Math.min(y, boardH - size.h - 8));
  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={label}
      className={className}
      data-low={y > boardH / 2 || undefined}
      style={{ left: x, top: y, visibility: size.w ? 'visible' : 'hidden' }}
    >
      {children}
    </div>
  );
}

// ─── Bars ──────────────────────────────────────────────────────────────

/** Top left: add a box of a shape, or a zone to group boxes in; tidy the whole board. */
export function ToolBar({ onAdd, onTidy, tidying }: { onAdd: (shape: CanvasShape) => void; onTidy?: () => void; tidying?: boolean }) {
  return (
    <div className="cv-bar cv-bar--tools" role="toolbar" aria-label="Add to the canvas">
      {TOOL_SHAPES.map((shape) => (
        <BarButton key={shape} label={`Add ${SHAPE_LABEL[shape].toLowerCase()}`} onClick={() => onAdd(shape)}>
          <ShapeIcon shape={shape} />
        </BarButton>
      ))}
      <BarSep />
      <BarButton label="Add a zone (drop boxes in it to group them)" onClick={() => onAdd('zone')}>
        <ShapeIcon shape="zone" />
      </BarButton>
      {onTidy && (
        <>
          <BarSep />
          <BarButton label={tidying ? 'Tidying up…' : 'Tidy up: lay the board out again (Ctrl Z undoes it)'} pressed={tidying} onClick={onTidy}>
            <WandSparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
        </>
      )}
    </div>
  );
}

/** Bottom right: zoom, fit, save as an image, full screen. */
export function ViewBar({ full, onToggleFull, onSave }: { full: boolean; onToggleFull: () => void; onSave?: (format: 'svg' | 'png') => void }) {
  const rf = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const duration = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200;
  return (
    <div className="cv-bar cv-bar--view" role="toolbar" aria-label="View">
      <BarButton label="Zoom out" onClick={() => void rf.zoomOut({ duration })}>
        <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </BarButton>
      <BarButton label="Zoom to 100%" wide onClick={() => void rf.zoomTo(1, { duration })}>
        <span className="cv-zoom">{Math.round(zoom * 100)}%</span>
      </BarButton>
      <BarButton label="Zoom in" onClick={() => void rf.zoomIn({ duration })}>
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </BarButton>
      <BarButton label="Fit everything in view" onClick={() => void rf.fitView({ duration, padding: 0.12, maxZoom: 1 })}>
        <Scan className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </BarButton>
      {onSave && (
        <>
          <BarSep />
          <BarButton label="Save as SVG" onClick={() => onSave('svg')}>
            <FileCode2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
          <BarButton label="Save as PNG" onClick={() => onSave('png')}>
            <FileImage className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </BarButton>
        </>
      )}
      <BarSep />
      <BarButton label={full ? 'Exit full screen' : 'Full screen'} onClick={onToggleFull}>
        {full ? <Minimize2 className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : <Maximize2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
      </BarButton>
    </div>
  );
}

/** Above the selected boxes: shape, colour, text size, delete. */
export function NodeBar({
  selected,
  anchor,
  onChange,
  onDelete,
}: {
  selected: CanvasNodeRecord[];
  anchor: Rect;
  onChange: (patch: Partial<CanvasNodeRecord>) => void;
  onDelete: () => void;
}) {
  const [shapesOpen, setShapesOpen] = useState(false);
  const first = selected[0];
  if (!first) return null;
  const same = <K extends keyof CanvasNodeRecord>(key: K) => (selected.every((n) => n[key] === first[key]) ? first[key] : undefined);
  const shape = same('shape') as CanvasShape | undefined;
  const color = same('color') as CanvasColor | undefined;
  const kind = same('kind') as CanvasKind | undefined;
  const KindNow = kind ? KIND_ICONS[kind] : null;
  const allText = selected.every((n) => n.shape === 'text');
  const allZones = selected.every((n) => n.shape === 'zone');
  const anyZone = selected.some((n) => n.shape === 'zone');
  const size = allText ? ((same('size') as CanvasTextSize | undefined) ?? (selected.every((n) => !n.size) ? 'm' : undefined)) : undefined;

  return (
    <FloatingBar anchor={anchor} className="cv-bar cv-bar--node nodrag nopan" label={allZones ? 'Selected zones' : 'Selected boxes'}>
      {!anyZone && (
      <div className="cv-menu-anchor">
        <button
          type="button"
          className="cv-btn cv-btn--wide"
          aria-label="Shape"
          title="Shape"
          aria-expanded={shapesOpen}
          onClick={() => setShapesOpen((o) => !o)}
        >
          {shape ? <ShapeIcon shape={shape} /> : <ShapeIcon shape="rect" />}
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </button>
        {shapesOpen && (
          <div className="cv-menu" role="menu" aria-label="Shape">
            {SHAPE_MENU.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitemradio"
                aria-checked={shape === s}
                className="cv-menu-item"
                onClick={() => {
                  onChange({ shape: s });
                  setShapesOpen(false);
                }}
              >
                <ShapeIcon shape={s} />
                <span>{SHAPE_LABEL[s]}</span>
                {shape === s && <Check className="ml-auto h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
              </button>
            ))}
          </div>
        )}
      </div>
      )}
      {!anyZone && (
        <RcPicker
          label="What it is (its icon)"
          options={KIND_OPTIONS}
          value={kind ?? (selected.every((n) => !n.kind) ? NO_KIND : null)}
          onChange={(v) => onChange({ kind: v === NO_KIND ? undefined : (v as CanvasKind) })}
          searchPlaceholder="Database, cache, queue…"
          searchable
          width={220}
        >
          <button type="button" className="cv-btn cv-btn--wide" title="What it is (its icon)">
            {KindNow ? <KindNow className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : <Tag className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        </RcPicker>
      )}
      {!anyZone && <BarSep />}
      <div className="cv-swatches" role="radiogroup" aria-label="Colour">
        {CANVAS_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={COLOR_LABEL[c]}
            title={COLOR_LABEL[c]}
            className="cv-swatch"
            data-color={c}
            onClick={() => onChange({ color: c })}
          >
            <span aria-hidden />
          </button>
        ))}
      </div>
      {allText && (
        <>
          <BarSep />
          {(['s', 'm', 'l'] as const).map((s) => (
            <BarButton key={s} label={s === 's' ? 'Small text' : s === 'm' ? 'Medium text' : 'Large text'} pressed={size === s} onClick={() => onChange({ size: s })}>
              <span className="cv-size" data-size={s}>
                A
              </span>
            </BarButton>
          ))}
        </>
      )}
      <BarSep />
      <BarButton
        label={allZones ? (selected.length > 1 ? `Delete ${selected.length} zones and what they hold` : 'Delete the zone and what it holds') : selected.length > 1 ? `Delete ${selected.length} boxes` : 'Delete the box'}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </BarButton>
    </FloatingBar>
  );
}

/** Above the selected arrow: line, arrowheads, path, label, delete. */
export function EdgeBar({
  edge,
  anchor,
  onChange,
  onLabel,
  onDelete,
}: {
  edge: CanvasEdgeRecord;
  anchor: Rect;
  onChange: (patch: Partial<CanvasEdgeRecord>) => void;
  onLabel: () => void;
  onDelete: () => void;
}) {
  return (
    <FloatingBar anchor={anchor} className="cv-bar cv-bar--edge nodrag nopan" label="Selected arrow">
      {LINES.map((o) => (
        <BarButton key={o.value} label={o.label} pressed={edge.line === o.value} onClick={() => onChange({ line: o.value })}>
          {o.icon}
        </BarButton>
      ))}
      <BarSep />
      {ARROWS.map((o) => (
        <BarButton key={o.value} label={o.label} pressed={edge.arrow === o.value} onClick={() => onChange({ arrow: o.value })}>
          {o.icon}
        </BarButton>
      ))}
      <BarSep />
      {PATHS.map((o) => (
        <BarButton key={o.value} label={o.label} pressed={edge.path === o.value} onClick={() => onChange({ path: o.value })}>
          {o.icon}
        </BarButton>
      ))}
      <BarSep />
      <BarButton label={edge.label ? 'Edit the label' : 'Add a label'} onClick={onLabel}>
        <Type className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </BarButton>
      <BarButton label="Delete the arrow" onClick={onDelete}>
        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </BarButton>
    </FloatingBar>
  );
}
