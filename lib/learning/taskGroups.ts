/**
 * Groups the Home page's tasks into Revise's tabs (DashboardClient "Group tasks"), with the
 * audit fix: the "Due Today" tab lists overdue tasks first (with an Overdue badge) instead of
 * hiding them under All → Overdue. Pure; days are compared in the user's time zone.
 */
import { dayOf, resolveTimeZone, type DayString } from '@/lib/learning/engine';
import type { Task } from '@/lib/learning/types';

export interface GroupedTask extends Task {
  /** The due date's day in the user's zone, or null. */
  dueDay: DayString | null;
  isDone: boolean;
  isOverdue: boolean;
}

export interface TaskGroups {
  overdue: GroupedTask[];
  today: GroupedTask[];
  upcoming: GroupedTask[];
  weekly: GroupedTask[];
  monthly: GroupedTask[];
  /** What the first tab shows: overdue + today, or the 5 soonest upcoming when both are empty. */
  firstTab: { title: 'Due Today' | 'Upcoming'; tasks: GroupedTask[] };
  /** Not done, any group (the All dialog's "N total"). */
  undoneCount: number;
}

const byDoneThenDue = (a: GroupedTask, b: GroupedTask): number => {
  if (a.isDone !== b.isDone) return Number(a.isDone) - Number(b.isDone);
  const ad = a.dueDate ? Date.parse(a.dueDate) : Infinity;
  const bd = b.dueDate ? Date.parse(b.dueDate) : Infinity;
  return ad - bd;
};

export function toGroupedTask(task: Task, today: DayString, tz: string): GroupedTask {
  const zone = resolveTimeZone(tz);
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const dueDay = due && !Number.isNaN(due.getTime()) ? dayOf(due, zone) : null;
  const isDone = task.status === 'complete';
  const goalType = task.goalType ?? 'NONE';
  return {
    ...task,
    goalType,
    dueDay,
    isDone,
    isOverdue: !isDone && goalType === 'NONE' && dueDay !== null && dueDay < today,
  };
}

export function groupTasks(tasks: readonly Task[], today: DayString, tz: string): TaskGroups {
  const all = tasks.map((t) => toGroupedTask(t, today, tz));
  const standard = all.filter((t) => t.goalType === 'NONE');

  const overdue = standard.filter((t) => t.isOverdue).sort(byDoneThenDue);
  // No due date → today (Revise); the server only sends dateless standard tasks when they were completed today.
  const todayList = standard.filter((t) => !t.isOverdue && (t.dueDay === null || t.dueDay === today)).sort(byDoneThenDue);
  const upcoming = standard.filter((t) => t.dueDay !== null && t.dueDay > today).sort(byDoneThenDue);
  const weekly = all.filter((t) => t.goalType === 'WEEKLY').sort(byDoneThenDue);
  const monthly = all.filter((t) => t.goalType === 'MONTHLY').sort(byDoneThenDue);

  const dueNow = [...overdue, ...todayList];
  const firstTab =
    dueNow.length > 0
      ? { title: 'Due Today' as const, tasks: dueNow }
      : { title: 'Upcoming' as const, tasks: upcoming.filter((t) => !t.isDone).slice(0, 5) };

  return {
    overdue,
    today: todayList,
    upcoming,
    weekly,
    monthly,
    firstTab,
    undoneCount: all.filter((t) => !t.isDone).length,
  };
}
