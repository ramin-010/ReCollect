/**
 * Home's date and number words (DESIGN.md "Words"). Days are 'YYYY-MM-DD' in the user's zone and
 * are formatted at UTC midnight with timeZone 'UTC', so labels never shift by the browser's offset.
 * Day-first order ("Saturday, 14 November"), as Ramin writes dates.
 */
import { diffDays, type DayString } from '@/lib/learning/engine';

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(day: DayString, options: Intl.DateTimeFormatOptions): string {
  const key = JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' });
    cache.set(key, f);
  }
  return f.format(new Date(`${day}T00:00:00Z`));
}

/** 'Saturday, 14 November' */
export function longDay(day: DayString): string {
  return `${fmt(day, { weekday: 'long' })}, ${fmt(day, { day: 'numeric', month: 'long' })}`;
}

/** '5 Nov', or '5 Nov 2027' outside the current year. */
export function shortDay(day: DayString, today: DayString): string {
  const base = fmt(day, { day: 'numeric', month: 'short' });
  return day.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${day.slice(0, 4)}`;
}

/** 'Fri 20 Nov' */
export function weekdayDay(day: DayString, today: DayString): string {
  return `${fmt(day, { weekday: 'short' })} ${shortDay(day, today)}`;
}

/** 'M', 'T', … for the rhythm cells. */
export function weekdayInitial(day: DayString): string {
  return fmt(day, { weekday: 'narrow' });
}

/** 'Monday 9 November' (accessible names). */
export function fullDay(day: DayString): string {
  return `${fmt(day, { weekday: 'long' })} ${fmt(day, { day: 'numeric', month: 'long' })}`;
}

/** Stamp text: '28 Nov' or '30 Jun 2027' (the stamp face sets it in capitals). */
export function stampDay(day: DayString, today: DayString): string {
  return shortDay(day, today);
}

/** 'Today' / 'Tomorrow' / 'Yesterday' / 'Fri 20 Nov' */
export function relativeDay(day: DayString, today: DayString): string {
  const d = diffDays(day, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return weekdayDay(day, today);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** '3 weeks' / 'a week' / '5 days' for forecast words. */
export function spanWords(days: number): string {
  const d = Math.abs(Math.round(days));
  if (d < 7) return d <= 1 ? 'a day' : `${d} days`;
  const w = Math.round(d / 7);
  if (w < 9) return w === 1 ? 'a week' : `${w} weeks`;
  const m = Math.round(d / 30);
  return m === 1 ? 'a month' : `${m} months`;
}
