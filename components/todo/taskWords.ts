/**
 * Words for a task's due date, status and priority on theme v2 (the Tasks list and its table):
 * dates the way Home says them ("Today, 5 pm", "Tue 17 Nov"), lateness in words ("2 days late"),
 * sentence case, never all caps.
 */
import { differenceInCalendarDays, differenceInMinutes, format, parseISO } from 'date-fns';

export interface DueWords {
  text: string;
  late: boolean;
}

function clock(d: Date): string {
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return (d.getMinutes() === 0 ? format(d, 'h a') : format(d, 'h:mm a')).toLowerCase();
}

export function dueWords(iso: string, now: Date = new Date()): DueWords {
  const due = parseISO(iso);
  const time = clock(due);
  const mins = differenceInMinutes(now, due);
  if (mins > 0) {
    if (mins < 60) return { text: `${mins} min late`, late: true };
    if (mins < 24 * 60) return { text: `${Math.floor(mins / 60)} hr late`, late: true };
    const days = Math.floor(mins / (24 * 60));
    return { text: `${days} ${days === 1 ? 'day' : 'days'} late`, late: true };
  }
  const days = differenceInCalendarDays(due, now);
  const at = time ? `, ${time}` : '';
  if (days === 0) return { text: `Today${at}`, late: false };
  if (days === 1) return { text: `Tomorrow${at}`, late: false };
  if (days < 7) return { text: `${format(due, 'EEE')}${at}`, late: false };
  return { text: format(due, due.getFullYear() === now.getFullYear() ? 'EEE d MMM' : 'd MMM yyyy'), late: false };
}

export const STATUS_WORDS: Record<string, string> = {
  pending: 'To do',
  in_progress: 'In progress',
  review: 'In review',
  blocked: 'Blocked',
  complete: 'Done',
};

export const PRIORITY_WORDS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  normal: 'Medium',
  low: 'Low',
};
