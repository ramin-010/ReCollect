'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import type { GroupedTask, TaskGroups } from '@/lib/learning/taskGroups';
import type { DayString } from '@/lib/learning/types';
import { formatClock } from '@/lib/learning/dates';
import { RcButton, RcCheck } from '@/components/rc-ui';
import { SectionHead } from './parts';
import { plural, relativeDay } from './format';

const MAX_ROWS = 3;

function dueWords(task: GroupedTask, today: DayString, timezone: string): string {
  if (!task.dueDay) return '';
  if (task.dueDay === today) {
    if (!task.dueDate) return 'Today';
    const at = formatClock(new Date(task.dueDate), timezone).toLowerCase();
    return at === '6:00 pm' ? 'Today' : at;
  }
  return task.dueDay < today ? `Since ${relativeDay(task.dueDay, today).toLowerCase()}` : relativeDay(task.dueDay, today);
}

/**
 * Tasks on Home only when something is due today (or late): at most three rows, then a link to
 * the rest in Tasks. Otherwise nothing at all. On Mondays with last week's open items, a quiet
 * "Plan your week" link stands in for the old review pop-up.
 */
export function TasksToday({
  groups,
  today,
  timezone,
  reviewCount,
  onPlanWeek,
}: {
  groups: TaskGroups;
  today: DayString;
  timezone: string;
  reviewCount: number;
  onPlanWeek: () => void;
}) {
  const due = [...groups.overdue, ...groups.today];
  const open = due.filter((t) => !t.isDone);
  if (due.length === 0 && reviewCount === 0) return null;
  const shown = [...open, ...due.filter((t) => t.isDone)].slice(0, MAX_ROWS);
  const more = due.length - shown.length;
  const { toggleTask, openTaskDetail } = useLearningStore.getState();
  // A tick says what it did and can be taken back (the row may leave the list on the next refresh).
  const tick = (task: GroupedTask) => {
    const wasDone = task.isDone;
    void toggleTask(task._id).then(() => {
      if (!wasDone) toast.success(`Done: ${task.title}`, { action: { label: 'Undo', onClick: () => void toggleTask(task._id) } });
    });
  };

  return (
    <section aria-labelledby="tasks-h">
      <SectionHead id="tasks-h" title="Due today">
        {reviewCount > 0 && (
          <RcButton variant="quiet" size="sm" className="-mr-2" onClick={onPlanWeek}>
            Plan your week
          </RcButton>
        )}
      </SectionHead>
      {shown.length > 0 ? (
        <ul className="border-t border-[var(--rc-line)]">
          {shown.map((task) => (
            <li key={task._id} className="flex items-start gap-3 py-2.5 border-b border-[var(--rc-line)]">
              <div className="pt-[2px]">
                <RcCheck checked={task.isDone} onToggle={() => tick(task)} label={task.isDone ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`} />
              </div>
              <button
                type="button"
                onClick={() => openTaskDetail(task)}
                className={cn(
                  'min-w-0 flex-1 text-left text-[var(--rc-fs-body)] leading-[1.35] break-words cursor-pointer decoration-1 underline-offset-[3px] hover:underline',
                  task.isDone ? 'text-[var(--rc-ink-3)] line-through decoration-[var(--rc-ink-3)]' : 'text-[var(--rc-ink-1)]',
                )}
              >
                {task.title}
              </button>
              <span className="rc-meta rc-num shrink-0 pt-[2px] text-right">{dueWords(task, today, timezone)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] rc-ink-2">{plural(reviewCount, 'task')} from last week {reviewCount === 1 ? 'is' : 'are'} still open.</p>
      )}
      {more > 0 && (
        <Link href="/todo" className="rc-btn rc-btn--quiet rc-btn--sm -ml-2 mt-1.5 no-underline">
          +{more} in Tasks
        </Link>
      )}
    </section>
  );
}
