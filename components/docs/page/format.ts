import type { DayString } from '@/lib/learning/engine';
import { shortDay } from '@/components/learning/home/format';

const localToday = (): DayString => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` as DayString;
};

/** A revision date as Home's purple tag shows it: '16 Nov' ('16 Nov 2027' outside this year). */
export function formatStampDay(day: DayString): string {
  return shortDay(day, localToday());
}

/** 'just now', '5 min ago', '3 hours ago', 'yesterday', '12 Nov' (and the year when it differs). */
export function formatRelative(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = new Date(t);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday';
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
  return new Intl.DateTimeFormat('en-GB', opts).format(d);
}
