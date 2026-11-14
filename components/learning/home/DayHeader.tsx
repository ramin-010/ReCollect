'use client';

import { BriefcaseBusiness, Plus, Settings2, Sunrise } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton, RcIconButton } from '@/components/rc-ui';
import type { DayString, LearningSettings, Rhythm, TodayPlan } from '@/lib/learning/types';
import { estimateMinutes } from '@/lib/learning/plan';
import { fullDay, longDay, plural, weekdayDay } from './format';

interface DayHeaderProps {
  today: DayString;
  plan: TodayPlan | null;
  settings: LearningSettings | null;
  rhythm: Rhythm | null;
  onOpenSettings: () => void;
  onEndBusy: () => void;
  onCapture: () => void;
}

/** The day in one line (owner's format: one separator style, no full stops). */
function summary(plan: TodayPlan): string {
  const left = plan.planned.length;
  const done = plan.doneToday.length;
  const minutes = plan.planned.reduce((s, r) => s + estimateMinutes(r), 0);
  const waiting = plan.waitingCount > 0 ? `${plan.waitingCount} waiting` : null;
  const parts =
    left === 0 && done === 0
      ? [plan.waitingCount > 0 ? 'Nothing planned for today' : 'Nothing to revise today', waiting]
      : left === 0
        ? [`All ${done} done`, waiting]
        : [`${left} to revise`, `about ${minutes} min`, waiting];
  return parts.filter(Boolean).join(' · ');
}

/**
 * Rhythm (LOOP_V2_SPEC §5) inline at the end of the summary: the last seven days as fixed cells,
 * filled when something was revised or a focus line was done. Nothing resets to zero.
 */
function RhythmInline({ rhythm, today }: { rhythm: Rhythm; today: DayString }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap" role="img" aria-label={`Active on ${rhythm.activeDays} of the last 7 days`}>
      <span className="inline-flex items-center gap-[3px]" aria-hidden>
        {rhythm.last7.map((d) => (
          <span
            key={d.day}
            title={`${d.day === today ? 'Today' : fullDay(d.day)}: ${d.active ? 'revised' : 'no revision'}`}
            className={cn(
              'h-[10px] w-[10px] rounded-[3px]',
              d.active ? 'bg-[var(--rc-stamp-mark)]' : 'bg-[var(--rc-line-strong)]',
              d.day === today && 'ring-1 ring-[var(--rc-ink-3)] ring-offset-1 ring-offset-[var(--rc-ground)]',
            )}
          />
        ))}
      </span>
      <span className="rc-num">{rhythm.activeDays} of 7 days</span>
    </span>
  );
}

/**
 * The page head: the date, one line under it (the day's summary or the calm busy / comeback line,
 * with the week's rhythm at its end), the one dark action (Capture, Ctrl K) and settings.
 */
export function DayHeader({ today, plan, settings, rhythm, onOpenSettings, onEndBusy, onCapture }: DayHeaderProps) {
  const mode = plan?.mode ?? 'normal';
  const count = plan ? plan.planned.length + plan.doneToday.length : 0;

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex-1 basis-[420px]">
        <h1 className="rc-h1">{longDay(today)}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] leading-[1.5] rc-ink-2 lg:flex-nowrap">
          {mode === 'comeback' && plan ? (
            <span className="inline-flex items-center gap-2">
              <Sunrise className="w-[17px] h-[17px] shrink-0 text-[var(--rc-icon)]" aria-hidden />
              Welcome back. Just {count === 1 ? 'this one' : `these ${count}`} to get going.
            </span>
          ) : mode === 'busy' && plan ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <BriefcaseBusiness className="w-[17px] h-[17px] shrink-0 text-[var(--rc-icon)]" aria-hidden />
              <span>
                Busy week{settings?.busyUntil ? ` until ${weekdayDay(settings.busyUntil, today)}` : ''}: just {count === 1 ? 'one small thing' : plural(count, 'small thing')} today.
              </span>
              <RcButton variant="quiet" size="sm" onClick={onEndBusy}>
                End busy week
              </RcButton>
            </span>
          ) : (
            plan && <span className="lg:whitespace-nowrap">{summary(plan)}</span>
          )}
          {rhythm && <RhythmInline rhythm={rhythm} today={today} />}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <RcButton variant="main" icon={<Plus />} onClick={onCapture} aria-keyshortcuts="Control+K">
          Capture
          <kbd className="ml-1 hidden rounded-[4px] bg-[color-mix(in_srgb,var(--rc-on-main)_14%,transparent)] px-1.5 py-[3px] font-[inherit] text-[12px] font-[500] leading-none opacity-80 sm:inline">Ctrl K</kbd>
        </RcButton>
        <RcIconButton label="Learning settings" onClick={onOpenSettings}>
          <Settings2 />
        </RcIconButton>
      </div>
    </header>
  );
}
