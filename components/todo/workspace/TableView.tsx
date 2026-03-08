import React from 'react';
import { CheckCircle2, Circle, Flag, Calendar, AlignLeft, Paperclip, Bell, Plus, MoreHorizontal, UserPlus } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getPriorityTextConfig } from './utils';

import { TaskStatusDropdown } from './TaskStatusDropdown';
import { AssigneeDropdown } from './modals/AssigneeDropdown';
import { DueDateDropdown } from './modals/DueDateDropdown';
import { PriorityDropdown } from './modals/PriorityDropdown';

interface TableViewProps {
  filteredTasks: any[];
  workspaceMembers?: any[];
  onStatusChange: (id: string, newStatus: string) => void;
  onUpdateTask: (id: string, updates: any) => void;
  onClick: (task: any) => void;
  taskFilter: string;
  isViewer?: boolean;
}

export function TableView({
  filteredTasks,
  workspaceMembers = [],
  onStatusChange,
  onUpdateTask,
  onClick,
  taskFilter,
  isViewer
}: TableViewProps) {

  // A helper component to render grid cells with vertical borders
  const Cell = ({ children, className, borderRight = true, onClick }: any) => (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center px-3 py-2 text-sm text-white/80 h-full",
        borderRight && "border-r border-white-[0.05] border-white/10",
        className
      )}
    >
      {children}
    </div>
  );

  return (
    <div className="w-full overflow-x-auto bg-[#1E1E1E] rounded-none">
      <div className="min-w-[900px]">
        {/* Table Header */}
        <div className="grid grid-cols-[30px_35px_1fr_140px_140px_140px_120px_50px] border-b border-white/10 text-xs font-semibold text-white/50 bg-[#252525]/50 sticky top-0 z-10 w-full hover:bg-white/[0.02]">
          <Cell borderRight={false} className="justify-center text-[10px] text-white/20 pl-2">#</Cell>
          <Cell borderRight={false} className="justify-center px-1">
            <CheckCircle2 className="w-3.5 h-3.5 opacity-50" />
          </Cell>
          <Cell className="border-l border-white/10 text-white/60">Name</Cell>
          <Cell className="text-white/60">Assignee</Cell>
          <Cell className="text-white/60">Status</Cell>
          <Cell className="text-white/60">Due date</Cell>
          <Cell className="text-white/60">Priority</Cell>
          <Cell borderRight={false} className="justify-center"><Plus className="w-3.5 h-3.5" /></Cell>
        </div>

        {/* Table Body */}
        <div className="flex flex-col flex-1 w-full bg-[#1E1E1E]">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 border-b border-white/10">
               <p className="text-sm text-white/35">No tasks available in table view.</p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;
              const isDone = task.status === 'complete';

              return (
                <div 
                  key={task._id}
                  onClick={() => onClick(task)}
                  className="group grid grid-cols-[30px_35px_1fr_140px_140px_140px_120px_50px] border-b border-white/10 hover:bg-white/[0.03] transition-colors cursor-pointer w-full bg-[#1e1e1e]"
                >
                  {/* # Column */}
                  <Cell borderRight={false} className="justify-center text-[10px] text-white/20 pl-2 select-none group-hover:text-white/40">
                    {index + 1}
                  </Cell>

                  {/* Completion Toggle */}
                  <Cell borderRight={false} className={cn("justify-center px-1", isViewer && "pointer-events-none")} onClick={(e: any) => e.stopPropagation()}>
                    <button 
                      onClick={() => onStatusChange(task._id, isDone ? 'pending' : 'complete')}
                      className={cn(
                        "w-[14px] h-[14px] rounded-[4px] border border-white/20 flex items-center justify-center transition-colors focus:outline-none hover:border-indigo-400/50 hover:bg-indigo-400/10",
                        isDone && "bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600 hover:border-indigo-600"
                      )}
                    >
                      {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                    </button>
                  </Cell>

                  {/* Name */}
                  <Cell className="border-l border-white/10 font-medium">
                    <span className={cn("truncate", isDone && "line-through text-white/30 decoration-white/20")}>
                      {task.title}
                    </span>
                    {task.description && (
                      <AlignLeft className="w-3.5 h-3.5 text-white/20 ml-2 shrink-0 group-hover:text-white/40" />
                    )}
                  </Cell>

                  {/* Assignee */}
                  <Cell onClick={(e: any) => e.stopPropagation()} className="p-0">
                    <div className={cn("w-full h-full", isViewer ? "pointer-events-none" : "hover:bg-white/[0.04]")}>
                        <AssigneeDropdown 
                          currentAssignees={task.assignees || []}
                          workspaceMembers={workspaceMembers}
                          onAssign={(email, name, avatar, _id) => {
                            const current = task.assignees || [];
                            onUpdateTask(task._id, { assignees: [...current, { _id, email, name, avatar }] });
                          }}
                          onUnassign={(email) => {
                            const current = task.assignees || [];
                            onUpdateTask(task._id, { assignees: current.filter((a: any) => a.email !== email) });
                          }}
                        >
                          <div className="w-full h-full flex items-center px-3 cursor-pointer">
                            {assignee ? (
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold">
                                  {assignee.avatar ? (
                                    <img src={assignee.avatar} alt="avatar" className="w-full h-full rounded-full" />
                                  ) : (
                                    getInitials(assignee.name)
                                  )}
                                </div>
                                <span className="text-[11px] truncate">{assignee.name || assignee.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-5 h-5 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                                  <UserPlus className="w-3 h-3 text-white/20" />
                                </div>
                                <span className="text-[11px] text-white/20">Set assignee</span>
                              </div>
                            )}
                          </div>
                        </AssigneeDropdown>
                    </div>
                  </Cell>

                  {/* Due Date */}
                  <Cell onClick={(e: any) => e.stopPropagation()} className="p-0">
                     <div className={cn("w-full h-full", isViewer ? "pointer-events-none" : "hover:bg-white/[0.04]")}>
                         <DueDateDropdown 
                            currentDate={task.dueDate}
                            onDateChange={(date) => onUpdateTask(task._id, { dueDate: date })}
                          >
                            <div className="w-full h-full flex items-center px-3 cursor-pointer">
                              {task.dueDate ? (
                                <span className="text-[11px] text-white/70">
                                  {formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true })}
                                </span>
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100 text-white/20 text-[11px]">Set date</span>
                              )}
                            </div>
                          </DueDateDropdown>
                     </div>
                  </Cell>

                  {/* Status */}
                  <Cell onClick={(e: any) => e.stopPropagation()} className="p-0">
                    <div className={cn("w-full h-full flex items-center", isViewer ? "pointer-events-none" : "hover:bg-white/[0.04]")}>
                         <TaskStatusDropdown
                            currentStatus={task.status}
                            onStatusChange={(status) => onStatusChange(task._id, status)}
                          >
                            <button className="w-full h-full flex items-center px-3 cursor-pointer text-left text-[11px] text-white/70">
                               {task.status === 'complete' ? 'Complete' :
                                task.status === 'in_progress' ? 'In Progress' :
                                task.status === 'review' ? 'Review' :
                                task.status === 'blocked' ? 'Blocked' : 'To Do'}
                            </button>
                          </TaskStatusDropdown>
                    </div>
                  </Cell>

                  {/* Priority */}
                  <Cell onClick={(e: any) => e.stopPropagation()} className="p-0">
                     <div className={cn("w-full h-full", isViewer ? "pointer-events-none" : "hover:bg-white/[0.04]")}>
                        <PriorityDropdown 
                          currentPriority={task.priority}
                          onPriorityChange={(priority) => onUpdateTask(task._id, { priority })}
                        >
                          <div className="w-full h-full flex items-center px-3 cursor-pointer">
                              {task.priority ? (
                                <span className={cn(
                                   "font-medium uppercase tracking-wider text-[9px]",
                                   getPriorityTextConfig(task.priority)
                                )}>
                                    {task.priority}
                                </span>
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100 text-white/20 text-[11px]"><Flag className="w-3.5 h-3.5" /></span>
                              )}
                          </div>
                        </PriorityDropdown>
                     </div>
                  </Cell>

                  {/* End/Options Placeholder */}
                  <Cell borderRight={false} className="justify-center">
                    <button className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors rounded">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </Cell>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
