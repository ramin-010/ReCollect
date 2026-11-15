'use client';

import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, CircleDashed, CalendarArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton, rcScope } from '@/components/rc-ui';
import { MoveCalendar, type MoveTarget } from '@/components/learning/MoveCalendar';
import type { ChainRevision, DayString } from '@/lib/learning/types';
import './revision-timeline.css';

/**
 * A topic's revision timeline (Ramin's Revise showed it: each cycle with its day, what comes next).
 * Opened from the doc's Revision property: reviews 1–4 with the day each was done or is planned,
 * the next one marked, and "Move the next review…" (the Move calendar).
 */

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const at = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`);
/** Today in this browser's zone (his own). */
export const localDay = (): DayString => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` as DayString;
};
const daysBetween = (a: DayString, b: DayString) => Math.round((at(b).getTime() - at(a).getTime()) / 86_400_000);

export function RevisionTimeline({ chain, title, editable, onMoved }: { chain: ChainRevision[]; title: string; editable: boolean; onMoved: () => void }) {
  const [moving, setMoving] = useState<MoveTarget | null>(null);
  const today = localDay();
  const sorted = [...chain].sort((a, b) => a.cycleNumber - b.cycleNumber);
  const next = sorted.find((r) => r.status === 'pending') ?? null;
  const done = sorted.filter((r) => r.status === 'done').length;

  return (
    <>
      <PopoverPrimitive.Root>
        <PopoverPrimitive.Trigger asChild>
          <RcButton size="sm" variant="quiet">
            Timeline
          </RcButton>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content align="start" sideOffset={6} className={cn(rcScope, 'rc-float rt-pop')}>
            <p className="rt-title">Revisions</p>
            <p className="rt-meta">
              {done} of {sorted.length} done{next ? '' : ' · mastered'}
            </p>
            <ol className="rt-list">
              {sorted.map((r) => {
                const isNext = r._id === next?._id;
                const late = isNext && r.scheduledFor < today ? daysBetween(r.scheduledFor, today) : 0;
                const when =
                  r.status === 'done'
                    ? `Done ${r.completedAt ? DAY.format(new Date(r.completedAt)) : ''}`.trim()
                    : isNext
                      ? r.scheduledFor === today
                        ? 'Due today'
                        : late > 0
                          ? `Was due ${DAY.format(at(r.scheduledFor))} · ${late} ${late === 1 ? 'day' : 'days'} late`
                          : `Next · ${DAY.format(at(r.scheduledFor))}`
                      : `Planned ${DAY.format(at(r.scheduledFor))}`;
                return (
                  <li key={r._id} className={cn('rt-item', r.status === 'done' && 'rt-item--done', isNext && 'rt-item--next')}>
                    <span className="rt-mark" aria-hidden>
                      {r.status === 'done' ? <Check strokeWidth={2.25} /> : isNext ? <span className="rt-dot" /> : <CircleDashed strokeWidth={1.75} />}
                    </span>
                    <span className="rt-text">
                      <span className="rt-cycle">
                        Review {r.cycleNumber} <span className="rt-gap">+{r.intervalDays} {r.intervalDays === 1 ? 'day' : 'days'}</span>
                      </span>
                      <span className={cn('rt-when', late > 0 && 'rt-when--late')}>{when}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {editable && next && (
              <RcButton
                size="sm"
                variant="outline"
                className="rt-move"
                icon={<CalendarArrowUp className="h-4 w-4" strokeWidth={1.75} />}
                onClick={() => setMoving({ id: next._id, title, scheduledFor: next.scheduledFor, cycleNumber: next.cycleNumber })}
              >
                Move review {next.cycleNumber}…
              </RcButton>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      <MoveCalendar target={moving} today={today} onClose={() => setMoving(null)} onMoved={onMoved} />
    </>
  );
}
