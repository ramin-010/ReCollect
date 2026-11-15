'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { formatMinutes } from '@/lib/learning/sessionLog';
import type { DayString, KindMinutes, MirrorData, PathPace, SessionKind } from '@/lib/learning/types';
import { RcSkel, rcScope } from '@/components/rc-ui';
import { SectionFailed } from '../home/parts';

const KINDS: SessionKind[] = ['study', 'practice', 'build', 'review'];
const KIND_LABEL: Record<SessionKind, string> = { study: 'Study', practice: 'Practice', build: 'Build', review: 'Review' };
const kindColor = (k: SessionKind) => `var(--rc-kind-${k})`;

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const LONG = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const at = (d: DayString) => new Date(`${d}T00:00:00Z`);
const perWeek = (n: number) => `${n} a week`;
const total = (m: KindMinutes) => KINDS.reduce((a, k) => a + m[k], 0);

const STATUS_WORD: Record<PathPace['status'], string> = {
  done: 'Done',
  overdue: 'Past the deadline',
  no_data: 'Too early to tell',
  behind: 'Behind',
  ahead: 'Ahead',
  on_track: 'On track',
};

const frame = 'mx-auto w-full max-w-[880px] px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8 pb-24';

/**
 * Where you stand (LOOP_COMPLETE_SPEC 1.7): per goal, each path's pace against its deadline and the
 * smallest fix; hours per week by kind; per subject, quiz scores, weak spots and practice outcomes.
 * Every number comes from the server (GET /api/mirror); the page only draws them.
 */
export function MirrorPage() {
  const [data, setData] = useState<MirrorData | null | 'failed'>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    learningApi.getMirror().then(
      (m) => alive && setData(m),
      () => alive && setData('failed'),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
      <div className={frame}>
        <h1 className="rc-h1">Where you stand</h1>
        <p className="rc-meta mt-1.5">Worked out from your paths, sessions and Recall each time you open it. No guesses.</p>
        {data === null && <MirrorSkeleton />}
        {data === 'failed' && <SectionFailed className="mt-8" what="where you stand" onRetry={() => setAttempt((n) => n + 1)} />}
        {data && data !== 'failed' && (
          <div className="mt-8 flex flex-col gap-9">
            {data.goals.length === 0 && <p className="rc-body rc-ink-2">No goal with a deadline yet: add one on Home and its paths get a pace here.</p>}
            {data.goals.map((g) => (
              <GoalPace key={g._id} goal={g} />
            ))}
            <WeeklyHours weeks={data.weeks} />
            <Subjects subjects={data.subjects} />
          </div>
        )}
      </div>
    </div>
  );
}

function MirrorSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-6" aria-busy aria-label="Working out where you stand">
      <RcSkel className="h-[150px] w-full rounded-[12px]" />
      <RcSkel className="h-[260px] w-full rounded-[12px]" />
    </div>
  );
}

// ─── A goal: each path's pace ──────────────────────────────────────────

function GoalPace({ goal }: { goal: MirrorData['goals'][number] }) {
  return (
    <section aria-labelledby={`goal-${goal._id}`} className="rc-card px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`goal-${goal._id}`} className="rc-h2">
          {goal.title}
        </h2>
        <p className="rc-meta rc-num">
          {goal.daysLeft >= 0 ? `${goal.daysLeft} days left` : `${-goal.daysLeft} days past`} · due {LONG.format(at(goal.deadline))}
        </p>
      </div>
      <p className="rc-meta rc-num mt-0.5">
        {goal.milestones.done} of {goal.milestones.total} milestones done
      </p>
      {goal.paths.length === 0 ? (
        <p className="rc-meta mt-4">No path is linked to this goal: link its subjects on Home to see their pace.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {goal.paths.map((p) => (
            <PathRow key={p.subject._id} p={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PathRow({ p }: { p: MirrorData['goals'][number]['paths'][number] }) {
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const need = p.requiredPerWeek !== null && p.status !== 'done' ? `needs ${perWeek(p.requiredPerWeek)}` : null;
  const lands = p.landsOn && p.status !== 'done' ? `lands ${DAY.format(at(p.landsOn)).replace(',', '')}` : null;
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="flex items-center gap-1.5 text-[var(--rc-fs-body)] font-medium text-[var(--rc-ink-1)]">
          <span className="rc-swatch" style={{ background: p.subject.color ?? 'var(--rc-icon)' }} aria-hidden />
          {p.subject.name}
        </p>
        <p className="rc-meta rc-num">
          {STATUS_WORD[p.status]}
          {p.status !== 'done' && p.status !== 'no_data' ? ` · ${perWeek(p.perWeek)}` : ''}
          {need ? ` · ${need}` : ''}
          {lands ? ` · ${lands}` : ''}
        </p>
      </div>
      <div
        className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[var(--rc-surface-2)]"
        role="img"
        aria-label={`${p.done} of ${p.total} topics done`}
      >
        <div className="h-full rounded-full bg-[var(--rc-ink-2)]" style={{ width: `${pct}%` }} />
      </div>
      <p className="rc-meta rc-num mt-1.5">
        {p.done} of {p.total} topics
        {p.fix && (
          <>
            {' · '}
            <span className="text-[var(--rc-ink-2)]">
              Smallest fix: {p.fix.extraPerWeek} more topic{p.fix.extraPerWeek === 1 ? '' : 's'} a week
              {p.fix.orLandsOn ? `, or it lands ${SHORT.format(at(p.fix.orLandsOn))}` : ''}.
            </span>
          </>
        )}
      </p>
    </li>
  );
}

// ─── Hours per week, by kind (stacked columns) ─────────────────────────

const CHART_H = 180;
const PAD = { top: 12, right: 8, bottom: 26, left: 36 };
const BAR_MAX = 24;
const GAP = 2;

function niceMax(minutes: number): number {
  const hours = Math.max(1, Math.ceil(minutes / 60));
  const step = hours <= 4 ? 1 : hours <= 10 ? 2 : hours <= 25 ? 5 : 10;
  return Math.ceil(hours / step) * step * 60;
}

function WeeklyHours({ weeks }: { weeks: MirrorData['weeks'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  const totals = weeks.map((w) => total(w.minutes));
  const all = totals.reduce((a, b) => a + b, 0);
  // The chart is drawn at the width it gets (no stretched text).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [all]);
  const sums = KINDS.map((k) => [k, weeks.reduce((a, w) => a + w.minutes[k], 0)] as const);
  const max = niceMax(Math.max(...totals, 60));
  const innerW = width - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, weeks.length);
  const barW = Math.min(BAR_MAX, slot * 0.5);
  const y = (m: number) => (m / max) * innerH;
  const ticks = [0, max / 2, max];
  // The hovered week reads out in the card's own header and legend, where it can't cover a bar
  // (a floating card is taller than the plot, so beside the last columns it hid their neighbour).
  // Every variant (all weeks, then each week) sits in the same grid cell and only the live one
  // shows, so the cell keeps the tallest one's height and the chart never moves as the text wraps.
  const variants: Array<number | null> = [null, ...weeks.map((_, i) => i)];

  return (
    <section aria-labelledby="hours-h" className="rc-card px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="hours-h" className="rc-h2">
          Hours per week
        </h2>
        <div className="grid">
          {variants.map((v) => {
            const live = v === hover;
            const w = v === null ? null : weeks[v]!;
            return (
              <p key={v ?? 'all'} aria-hidden={!live} className={cn('rc-meta rc-num [grid-area:1/1]', !live && 'invisible')}>
                {w ? (
                  <>
                    <span className="font-medium text-[var(--rc-ink-1)]">Week of {SHORT.format(at(w.weekStart))}</span>
                    {' · '}
                    {totals[v!] ? `${formatMinutes(totals[v!]!)} logged` : 'nothing logged'}
                    {w.targets.total > 0 && ` · ${w.targets.done} of ${w.targets.total} week targets`}
                  </>
                ) : (
                  `last ${weeks.length} weeks · ${formatMinutes(all)} logged`
                )}
              </p>
            );
          })}
        </div>
      </div>
      {all === 0 ? (
        <p className="rc-meta mt-4">No sessions in the last {weeks.length} weeks. Study chats, Claude Code and Ctrl K “log 40m …” fill this in.</p>
      ) : (
        <>
          <div className="mt-3 grid">
            {variants.map((v) => {
              const live = v === hover;
              const w = v === null ? null : weeks[v]!;
              return (
                <ul
                  key={v ?? 'all'}
                  aria-hidden={!live}
                  aria-label={w ? `Week of ${SHORT.format(at(w.weekStart))}, by kind` : 'Legend'}
                  className={cn('flex flex-wrap gap-x-4 gap-y-1 [grid-area:1/1]', !live && 'invisible')}
                >
                  {sums.map(([k, m]) => {
                    const value = w ? w.minutes[k] : m;
                    return (
                      <li key={k} className="flex items-center gap-1.5 text-[13px] text-[var(--rc-ink-2)]">
                        <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: kindColor(k) }} aria-hidden />
                        {KIND_LABEL[k]}{' '}
                        <span className={cn('rc-num', w && value ? 'font-medium text-[var(--rc-ink-1)]' : 'text-[var(--rc-ink-3)]')}>{w && !value ? '–' : formatMinutes(value)}</span>
                      </li>
                    );
                  })}
                </ul>
              );
            })}
          </div>
          <div className="relative mt-3" ref={box}>
            <svg width="100%" height={CHART_H} viewBox={`0 0 ${width} ${CHART_H}`} role="img" aria-label={`Hours per week by kind, ${weeks.length} weeks: the table below has the numbers`}>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH - y(t)} y2={PAD.top + innerH - y(t)} stroke="var(--rc-line)" strokeWidth={1} />
                  <text x={PAD.left - 8} y={PAD.top + innerH - y(t) + 4} textAnchor="end" className="fill-[var(--rc-ink-3)] text-[12.5px] tabular-nums">
                    {t / 60} h
                  </text>
                </g>
              ))}
              {weeks.map((w, i) => {
                const x = PAD.left + slot * i + (slot - barW) / 2;
                const present = KINDS.filter((k) => w.minutes[k] > 0);
                let cum = 0;
                return (
                  <g key={w.weekStart} opacity={hover === null || hover === i ? 1 : 0.45}>
                    {present.map((k, j) => {
                      // Bottom-up; a 2px surface gap under every segment but the first; the top one rounded.
                      const yBottom = PAD.top + innerH - y(cum);
                      cum += w.minutes[k];
                      const yTop = PAD.top + innerH - y(cum);
                      const h = Math.max(1, yBottom - yTop - (j > 0 ? GAP : 0));
                      return j === present.length - 1 ? (
                        <path key={k} d={roundedTop(x, yTop, barW, h, Math.min(4, h))} fill={kindColor(k)} />
                      ) : (
                        <rect key={k} x={x} y={yTop} width={barW} height={h} fill={kindColor(k)} />
                      );
                    })}
                    <text x={x + barW / 2} y={CHART_H - 8} textAnchor="middle" className="fill-[var(--rc-ink-3)] text-[12.5px] tabular-nums">
                      {SHORT.format(at(w.weekStart))}
                    </text>
                    <rect
                      x={PAD.left + slot * i}
                      y={PAD.top}
                      width={slot}
                      height={innerH}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      aria-hidden
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <details className="mt-2">
            <summary className="rc-meta cursor-pointer select-none">Show the numbers</summary>
            <table className="mt-2 w-full text-left text-[13px] text-[var(--rc-ink-2)]">
              <thead>
                <tr className="text-[var(--rc-ink-3)]">
                  <th className="py-1 font-medium">Week of</th>
                  {KINDS.map((k) => (
                    <th key={k} className="py-1 text-right font-medium">
                      {KIND_LABEL[k]}
                    </th>
                  ))}
                  <th className="py-1 text-right font-medium">Total</th>
                  <th className="py-1 text-right font-medium">Targets</th>
                </tr>
              </thead>
              <tbody className="rc-num">
                {weeks.map((w, i) => (
                  <tr key={w.weekStart} className="border-t border-[var(--rc-line)]">
                    <td className="py-1">{SHORT.format(at(w.weekStart))}</td>
                    {KINDS.map((k) => (
                      <td key={k} className="py-1 text-right">
                        {w.minutes[k] ? formatMinutes(w.minutes[k]) : '–'}
                      </td>
                    ))}
                    <td className="py-1 text-right">{totals[i] ? formatMinutes(totals[i]!) : '–'}</td>
                    <td className="py-1 text-right">{w.targets.total ? `${w.targets.done}/${w.targets.total}` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

/** A column segment with a 4px rounded data-end on top, square at the bottom. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

// ─── Subjects ──────────────────────────────────────────────────────────

function QuizDots({ quiz }: { quiz: MirrorData['subjects'][number]['quiz'] }) {
  const W = 132;
  const H = 28;
  const pts = quiz.map((q, i) => ({ x: quiz.length === 1 ? W / 2 : 6 + (i * (W - 12)) / (quiz.length - 1), y: 4 + (1 - q.done / q.total) * (H - 8), q }));
  return (
    <svg width={W} height={H} role="img" aria-label={`Quiz scores, oldest first: ${quiz.map((q) => `${q.done} of ${q.total}`).join(', ')}`} className="shrink-0">
      <line x1={0} x2={W} y1={4} y2={4} stroke="var(--rc-line)" strokeWidth={1} />
      <line x1={0} x2={W} y1={H - 4} y2={H - 4} stroke="var(--rc-line)" strokeWidth={1} />
      {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--rc-ink-3)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--rc-ink-2)" stroke="var(--rc-surface)" strokeWidth={2}>
          <title>{`${DAY.format(at(p.q.day)).replace(',', '')}: ${p.q.done} of ${p.q.total}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Subjects({ subjects }: { subjects: MirrorData['subjects'] }) {
  const shown = subjects.filter((s) => s.path || s.quiz.length || s.weakSpots.open || s.weakSpots.clearedIn30 || s.practice.alone + s.practice.hints + s.practice.after_answer);
  if (!shown.length) return null;
  return (
    <section aria-labelledby="subjects-h">
      <h2 id="subjects-h" className="rc-h2 mb-2">
        By subject
      </h2>
      <ul className="flex flex-col">
        {shown.map((s) => {
          const practice = s.practice.alone + s.practice.hints + s.practice.after_answer;
          const last = s.quiz.at(-1);
          return (
            <li key={s._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--rc-line)] py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[var(--rc-fs-body)] font-medium text-[var(--rc-ink-1)]">
                  <span className="rc-swatch" style={{ background: s.color ?? 'var(--rc-icon)' }} aria-hidden />
                  {s.name}
                </p>
                <p className="rc-meta rc-num mt-0.5 break-words">
                  {[
                    s.path ? `path ${s.path.done} of ${s.path.total}${s.path.perWeek ? `, ${perWeek(s.path.perWeek)}` : ''}` : null,
                    s.weakSpots.open || s.weakSpots.clearedIn30 ? `${s.weakSpots.open} weak spot${s.weakSpots.open === 1 ? '' : 's'} open, ${s.weakSpots.clearedIn30} cleared in 30 days` : null,
                    practice ? `practice in 90 days: ${s.practice.alone} alone, ${s.practice.hints} with hints, ${s.practice.after_answer} after the answer` : null,
                    s.minutesPerTopic ? `${formatMinutes(s.minutesPerTopic)} per finished topic` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {s.quiz.length > 0 && (
                <div className="flex items-center gap-2">
                  {s.quiz.length >= 2 && <QuizDots quiz={s.quiz} />}
                  <span className="rc-meta rc-num">
                    quiz {last!.done}/{last!.total}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
