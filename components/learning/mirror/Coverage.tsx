'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StandCoverage, StandWindow } from '@/lib/learning/types';
import { WINDOW_WORDS } from '@/lib/learning/stand';

/**
 * Coverage (COVERAGE_PLAN, 11-23): four rates, none of them minutes. On how many days they learned, built and worked
 * (work against weekdays), and how much of what came due was done by its day. A day counts once however much happened
 * on it, so it reads showing up and keeping dates, not volume (the wave above does volume). Only the parts the record
 * holds get an axis.
 *
 * His look (11-23 night: "doesn't look smartly organised"): a card like the wave's, the shape small on the left and the
 * four parts as rows on the right (name, a thin bar, the rate, the count), so every number sits on one line and in one
 * column. Hovering a row or a point lights both; On time's row unfolds its five parts.
 */

type AxisKey = 'learning' | 'building' | 'work' | 'onTime';
interface Axis {
  key: AxisKey;
  name: string;
  /** 0..1, or null when there is nothing to measure yet (nothing came due; no weekdays yet). */
  rate: number | null;
  count: string;
}

const SIZE = 290;
const R = 90;
const C = SIZE / 2;

const PART_NAMES: Record<keyof StandCoverage['onTime']['by'], string> = {
  reviews: 'Reviews',
  tasks: 'Tasks with a due date',
  milestones: 'Milestones',
  targets: 'Week targets',
  focus: 'Focus lines',
};

function axesOf(c: StandCoverage): Axis[] {
  const days = (n: number, of: number, unit: string) => `${n} of ${of} ${unit}${of === 1 ? '' : 's'}`;
  const out: Axis[] = [{ key: 'learning', name: 'Learning', rate: c.learning.of ? c.learning.days / c.learning.of : null, count: days(c.learning.days, c.learning.of, 'day') }];
  if (c.building) out.push({ key: 'building', name: 'Building', rate: c.building.of ? c.building.days / c.building.of : null, count: days(c.building.days, c.building.of, 'day') });
  if (c.work) out.push({ key: 'work', name: 'Work', rate: c.work.of ? c.work.days / c.work.of : null, count: c.work.of ? days(c.work.days, c.work.of, 'weekday') : 'no weekdays yet' });
  out.push({ key: 'onTime', name: 'On time', rate: c.onTime.due ? c.onTime.done / c.onTime.due : null, count: c.onTime.due ? `${c.onTime.done} of ${c.onTime.due} done by their day` : 'nothing was due' });
  return out;
}

const pct = (rate: number | null) => (rate === null ? '–' : `${Math.round(rate * 100)}%`);

/** Axis i of n: the first straight up, the rest evenly round (four: up, right, down, left). */
const angleOf = (i: number, n: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

export function Coverage({ coverage, window, partial }: { coverage: StandCoverage; window: StandWindow; partial: boolean }) {
  const axes = axesOf(coverage);
  const n = axes.length;
  const [hover, setHover] = useState<AxisKey | null>(null);
  const [open, setOpen] = useState(false);
  const at = (i: number, r: number) => ({ x: C + Math.cos(angleOf(i, n)) * r, y: C + Math.sin(angleOf(i, n)) * r });
  const points = axes.map((a, i) => at(i, (a.rate ?? 0) * R));
  const ring = (scale: number) => axes.map((_, i) => at(i, R * scale)).map((p) => `${p.x},${p.y}`).join(' ');
  const where = partial ? 'since the record started' : `in ${WINDOW_WORDS[window].now}`;

  return (
    <section aria-labelledby="ws-coverage" className="rounded-[14px] bg-[color-mix(in_srgb,var(--rc-ink-1)_3.5%,var(--rc-ground))] px-5 pb-4 pt-4 sm:-mx-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="ws-coverage" className="text-[20px] font-[600] leading-[1.2] text-[var(--rc-ink-1)]">
          Coverage <span className="text-[14px] font-[400] text-[var(--rc-ink-3)]">{where}</span>
        </h2>
        <p className="text-[13px] text-[var(--rc-ink-3)]">Days you showed up for each part, and dates you kept</p>
      </div>

      <div className="mt-4 grid items-center gap-x-8 gap-y-4 sm:grid-cols-[250px_1fr]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-[250px]" aria-hidden onPointerLeave={() => setHover(null)}>
          <polygon points={ring(1)} fill="none" stroke="var(--rc-line)" strokeWidth={1} />
          <polygon points={ring(0.5)} fill="none" stroke="var(--rc-line)" strokeWidth={1} strokeDasharray="3 4" />
          {axes.map((a, i) => {
            const end = at(i, R);
            return <line key={a.key} x1={C} y1={C} x2={end.x} y2={end.y} stroke="var(--rc-line)" strokeWidth={1} />;
          })}
          <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="var(--rc-heat-3)" fillOpacity={0.2} stroke="var(--rc-heat-4)" strokeWidth={2} strokeLinejoin="round" />
          {axes.map((a, i) => {
            const p = points[i]!;
            const tip = at(i, R + 14);
            const cos = Math.cos(angleOf(i, n));
            const sin = Math.sin(angleOf(i, n));
            const on = hover === a.key;
            return (
              <g key={a.key} onPointerEnter={() => setHover(a.key)}>
                <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={on ? 5.5 : 4} fill={a.rate === null ? 'var(--rc-ground)' : 'var(--rc-heat-4)'} stroke={a.rate === null ? 'var(--rc-ink-3)' : 'var(--rc-ground)'} strokeWidth={2} />
                <text
                  x={tip.x}
                  y={tip.y + (sin > 0.3 ? 9 : sin < -0.3 ? -2 : 4)}
                  textAnchor={Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end'}
                  className={cn('text-[11.5px]', on ? 'fill-[var(--rc-ink-1)]' : 'fill-[var(--rc-ink-3)]')}
                >
                  {a.name}
                </text>
              </g>
            );
          })}
        </svg>

        <ul className="flex flex-col" aria-label={`Coverage ${where}`}>
          {axes.map((a) => {
            const on = hover === a.key;
            const unfold = a.key === 'onTime' && coverage.onTime.due > 0;
            return (
              <li key={a.key} className="border-b border-[var(--rc-line)] last:border-b-0" onPointerEnter={() => setHover(a.key)} onPointerLeave={() => setHover(null)}>
                <div
                  className={cn('-mx-2 flex items-center gap-3 rounded-[8px] px-2 py-2.5', on && 'bg-[var(--rc-hover)]', unfold && 'cursor-pointer')}
                  role={unfold ? 'button' : undefined}
                  tabIndex={unfold ? 0 : undefined}
                  aria-expanded={unfold ? open : undefined}
                  onClick={unfold ? () => setOpen((x) => !x) : undefined}
                  onKeyDown={unfold ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((x) => !x)) : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-1 text-[14.5px] text-[var(--rc-ink-1)]">
                        {a.name}
                        {unfold && <ChevronDown className={cn('h-3.5 w-3.5 text-[var(--rc-icon)] transition-transform', !open && '-rotate-90')} aria-hidden />}
                      </span>
                      <span className="rc-num text-[12.5px] text-[var(--rc-ink-3)]">{a.count}</span>
                    </div>
                    <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-[var(--rc-line)]" aria-hidden>
                      <div className="h-full rounded-full bg-[var(--rc-heat-4)]" style={{ width: `${Math.round((a.rate ?? 0) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="rc-num w-[44px] shrink-0 text-right text-[15px] font-[600] text-[var(--rc-ink-1)]">{pct(a.rate)}</span>
                </div>
                {unfold && open && (
                  <ul className="mb-2 flex flex-col gap-1 pl-1 pr-[56px]">
                    {(Object.keys(PART_NAMES) as Array<keyof typeof PART_NAMES>)
                      .filter((k) => coverage.onTime.by[k].due > 0)
                      .map((k) => {
                        const t = coverage.onTime.by[k];
                        return (
                          <li key={k} className="flex items-baseline justify-between gap-3 text-[13px] text-[var(--rc-ink-2)]">
                            <span>{PART_NAMES[k]}</span>
                            <span className="rc-num text-[var(--rc-ink-3)]">
                              {t.done} of {t.due} · <span className="text-[var(--rc-ink-2)]">{pct(t.done / t.due)}</span>
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
