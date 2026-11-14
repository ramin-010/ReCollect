/**
 * Pure helpers for the loop v2 Today plan (LOOP_V2_SPEC §2) on the client.
 *
 * The server owns the plan; these only fill gaps the contract leaves open (per-item minutes,
 * the next review day shown on the due stamp) and turn a pre-v2 payload into a plan so Home
 * still works against an older backend.
 */
import { addDays, type DayString } from '@/lib/learning/engine';
import type { RevisionBuckets, TodayPlan } from '@/lib/learning/types';

/** Engine constants (LOOP_V2_SPEC §2): cycle 1 = 8 min, otherwise 5. */
export const MINUTES_FIRST_CYCLE = 8;
export const MINUTES_LATER_CYCLE = 5;
export const DEFAULT_BUDGET_MIN = 25;
/** +1, +3, +7, +21 days (LEARNING_SPEC). */
export const REVISION_INTERVALS = [1, 3, 7, 21] as const;
export const REVISION_CYCLES = REVISION_INTERVALS.length;

/** Minutes for one plan item: the server's value when it sends one, else the engine constants. */
export function estimateMinutes(item: { cycleNumber: number; minutes?: number }): number {
  if (typeof item.minutes === 'number' && item.minutes > 0) return item.minutes;
  return item.cycleNumber <= 1 ? MINUTES_FIRST_CYCLE : MINUTES_LATER_CYCLE;
}

/**
 * The day the next cycle lands on when cycle `cycleNumber` is done today: later cycles keep
 * their spacing from the completion day (engine completeRevision). null after the last cycle.
 */
export function nextReviewDay(today: DayString, cycleNumber: number): DayString | null {
  if (cycleNumber >= REVISION_CYCLES) return null;
  const current = REVISION_INTERVALS[cycleNumber - 1] ?? REVISION_INTERVALS[0];
  const next = REVISION_INTERVALS[cycleNumber] ?? current;
  return addDays(today, next - current);
}

/** A pre-v2 payload (no `plan`): everything due or overdue, unbudgeted, in the old order. */
export function derivePlan<R extends { cycleNumber: number; minutes?: number }>(revisions: RevisionBuckets<R>): TodayPlan<R> {
  const planned = [...revisions.dueToday, ...revisions.overdue];
  return {
    mode: 'normal',
    budgetMin: DEFAULT_BUDGET_MIN,
    estMinutes: planned.reduce((sum, r) => sum + estimateMinutes(r), 0),
    planned,
    waitingCount: 0,
    doneToday: revisions.doneToday,
  };
}
