'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import type { GroupedTask, TaskGroups } from '@/lib/learning/taskGroups';
import type { DayString } from '@/lib/learning/types';
import { formatClock } from '@/lib/learning/dates';
import { RcButton, RcCheck, RcIconButton } from '@/components/rc-ui';
import { LabelLine } from './parts';
import { FocusItems } from './FocusLines';
import { NextUpRows } from './NextUp';
import type { NextUp, TodayFocus } from '@/lib/learning/types';
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
 * Today's focus (the owner, 11-21): the tasks due today or late (at most three, then a link to the
 * rest in Tasks); on a day with none, what comes next on each path in their place; then the day's
 * focus lines, which are not tasks, with "Add a focus" last. On Mondays with last week's open
 * items, a quiet "Plan your week" link.
 */
export function TasksToday({
  groups,
  today,
  timezone,
  reviewCount,
  onPlanWeek,
  focus,
  next,
  onRetry,
}: {
  groups: TaskGroups;
  today: DayString;
  timezone: string;
  reviewCount: number;
  onPlanWeek: () => void;
  focus: TodayFocus | null;
  next: NextUp[] | undefined;
  onRetry: () => void;
}) {
  // A ticked task leaves with a line drawn through it from the centre out, then fades and folds away
  // (the owner, 11-21: "not go away immediately"); the tick is saved when it has left. A second click
  // while it leaves keeps it.
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const all = timers.current;
    return () => all.forEach((t) => window.clearTimeout(t));
  }, []);
  const due = [...groups.overdue, ...groups.today];
  const open = due.filter((t) => !t.isDone);
  const shown = [...open, ...due.filter((t) => t.isDone)].slice(0, MAX_ROWS);
  const more = due.length - shown.length;
  const { toggleTask, openTaskDetail, openReschedule } = useLearningStore.getState();
  // A tick says what it did and can be taken back (the row may leave the list on the next refresh).
  const tick = (task: GroupedTask) => {
    if (task.isDone) {
      void toggleTask(task._id);
      return;
    }
    const pending = timers.current.get(task._id);
    if (pending) {
      window.clearTimeout(pending);
      timers.current.delete(task._id);
      setLeaving((l) => {
        const n = new Set(l);
        n.delete(task._id);
        return n;
      });
      return;
    }
    setLeaving((l) => new Set(l).add(task._id));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => {
        timers.current.delete(task._id);
        void toggleTask(task._id).then(() => {
          setLeaving((l) => {
            const n = new Set(l);
            n.delete(task._id);
            return n;
          });
          toast.success(`Done: ${task.title}`, { action: { label: 'Undo', onClick: () => void toggleTask(task._id) } });
        });
      },
      reduced ? 150 : 760,
    );
    timers.current.set(task._id, timer);
  };

  return (
    <section aria-labelledby="tasks-h" className="scroll-mt-6">
      <LabelLine id="tasks-h" title="Today’s focus" className="scroll-mt-6">
        {more > 0 && (
          <Link href="/todo" className="rc-btn rc-btn--quiet rc-btn--sm no-underline">
            +{more} in Tasks
          </Link>
        )}
        {reviewCount > 0 && (
          <RcButton variant="quiet" size="sm" className="-mr-2" onClick={onPlanWeek}>
            Plan your week
          </RcButton>
        )}
      </LabelLine>
      {shown.length > 0 ? (
        <ul>
          {shown.map((task) => (
            <li key={task._id} data-leaving={leaving.has(task._id) || undefined} className="rc-row rc-hoverable rc-task-row group -mx-2 flex items-start gap-3 px-2 py-[7px]">
              <div className="pt-[2px]">
                <RcCheck
                  checked={task.isDone || leaving.has(task._id)}
                  onToggle={() => tick(task)}
                  label={leaving.has(task._id) ? `Keep “${task.title}”` : task.isDone ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`}
                />
              </div>
              {/* As Revise (the owner, 11-21): a click opens the task, the calendar beside its date moves it. */}
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                <button type="button" title="Open the task" onClick={() => openTaskDetail(task)} className="min-w-0 cursor-pointer text-left outline-none">
                  <span
                    className={cn(
                      'rc-task-title relative min-w-0 text-[var(--rc-fs-body)] leading-[1.4] break-words decoration-1 underline-offset-[3px] group-hover:underline',
                      task.isDone ? 'text-[var(--rc-ink-3)] line-through decoration-[var(--rc-ink-3)]' : 'text-[var(--rc-ink-1)]',
                    )}
                  >
                    {task.title}
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-2 rc-meta rc-num">
                  {!task.isDone && (
                    <RcIconButton
                      size="sm"
                      label={`Move “${task.title}” to another day`}
                      className="-my-1"
                      onClick={() => openReschedule({ kind: 'task', id: task._id, title: task.title, dueDate: task.dueDate ?? null })}
                    >
                      <CalendarClock />
                    </RcIconButton>
                  )}
                  {dueWords(task, today, timezone).replace(/^Since /, 'since ')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {reviewCount > 0 && <p className="py-1 text-[14px] rc-ink-2">{plural(reviewCount, 'task')} from last week {reviewCount === 1 ? 'is' : 'are'} still open.</p>}
          <NextUpRows next={next} />
        </>
      )}
      <FocusItems focus={focus} onRetry={onRetry} />
    </section>
  );
}
