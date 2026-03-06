import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface TaskRowProps {
  task: any;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onClick: (task: any) => void;
}

export function TaskRow({ task, onToggleStatus, onClick }: TaskRowProps) {
  const isDone = task.status === 'complete';
  const createdAtStr = task.createdAt 
    ? formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true }).replace('about ', '') 
    : '';
  const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;

  return (
    <div 
      onClick={() => onClick(task)}
      className="group flex gap-4 p-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer relative"
    >
      {/* Left: Avatar / Status Toggle */}
      <div className="shrink-0 mt-0.5 relative">
        <div className="w-9 h-9 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
          {assignee?.avatar ? (
            <img src={assignee.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white/60">
              {assignee?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        {/* Hover Action: Mark Complete checkmark overlaying the avatar */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task._id, task.status);
          }}
          className={cn(
            "absolute inset-0 rounded-full flex items-center justify-center transition-all duration-200",
            isDone ? "bg-emerald-500/20 opacity-100" : "bg-black/40 opacity-0 group-hover:opacity-100 backdrop-blur-sm"
          )}
        >
          <CheckCircle2 className={cn("w-5 h-5", isDone ? "text-emerald-400" : "text-white/70 hover:text-white")} />
        </button>
      </div>

      {/* Middle: Content Stack */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* Top line: Name + Priority */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("text-sm font-semibold", isDone ? "text-white/40" : "text-white/90")}>
            {assignee?.name || 'Unassigned'}
          </span>
          {task.priority && (
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              task.priority === 'high' ? "text-amber-500 bg-amber-500/10" : 
              task.priority === 'low' ? "text-blue-400 bg-blue-500/10" : 
              "text-white/40 bg-white/5"
            )}>
              Priority
            </span>
          )}
        </div>
        
        {/* Title */}
        <p className={cn(
          "text-[15px] font-medium truncate mb-1",
          isDone ? "text-white/40 line-through" : "text-white/80"
        )}>
          {task.title}
        </p>

        {/* Description snippet */}
        <p className="text-sm text-white/40 truncate">
          {task.description || 'No description provided.'}
        </p>
      </div>

      {/* Right: Meta (Time & Unread Dot) */}
      <div className="shrink-0 flex items-start gap-3 pl-2">
        <span className="text-[11px] text-white/30 whitespace-nowrap mt-0.5">
          {createdAtStr}
        </span>
        {!isDone && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
        )}
      </div>
    </div>
  );
}
