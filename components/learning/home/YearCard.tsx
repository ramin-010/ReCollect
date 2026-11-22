'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMinutes } from '@/lib/learning/sessionLog';
import { cellLevel, dayName, dayWords } from '@/lib/learning/stand';
import type { DayString, StandData, StandDay } from '@/lib/learning/types';
import { RcSkel } from '@/components/rc-ui';
import { cn } from '@/lib/utils';

const FILL = ['var(--rc-heat-0)', 'var(--rc-heat-1)', 'var(--rc-heat-2)', 'var(--rc-heat-3)', 'var(--rc-heat-4)'] as const;
/** An inactive day in the record: a clear step off the card, so each month's shape reads (the owner, 11-22). */
const EMPTY = 'color-mix(in srgb, var(--rc-ink-1) 10%, transparent)';
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const GAP = 2;
const WEEKEND_GAP = 4;
const MIN_MONTH_GAP = 6;
const LABEL_H = 20;

const dayOf = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10) as DayString;

interface Month {
  y: number;
  m: number;
  days: number;
  /** Monday-based weekday of its 1st (0 = Monday). */
  lead: number;
  cols: number;
}

/** The 12 months ending with today's, oldest first. */
function monthsTo(today: DayString): Month[] {
  const ty = Number(today.slice(0, 4));
  const tm = Number(today.slice(5, 7)) - 1;
  const out: Month[] = [];
  for (let k = 11; k >= 0; k--) {
    const at = new Date(Date.UTC(ty, tm - k, 1));
    const y = at.getUTCFullYear();
    const m = at.getUTCMonth();
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const lead = (at.getUTCDay() + 6) % 7;
    out.push({ y, m, days, lead, cols: Math.ceil((lead + days) / 7) });
  }
  return out;
}

/**
 * The year as a card (the owner's final, 11-22): the last 12 months as 12 small calendar blocks that
 * fill the card's width, each month's name under it (this month in full ink); the weekend set a little
 * apart from the weekdays instead of weekday letters. A day fills green when it was active, greener
 * with more time logged, and a clear grey when it wasn't; days before the record and days still to
 * come are faint. On a quiet tint, no border, no shadow. Hover a day for what made it count.
 */
export function YearCard({ stand, top, bottom, pointed }: { stand: StandData | null | 'failed'; top?: React.ReactNode; bottom?: React.ReactNode; pointed?: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(620);
  const [at, setAt] = useState<{ x: number; y: number; text: string } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(() => {
    if (!stand || stand === 'failed') return null;
    const months = monthsTo(stand.today);
    const totalCols = months.reduce((n, m) => n + m.cols, 0);
    // The largest cell that fits, then the months spread so the grid spans the card exactly.
    // Not rounded down to whole pixels (the owner, 11-22: the cells a little bigger, the month gaps take less).
    const cell = Math.max(4, (width - 11 * MIN_MONTH_GAP + 12 * GAP) / totalCols - GAP);
    const blocks = months.map((m) => m.cols * (cell + GAP) - GAP);
    const monthGap = (width - blocks.reduce((a, b) => a + b, 0)) / 11;
    const byDay = new Map(stand.days.map((d) => [d.day, d]));
    const cells: Array<{ x: number; y: number; day: DayString; data: StandDay | null; state: 'pre' | 'future' | 'day' }> = [];
    const labels: Array<{ x: number; text: string; now: boolean }> = [];
    let x = 0;
    months.forEach((m, i) => {
      for (let d = 1; d <= m.days; d++) {
        const day = dayOf(m.y, m.m, d);
        const pos = m.lead + d - 1;
        const col = Math.floor(pos / 7);
        const row = pos % 7;
        const data = byDay.get(day) ?? null;
        cells.push({ x: x + col * (cell + GAP), y: row * (cell + GAP) + (row >= 5 ? WEEKEND_GAP : 0), day, data, state: day > stand.today ? 'future' : day < stand.recordStart || !data ? 'pre' : 'day' });
      }
      labels.push({ x: x + blocks[i]! / 2, text: MONTH.format(new Date(Date.UTC(m.y, m.m, 1))), now: i === 11 });
      x += blocks[i]! + monthGap;
    });
    const gridH = 7 * (cell + GAP) - GAP + WEEKEND_GAP;
    const now = cells.find((c) => c.day === stand.today);
    return { cell, cells, labels, gridH, todayX: now ? now.x + cell / 2 : width - 4 };
  }, [stand, width]);

  if (stand === 'failed') return null;
  const card = (
    <section aria-label="Your year, a cell per day" className="rounded-[14px] bg-[color-mix(in_srgb,var(--rc-ink-1)_3.5%,var(--rc-ground))] px-4 pb-2 pt-4">
      {top && <div className="-mt-1 mb-3.5 border-b border-[var(--rc-line)] pb-3">{top}</div>}
      <div ref={box} className="relative">
        {!layout ? (
          <RcSkel className="h-[96px] w-full rounded-[6px]" />
        ) : (
          <svg width={width} height={layout.gridH + LABEL_H} className="block overflow-visible" onPointerLeave={() => setAt(null)} aria-hidden>
            {layout.cells.map((c) => {
              const today = c.day === stand?.today;
              const level = c.state === 'day' && c.data ? cellLevel(c.data) : 0;
              const s = layout.cell;
              return (
                <rect
                  key={c.day}
                  x={c.x}
                  y={c.y}
                  width={s}
                  height={s}
                  rx={s >= 8 ? 2 : 1.5}
                  // Before the record: between the old faded colour and an inactive day's grey (the owner, 11-22).
                  style={{ fill: c.state === 'future' || !level ? EMPTY : FILL[level] }}
                  // Days to come a touch under the days before the record (the owner, 11-22: "not that faded").
                  opacity={c.state === 'day' ? 1 : c.state === 'pre' ? 0.68 : 0.5}
                  stroke={today ? 'var(--rc-ink-2)' : undefined}
                  strokeWidth={today ? 1.5 : undefined}
                  onPointerEnter={
                    c.state === 'future' || !stand
                      ? undefined
                      : () =>
                          setAt({
                            x: c.x + s / 2,
                            y: c.y,
                            text: `${dayName(c.day, stand.today)} · ${c.state === 'pre' ? 'before the record started' : c.data ? dayWords(c.data, formatMinutes) : 'not active'}`,
                          })
                  }
                />
              );
            })}
            {layout.labels.map((l) => (
              <text key={l.text + l.x} x={l.x} y={layout.gridH + 15} textAnchor="middle" className={cn('text-[12px]', l.now ? 'fill-[var(--rc-ink-1)] font-[600]' : 'fill-[var(--rc-ink-3)]')}>
                {l.text}
              </text>
            ))}
          </svg>
        )}
        {at && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[6px] bg-[var(--rc-surface-float)] px-2 py-1 text-[12.5px] text-[var(--rc-ink-1)] shadow-[var(--rc-shadow-float)]"
            style={{ left: Math.min(Math.max(at.x, 90), width - 90), top: at.y - 6 }}
          >
            {at.text}
          </div>
        )}
      </div>
      {bottom && <div className="mt-1 mb-1 border-t border-[var(--rc-line)] pt-3">{bottom}</div>}
    </section>
  );
  if (!pointed) return card;
  // A block under the card whose pointer touches today's cell (the card's padding is 16 px).
  return (
    <div>
      {card}
      <div className="relative mt-3">
        <i className="absolute -top-[6px] h-[12px] w-[12px] rotate-45 rounded-[2px] bg-[var(--rc-surface-2)]" style={{ left: 16 + (layout?.todayX ?? width) - 6 }} aria-hidden />
        <div className="relative rounded-[14px] bg-[var(--rc-surface-2)] px-4 py-3">{pointed}</div>
      </div>
    </div>
  );
}
