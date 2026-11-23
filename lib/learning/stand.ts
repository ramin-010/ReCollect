/**
 * Where you stand, the page's own arithmetic (WHERE_YOU_STAND_PLAN §4-5, §9): how the server's numbers are
 * laid out (the wave's points, the year card's levels, the span words). Every number comes from
 * GET /api/mirror/stand; nothing here counts the record, it only groups the days the server sent.
 */
import { addDays, diffDays, type DayString } from '@/lib/learning/engine';
import type { StandData, StandDay, StandSpan, StandWindow } from './types';

export const STAND_WINDOWS: StandWindow[] = ['week', 'month', 'year'];
export const WINDOW_LABEL: Record<StandWindow, string> = { week: 'Week', month: 'Month', year: 'Year' };
/** "in the last 7 days" and its span before, for the page's own words (the verdict comes from the server). */
export const WINDOW_WORDS: Record<StandWindow, { now: string; before: string }> = {
  week: { now: 'the last 7 days', before: 'the 7 days before' },
  month: { now: 'the last 4 weeks', before: 'the 4 weeks before' },
  year: { now: 'the last year', before: 'the year before' },
};

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

const year = (d: DayString) => d.slice(0, 4);
/** '16 Nov' */
export const dayMonth = (d: DayString) => fmt(d, { day: 'numeric', month: 'short' });
/** 'Mon' */
export const weekdayShort = (d: DayString) => fmt(d, { weekday: 'short' });
/** 'Nov' */
export const monthShort = (d: DayString) => fmt(d, { month: 'short' });
/** 'Mon 16 Nov', with the year when it isn't today's. */
export function dayName(d: DayString, today: DayString): string {
  return `${weekdayShort(d)} ${dayMonth(d)}${year(d) === year(today) ? '' : ` ${year(d)}`}`;
}

/** '16–22 Nov', '26 Oct – 22 Nov', '24 Nov 2025 – 22 Nov 2026' (the year only when it isn't today's). */
export function formatSpan(s: StandSpan, today: DayString): string {
  const sameYear = year(s.from) === year(s.to);
  if (!sameYear) return `${dayMonth(s.from)} ${year(s.from)} – ${dayMonth(s.to)} ${year(s.to)}`;
  const tail = year(s.to) === year(today) ? '' : ` ${year(s.to)}`;
  if (s.from.slice(0, 7) === s.to.slice(0, 7)) return `${Number(s.from.slice(8))}–${dayMonth(s.to)}${tail}`;
  return `${dayMonth(s.from)} – ${dayMonth(s.to)}${tail}`;
}

function byDay(stand: StandData): Map<DayString, StandDay> {
  return new Map(stand.days.map((d) => [d.day, d]));
}

export interface WavePoint {
  key: string;
  /** Under the axis; '' where it shows none. */
  label: string;
  /** The read-out's name ('Mon 16 Nov', '26 Oct – 1 Nov'). */
  name: string;
  /** The days the point covers (a day, or a year's week). */
  from: DayString;
  to: DayString;
  /** Minutes logged; null before the record started (the wave starts with the record). */
  now: number | null;
  /** The same point of the span before; null without one. */
  before: number | null;
}

/**
 * The wave's points (the owner, 11-22: "a wave graph which reflects the progress"): a week's 7 days and a month's
 * 28 days, each beside the same day of the span before; a year's 52 weeks (no year before is sent), from the record's
 * start. A month's day is the average a day over the 7 days up to it, so it shows the trend, not single days' spikes.
 */
export function waveSeries(stand: StandData, window: StandWindow, area?: 'personal' | 'work'): WavePoint[] {
  const { span, before } = stand.periods[window];
  const days = byDay(stand);
  const today = stand.today;
  // PERSONAL_OFFICE_PLAN: one area's minutes (the All lens draws personal and work as two lines).
  const minutesOf = (e: StandDay) => (area ? (e.byArea?.[area] ?? (area === 'personal' ? e.minutes : 0)) : e.minutes);
  const total = (from: DayString, to: DayString) => {
    let sum = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const e = days.get(d);
      if (e) sum += minutesOf(e);
    }
    return sum;
  };
  const avg7 = (day: DayString) => {
    const from = addDays(day, -6) < stand.recordStart ? stand.recordStart : addDays(day, -6);
    return Math.round((total(from, day) / (diffDays(day, from) + 1)) * 10) / 10;
  };
  const out: WavePoint[] = [];
  if (window !== 'year') {
    const n = window === 'week' ? 7 : 28;
    const value = window === 'week' ? (d: DayString) => total(d, d) : avg7;
    for (let i = 0; i < n; i++) {
      const day = addDays(span.from, i);
      const prior = before ? addDays(before.from, i) : null;
      out.push({
        key: day,
        label: window === 'week' ? (day === today ? 'Today' : weekdayShort(day)) : i % 7 === 0 || i === n - 1 ? (day === today ? 'Today' : dayMonth(day)) : '',
        name: dayName(day, today),
        from: day,
        to: day,
        now: day >= stand.recordStart ? value(day) : null,
        before: prior ? value(prior) : null,
      });
    }
    return out;
  }
  // A year starts its wave at the record: the weeks before it would only be an empty stretch.
  let lastMonth = '';
  for (let j = 0; j < 52; j++) {
    const from = addDays(span.from, 7 * j);
    const to = addDays(from, 6);
    if (to < stand.recordStart && j < 50) continue;
    const month = from.slice(0, 7);
    out.push({ key: from, label: month !== lastMonth ? monthShort(from) : '', name: formatSpan({ from, to }, today), from, to, now: to >= stand.recordStart ? total(from, to) : null, before: null });
    lastMonth = month;
  }
  return out;
}

/** What one point of the wave counts: a day's minutes (week), the average a day over 7 days (month), a week's (year). */
export const WAVE_UNIT: Record<StandWindow, { suffix: string; column: string }> = {
  week: { suffix: '', column: 'Logged' },
  month: { suffix: ' a day', column: 'A day, 7-day average' },
  year: { suffix: ' that week', column: 'Logged' },
};

/** A grid cell's level: 0 not active; then by minutes logged that day (under 30, 30-59, 60-119, 120 and more). */
export function cellLevel(d: StandDay): 0 | 1 | 2 | 3 | 4 {
  if (!d.active) return 0;
  if (d.minutes < 30) return 1;
  if (d.minutes < 60) return 2;
  if (d.minutes < 120) return 3;
  return 4;
}

/**
 * What made a day active, for its tooltip: '1 h 40 min (second_brain 1 h, DSA 40 min) · 2 reviews, 1 focus line'
 * (where the time went: PERSONAL_OFFICE_PLAN; an older server sends no places).
 */
export function dayWords(d: StandDay, formatMinutes: (m: number) => string): string {
  if (!d.active) return 'not active';
  const where = d.places?.length && d.minutes ? ` (${d.places.map((p) => `${p.name} ${formatMinutes(p.minutes)}`).join(', ')})` : '';
  const parts = [
    d.reviews ? `${d.reviews} ${d.reviews === 1 ? 'review' : 'reviews'}` : null,
    d.focus ? `${d.focus} focus ${d.focus === 1 ? 'line' : 'lines'}` : null,
    d.sessions && !d.minutes ? `${d.sessions} ${d.sessions === 1 ? 'session' : 'sessions'}` : null,
  ].filter(Boolean);
  return [d.minutes ? `${formatMinutes(d.minutes)}${where}` : null, parts.join(', ') || null].filter(Boolean).join(' · ');
}

/**
 * Which axis labels to draw when they may crowd (the year's month names): where two would sit closer
 * than `minGap`, the later one stays (a month's first full column beats the stub of the month before).
 */
export function spacedLabels(xs: ReadonlyArray<number | null>, minGap: number): boolean[] {
  const out = xs.map((x) => x !== null);
  let next = Infinity;
  for (let i = xs.length - 1; i >= 0; i--) {
    const x = xs[i];
    if (x === null || x === undefined) continue;
    if (next - x < minGap) out[i] = false;
    else next = x;
  }
  return out;
}

export type Trend = 'up' | 'down' | null;

/** Which way a count went (more is better on every row of the page). */
export function countTrend(now: number, before: number | null | undefined): Trend {
  if (before === null || before === undefined || now === before) return null;
  return now > before ? 'up' : 'down';
}

/** Which way a share went ('14 of 18' against '9 of 15'); null when either has nothing to count. */
export function shareTrend(now: [number, number], before: [number, number] | null | undefined): Trend {
  if (!before || now[1] === 0 || before[1] === 0) return null;
  const a = now[0] / now[1];
  const b = before[0] / before[1];
  if (Math.abs(a - b) < 0.005) return null;
  return a > b ? 'up' : 'down';
}
