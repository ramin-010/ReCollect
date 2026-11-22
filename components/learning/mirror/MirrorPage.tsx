'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import type { DayString, MirrorData, PathPace, StandData, StandMeasures, StandPeriod, StandTakes, StandWindow } from '@/lib/learning/types';
import { countTrend, dayName, formatSpan, shareTrend, STAND_WINDOWS, WINDOW_LABEL, WINDOW_WORDS, type Trend } from '@/lib/learning/stand';
import { RcButton, RcSegmented, RcSkel, rcScope } from '@/components/rc-ui';
import { voice } from '@/components/buddy/voice';
import { LabelLine, SectionFailed } from '../home/parts';
import { shortDay } from '../home/format';
import { StandWave } from './StandWave';

const WINDOW_KEY = 'rc-mirror-window';
const frame = 'mx-auto w-full max-w-[760px] px-4 sm:px-6 pt-6 lg:pt-8 pb-24';

type Load<T> = T | null | 'failed';

function readWindow(): StandWindow {
  try {
    const v = localStorage.getItem(WINDOW_KEY);
    return v === 'month' || v === 'year' ? v : 'week';
  } catch {
    return 'week';
  }
}

/**
 * Where you stand (WHERE_YOU_STAND_PLAN §8-§9): the person's record over the last week, month or year against the
 * same span before it. His pick of the looks (11-22, "moments"): the summary and the buddy's take, the wave of time
 * with a ring where something was finished, the list of what was finished, the habits against before, then each
 * goal's pace and each subject in short. Every number comes from the server (GET /api/mirror/stand, GET /api/mirror);
 * the page only lays them out. A quiet page, as Home: a strip, label lines and rows.
 */
export function MirrorPage() {
  const [stand, setStand] = useState<Load<StandData>>(null);
  const [mirror, setMirror] = useState<Load<MirrorData>>(null);
  const [takes, setTakes] = useState<StandTakes | null>(null);
  const [standTry, setStandTry] = useState(0);
  const [mirrorTry, setMirrorTry] = useState(0);
  // The window chosen last in this browser (a per-viewer convenience; the content renders after the data, on the client).
  const [win, setWin] = useState<StandWindow>(readWindow);

  useEffect(() => {
    let alive = true;
    learningApi.getStand().then(
      (s) => alive && setStand(s),
      () => alive && setStand('failed')
    );
    return () => {
      alive = false;
    };
  }, [standTry]);

  useEffect(() => {
    let alive = true;
    learningApi.getMirror().then(
      (m) => alive && setMirror(m),
      () => alive && setMirror('failed')
    );
    return () => {
      alive = false;
    };
  }, [mirrorTry]);

  // The buddy's takes of today (§9): without them the page shows the summary alone, as before.
  useEffect(() => {
    let alive = true;
    learningApi.getStandTakes().then(
      (t) => alive && setTakes(t),
      () => undefined
    );
    return () => {
      alive = false;
    };
  }, []);

  const pickWindow = (w: StandWindow) => {
    setWin(w);
    try {
      localStorage.setItem(WINDOW_KEY, w);
    } catch {
      /* the choice just isn't kept */
    }
  };

  const period = stand && stand !== 'failed' ? stand.periods[win] : null;

  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
      <div className={frame}>
        <h1 className="sr-only">Where you stand</h1>
        {stand === null && <StandSkeleton />}
        {stand === 'failed' && <SectionFailed what="where you stand" onRetry={() => setStandTry((n) => n + 1)} />}
        {stand && stand !== 'failed' && period && (
          <StandBlocks stand={stand} period={period} win={win} onWindow={pickWindow} takes={takes} onTake={(t) => setTakes((cur) => (cur ? { ...cur, takes: { ...cur.takes, [t.window]: t } } : cur))} />
        )}

        <div className="mt-9 flex flex-col gap-9">
          {mirror === null && <RcSkel className="h-[140px] w-full rounded-[10px]" />}
          {mirror === 'failed' && <SectionFailed what="your goals and subjects" onRetry={() => setMirrorTry((n) => n + 1)} />}
          {mirror && mirror !== 'failed' && (
            <>
              <Goals goals={mirror.goals} today={mirror.today} />
              <Subjects subjects={mirror.subjects} period={period} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StandSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Working out where you stand">
      <div className="flex items-center justify-between gap-4">
        <RcSkel className="h-[32px] w-[196px] rounded-[8px]" />
        <RcSkel className="h-[14px] w-[160px] rounded-[4px]" />
      </div>
      <RcSkel className="h-[52px] w-full max-w-[640px] rounded-[6px]" />
      <RcSkel className="h-[230px] w-full rounded-[10px]" />
      <RcSkel className="h-[260px] w-full rounded-[10px]" />
    </div>
  );
}

// ─── The record against the span before ────────────────────────────────

function StandBlocks({
  stand,
  period,
  win,
  onWindow,
  takes,
  onTake,
}: {
  stand: StandData;
  period: StandPeriod;
  win: StandWindow;
  onWindow: (w: StandWindow) => void;
  takes: StandTakes | null;
  onTake: (t: NonNullable<StandTakes['takes'][StandWindow]>) => void;
}) {
  const start = shortDay(stand.recordStart, stand.today);
  const spans = period.before ? `${formatSpan(period.span, stand.today)} · against ${formatSpan(period.before, stand.today)}` : `${formatSpan(period.span, stand.today)} · the record starts ${start}`;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <RcSegmented label="Compare over" options={STAND_WINDOWS.map((w) => ({ value: w, label: WINDOW_LABEL[w] }))} value={win} onChange={onWindow} />
        <p className="rc-meta rc-num">{spans}</p>
      </div>
      <Summary key={`s-${win}`} period={period} takes={takes} onTake={onTake} />
      <div key={win} className="rc-ws-in mt-7 flex flex-col gap-9">
        <StandWave stand={stand} period={period} moments={stand.moments ?? []} />
        <Finished stand={stand} period={period} />
        <Habits stand={stand} period={period} />
      </div>
    </>
  );
}

// ─── The summary and the buddy's take (§9) ─────────────────────────────

/**
 * The top of the page: the summary written by code, and "Ask <buddy>" for its take on this window, honest and
 * personal, written once a day per window and kept for the day. With a take, the take leads and the plain summary
 * is one tap away.
 */
function Summary({ period, takes, onTake }: { period: StandPeriod; takes: StandTakes | null; onTake: (t: NonNullable<StandTakes['takes'][StandWindow]>) => void }) {
  const [asking, setAsking] = useState(false);
  const [plain, setPlain] = useState(false);
  const take = takes?.takes[period.window] ?? null;
  const name = takes?.name || 'Buddy';
  const canAsk = takes?.ask === 'ok';

  const ask = async () => {
    setAsking(true);
    try {
      onTake(await learningApi.askStandTake(period.window));
      setPlain(false);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'Your buddy couldn’t answer just now. Try again.');
    } finally {
      setAsking(false);
    }
  };

  const avatar = (
    <span className="mt-[3px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[var(--rc-main)] text-[11px] font-[700] text-[var(--rc-on-main)]" aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  );

  if (take && !plain) {
    return (
      <div className="mt-6 max-w-[640px]" aria-live="polite">
        <div className="flex items-start gap-2.5">
          {avatar}
          <p className={cn('min-w-0 flex-1 text-[16px] leading-[1.6] text-[var(--rc-ink-1)]', voice.className)}>{take.text}</p>
        </div>
        <p className="mt-2 pl-[32px] text-[12.5px] text-[var(--rc-ink-3)]">
          {name}’s take for today ·{' '}
          <button type="button" className="underline-offset-2 hover:text-[var(--rc-ink-1)] hover:underline" onClick={() => setPlain(true)}>
            The plain summary
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-[640px]">
      {period.verdict.length > 0 && (
        <p className="text-[16px] leading-[1.55] text-[var(--rc-ink-1)]" aria-live="polite">
          {period.verdict.join(' ')}
        </p>
      )}
      {take ? (
        <button type="button" className="mt-2 text-[12.5px] text-[var(--rc-ink-3)] underline-offset-2 hover:text-[var(--rc-ink-1)] hover:underline" onClick={() => setPlain(false)}>
          {name}’s take for today
        </button>
      ) : (
        canAsk && (
          <RcButton size="sm" variant="quiet" busy={asking} className="-ml-2 mt-2.5 gap-2" onClick={() => void ask()}>
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--rc-main)] text-[10px] font-[700] text-[var(--rc-on-main)]" aria-hidden>
              {name.charAt(0).toUpperCase()}
            </span>
            {asking ? `${name} is thinking…` : `Ask ${name} for an honest take`}
          </RcButton>
        )
      )}
    </div>
  );
}

interface LedgerRow {
  key: string;
  label: string;
  now: string;
  before: string | null;
  trend: Trend;
  /** More about the row, on hover and for screen readers. */
  detail?: string;
  /** A second line under the label. */
  note?: { text: string; tone: 'attn' | 'meta' };
  /** Shown even when it is zero both now and before. */
  always?: boolean;
  /** Zero or nothing to count, now and before. */
  idle: boolean;
}

const of = (done: number, base: number) => (base ? `${done} of ${base}` : '–');

/**
 * A quiet ledger: one row per measure, the span's figure and the span before's (when the record covers
 * it), with which way it went. More is better on every row. Rows with nothing in either span are left out.
 */
function Ledger({ label, rows, compare }: { label: string; rows: LedgerRow[]; compare: boolean }) {
  const shown = rows.filter((r) => r.always || !r.idle || r.note);
  return (
    <table className="mt-2 w-full table-fixed border-collapse" aria-label={label}>
      <colgroup>
        <col />
        <col className="w-[96px] max-sm:w-[80px]" />
        {compare && <col className="w-[84px] max-sm:w-[68px]" />}
      </colgroup>
      {compare && (
        <thead>
          <tr className="text-[12.5px] text-[var(--rc-ink-3)]">
            <th className="sr-only" scope="col">
              Measure
            </th>
            <th scope="col" className="pb-0.5 text-right font-normal">
              Now
            </th>
            <th scope="col" className="pb-0.5 text-right font-normal">
              Before
            </th>
          </tr>
        </thead>
      )}
      <tbody>
        {shown.map((r) => (
          <tr key={r.key} className="align-baseline">
            <th scope="row" className="py-[7px] pr-3 text-left text-[15px] font-normal leading-[1.4] text-[var(--rc-ink-1)]" title={r.detail}>
              {r.label}
              {r.detail && <span className="sr-only">: {r.detail}</span>}
              {r.note && <span className={cn('mt-0.5 block text-[13px]', r.note.tone === 'attn' ? 'text-[var(--rc-attn)]' : 'text-[var(--rc-ink-3)]')}>{r.note.text}</span>}
            </th>
            <td className="rc-num py-[7px] text-right text-[15px] text-[var(--rc-ink-1)]">
              {r.trend === 'up' && (
                <span className="mr-1.5 inline-flex text-[var(--rc-good)]" title="More than before">
                  <ArrowUp className="h-[13px] w-[13px] translate-y-[1px]" strokeWidth={2.25} aria-hidden />
                  <span className="sr-only">up from before:</span>
                </span>
              )}
              {r.trend === 'down' && (
                <span className="mr-1.5 inline-flex text-[var(--rc-attn)]" title="Less than before">
                  <ArrowDown className="h-[13px] w-[13px] translate-y-[1px]" strokeWidth={2.25} aria-hidden />
                  <span className="sr-only">down from before:</span>
                </span>
              )}
              {r.now}
            </td>
            {compare && <td className="rc-num py-[7px] text-right text-[15px] text-[var(--rc-ink-3)]">{r.before ?? '–'}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function consistencyRows(stand: StandData, period: StandPeriod): LedgerRow[] {
  const c = period.current;
  const p = period.previous;
  const pair = (m: StandMeasures | null, get: (m: StandMeasures) => [number, number]) => (m ? get(m) : null);
  const reviewDetail = [
    c.reviews.late ? `${c.reviews.late} done late` : null,
    c.reviews.open ? `${c.reviews.open} still open` : null,
    c.reviews.catchUps ? `${plural(c.reviews.catchUps, 'review')} from earlier caught up` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const rows: LedgerRow[] = [
    {
      key: 'active',
      label: 'Active days',
      now: `${c.activeDays} of ${c.days}`,
      before: p ? `${p.activeDays} of ${p.days}` : null,
      trend: shareTrend([c.activeDays, c.days], pair(p, (m) => [m.activeDays, m.days])),
      always: true,
      idle: false,
    },
    {
      key: 'reviews',
      label: 'Reviews done on their day',
      now: of(c.reviews.onDay, c.reviews.due),
      before: p ? of(p.reviews.onDay, p.reviews.due) : null,
      trend: shareTrend([c.reviews.onDay, c.reviews.due], pair(p, (m) => [m.reviews.onDay, m.reviews.due])),
      detail: reviewDetail || undefined,
      note: stand.openNow ? { text: `${plural(stand.openNow, 'review')} waiting from earlier days`, tone: 'attn' } : undefined,
      idle: !c.reviews.due && !p?.reviews.due,
    },
    {
      key: 'focus',
      label: 'Focus lines kept',
      now: of(c.focus.done, c.focus.set),
      before: p ? of(p.focus.done, p.focus.set) : null,
      trend: shareTrend([c.focus.done, c.focus.set], pair(p, (m) => [m.focus.done, m.focus.set])),
      idle: !c.focus.set && !p?.focus.set,
    },
    {
      key: 'targets',
      label: 'Week targets kept',
      now: of(c.targets.done, c.targets.set),
      before: p ? of(p.targets.done, p.targets.set) : null,
      trend: shareTrend([c.targets.done, c.targets.set], pair(p, (m) => [m.targets.done, m.targets.set])),
      detail: c.targets.dropped ? `${c.targets.dropped} dropped` : undefined,
      idle: !c.targets.set && !p?.targets.set,
    },
    {
      key: 'sitting',
      label: 'Days with 30 min or more logged',
      now: String(c.daysWithSitting),
      before: p ? String(p.daysWithSitting) : null,
      trend: countTrend(c.daysWithSitting, p?.daysWithSitting),
      idle: !c.daysWithSitting && !p?.daysWithSitting,
    },
  ];
  return rows;
}

/** The habits against the span before: active days, reviews on their day, focus lines, week targets (only those with something in them). */
function Habits({ stand, period }: { stand: StandData; period: StandPeriod }) {
  const rows = consistencyRows(stand, period).filter((r) => r.key !== 'sitting');
  return (
    <section aria-labelledby="ws-habits">
      <LabelLine title="Habits" id="ws-habits" meta={period.previous ? undefined : period.partial ? 'since the record started' : undefined} />
      <Ledger label="Habits" rows={rows} compare={!!period.previous} />
    </section>
  );
}

/** What was finished in the window, newest first (a path's topic, a goal's milestone); each is a ring on the wave too. */
function Finished({ stand, period }: { stand: StandData; period: StandPeriod }) {
  const [all, setAll] = useState(false);
  const list = (stand.moments ?? []).filter((m) => m.day >= period.span.from && m.day <= period.span.to).reverse();
  const shown = all ? list : list.slice(0, 8);
  const where = period.partial ? 'the record' : WINDOW_WORDS[period.window].now;
  return (
    <section aria-labelledby="ws-finished">
      <LabelLine title="Finished" id="ws-finished" meta={list.length ? `${list.length} in ${where}` : undefined} />
      {list.length === 0 ? (
        <p className="rc-meta mt-3">Nothing finished in {where} yet. A path’s topics and a goal’s milestones land here as you finish them, and on the wave above.</p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((m, i) => (
            <li key={`${m.day}-${i}`} className="flex items-baseline gap-3 border-b border-[var(--rc-line)] py-2.5 last:border-b-0">
              <span className="rc-num w-[96px] shrink-0 text-[13px] text-[var(--rc-ink-3)]">{dayName(m.day, stand.today)}</span>
              {m.kind === 'milestone' ? (
                <Flag className="h-[13px] w-[13px] shrink-0 translate-y-[1px] text-[var(--rc-heat-4)]" strokeWidth={2.25} aria-label="Milestone" />
              ) : (
                <span className="inline-block h-[9px] w-[9px] shrink-0 rounded-full border-2 border-[var(--rc-heat-4)]" aria-hidden />
              )}
              <p className="min-w-0 flex-1 text-[15px] leading-[1.45] text-[var(--rc-ink-1)]">
                {m.title}
                {m.of && <span className="text-[var(--rc-ink-3)]"> · {m.of}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
      {list.length > 8 && (
        <button type="button" className="rc-meta mt-2 hover:text-[var(--rc-ink-1)]" onClick={() => setAll((x) => !x)}>
          {all ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}
    </section>
  );
}

// ─── Goals: each path's pace ───────────────────────────────────────────

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const LONG = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const at = (d: DayString) => new Date(`${d}T00:00:00Z`);
const perWeek = (n: number) => `${n} a week`;

const STATUS_WORD: Record<PathPace['status'], string> = {
  done: 'Done',
  overdue: 'Past the deadline',
  no_data: 'Too early to tell',
  behind: 'Behind',
  ahead: 'Ahead',
  on_track: 'On track',
};

function Goals({ goals, today }: { goals: MirrorData['goals']; today: DayString }) {
  return (
    <section aria-labelledby="ws-goals">
      <LabelLine title="Goals" id="ws-goals" meta={goals.length ? `${goals.length} active` : undefined} />
      {goals.length === 0 ? (
        <p className="rc-meta mt-3">No goal with a deadline yet: add one on Home and its paths get a pace here.</p>
      ) : (
        <ul className="flex flex-col">
          {goals.map((g) => (
            <li key={g._id} className="border-b border-[var(--rc-line)] py-3.5 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <h3 className="text-[15px] font-medium text-[var(--rc-ink-1)]">{g.title}</h3>
                <p className="rc-meta rc-num">
                  {g.daysLeft >= 0 ? `${g.daysLeft} days left` : `${-g.daysLeft} days past`} · due {g.deadline.slice(0, 4) === today.slice(0, 4) ? SHORT.format(at(g.deadline)) : LONG.format(at(g.deadline))}
                </p>
              </div>
              <p className="rc-meta rc-num mt-0.5">
                {g.milestones.done} of {g.milestones.total} milestones done
              </p>
              {g.paths.length === 0 ? (
                <p className="rc-meta mt-2.5">No path is linked to this goal: link its subjects on Home to see their pace.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3.5">
                  {g.paths.map((p) => (
                    <PathRow key={p.subject._id} p={p} />
                  ))}
                </ul>
              )}
            </li>
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
        <p className="text-[15px] text-[var(--rc-ink-1)]">{p.subject.name}</p>
        <p className="rc-meta rc-num">
          {STATUS_WORD[p.status]}
          {p.status !== 'done' && p.status !== 'no_data' ? ` · ${perWeek(p.perWeek)}` : ''}
          {need ? ` · ${need}` : ''}
          {lands ? ` · ${lands}` : ''}
        </p>
      </div>
      <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[var(--rc-surface-2)]" role="img" aria-label={`${p.done} of ${p.total} topics done`}>
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
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--rc-ink-2)" stroke="var(--rc-ground)" strokeWidth={2}>
          <title>{`${DAY.format(at(p.q.day)).replace(',', '')}: ${p.q.done} of ${p.q.total}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Subjects({ subjects, period }: { subjects: MirrorData['subjects']; period: StandPeriod | null }) {
  const shown = subjects.filter((s) => s.path || s.quiz.length || s.weakSpots.open || s.weakSpots.clearedIn30 || s.practice.alone + s.practice.hints + s.practice.after_answer);
  if (!shown.length) return null;
  const doneIn = (m: StandMeasures | null | undefined, id: string) => m?.topicsBySubject.find((x) => x.subjectId === id)?.done ?? 0;
  return (
    <section aria-labelledby="ws-subjects">
      <LabelLine title="By subject" id="ws-subjects" />
      <ul className="flex flex-col">
        {shown.map((s) => {
          const last = s.quiz.at(-1);
          const now = doneIn(period?.current, s._id);
          const before = period?.previous ? doneIn(period.previous, s._id) : null;
          const finished =
            period && (now || before)
              ? `${now} finished in ${period.partial ? 'the record' : WINDOW_WORDS[period.window].now}${before !== null ? `, ${before} the span before` : ''}`
              : null;
          return (
            <li key={s._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--rc-line)] py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">{s.name}</p>
                <p className="rc-meta rc-num mt-0.5 break-words">
                  {[
                    s.path ? `path ${s.path.done} of ${s.path.total}${s.path.perWeek ? `, ${perWeek(s.path.perWeek)}` : ''}` : null,
                    finished,
                    // How far along it is and what moved, nothing more (the owner, 11-22: no clutter of text).
                    s.weakSpots.open ? `${s.weakSpots.open} weak spot${s.weakSpots.open === 1 ? '' : 's'} open` : null,
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
