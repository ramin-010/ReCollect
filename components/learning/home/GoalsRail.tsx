'use client';

import { CalendarX2, CircleCheck, CircleDashed, Flag, Hourglass, Pencil, Plus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import { diffDays, type DayString } from '@/lib/learning/engine';
import { GOAL_LIMIT, type ForecastStatus, type TodayGoal } from '@/lib/learning/types';
import { RcButton, RcCheck, RcIconButton, RcStamp } from '@/components/rc-ui';
import { SectionFailed, SectionHead } from './parts';
import { plural, shortDay, spanWords, stampDay } from './format';

const STATUS: Record<ForecastStatus, { tone: 'good' | 'attn' | 'neutral'; icon: typeof CircleCheck }> = {
  on_track: { tone: 'good', icon: CircleCheck },
  ahead: { tone: 'good', icon: TrendingUp },
  done: { tone: 'good', icon: Flag },
  behind: { tone: 'attn', icon: Hourglass },
  overdue: { tone: 'attn', icon: CalendarX2 },
  no_data: { tone: 'neutral', icon: CircleDashed },
};

/** A pace in words, rounded so it is enough: 0.12/week → "One milestone every 8 weeks", 1.2 → "2 milestones a week". */
function rateWords(perWeek: number | null): string | null {
  if (perWeek === null || !(perWeek > 0)) return null;
  if (perWeek >= 1 - 1e-9) {
    const n = Math.ceil(perWeek - 1e-9);
    return n === 1 ? 'One milestone a week' : `${n} milestones a week`;
  }
  return `One milestone every ${Math.max(2, Math.floor(1 / perWeek))} weeks`;
}

/**
 * The forecast as one calm line: the status (coloured, with its icon) and the smallest next step,
 * built from the forecast's numbers so the two halves never repeat each other.
 */
function forecastLine(g: TodayGoal, today: DayString): { status: string; next: string } {
  const f = g.forecast;
  const rate = rateWords(f.requiredPerWeek);
  switch (f.status) {
    case 'on_track':
      return { status: 'On track.', next: rate ? `${rate} keeps you there.` : 'Keep going.' };
    case 'ahead':
      return {
        status: f.projectedDay ? `Ahead of plan by about ${spanWords(diffDays(g.deadline, f.projectedDay))}.` : 'Ahead of plan.',
        next: rate ? `${rate} keeps you on track.` : 'Keep going.',
      };
    case 'behind':
      return {
        status: f.behindDays && f.behindDays > 0 ? `About ${spanWords(f.behindDays)} behind.` : 'Behind pace.',
        next: rate ? `${rate} from now gets you there by ${shortDay(g.deadline, today)}.` : `Pick the next milestone and a date for it.`,
      };
    case 'overdue':
      return { status: 'Past the deadline.', next: 'Pick a new date, or mark it reached.' };
    case 'done':
      return { status: 'Reached.', next: 'Archive it, or set the next goal.' };
    case 'no_data':
      return { status: 'Too early to tell.', next: 'Tick off a first milestone to see a forecast.' };
  }
}

/** Where a steady pace would be today: the share of the goal's time already gone (null without a start day). */
function expectedShare(g: TodayGoal, today: DayString): number | null {
  if (!g.createdDay) return null;
  const span = diffDays(g.deadline, g.createdDay);
  if (span <= 0) return null;
  return Math.min(1, Math.max(0, diffDays(today, g.createdDay) / span));
}

function GoalCard({ goal, today, onEdit }: { goal: TodayGoal; today: DayString; onEdit: () => void }) {
  const f = goal.forecast;
  const { done, total } = goal.progress;
  const share = total > 0 ? done / total : 0;
  const expected = expectedShare(goal, today);
  const st = STATUS[f.status];
  const Icon = st.icon;
  const toneText = st.tone === 'good' ? 'text-[var(--rc-good)]' : st.tone === 'attn' ? 'text-[var(--rc-attn)]' : 'text-[var(--rc-ink-2)]';
  const daysWords = f.daysLeft > 0 ? `${plural(f.daysLeft, 'day')} left` : f.daysLeft === 0 ? 'Due today' : `${plural(-f.daysLeft, 'day')} past`;
  const showTick = expected !== null && f.status !== 'done';
  const next = goal.nextMilestone;
  const line = forecastLine(goal, today);

  return (
    <article className="rounded-[14px] bg-[color-mix(in_srgb,var(--rc-ink-1)_3.5%,var(--rc-ground))] px-3.5 pt-3 pb-3.5" aria-label={`Goal: ${goal.title}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="rc-title min-w-0 pt-0.5">{goal.title}</h3>
        <RcIconButton label={`Edit goal “${goal.title}”`} size="sm" className="-mr-1.5 -mt-0.5" onClick={onEdit}>
          <Pencil />
        </RcIconButton>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <RcStamp label={daysWords}>{daysWords}</RcStamp>
        <span className="rc-meta rc-num">by {stampDay(goal.deadline, today)}</span>
      </div>

      <div className="mt-3">
        <div
          className="rc-meter"
          data-tone={st.tone === 'neutral' ? undefined : st.tone}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={`${done} of ${total} milestones done${expected !== null ? `; a steady pace would be at ${Math.round(expected * total * 10) / 10} by today` : ''}`}
        >
          <span className="rc-meter-fill" style={{ width: `${Math.max(share * 100, done > 0 ? 3 : 0)}%` }} />
          {showTick && <span className="rc-meter-tick" style={{ left: `${expected! * 100}%` }} title="Where a steady pace would be today" />}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 rc-meta rc-num">
          <span>
            {done} of {plural(total, 'milestone')}
          </span>
          {showTick && (
            <span className="inline-flex items-center gap-1.5 text-right">
              <span aria-hidden className="inline-block h-[11px] w-[2px] rounded-[1px] bg-[var(--rc-ink-2)]" />
              steady pace
            </span>
          )}
        </div>
      </div>

      <p className="mt-2.5 text-[14.5px] leading-[1.4]">
        <span className={cn('inline-flex items-center gap-1.5 font-[600] align-top', toneText)}>
          <Icon className="w-4 h-4 shrink-0" aria-hidden />
          {line.status}
        </span>{' '}
        <span className="rc-ink-2">{line.next}</span>
      </p>

      {next ? (
        <div className="mt-3 flex items-start gap-2.5 border-t border-[var(--rc-line)] pt-3">
          <div className="pt-[2px]">
            <RcCheck
              checked={next.done}
              onToggle={() => void useLearningStore.getState().toggleMilestone(goal._id, next)}
              label={next.done ? `Mark milestone “${next.title}” not done` : `Mark milestone “${next.title}” done`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('text-[14.5px] leading-[1.35] break-words', next.done ? 'text-[var(--rc-ink-3)] line-through' : 'text-[var(--rc-ink-1)]')}>
              <span className="sr-only">Next milestone: </span>
              {next.title}
            </p>
            <p className="mt-0.5 text-[13px] leading-[1.3] rc-ink-3">{next.dueDay ? `Next milestone, due ${shortDay(next.dueDay, today)}` : 'Next milestone'}</p>
          </div>
        </div>
      ) : (
        total === 0 && (
          <RcButton variant="quiet" size="sm" className="mt-2 -ml-2" onClick={onEdit}>
            Add milestones
          </RcButton>
        )
      )}
    </article>
  );
}

/**
 * Goals (LOOP_V2_SPEC §4): each active goal as its own card with matching heads: deadline stamp,
 * days left, milestones against a steady-pace tick, the honest forecast and its suggestion, and
 * the next milestone one click from done.
 */
export function GoalsRail({
  goals,
  today,
  onRetry,
  onCreate,
  onEdit,
}: {
  goals: TodayGoal[] | null;
  today: DayString;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (goalId: string) => void;
}) {
  return (
    <section aria-labelledby="goals-h">
      {/* The heading and New goal a little faded (the owner, 11-22): the card leads. */}
      <SectionHead id="goals-h" title="Goals" className="!mb-[4px] [&_h2]:ml-[3px] [&_h2]:!text-[var(--rc-ink-3)]">
        {goals && goals.length > 0 && goals.length < GOAL_LIMIT && (
          <RcButton variant="quiet" size="sm" className="-mr-2 !text-[var(--rc-ink-3)] hover:!text-[var(--rc-ink-1)]" icon={<Plus />} onClick={onCreate}>
            New goal
          </RcButton>
        )}
      </SectionHead>
      {!goals ? (
        <SectionFailed what="your goals" onRetry={onRetry} />
      ) : goals.length === 0 ? (
        <div className="rc-card px-4 py-4">
          <p className="rc-title">No goal yet.</p>
          <p className="mt-1 text-[15px] rc-ink-2">A goal with a date keeps the days honest: Home tells you if you’re on pace.</p>
          <RcButton variant="outline" size="sm" className="mt-3" icon={<Plus />} onClick={onCreate}>
            Set a goal
          </RcButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((g) => (
            <GoalCard key={g._id} goal={g} today={today} onEdit={() => onEdit(g._id)} />
          ))}
        </div>
      )}
    </section>
  );
}
