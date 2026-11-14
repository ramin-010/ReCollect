/**
 * Display helpers for learning days and times (LEARNING_SPEC §3 "Dates").
 *
 * A day is a 'YYYY-MM-DD' string in the user's time zone. To show one, it is formatted as
 * that date at UTC midnight with `timeZone: 'UTC'`, so the label never shifts by the
 * browser's offset. Never `new Date('YYYY-MM-DD')` without a zone.
 */
import {
  addDays,
  diffDays,
  minutesOfDay,
  resolveTimeZone,
  startOfDay,
  today as engineToday,
  type DayString,
} from '@/lib/learning/engine';
import { DEFAULT_DUE_HOUR } from '@/lib/utils/smartDateParser';

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let f = dayFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' });
    dayFormatters.set(key, f);
  }
  return f;
}

/** The UTC-midnight instant of a day: only for formatting with timeZone 'UTC'. */
function dayInstant(day: DayString): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** 'Wednesday, October 21, 2026' (Revise's header), or any other Intl option set. */
export function formatDay(
  day: DayString,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
): string {
  return dayFormatter(options).format(dayInstant(day));
}

/** 'Oct 21' */
export function formatDayShort(day: DayString): string {
  return formatDay(day, { month: 'short', day: 'numeric' });
}

/** 'Thu 22 Oct' style used by hint chips. */
export function formatDayChip(day: DayString): string {
  return formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** The user's current day. */
export function todayIn(tz: string | null | undefined): DayString {
  return engineToday(resolveTimeZone(tz));
}

/** Local wall-clock minutes since midnight now, in the user's zone. */
export function nowMinutes(tz: string | null | undefined): number {
  return minutesOfDay(new Date(), resolveTimeZone(tz));
}

/** Revise's greeting, by the user's local hour ("Still up" before 5). */
export function greeting(tz: string | null | undefined): string {
  const h = Math.floor(nowMinutes(tz) / 60);
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The day an instant falls on in the user's zone. */
export { dayOf } from '@/lib/learning/engine';

/** Whole days from `earlier` to `later`. */
export { diffDays, addDays };

/** 'Today' / 'Yesterday' / 'Oct 19' / 'Oct 19, 2025' for a day relative to `today` (Quick Notes groups). */
export function relativeDayLabel(day: DayString, today: DayString): string {
  const d = diffDays(today, day);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return day.slice(0, 4) === today.slice(0, 4)
    ? formatDay(day, { month: 'short', day: 'numeric' })
    : formatDay(day, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** The four revision days for a start on `today` (+1, +3, +7, +21), for the Ctrl+K hint. */
export function revisionDaysFrom(today: DayString): DayString[] {
  return [1, 3, 7, 21].map((n) => addDays(today, n));
}

/** 'h:mm a' of an instant in the user's zone (quick-note bubbles). */
export function formatClock(instant: Date, tz: string | null | undefined): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: resolveTimeZone(tz),
  }).format(instant);
}

/**
 * A task due date for `day` at 18:00 in the user's zone (Recollect's date-only rule,
 * smartDateParser DEFAULT_DUE_HOUR), whatever zone the browser is in.
 */
export function dueInstantForDay(day: DayString, tz: string | null | undefined): Date {
  return new Date(startOfDay(day, resolveTimeZone(tz)).getTime() + DEFAULT_DUE_HOUR * 60 * 60 * 1000);
}
