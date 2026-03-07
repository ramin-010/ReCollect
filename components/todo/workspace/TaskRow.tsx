import React from 'react';
import { CheckCircle2, Circle, MessageSquare, Flag, Calendar, AlignLeft, Paperclip, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';

import { TaskStatusDropdown, TaskStatus } from './TaskStatusDropdown';
import { AssigneeDropdown } from './modals/AssigneeDropdown';
import { DueDateDropdown } from './modals/DueDateDropdown';
import { PriorityDropdown } from './modals/PriorityDropdown';

interface TaskRowProps {
  task: any;
  workspaceMembers?: any[];
  onStatusChange: (id: string, newStatus: string) => void;
  onUpdateTask: (id: string, updates: any) => void;
  onClick: (task: any) => void;
}

export function TaskRow({ task, workspaceMembers = [], onStatusChange, onUpdateTask, onClick }: TaskRowProps) {
  const isDone = task.status === 'complete';
  const createdAtStr = task.createdAt 
    ? formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true }).replace('about ', '') 
    : '';
  const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;

  return (
    <div 
      onClick={() => onClick(task)}
      className="group grid grid-cols-[40px_1fr_130px_120px_120px_100px_80px] gap-2 items-center px-3 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer bg-transparent"
    >
      {/* 1. Status Toggle (Leftmost Checkbox style) via Dropdown */}
      <div className="flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
        <TaskStatusDropdown 
          currentStatus={task.status as TaskStatus}
          onStatusChange={(newStatus) => onStatusChange(task._id, newStatus)}
        >
          <button 
            className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
          >
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
      <div className="flex items-center gap-2 min-w-0 pr-4 pl-1">
        <p className={cn(
          "text-[13px] truncate font-medium",
          isDone ? "text-white/40 line-through" : "text-white/90"
        )}>
          {task.title}
        </p>
        
        {/* Optional indicators for description/attachments next to name like in ClickUp */}
        {task.description && (
          <AlignLeft className="w-3.5 h-3.5 text-white/30 shrink-0" />
        )}
        {task.cloudImages && task.cloudImages.length > 0 && (
          <Paperclip className="w-3.5 h-3.5 text-white/30 shrink-0" />
        )}
      </div>

      {/* 3. Status Pill via Dropdown */}
      <div className="flex items-center justify-start shrink-0 pr-2" onClick={(e) => e.stopPropagation()}>
        <TaskStatusDropdown 
          currentStatus={task.status as TaskStatus}
          onStatusChange={(newStatus) => onStatusChange(task._id, newStatus)}
        >
          <button className={cn(
            "px-2.5 py-1 rounded-[4px] text-[10px] font-bold tracking-wide uppercase focus:outline-none transition-colors",
            isDone 
              ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" 
              : task.status === 'in_progress'
                ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                : task.status === 'review'
                  ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                  : task.status === 'blocked'
                    ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                    : "bg-white/[0.05] text-white/40 hover:bg-white/10"
          )}>
            {isDone ? 'COMPLETE' : task.status === 'in_progress' ? 'IN PROGRESS' : task.status === 'review' ? 'REVIEW' : task.status === 'blocked' ? 'BLOCKED' : 'TO DO'}
          </button>
        </TaskStatusDropdown>
      </div>

      {/* 4. Assignees via Dropdown */}
      <div className="flex items-center gap-1 shrink-0 px-2" onClick={(e) => e.stopPropagation()}>
        <AssigneeDropdown 
          currentAssignees={task.assignees || []}
          workspaceMembers={workspaceMembers}
          onAssign={(email, name, avatar) => {
            const current = task.assignees || [];
            onUpdateTask(task._id, { assignees: [...current, { email, name, avatar }] });
          }}
          onUnassign={(email) => {
            const current = task.assignees || [];
            onUpdateTask(task._id, { assignees: current.filter((a: any) => a.email !== email) });
          }}
        >
          <button className="flex items-center justify-center p-0.5 rounded-full hover:bg-white/5 transition-colors focus:outline-none">
            {assignee ? (
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold">
                {assignee.avatar ? (
                  <img src={assignee.avatar} alt="avatar" className="w-full h-full rounded-full" />
                ) : (
                  assignee.name?.[0]?.toUpperCase() || '?'
                )}
              </div>
            ) : (
              <span className="text-[11px] text-white/15">—</span>
            )}
          </button>
        </AssigneeDropdown>
        {task.assignees?.length > 1 && (
          <div className="text-[10px] text-white/40 font-medium">+{task.assignees.length - 1}</div>
        )}
      </div>

      {/* 4. Due Date via Dropdown */}
      <div className="flex justify-start text-[11px] shrink-0 font-medium px-2" onClick={(e) => e.stopPropagation()}>
        <DueDateDropdown 
          currentDate={task.dueDate}
          onDateChange={(date) => onUpdateTask(task._id, { dueDate: date })}
        >
          <button className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors focus:outline-none",
            task.dueDate ? "text-white/70" : "text-white/15"
          )}>
            {task.dueDate ? (
              <>
                <Calendar className="w-3.5 h-3.5 opacity-60" />
                <span>
                  {formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true })}
                </span>
              </>
            ) : (
              <span className="text-[11px]">—</span>
            )}
          </button>
        </DueDateDropdown>
      </div>

      {/* 6. Reminder */}
      <div className="flex justify-start text-[11px] shrink-0 font-medium px-2" onClick={(e) => e.stopPropagation()}>
        <button className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.04] transition-colors focus:outline-none",
          task.reminder ? "text-white/70" : "text-white/15"
        )}>
          {task.reminder ? (
            <>
              <Bell className="w-3.5 h-3.5 opacity-60" />
              <span>
                {formatDistanceToNow(parseISO(task.reminder), { addSuffix: true })}
              </span>
            </>
          ) : (
            <span className="text-[11px]">—</span>
          )}
        </button>
      </div>

      {/* 7. Priority via Dropdown */}
      <div className="flex items-center justify-start shrink-0 px-2" onClick={(e) => e.stopPropagation()}>
        <PriorityDropdown 
           currentPriority={task.priority}
           onPriorityChange={(priority) => onUpdateTask(task._id, { priority })}
        >
          <button className="p-1 rounded hover:bg-white/[0.04] transition-colors focus:outline-none">
            {task.priority ? (
              <Flag className={cn("w-[14px] h-[14px]", 
                task.priority === 'high' ? "text-rose-400 fill-rose-500/20" :
                task.priority === 'medium' ? "text-amber-400 fill-amber-500/20" :
                task.priority === 'low' ? "text-blue-400 fill-blue-500/20" :
                "text-white/10"
              )} />
            ) : (
              <span className="text-[11px] text-white/15">—</span>
            )}
          </button>
        </PriorityDropdown>
      </div>

      {/* 8. Quick Row Actions (Visible on hover) */}
     
    </div>
  );
}
