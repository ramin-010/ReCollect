'use client';

import { cn } from '@/lib/utils';
import { formatDay, formatDayShort } from '@/lib/learning/dates';
import type { GroupedTask } from '@/lib/learning/taskGroups';
import { useLearningStore } from '@/lib/store/learningStore';
import { ItemActionMenu } from './ItemActionMenu';
import { lx } from './styles';

/** Kaaga task descriptions are HTML; rows show them as plain text. */
export function plainText(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export type TaskRowVariant = 'panel' | 'overdue' | 'today' | 'upcoming';

interface TaskRowProps {
  task: GroupedTask;
  variant?: TaskRowVariant;
  expanded: boolean;
  onToggleExpand: () => void;
}

/** Revise TasksSidebar task card ('panel') and the All Tasks dialog rows. */
export function TaskRow({ task, variant = 'panel', expanded, onToggleExpand }: TaskRowProps) {
  const { toggleTask, openReschedule, openTaskDetail, deleteTask } = useLearningStore.getState();
  const description = plainText(task.description);
  const tags = (task.tags ?? []).map((t) => t.name);
  const inDialog = variant !== 'panel';

  const accentBar =
    variant === 'overdue'
      ? 'bg-[hsl(var(--destructive))]/50 group-hover:bg-[hsl(var(--destructive))]'
      : variant === 'today'
        ? 'bg-[hsl(var(--primary))]/30 group-hover:bg-[hsl(var(--primary))]'
        : 'bg-[hsl(var(--foreground))]/10 group-hover:bg-[hsl(var(--foreground))]/30';

  return (
    <div
      onClick={onToggleExpand}
      className={cn(
        'group relative flex gap-3 transition-colors cursor-pointer',
        inDialog
          ? cn('items-center px-4 py-3.5 rounded-xl border border-transparent', task.isDone ? 'opacity-50' : 'hover:bg-[var(--surface-raised)]')
          : cn('items-start px-4 py-3', lx.card, task.isDone ? 'opacity-50' : lx.hover),
      )}
    >
      {inDialog && !task.isDone && <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-full transition-colors', accentBar)} />}
      <ItemActionMenu
        isDone={task.isDone}
        onToggle={() => toggleTask(task._id)}
        onReschedule={() => openReschedule({ kind: 'task', id: task._id, title: task.title, dueDate: task.dueDate ?? null })}
        onEdit={() => openTaskDetail(task)}
        onDelete={() => deleteTask(task._id)}
        deleteLabel="Delete task"
        sizeClassName={inDialog ? 'w-[15px] h-[15px]' : 'w-4 h-4'}
        circleClassName={
          variant === 'overdue'
            ? 'text-[hsl(var(--destructive))]/40 group-hover:text-[hsl(var(--destructive))]'
            : cn(lx.muted, 'group-hover:text-[hsl(var(--primary))]')
        }
      />
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium leading-snug', inDialog ? 'text-[13px]' : 'text-[12px]', task.isDone ? cn('line-through', lx.muted) : lx.fg90)}>{task.title}</p>
        {description && variant !== 'overdue' && (
          <p className={cn('text-[10px] mt-1 whitespace-pre-wrap', !expanded && 'line-clamp-2', lx.muted)}>{description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.isOverdue && variant === 'panel' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))]/20 font-bold uppercase tracking-wider">
              Overdue
            </span>
          )}
          {variant === 'overdue' && <p className="text-[11px] text-[hsl(var(--destructive))]/70">Overdue</p>}
          {task.goalType === 'MONTHLY' && variant === 'panel' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">Monthly</span>
          )}
          {task.dueDay && variant === 'panel' && <span className={cn('text-[10px] font-mono', lx.muted)}>{formatDayShort(task.dueDay)}</span>}
          {task.dueDay && variant === 'upcoming' && (
            <p className={cn('text-[11px]', lx.muted)}>{formatDay(task.dueDay, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          )}
          {tags.map((tag) =>
            variant === 'panel' || variant === 'overdue' ? (
              <span key={tag} className={cn('text-[10px] font-medium', lx.muted)}>
                {tag.replace('#', '')}
              </span>
            ) : (
              <span key={tag} className={cn('text-[9px] px-1.5 py-0.5 rounded-sm bg-[hsl(var(--foreground))]/5 border uppercase', lx.border, lx.muted)}>
                {tag.replace('#', '')}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
