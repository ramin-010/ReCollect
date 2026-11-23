'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { StandCoverage, StandTally, StandWindow } from '@/lib/learning/types';
import { WINDOW_WORDS } from '@/lib/learning/stand';
import { LabelLine } from '../home/parts';

/**
 * Coverage (COVERAGE_PLAN, 11-23): four rates, none of them minutes. On how many days they learned, built and worked
 * (work against weekdays), and how much of what came due was done by its day. A day counts once however much happened
 * on it, so the chart reads showing up and keeping dates, not volume (the wave above does volume). Only the parts the
 * record holds get an axis. Drawn by hand like the wave: thin marks, a ground ring on points, text in ink tokens.
 */

type AxisKey = 'learning' | 'building' | 'work' | 'onTime';
interface Axis {
  key: AxisKey;
  name: string;
  /** 0..1, or null when there is nothing to measure yet (nothing came due; no weekdays yet). */
  rate: number | null;
  count: string;
}

const VIEW_W = 460;
const VIEW_H = 330;
const R = 100;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

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
  out.push({ key: 'onTime', name: 'On time', rate: c.onTime.due ? c.onTime.done / c.onTime.due : null, count: c.onTime.due ? `${c.onTime.done} of ${c.onTime.due} on time` : 'nothing was due' });
  return out;
}

const pct = (rate: number | null) => (rate === null ? '–' : `${Math.round(rate * 100)}%`);

/** Axis i of n: the first straight up, the rest evenly round (four: up, right, down, left). */
function angleOf(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

export function Coverage({ coverage, window, partial }: { coverage: StandCoverage; window: StandWindow; partial: boolean }) {
  const axes = axesOf(coverage);
  const n = axes.length;
  const [hover, setHover] = useState<number | null>(null);
  const at = (i: number, r: number) => ({ x: CX + Math.cos(angleOf(i, n)) * r, y: CY + Math.sin(angleOf(i, n)) * r });
  const points = axes.map((a, i) => at(i, (a.rate ?? 0) * R));
  const ring = (scale: number) => axes.map((_, i) => at(i, R * scale)).map((p) => `${p.x},${p.y}`).join(' ');
  const where = partial ? 'since the record started' : WINDOW_WORDS[window].now;
  const readOut = (i: number | null) => {
    if (i === null) return '';
    const a = axes[i]!;
    return `${a.name} · ${pct(a.rate)} · ${a.count}`;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    setHover((h) => ((h ?? (step > 0 ? -1 : 0)) + step + n) % n);
  };

  return (
    <section aria-labelledby="ws-coverage">
      <LabelLine title="Coverage" id="ws-coverage" meta={`showing up for each part, and keeping dates · ${where}`} />
      <p className="rc-num mt-2 min-h-[20px] text-center text-[13px] text-[var(--rc-ink-2)]" aria-live="polite">
        {readOut(hover)}
      </p>
      <div
        tabIndex={0}
        role="group"
        aria-label={`Coverage ${where}: ${axes.map((a) => `${a.name} ${pct(a.rate)}, ${a.count}`).join('; ')}. Use the arrow keys to read each part.`}
        className="mx-auto mt-1 max-w-[460px] rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)]"
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg width="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block" aria-hidden onPointerLeave={() => setHover(null)}>
          <polygon points={ring(1)} fill="none" stroke="var(--rc-line)" strokeWidth={1} />
          <polygon points={ring(0.5)} fill="none" stroke="var(--rc-line)" strokeWidth={1} strokeDasharray="3 4" />
          {axes.map((a, i) => {
            const end = at(i, R);
            return <line key={a.key} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="var(--rc-line)" strokeWidth={1} />;
          })}
          <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="var(--rc-heat-3)" fillOpacity={0.18} stroke="var(--rc-heat-4)" strokeWidth={2} strokeLinejoin="round" />
          {axes.map((a, i) => {
            const p = points[i]!;
            const label = at(i, R + 22);
            const cos = Math.cos(angleOf(i, n));
            const sin = Math.sin(angleOf(i, n));
            const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
            // Labels above the top axis grow upward; below the bottom one, downward; at the sides, centred on the axis.
            const y0 = sin < -0.3 ? label.y - 30 : sin > 0.3 ? label.y + 4 : label.y - 14;
            const on = hover === i;
            return (
              <g key={a.key} onPointerEnter={() => setHover(i)} style={{ cursor: 'default' }}>
                <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={on ? 5.5 : 4}
                  fill={a.rate === null ? 'var(--rc-ground)' : 'var(--rc-heat-4)'}
                  stroke={a.rate === null ? 'var(--rc-ink-3)' : 'var(--rc-ground)'}
                  strokeWidth={2}
                />
                <text x={label.x} y={y0} textAnchor={anchor} className="fill-[var(--rc-ink-2)] text-[13px]">
                  {a.name}
                </text>
                <text x={label.x} y={y0 + 18} textAnchor={anchor} className={cn('rc-num fill-[var(--rc-ink-1)] text-[15px] font-[600]')}>
                  {pct(a.rate)}
                </text>
                <text x={label.x} y={y0 + 34} textAnchor={anchor} className="rc-num fill-[var(--rc-ink-3)] text-[12px]">
                  {a.count}
                </text>
                <rect x={Math.min(label.x, p.x) - 60} y={y0 - 14} width={120} height={56} fill="transparent" />
              </g>
            );
          })}
        </svg>
      </div>
      <details className="mt-1">
        <summary className="rc-meta cursor-pointer select-none text-right text-[12.5px] marker:content-none">Show the numbers</summary>
        <table className="mt-2 w-full text-left text-[13px] text-[var(--rc-ink-2)]">
          <tbody>
            {axes.map((a) => (
              <tr key={a.key} className="border-t border-[var(--rc-line)]">
                <td className="py-1.5">{a.name}</td>
                <td className="rc-num py-1.5 text-right">{a.count}</td>
                <td className="rc-num w-[56px] py-1.5 text-right text-[var(--rc-ink-1)]">{pct(a.rate)}</td>
              </tr>
            ))}
            {(Object.keys(PART_NAMES) as Array<keyof typeof PART_NAMES>).map((k) => {
              const t: StandTally = coverage.onTime.by[k];
              return (
                <tr key={k} className="text-[var(--rc-ink-3)]">
                  <td className="py-1 pl-4">{PART_NAMES[k]}</td>
                  <td className="rc-num py-1 text-right">{t.due ? `${t.done} of ${t.due} on time` : 'none due'}</td>
                  <td className="rc-num py-1 text-right">{t.due ? pct(t.done / t.due) : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </section>
  );
}
