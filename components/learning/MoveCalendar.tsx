'use client';

import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { ArrowRight, CheckSquare, ChevronLeft, ChevronRight, CircleAlert, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton, RcIconButton, RcSkel, rcScope } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import type { DayString, RevisionCalendar, RevisionCalendarDay } from '@/lib/learning/types';
import './move-calendar.css';

/**
 * Move a review to another day, seeing each day's load first (Ramin's Revise had it: a month,
 * the chosen day's reviews and tasks beside it, "Move here"). The month marks each day's minutes
 * against his budget; the side shows what is already there. Moving keeps the later cycles' gaps.
 */

export interface MoveTarget {
  id: string;
  title: string;
  scheduledFor: DayString;
  cycleNumber?: number;
}

const DAY_MS = 86_400_000;
const at = (d: DayString) => new Date(`${d}T00:00:00Z`);
const iso = (t: number): DayString => new Date(t).toISOString().slice(0, 10) as DayString;
const plusDays = (d: DayString, n: number) => iso(at(d).getTime() + n * DAY_MS);
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const SHORT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const firstOfMonth = (d: DayString) => `${d.slice(0, 7)}-01` as DayString;
/** The Monday on or before the first of the month: the grid's first cell. */
const gridStart = (month: DayString) => {
  const first = at(firstOfMonth(month));
  const back = (first.getUTCDay() + 6) % 7;
  return iso(first.getTime() - back * DAY_MS);
};
const addMonths = (month: DayString, n: number) => {
  const d = at(firstOfMonth(month));
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d.getTime());
};

function relative(day: DayString, today: DayString): string {
  const n = Math.round((at(day).getTime() - at(today).getTime()) / DAY_MS);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n > 1 && n < 14) return `In ${n} days`;
  return SHORT.format(at(day));
}

export function MoveCalendar({ target, today, onClose, onMoved }: { target: MoveTarget | null; today: DayString; onClose: () => void; onMoved?: (day: DayString) => void }) {
  const open = !!target;
  const start = target && target.scheduledFor > today ? target.scheduledFor : today;
  const [month, setMonth] = useState<DayString>(firstOfMonth(start));
  const [chosen, setChosen] = useState<DayString>(start);
  const [cal, setCal] = useState<RevisionCalendar | null | 'failed'>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);

  // A new target starts on its own day (or today, when it is overdue).
  if (target && opened !== target.id) {
    setOpened(target.id);
    setMonth(firstOfMonth(start));
    setChosen(start);
  }

  const first = gridStart(month);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCal(null);
    learningApi.revisionCalendar(first, 42).then(
      (c) => alive && setCal(c),
      () => alive && setCal('failed'),
    );
    return () => {
      alive = false;
    };
  }, [open, first, attempt]);

  const byDay = useMemo(() => new Map((cal && cal !== 'failed' ? cal.days : []).map((d) => [d.day, d])), [cal]);
  const budget = cal && cal !== 'failed' ? cal.budgetMin : 0;
  const cells = Array.from({ length: 42 }, (_, i) => plusDays(first, i));
  const canGoBack = month > firstOfMonth(today);
  const picked: RevisionCalendarDay | undefined = byDay.get(chosen);
  const moving = target ? (picked?.revisions.find((r) => r._id === target.id) ?? null) : null;
  const ownMinutes = moving?.minutes ?? 0;
  const there = picked ? picked.revisions.filter((r) => r._id !== target?.id) : [];
  const loadAfter = (picked?.minutes ?? 0) - ownMinutes + (target ? ownMinutesGuess(target, cal) : 0);
  const over = budget > 0 && loadAfter > budget;
  const same = !!target && chosen === target.scheduledFor;

  const move = async () => {
    if (!target || same) return;
    setBusy(true);
    try {
      await learningApi.rescheduleRevision(target.id, chosen);
      toast.success(`Moved to ${SHORT.format(at(chosen))}`, { description: target.title });
      onMoved?.(chosen);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "That review couldn't be moved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(rcScope, 'rc-overlay')} />
        <DialogPrimitive.Content
          className={cn(rcScope, 'rc-float mc-dialog')}
          aria-describedby={undefined}
          // Focus starts on the chosen day (not the month arrows).
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => (document.querySelector('.mc-day--chosen') as HTMLElement | null)?.focus({ preventScroll: true }));
          }}
        >
          <div className="mc-cal">
            <div className="mc-cal-head">
              <DialogPrimitive.Title className="mc-month">{MONTH.format(at(month))}</DialogPrimitive.Title>
              <div className="flex items-center gap-0.5">
                <RcIconButton label="Previous month" size="sm" disabled={!canGoBack} onClick={() => setMonth(addMonths(month, -1))}>
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                </RcIconButton>
                <RcIconButton label="Next month" size="sm" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </RcIconButton>
              </div>
            </div>
            <div className="mc-grid" role="grid" aria-label={`Days of ${MONTH.format(at(month))}`}>
              {WEEKDAYS.map((w) => (
                <span key={w} className="mc-weekday" aria-hidden>
                  {w}
                </span>
              ))}
              {cells.map((day) => {
                const d = byDay.get(day);
                const past = day < today;
                const outside = day.slice(0, 7) !== month.slice(0, 7);
                const load = d && budget ? Math.min(1, d.minutes / budget) : 0;
                return (
                  <button
                    key={day}
                    type="button"
                    role="gridcell"
                    disabled={past}
                    aria-selected={day === chosen}
                    aria-label={`${LONG.format(at(day))}${d && d.revisions.length ? `, ${d.revisions.length} reviews, ${d.minutes} minutes` : ''}`}
                    className={cn('mc-day', outside && 'mc-day--outside', day === today && 'mc-day--today', day === chosen && 'mc-day--chosen')}
                    onClick={() => setChosen(day)}
                  >
                    <span className="mc-day-num">{Number(day.slice(8))}</span>
                    {target && day === target.scheduledFor && day !== chosen && <span className="mc-day-now" title="It is here now" />}
                    {!past && d && d.minutes > 0 && (
                      <span className={cn('mc-load', budget && d.minutes > budget && 'mc-load--over')} style={{ width: `${Math.max(18, load * 100)}%` }} aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mc-key">
              <span className="mc-load mc-load--key" aria-hidden /> minutes of reviews, against your {budget || '…'} a day
            </p>
          </div>

          <div className="mc-side">
            <p className="mc-day-title">{LONG.format(at(chosen))}</p>
            <p className="mc-day-meta">{relative(chosen, today)}</p>
            {cal === 'failed' && (
              <div className="mc-failed">
                <p>Couldn’t load the days.</p>
                <RcButton size="sm" variant="outline" icon={<RotateCw />} onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </RcButton>
              </div>
            )}
            {cal === null && (
              <div className="mt-5 flex flex-col gap-2" aria-busy aria-label="Loading the days">
                <RcSkel className="h-4 w-3/4 rounded-[6px]" />
                <RcSkel className="h-4 w-1/2 rounded-[6px]" />
              </div>
            )}
            {cal && cal !== 'failed' && (
              <>
                <p className={cn('mc-load-line', over && 'mc-load-line--over')}>
                  {over && <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />}
                  {there.length === 0 ? 'No other reviews' : `${there.length} other ${there.length === 1 ? 'review' : 'reviews'}`}
                  {' · '}about {loadAfter} min of your {budget}
                  {over ? ` · ${loadAfter - budget} over` : ''}
                </p>
                <ul className="mc-list">
                  {target && (
                    <li className="mc-item mc-item--moving">
                      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1">{target.title}</span>
                      <span className="mc-item-meta">{same ? 'here now' : 'moves here'}</span>
                    </li>
                  )}
                  {there.map((r) => (
                    <li key={r._id} className="mc-item">
                      <span className="rc-swatch" style={{ background: r.subject?.color ?? 'var(--rc-icon)' }} aria-hidden />
                      <span className="min-w-0 flex-1">{r.title}</span>
                      <span className="mc-item-meta">
                        review {r.cycleNumber} · {r.minutes} min
                      </span>
                    </li>
                  ))}
                  {(picked?.tasks ?? []).map((t) => (
                    <li key={t._id} className="mc-item">
                      <CheckSquare className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1">{t.title}</span>
                      <span className="mc-item-meta">task</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mc-actions">
              <RcButton variant="outline" disabled={busy} onClick={onClose}>
                Cancel
              </RcButton>
              <RcButton variant="main" busy={busy} disabled={same || cal === null} onClick={() => void move()}>
                Move here
              </RcButton>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The moving review's minutes, from wherever it shows in the loaded month (else a typical 8). */
function ownMinutesGuess(target: MoveTarget, cal: RevisionCalendar | null | 'failed'): number {
  if (cal && cal !== 'failed') for (const d of cal.days) for (const r of d.revisions) if (r._id === target.id) return r.minutes;
  return 8;
}
