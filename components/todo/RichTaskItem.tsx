import React, { useState } from 'react';
import { CheckCircle2, Calendar, AlignLeft, Paperclip, GripVertical, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { parseISO, differenceInSeconds, differenceInHours, isTomorrow, format } from 'date-fns';
import { subMinutes } from 'date-fns';

import { TaskStatusDropdown, TaskStatus } from './workspace/TaskStatusDropdown';
import { DueDateDropdown } from './workspace/modals/DueDateDropdown';
import { PriorityDropdown } from './workspace/modals/PriorityDropdown';
import type { Todo } from '@/lib/store/todoStore';

interface RichTaskItemProps {
  task: Todo;
  isComplete: boolean;
  onSelect: (task: Todo) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onUpdateTask: (id: string, updates: Partial<Todo>) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

/**
 * Smart date formatting
 */
function formatSmartDate(dateStr: string, isDueDate: boolean = true): { text: string; isOverdue: boolean } {
  const now = new Date();
  const date = parseISO(dateStr);
  const MathAbs = Math.abs; // for safe usage
  const diffSecs = differenceInSeconds(date, now);

  // Overdue
  if (diffSecs < 0) {
    const absDiffSecs = MathAbs(diffSecs);
    if (absDiffSecs < 3600) {
      const diffMins = Math.floor(absDiffSecs / 60);
      return { text: `Overdue by ${diffMins} min${diffMins !== 1 ? 's' : ''}`, isOverdue: true };
    }
    const diffHrs = Math.floor(absDiffSecs / 3600);
    if (diffHrs < 24) {
      return { text: `Overdue by ${diffHrs} hr${diffHrs !== 1 ? 's' : ''}`, isOverdue: true };
    }
    const diffDays = Math.floor(absDiffSecs / 86400);
    return { text: `Overdue by ${diffDays} day${diffDays !== 1 ? 's' : ''}`, isOverdue: true };
  }

  // Within 24 hours
  const diffHrs = differenceInHours(date, now);
  if (diffHrs < 24) {
    if (diffSecs < 60) return { text: `${isDueDate ? 'Due in' : 'In'} ${diffSecs}s`, isOverdue: false };
    if (diffSecs < 3600) return { text: `${isDueDate ? 'Due in' : 'In'} ${Math.floor(diffSecs / 60)}min`, isOverdue: false };
    return { text: `${isDueDate ? 'Due in' : 'In'} ${diffHrs}hr`, isOverdue: false };
  }

  // Tomorrow
  if (isTomorrow(date)) return { text: `${isDueDate ? 'Due tomorrow' : 'Tomorrow'}`, isOverdue: false };

  // Otherwise dd/MM/yy
  return { text: format(date, 'dd/MM/yy'), isOverdue: false };
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case 'urgent': return { color: 'text-rose-500/70', fill: 'fill-rose-500/20' };
    case 'high': return { color: 'text-amber-500/70', fill: 'fill-amber-500/20' };
    case 'normal': case 'medium': return { color: 'text-blue-400/70', fill: 'fill-blue-500/20' };
    case 'low': return { color: 'text-zinc-500', fill: 'fill-zinc-400/20' };
    default: return { color: 'text-zinc-500', fill: '' };
  }
}

export function RichTaskItem({ task, isComplete, onSelect, onStatusChange, onUpdateTask, isSelected, onToggleSelect }: RichTaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const isDone = isComplete || isCompleting;
  const priorityConfig = getPriorityConfig(task.priority || 'low');

  const dueDateDisplay = task.dueDate ? formatSmartDate(task.dueDate, true) : null;

  return (
    <div 
      onClick={() => onSelect(task)}
      className={cn(
        "group relative grid grid-cols-[40px_minmax(0,1fr)_120px_120px_100px] gap-4 py-2.5 items-center border-b rounded-lg border-white/5 transition-all cursor-pointer",
        "bg-transparent border-white/10 hover:bg-white/[0.02]",
        isCompleting && "opacity-0 duration-1000 delay-1000 pointer-events-none scale-[0.98]"
      )}
    >
      {/* Hover Select Checkbox */}
      {onToggleSelect && (
        <div 
          className={cn(
            "absolute -left-12 top-1/2 -translate-y-1/2 flex items-center gap-1.5 transition-opacity z-10",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(task._id); }}
        >
          <GripVertical className="w-3.5 h-3.5 text-white/20 hover:text-white/50 cursor-grab hidden md:block" />
          <button className={cn(
            "flex items-center justify-center w-[16px] h-[16px] rounded-[4px] border transition-colors shadow-sm",
            isSelected 
              ? "bg-indigo-500 border-indigo-500 text-white" 
              : "border-white/30 hover:border-indigo-400 bg-[#1e1e1e]"
          )}>
            {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
          </button>
        </div>
      )}

      {/* 1. Status Toggle */}
      <div className="flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
        <TaskStatusDropdown 
          currentStatus={(isCompleting ? 'complete' : task.status) as TaskStatus}
          onStatusChange={(newStatus) => {
            if (newStatus === 'complete' && task.status !== 'complete') {
              setIsCompleting(true);
              setTimeout(() => {
                onStatusChange(task._id, newStatus);
              }, 2000); // Wait for fade
            } else {
              onStatusChange(task._id, newStatus);
            }
          }}
        >
          <button className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity focus:outline-none">
            {isDone ? (
              <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500 fill-emerald-500/20" />
            ) : task.status === 'in_progress' ? (
              <div className="w-[18px] h-[18px] rounded-full border-[2px] border-blue-500 flex items-center justify-center">
                <div className="w-[6px] h-[6px] rounded-full bg-blue-500" />
              </div>
            ) : task.status === 'review' ? (
              <div className="w-[18px] h-[18px] rounded-full border-[2px] border-amber-400 flex items-center justify-center">
                <div className="w-[6px] h-[6px] rounded-full bg-amber-400" />
              </div>
            ) : task.status === 'blocked' ? (
              <div className="w-[18px] h-[18px] rounded-full border-[2px] border-rose-500 flex items-center justify-center">
                <div className="w-[6px] h-[6px] rounded-full bg-rose-500" />
              </div>
            ) : (
              <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-dashed border-white/40 group-hover:border-solid group-hover:border-white/60 transition-all flex items-center justify-center" />
            )}
          </button>
        </TaskStatusDropdown>
      </div>

      {/* 2. Task Name & Metadata */}
      <div className="flex items-center gap-2 min-w-0">
        <p className={cn(
          "text-[13px] truncate font-medium",
          isDone ? "text-white/40 line-through" : "text-white/90"
        )}>
          {task.title}
        </p>
        {task.description && (
          <AlignLeft className="w-3.5 h-3.5 text-white/30 shrink-0" />
        )}
        {isDone && task.references && task.references.length > 0 && (
          <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/5 text-white/40 text-[9px] font-medium uppercase tracking-wider shrink-0" title="Linked to content">
             {task.references[0].type}
          </span>
        )}
      </div>

      {/* 4. Due Date */}
      <div className="flex justify-start text-[11px] shrink-0 font-medium" onClick={(e) => e.stopPropagation()}>
        <DueDateDropdown 
          currentDate={task.dueDate}
          onDateChange={(date) => {
            const updates: Partial<Todo> = { dueDate: date };
            if (date) {
              updates.reminderDate = subMinutes(new Date(date), 10).toISOString();
            } else {
              updates.reminderDate = undefined;
            }
            onUpdateTask(task._id, updates);
          }}
        >
          <button className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors focus:outline-none whitespace-nowrap",
            dueDateDisplay?.isOverdue ? "text-rose-400/80 font-medium" : task.dueDate ? "text-white/40" : "text-white/20 hover:text-white/40"
          )}>
            {task.dueDate && dueDateDisplay ? (
              <span>{dueDateDisplay.text}</span>
            ) : (
              <Calendar className="w-3.5 h-3.5 shrink-0 opacity-40" />
            )}
          </button>
        </DueDateDropdown>
      </div>

      {/* 3. Status Pill */}
      <div className="flex items-center justify-start shrink-0" onClick={(e) => e.stopPropagation()}>
        <TaskStatusDropdown 
          currentStatus={(isCompleting ? 'complete' : task.status) as TaskStatus}
          onStatusChange={(newStatus) => {
            if (newStatus === 'complete' && task.status !== 'complete') {
              setIsCompleting(true);
              setTimeout(() => {
                onStatusChange(task._id, newStatus);
              }, 2000);
            } else {
              onStatusChange(task._id, newStatus);
            }
          }}
        >
          <button className={cn(
            "px-2.5 py-1 rounded-[4px] text-[10px] font-bold tracking-wide uppercase focus:outline-none transition-colors",
            isDone 
              ? "bg-emerald-500/10 text-emerald-500/70 hover:bg-emerald-500/15" 
              : task.status === 'in_progress'
                ? "bg-blue-500/10 text-blue-400/70 hover:bg-blue-500/15"
                : task.status === 'review'
                  ? "bg-amber-500/10 text-amber-500/70 hover:bg-amber-500/15"
                  : task.status === 'blocked'
                    ? "bg-rose-500/10 text-rose-500/70 hover:bg-rose-500/15"
                    : "bg-white/[0.03] text-white/30 hover:bg-white/[0.06]"
          )}>
            {isDone ? 'COMPLETE' : task.status === 'in_progress' ? 'IN PROGRESS' : task.status === 'review' ? 'REVIEW' : task.status === 'blocked' ? 'BLOCKED' : 'TO DO'}
          </button>
        </TaskStatusDropdown>
      </div>

      {/* 5. Priority */}
      <div className="flex items-center justify-start shrink-0" onClick={(e) => e.stopPropagation()}>
        <PriorityDropdown 
           currentPriority={task.priority as "high" | "medium" | "low" | undefined}
           onPriorityChange={(priority) => onUpdateTask(task._id, { priority: priority as "high" | "medium" | "low" | undefined })}
        >
          <button className={cn(
             "p-1 rounded hover:bg-white/[0.04] transition-colors focus:outline-none",
             "font-medium uppercase tracking-wider text-[9px]", 
             priorityConfig.color
          )}>
            {task.priority || 'Normal'}
          </button>
        </PriorityDropdown>
      </div>
    </div>
  );
}
