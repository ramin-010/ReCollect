import React, { useState } from 'react';
import { AlignLeft, Calendar, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subMinutes } from 'date-fns';

import { TaskStatusDropdown, TaskStatus } from './workspace/TaskStatusDropdown';
import { DueDateDropdown } from './workspace/modals/DueDateDropdown';
import { PriorityDropdown } from './workspace/modals/PriorityDropdown';
import type { Todo } from '@/lib/store/todoStore';
import { TaskStatusMark, PriorityBars } from './TaskMarks';
import { dueWords, PRIORITY_WORDS, STATUS_WORDS } from './taskWords';

interface RichTaskItemProps {
  task: Todo;
  isComplete: boolean;
  onSelect: (task: Todo) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onUpdateTask: (id: string, updates: Partial<Todo>) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const metaBtn = 'flex h-7 items-center gap-1.5 rounded-[6px] px-1.5 text-[13px] whitespace-nowrap transition-colors hover:bg-[var(--rc-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--rc-accent-fill)]';

/**
 * A task on theme v2 (inside an `.rc` scope): an inset row that fills on hover (no dividers), the
 * status mark, the title that wraps, and the due date, status and priority, each opening its own
 * picker. On a laptop they sit at the row's end; on a phone they make the meta line under the title.
 */
export function RichTaskItem({ task, isComplete, onSelect, onStatusChange, onUpdateTask, isSelected, onToggleSelect }: RichTaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const isDone = isComplete || isCompleting;
  const due = task.dueDate ? dueWords(task.dueDate) : null;
  const status = isCompleting ? 'complete' : task.status;
  const priority = task.priority ? PRIORITY_WORDS[task.priority] : undefined;

  const changeStatus = (next: TaskStatus) => {
    if (next === 'complete' && task.status !== 'complete') {
      setIsCompleting(true);
      setTimeout(() => onStatusChange(task._id, next), 1600); // the tick shows, then the row leaves
    } else {
      onStatusChange(task._id, next);
    }
  };

  return (
    <div
      onClick={() => onSelect(task)}
      className={cn(
        'group relative grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-2 rounded-[6px] px-2 py-[9px] cursor-pointer transition-[background-color,opacity] sm:grid-cols-[28px_minmax(0,1fr)_auto] sm:items-center',
        'hover:bg-[var(--rc-hover)]',
        isSelected && 'bg-[var(--rc-selected)] hover:bg-[var(--rc-selected)]',
        isCompleting && 'opacity-0 duration-700 delay-[900ms] pointer-events-none',
      )}
    >
      {/* Select for bulk actions (on hover, left of the row). */}
      {onToggleSelect && (
        <button
          type="button"
          aria-label={isSelected ? `Unselect “${task.title}”` : `Select “${task.title}”`}
          aria-pressed={!!isSelected}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(task._id);
          }}
          className={cn(
            'absolute -left-7 top-[11px] hidden h-4 w-4 items-center justify-center rounded-[4px] transition-opacity md:flex',
            isSelected
              ? 'bg-[var(--rc-accent-fill)] text-white opacity-100'
              : 'opacity-0 shadow-[inset_0_0_0_1.5px_var(--rc-icon)] group-hover:opacity-100 focus-visible:opacity-100',
          )}
        >
          {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>
      )}

      {/* The status mark (a tick to finish; the picker for the rest). */}
      <div className="flex h-7 items-center justify-center sm:h-auto" onClick={(e) => e.stopPropagation()}>
        <TaskStatusDropdown currentStatus={status as TaskStatus} onStatusChange={changeStatus}>
          <button type="button" className="group/mark grid h-7 w-7 place-items-center rounded-[6px] hover:bg-[var(--rc-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--rc-accent-fill)]" aria-label={`Status: ${STATUS_WORDS[status] ?? 'To do'}. Change it`}>
            <TaskStatusMark status={status} />
          </button>
        </TaskStatusDropdown>
      </div>

      {/* The title (wraps, never cut) and its small marks. */}
      <div className="min-w-0 self-center py-[3px]">
        <p className={cn('inline break-words text-[15px] leading-[1.4]', isDone ? 'text-[var(--rc-ink-3)] line-through' : 'text-[var(--rc-ink-1)]')}>{task.title}</p>
        {task.description && <AlignLeft className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-[var(--rc-icon)]" aria-label="Has notes" />}
      </div>

      {/* Due date · status · priority: the row's end on a laptop, the meta line on a phone. */}
      <div className="col-start-2 -ml-1.5 flex flex-wrap items-center gap-x-1 sm:col-start-3 sm:row-start-1 sm:ml-0 sm:flex-nowrap sm:justify-end" onClick={(e) => e.stopPropagation()}>
        <DueDateDropdown
          currentDate={task.dueDate}
          onDateChange={(date) => {
            const updates: Partial<Todo> = { dueDate: date };
            updates.reminderDate = date ? subMinutes(new Date(date), 10).toISOString() : undefined;
            onUpdateTask(task._id, updates);
          }}
        >
          <button type="button" className={cn(metaBtn, due?.late && !isDone ? 'text-[var(--rc-attn)]' : 'text-[var(--rc-ink-3)]', !due && 'max-sm:hidden opacity-0 group-hover:opacity-100 focus-visible:opacity-100')} aria-label={due ? `Due ${due.text}. Change the date` : 'Add a due date'}>
            {due ? (
              <>
                {due.late && !isDone && <Clock className="h-3.5 w-3.5" aria-hidden />}
                <span className="tabular-nums">{due.text}</span>
              </>
            ) : (
              <Calendar className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </DueDateDropdown>

        {status !== 'pending' && status !== 'complete' && (
          <TaskStatusDropdown currentStatus={status as TaskStatus} onStatusChange={changeStatus}>
            <button type="button" className={cn(metaBtn, 'text-[var(--rc-ink-2)]')} aria-label={`Status: ${STATUS_WORDS[status]}. Change it`}>
              <span className="rounded-[4px] bg-[var(--rc-surface-2)] px-1.5 py-[1px] text-[12.5px] font-medium">{STATUS_WORDS[status]}</span>
            </button>
          </TaskStatusDropdown>
        )}

        <PriorityDropdown
          currentPriority={task.priority as 'high' | 'medium' | 'low' | undefined}
          onPriorityChange={(p) => onUpdateTask(task._id, { priority: p as 'high' | 'medium' | 'low' | undefined })}
        >
          <button
            type="button"
            className={cn(metaBtn, (task.priority as string | undefined) === 'urgent' ? 'text-[var(--rc-attn)]' : 'text-[var(--rc-ink-3)]', !priority && 'max-sm:hidden opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
            aria-label={priority ? `Priority: ${priority}. Change it` : 'Set a priority'}
          >
            <PriorityBars priority={task.priority} />
            {priority && <span className="sm:w-[52px]">{priority}</span>}
          </button>
        </PriorityDropdown>
      </div>
    </div>
  );
}
