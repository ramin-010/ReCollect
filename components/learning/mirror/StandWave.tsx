'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMinutes } from '@/lib/learning/sessionLog';
import type { StandData, StandLens, StandMoment, StandPeriod } from '@/lib/learning/types';
import { spacedLabels, WAVE_UNIT, waveSeries, WINDOW_WORDS } from '@/lib/learning/stand';

/** The same equal-ish gap the verdict uses: under 15 minutes apart reads as the same. */
const SAME_MINUTES = 15;
const CHART_H = 168;
const PAD = { top: 14, bottom: 24 };

function useWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A smooth line through the points that never swings past them (monotone cubic, Fritsch–Carlson): no dip below zero. */
function smoothPath(pts: ReadonlyArray<{ x: number; y: number }>): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0]!.x},${pts[0]!.y}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1]!.x - pts[i]!.x;
    m[i] = (pts[i + 1]!.y - pts[i]!.y) / dx[i]!;
  }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  t[n - 1] = m[n - 2]!;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i]!;
      t[i + 1] = k * b * m[i]!;
    }
  }
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 0; i < n - 1; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${p.x + h},${p.y + t[i]! * h} ${q.x - h},${q.y - t[i + 1]! * h} ${q.x},${q.y}`;
  }
  return d;
}

function niceMax(minutes: number): number {
  const hours = Math.max(1, Math.ceil(minutes / 60));
  const step = hours <= 4 ? 1 : hours <= 10 ? 2 : hours <= 25 ? 5 : 10;
  return Math.ceil(hours / step) * step * 60;
}

const hoursText = (m: number) => (Math.round(m) ? formatMinutes(Math.round(m)) : 'nothing');

/**
 * The wave (the owner, 11-22): time logged over the span as one smooth line with a soft fill, the span before as a
 * dashed line under it, so the shape says whether it is rising. One figure on top, the comparison in one line; the
 * hovered day reads out where the active days stand, so nothing covers the line.
 */
/** What a hovered ring says under the wave: "Milestone: Finish NeetCode 150 · Product-company SDE role". */
const momentWords = (list: readonly StandMoment[]) =>
  list.length === 0
    ? ''
    : `${list[0]!.kind === 'milestone' ? 'Milestone' : 'Finished'}: ${list[0]!.title}${list[0]!.of ? ` · ${list[0]!.of}` : ''}${list.length > 1 ? `, and ${list.length - 1} more` : ''}`;

/**
 * PERSONAL_OFFICE_PLAN (11-23), the lens: Personal and All draw in the year's greens, Work in a quiet slate; All draws
 * personal and work as two lines (no span-before line, so three lines never share the chart).
 */
export function StandWave({ stand, period, moments, lens = 'personal' }: { stand: StandData; period: StandPeriod; moments?: readonly StandMoment[]; lens?: StandLens }) {
  const win = period.window;
  const split = lens === 'all';
  const points = useMemo(() => waveSeries(stand, win, split ? 'personal' : undefined), [stand, win, split]);
  const workPoints = useMemo(() => (split ? waveSeries(stand, win, 'work') : null), [stand, win, split]);
  const stroke = lens === 'work' ? 'var(--rc-wave-work)' : 'var(--rc-heat-4)';
  const fill = lens === 'work' ? 'var(--rc-wave-work)' : 'var(--rc-heat-3)';
  const [box, width] = useWidth<HTMLDivElement>(680);
  const [hover, setHover] = useState<number | null>(null);
  const gradient = useId().replace(/:/g, '');
  const c = period.current;
  const p = period.previous;
  const compare = !split && points.some((pt) => pt.before !== null);

  const n = points.length;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const base = PAD.top + innerH;
  const max = niceMax(Math.max(60, ...points.map((pt) => Math.max(pt.now ?? 0, pt.before ?? 0)), ...(workPoints ?? []).map((pt) => pt.now ?? 0)));
  const xAt = (i: number) => (n === 1 ? width / 2 : 6 + (i * (width - 12)) / (n - 1));
  const yAt = (m: number) => base - (m / max) * innerH;
  const nowPts = points.flatMap((pt, i) => (pt.now === null ? [] : [{ x: xAt(i), y: yAt(pt.now) }]));
  const beforePts = compare ? points.flatMap((pt, i) => (pt.before === null ? [] : [{ x: xAt(i), y: yAt(pt.before) }])) : [];
  const workPts = workPoints ? workPoints.flatMap((pt, i) => (pt.now === null ? [] : [{ x: xAt(i), y: yAt(pt.now) }])) : [];
  const line = smoothPath(nowPts);
  const area = nowPts.length > 1 ? `${line} L${nowPts.at(-1)!.x},${base} L${nowPts[0]!.x},${base} Z` : '';
  const empty = points.every((pt) => !pt.now && !pt.before) && (workPoints ?? []).every((pt) => !pt.now);
  // The moments look (the owner's options, 11-22): what was finished sits on the line, a ring where it happened.
  const marks = moments ? points.map((pt) => moments.filter((m) => m.day >= pt.from && m.day <= pt.to)) : null;

  const diff = p ? c.totalMinutes - p.totalMinutes : null;
  const span = period.partial ? `since the record started` : `in ${WINDOW_WORDS[win].now}`;
  const shown = spacedLabels(
    points.map((pt, i) => (pt.label ? xAt(i) : null)),
    34,
  );

  const readOut = (i: number | null) => {
    if (i === null) return `${c.activeDays} of ${c.days} days ${lens === 'work' ? 'at work' : 'active'}`;
    const pt = points[i]!;
    if (pt.now === null) return `${pt.name} · before the record`;
    const u = WAVE_UNIT[win].suffix;
    if (workPoints) {
      const w = workPoints[i]?.now ?? 0;
      return `${pt.name} · ${hoursText(pt.now)} personal · ${hoursText(w)} work${Math.round(pt.now) || Math.round(w) ? u : ''}`;
    }
    return `${pt.name} · ${hoursText(pt.now)}${Math.round(pt.now) ? u : ''}${pt.before !== null ? ` · before ${hoursText(pt.before)}${Math.round(pt.before) ? u : ''}` : ''}`;
  };

  const pick = (clientX: number, rect: DOMRect) => {
    const x = ((clientX - rect.left) / rect.width) * width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((x - 6) / (width - 12)) * (n - 1)))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setHover((h) => Math.max(0, Math.min(n - 1, (h ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))));
  };
  const hp = hover === null ? null : points[hover]!;

  return (
    <section aria-labelledby="ws-wave" className="rounded-[14px] bg-[color-mix(in_srgb,var(--rc-ink-1)_3.5%,var(--rc-ground))] px-5 pb-3 pt-4 sm:-mx-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h2 id="ws-wave" className="rc-num text-[20px] font-[600] leading-[1.2] text-[var(--rc-ink-1)]">
            {c.totalMinutes ? formatMinutes(c.totalMinutes) : lens === 'work' ? 'No time' : 'Nothing'}{' '}
            <span className="text-[14px] font-[400] text-[var(--rc-ink-3)]">
              {lens === 'work' ? 'at work' : 'logged'} {span}
            </span>
          </h2>
          {diff !== null && p && (
            <p className="rc-num mt-1 flex items-center gap-1 text-[13px] text-[var(--rc-ink-3)]">
              {Math.abs(diff) < SAME_MINUTES ? (
                <>About the same as {WINDOW_WORDS[win].before}</>
              ) : (
                <>
                  <span className={cn('inline-flex items-center gap-0.5', diff > 0 ? 'text-[var(--rc-good)]' : 'text-[var(--rc-attn)]')}>
                    {diff > 0 ? <ArrowUp className="h-[13px] w-[13px]" strokeWidth={2.25} aria-hidden /> : <ArrowDown className="h-[13px] w-[13px]" strokeWidth={2.25} aria-hidden />}
                    {formatMinutes(Math.abs(diff))} {diff > 0 ? 'more' : 'less'}
                  </span>
                  than {WINDOW_WORDS[win].before} ({hoursText(p.totalMinutes)})
                </>
              )}
            </p>
          )}
        </div>
        <p className="rc-num ml-auto grid text-right text-[13px] text-[var(--rc-ink-2)] max-sm:ml-0 max-sm:w-full max-sm:text-left" aria-live="polite">
          {[null, ...points.map((_, i) => i)].map((v) => (
            <span key={v ?? 'all'} aria-hidden={v !== hover} className={cn('[grid-area:1/1]', v !== hover && 'invisible')}>
              {readOut(v)}
            </span>
          ))}
        </p>
      </div>

      {empty ? (
        <p className="rc-meta py-10 text-center">
          {lens === 'work' ? 'Claude Code in a folder marked Work fills this in (Settings › Tracking).' : 'Study chats, Claude Code and Ctrl K “log 40m …” fill this in.'}
        </p>
      ) : (
        <div ref={box} className="mt-3">
          <div
            tabIndex={0}
            role="group"
            aria-label={`Time ${lens === 'work' ? 'at work' : 'logged'} ${span}, ${win === 'year' ? 'a week at a time' : win === 'month' ? 'as the average a day over the 7 days up to each day' : 'a day at a time'}${compare ? ', with the span before as a dashed line' : ''}${split ? ', personal and work as two lines' : ''}. Use the arrow keys to read each point; Show the numbers lists them.`}
            className="rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--rc-accent)]"
            onFocus={() => setHover((h) => h ?? n - 1)}
            onBlur={() => setHover(null)}
            onKeyDown={onKey}
          >
            <svg
              width="100%"
              height={CHART_H}
              viewBox={`0 0 ${width} ${CHART_H}`}
              className="block touch-pan-y"
              aria-hidden
              onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
              onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
              onPointerLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={fill} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              {/* The scale: the top line with its hours, and the baseline. */}
              <line x1={0} x2={width} y1={PAD.top} y2={PAD.top} stroke="var(--rc-line)" strokeWidth={1} strokeDasharray="2 4" />
              <text x={width} y={PAD.top - 4} textAnchor="end" className="fill-[var(--rc-ink-3)] text-[12px] tabular-nums">
                {+(max / 60).toFixed(1)} h
              </text>
              <line x1={0} x2={width} y1={base} y2={base} stroke="var(--rc-line)" strokeWidth={1} />
              {beforePts.length > 1 && <path d={smoothPath(beforePts)} fill="none" stroke="var(--rc-ink-3)" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" />}
              {area && <path d={area} fill={`url(#${gradient})`} />}
              {nowPts.length > 1 && <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
              {nowPts.length === 1 && <circle cx={nowPts[0]!.x} cy={nowPts[0]!.y} r={3.5} fill={stroke} />}
              {workPts.length > 1 && <path d={smoothPath(workPts)} fill="none" stroke="var(--rc-wave-work)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
              {workPts.length === 1 && <circle cx={workPts[0]!.x} cy={workPts[0]!.y} r={3.5} fill="var(--rc-wave-work)" />}
              {marks?.map((list, i) => {
                const v = points[i]!.now;
                return list.length && v !== null ? (
                  <circle key={`m${i}`} cx={xAt(i)} cy={yAt(v)} r={list.some((m) => m.kind === 'milestone') ? 5 : 4} fill="var(--rc-ground)" stroke="var(--rc-heat-4)" strokeWidth={2} />
                ) : null;
              })}
              {hp && hover !== null && (
                <g>
                  <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={base} stroke="var(--rc-ink-3)" strokeOpacity={0.5} strokeWidth={1} />
                  {hp.before !== null && <circle cx={xAt(hover)} cy={yAt(hp.before)} r={3.5} fill="var(--rc-ink-3)" stroke="var(--rc-ground)" strokeWidth={2} />}
                  {hp.now !== null && <circle cx={xAt(hover)} cy={yAt(hp.now)} r={4.5} fill={stroke} stroke="var(--rc-ground)" strokeWidth={2} />}
                  {workPoints?.[hover]?.now != null && <circle cx={xAt(hover)} cy={yAt(workPoints[hover]!.now!)} r={4.5} fill="var(--rc-wave-work)" stroke="var(--rc-ground)" strokeWidth={2} />}
                </g>
              )}
              {points.map((pt, i) =>
                shown[i] ? (
                  <text
                    key={pt.key}
                    x={xAt(i)}
                    y={CHART_H - 6}
                    textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                    className={cn('text-[12px] tabular-nums', pt.label === 'Today' ? 'fill-[var(--rc-ink-1)]' : 'fill-[var(--rc-ink-3)]')}
                  >
                    {pt.label}
                  </text>
                ) : null,
              )}
            </svg>
          </div>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            {/* A hovered ring names what was finished there, in the legend's place (nothing covers the line). */}
            {hover !== null && marks?.[hover]?.length ? (
              <p className="min-w-0 flex-1 truncate pt-px text-[12.5px] text-[var(--rc-ink-2)]">{momentWords(marks[hover]!)}</p>
            ) : split ? (
              <ul className="flex flex-wrap gap-x-4 pt-px text-[12.5px] text-[var(--rc-ink-3)]" aria-label="Legend">
                <li className="flex items-center gap-1.5">
                  <span className="inline-block h-[2px] w-3.5 rounded-full bg-[var(--rc-heat-4)]" aria-hidden />
                  Personal
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block h-[2px] w-3.5 rounded-full bg-[var(--rc-wave-work)]" aria-hidden />
                  Work
                </li>
                {win === 'month' && <li>a day, averaged over 7 days</li>}
              </ul>
            ) : compare ? (
              <ul className="flex flex-wrap gap-x-4 pt-px text-[12.5px] text-[var(--rc-ink-3)]" aria-label="Legend">
                <li className="flex items-center gap-1.5">
                  <span className={cn('inline-block h-[2px] w-3.5 rounded-full', lens === 'work' ? 'bg-[var(--rc-wave-work)]' : 'bg-[var(--rc-heat-4)]')} aria-hidden />
                  {WINDOW_WORDS[win].now.replace(/^the /, 'The ')}
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 border-t-[1.5px] border-dashed border-[var(--rc-ink-3)]" aria-hidden />
                  {WINDOW_WORDS[win].before.replace(/^the /, 'The ')}
                </li>
                {win === 'month' && <li>a day, averaged over 7 days</li>}
              </ul>
            ) : (
              <span className="pt-px text-[12.5px] text-[var(--rc-ink-3)]">{win === 'month' ? 'A day, averaged over 7 days' : win === 'year' ? 'A week at a time' : ''}</span>
            )}
            <details className="group max-sm:w-full [&[open]]:w-full">
              <summary className="rc-meta cursor-pointer select-none text-right text-[12.5px] marker:content-none">Show the numbers</summary>
              <table className="mt-2 w-full text-left text-[13px] text-[var(--rc-ink-2)]">
                <thead>
                  <tr className="text-[var(--rc-ink-3)]">
                    <th className="py-1 font-medium">{win === 'year' ? 'Week' : 'Day'}</th>
                    <th className="py-1 text-right font-medium">{split ? 'Personal' : WAVE_UNIT[win].column}</th>
                    {split && <th className="py-1 text-right font-medium">Work</th>}
                    {compare && <th className="py-1 text-right font-medium">Before</th>}
                  </tr>
                </thead>
                <tbody className="rc-num">
                  {points.map((pt, i) => (
                    <tr key={pt.key} className="border-t border-[var(--rc-line)]">
                      <td className="py-1 pr-4">{pt.name}</td>
                      <td className="py-1 text-right">{pt.now === null ? '–' : hoursText(pt.now)}</td>
                      {split && <td className="py-1 text-right">{workPoints?.[i]?.now == null ? '–' : hoursText(workPoints[i]!.now!)}</td>}
                      {compare && <td className="py-1 text-right">{pt.before === null ? '–' : hoursText(pt.before)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </div>
      )}
    </section>
  );
}
