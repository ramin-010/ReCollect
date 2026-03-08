'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Trash2, 
  User,
  AlertTriangle,
  ListTodo
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { Task } from '@/lib/store/todoStore';
import { format, isToday, isPast, parseISO, formatDistanceToNow } from 'date-fns';

interface RichTaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, currentStatus: boolean) => void;
  onSelect: (task: Task) => void;
  isComplete: boolean;
}

export function RichTaskItem({ task, onDelete, onToggleComplete, onSelect, isComplete }: RichTaskItemProps) {
  
  // Date Formatting Helpers
  const getCreatedLabel = (dateStr: string) => {
      try {
        return format(parseISO(dateStr), 'MMM d');
      } catch (e) {
        return '';
      }
  };

  const getOverdueLabel = (dateStr: string) => {
      try {
        const date = parseISO(dateStr);
        if (isPast(date) && !isToday(date)) {
            return `Overdue by ${formatDistanceToNow(date)}`;
        }
      } catch (e) {
        return null;
      }
      return null;
  };

  // Status & Priority Colors (Refined for less visual noise)
  const priorityColor = 
      task.priority === 'high' ? 'text-rose-400/80' :
      task.priority === 'medium' ? 'text-amber-400/70' : 
      task.priority === 'low' ? 'text-blue-400/70' : 'text-white/10';

  const overdueLabel = task.dueDate ? getOverdueLabel(task.dueDate) : null;
  const isOverdue = !!overdueLabel;

  // Subtask Count (e.g. 0/2)
  const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={() => onSelect(task)}
      className="group flex items-center gap-4 py-3 px-4 border-b border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer select-none rounded-lg mx-1"
    >
        {/* 1. Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task._id, isComplete);
          }}
          className={cn(
            "w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all shrink-0",
            isComplete
              ? "bg-emerald-500 border-emerald-500" 
              : "border-white/30 hover:border-emerald-400 hover:bg-emerald-500/10"
          )}
        >
          {isComplete && (
            <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* 2. Task Title */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
             <span className={cn(
               "text-[15px] transition-colors truncate font-medium",
               isComplete ? "line-through text-white/30" : "text-white/90"
             )}>
               {task.title}
             </span>
             
             {/* Labels (Inline) */}
             {task.labels?.map(label => (
                 <span 
                    key={label.id}
                    className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider opacity-90 hidden sm:inline-block"
                    style={{ backgroundColor: `${label.color}20`, color: label.color }}
                 >
                     {label.name}
                 </span>
             ))}
        </div>

        {/* 3. Metadata Columns (Right Aligned) */}
        <div className="flex items-center gap-4 text-xs text-white/40 shrink-0">
            
            {/* Created At */}
            <span className="hidden md:block" title="Created date">
                {getCreatedLabel(task.createdAt)}
            </span>

            {/* Subtasks (0/2) */}
            {totalSubtasks > 0 && (
                <div className="flex items-center gap-1.5 w-10 justify-end" title={`${completedSubtasks}/${totalSubtasks} subtasks completed`}>
                    <span className="font-mono">{completedSubtasks}/{totalSubtasks}</span>
                    <ListTodo className="w-3.5 h-3.5 opacity-70" />
                </div>
            )}

            {/* Overdue Status */}
            {isOverdue && !isComplete && (
                <span className="text-rose-400 flex items-center gap-1.5 font-medium bg-rose-500/10 px-2 py-0.5 rounded">
                     <AlertTriangle className="w-3 h-3" />
                     {overdueLabel}
                </span>
            )}

            {/* Assignees Icon */}
            {task.assignees && task.assignees.length > 0 ? (
                <div className="flex -space-x-1.5" title={`${task.assignees.length} assignees`}>
                  {task.assignees.slice(0, 3).map((assignee: any) => {
                    const assigneeInfo = typeof assignee === 'string'
                      ? { name: assignee, email: assignee, avatar: undefined, _id: assignee }
                      : assignee;
                    const initials = getInitials(assigneeInfo.name);
                    return assigneeInfo.avatar ? (
                      <img key={assigneeInfo._id} src={assigneeInfo.avatar} alt={assigneeInfo.name} className="w-6 h-6 rounded-full object-cover border border-[#1e1e1e] ring-1 ring-indigo-500/30" title={`Assigned to ${assigneeInfo.name}`} />
                    ) : (
                      <div key={assigneeInfo._id} className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-[#1e1e1e] ring-1 ring-indigo-500/30" title={`Assigned to ${assigneeInfo.name}`}>
                        <span className="text-[10px] font-bold">{initials}</span>
                      </div>
                    );
                  })}
                  {task.assignees.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-white/10 text-white/50 flex items-center justify-center border border-[#1e1e1e] ring-1 ring-white/10">
                      <span className="text-[8px] font-bold">+{task.assignees.length - 3}</span>
                    </div>
                  )}
                </div>
            ) : (
                 <div className="w-6 h-6 rounded-full border border-dashed border-white/10 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity">
                     <User className="w-3 h-3" />
                 </div>
            )}

            {/* Reference Indicator */}
            {task.references && task.references.length > 0 && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-500/70 border border-amber-500/20" title="Has linked content">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                   </svg>
                </div>
            )}

            {/* Priority */}
            <div className={cn("font-medium uppercase tracking-wider text-[9px]", priorityColor)}>
                {task.priority || 'Normal'}
            </div>

            {/* Delete (Hover Only) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-rose-400 rounded transition-all"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>

    </motion.div>
  );
}
