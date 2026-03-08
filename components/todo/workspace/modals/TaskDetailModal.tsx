import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Clock, Calendar, Flag, Tag, CheckCircle2, CheckCircle, Share, MoreHorizontal, Sparkles, History, Box, CircleDot, UserCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, formatDistanceToNow } from 'date-fns';
import { cn, getInitials } from '@/lib/utils';
import { AssigneeDropdown } from './AssigneeDropdown';
import { DueDateDropdown } from './DueDateDropdown';
import { PriorityDropdown } from './PriorityDropdown';
import { TaskStatusDropdown, TaskStatus } from '../TaskStatusDropdown';

interface TaskDetailModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  workspaceMembers: any[];
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdateTask, workspaceMembers }: TaskDetailModalProps) {
  if (!task) return null;

  const isComplete = task.status === 'complete';
  const createdDate = task.createdAt ? format(parseISO(task.createdAt), 'MMM d, yyyy') : 'Unknown';

  const dateLabel = task.dueDate 
    ? isToday(parseISO(task.dueDate)) ? 'Today' 
      : isTomorrow(parseISO(task.dueDate)) ? 'Tomorrow'
      : format(parseISO(task.dueDate), 'MMM d, yyyy')
    : null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-[1200px] h-[90vh] max-h-[900px] bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden outline-none font-sans">
          {/* Fix for accessibility warning */}
          <Dialog.Title className="sr-only">Task Details</Dialog.Title>

          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shrink-0">
             <div className="flex items-center gap-2 text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors cursor-pointer">
                <Box className="w-4 h-4" /> 
                Task
             </div>
             
             <div className="flex items-center gap-4 text-[12px] text-white/50">
                <span>Created {createdDate}</span>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                   <Sparkles className="w-3.5 h-3.5" /> Ask
                </button>
                <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                   <Share className="w-3.5 h-3.5" /> Share
                </button>
                <button className="hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                <button onClick={onClose} className="p-1 -mr-1 hover:text-white hover:bg-white/10 rounded transition-colors"><X className="w-5 h-5" /></button>
             </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
             {/* Main Content (Left) */}
             <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 custom-scrollbar">
                
                {/* Title */}
                <input 
                  type="text"
                  value={task.title || ''}
                  onChange={(e) => onUpdateTask(task._id, { title: e.target.value })}
                  className={cn(
                    "w-full bg-transparent text-[28px] font-bold border-none outline-none focus:ring-0 p-0 mb-6 transition-colors",
                    isComplete ? "text-white/40 line-through" : "text-white/90 placeholder-white/20"
                  )}
                  placeholder="Task title"
                />



                {/* Properties Grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 max-w-[800px]">
                   
                   {/* Status */}
                   <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]">
                        <CircleDot className="w-3.5 h-3.5" /> Status
                      </div>
                      <div className="flex-1 flex items-center">
                         <TaskStatusDropdown 
                           currentStatus={task.status as TaskStatus}
                           onStatusChange={(status) => onUpdateTask(task._id, { status })}
                         >
                            <button className={cn(
                              "flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-bold tracking-wide uppercase transition-colors outline-none",
                              isComplete 
                                ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                                : task.status === 'in_progress'
                                  ? "bg-blue-500 text-white hover:bg-blue-400"
                                  : task.status === 'review'
                                    ? "bg-amber-500 text-black hover:bg-amber-400"
                                    : task.status === 'blocked'
                                      ? "bg-rose-500 text-white hover:bg-rose-400"
                                      : "bg-white/10 text-white hover:bg-white/20"
                            )}>
                              {isComplete ? 'Complete' : task.status === 'in_progress' ? 'In Progress' : task.status === 'review' ? 'Review' : task.status === 'blocked' ? 'Blocked' : 'To Do'}
                              <span className="opacity-50 ml-1 flex items-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg></span>
                            </button>
                         </TaskStatusDropdown>
                         {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2" />}
                      </div>
                   </div>

                   {/* Assignees */}
                   <div className="flex justify-between items-center z-[51]">
                      <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]">
                        <UserCircle2 className="w-3.5 h-3.5" /> Assignees
                      </div>
                      <div className="flex-1 flex items-center">
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
                           <button className="flex flex-wrap items-center gap-1.5 min-h-[28px] hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none">
                             {task.assignees && task.assignees.length > 0 ? (
                               task.assignees.map((a: any) => (
                                 <div key={a.email} className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 pr-2 rounded-full border border-indigo-500/20" title={a.name}>
                                   <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold">
                                     {a.avatar ? (
                                       <img src={a.avatar} alt="avatar" className="w-full h-full rounded-full" />
                                     ) : (
                                       getInitials(a.name) || '?'
                                     )}
                                   </div>
                                   <span className="text-[12px] font-medium">{a.name}</span>
                                 </div>
                               ))
                             ) : (
                               <span className="text-[13px] text-white/30 hover:text-white/50">Empty</span>
                             )}
                           </button>
                        </AssigneeDropdown>
                      </div>
                   </div>

                   {/* Dates */}
                   <div className="flex justify-between items-center group z-50">
                      <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]">
                        <Calendar className="w-3.5 h-3.5" /> Dates
                      </div>
                      <div className="flex-1 flex items-center text-[13px]">
                        <DueDateDropdown 
                          currentDate={task.dueDate}
                          onDateChange={(date) => onUpdateTask(task._id, { dueDate: date })}
                        >
                          <button className="flex items-center gap-2 hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none min-h-[28px]">
                            {task.dueDate ? (
                              <span className="text-white/80 group-hover:text-white">{dateLabel}</span>
                            ) : (
                              <span className="text-white/30 hover:text-white/50">Empty</span>
                            )}
                          </button>
                        </DueDateDropdown>
                      </div>
                   </div>

                   {/* Priority */}
                   <div className="flex justify-between items-center group z-40">
                      <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]">
                        <Flag className="w-3.5 h-3.5" /> Priority
                      </div>
                      <div className="flex-1 flex items-center text-[13px]">
                        <PriorityDropdown 
                          currentPriority={task.priority}
                          onPriorityChange={(priority) => onUpdateTask(task._id, { priority })}
                        >
                          <button className="flex items-center gap-1.5 hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none min-h-[28px]">
                            {task.priority ? (
                              <>
                                <Flag className={cn("w-3.5 h-3.5", 
                                  task.priority === 'high' ? "text-rose-400 fill-rose-500/20" :
                                  task.priority === 'medium' ? "text-amber-400 fill-amber-500/20" :
                                  "text-blue-400 fill-blue-500/20"
                                )} />
                                <span className="text-white/80 capitalize group-hover:text-white">
                                  {task.priority === 'medium' ? 'Normal' : task.priority}
                                </span>
                              </>
                            ) : (
                              <span className="text-white/30 hover:text-white/50">Empty</span>
                            )}
                          </button>
                        </PriorityDropdown>
                      </div>
                   </div>

                   {/* Track Time placeholder (to match design) */}
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]">
                        <Clock className="w-3.5 h-3.5" /> Track time
                      </div>
                      <div className="flex-1 flex items-center text-[13px]">
                         <span className="text-white/30 cursor-not-allowed">Empty</span>
                      </div>
                   </div>

                   {/* Tags */}
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]">
                        <Tag className="w-3.5 h-3.5" /> Tags
                      </div>
                      <div className="flex-1 flex items-center text-[13px]">
                        {task.labels && task.labels.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {task.labels.map((l: any) => (
                              <span 
                                key={l.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                style={{ borderColor: `${l.color}50`, backgroundColor: `${l.color}15`, color: l.color }}
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-white/30 cursor-not-allowed">Empty</span>
                        )}
                      </div>
                   </div>
                </div>

                <div className="border-t border-[hsl(var(--border))] my-4" />

                {/* Subtasks stub if any */}
                {task.subtasks && task.subtasks.length > 0 && (
                   <div className="mb-8">
                     <h3 className="text-[14px] font-semibold text-white/90 mb-3 flex items-center gap-2">
                       Subtasks
                     </h3>
                     <div className="space-y-1">
                       {task.subtasks.map((st: any) => (
                         <div key={st.id} className="flex items-center gap-3 py-1.5 group">
                           <div className={cn(
                             "w-4 h-4 rounded-sm flex items-center justify-center shrink-0 border border-white/20 transition-colors cursor-default",
                             st.isCompleted ? "bg-emerald-500 border-emerald-500" : ""
                           )}>
                             {st.isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                           </div>
                           <span className={cn(
                             "text-[14px]",
                             st.isCompleted ? "text-white/40 line-through" : "text-white/80"
                           )}>
                             {st.text}
                           </span>
                         </div>
                       ))}
                     </div>
                   </div>
                )}

                {/* Description Editor */}
                <div className="flex-1 min-h-[200px] flex flex-col pt-2 pb-10">
                  <textarea 
                    value={task.description || ''}
                    onChange={(e: any) => onUpdateTask(task._id, { description: e.target.value })}
                    placeholder="Add description... Write or type / for command and AI action"
                    className="w-full flex-1 bg-transparent text-foreground/80 placeholder:text-muted-foreground/60 outline-none resize-none text-[15px] leading-relaxed font-sans"
                  />
                </div>

             </div>

             {/* Activity Sidebar (Right) */}
             <div className="w-[340px] border-l border-[hsl(var(--border))] bg-transparent flex flex-col shrink-0">
               {/* Sidebar header */}
               <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-white/90">Activity</span>
                  <div className="flex items-center gap-2 text-white/40">
                    <button className="hover:text-white transition-colors" title="History filters">
                      <History className="w-4 h-4" />
                    </button>
                  </div>
               </div>

               {/* Activity Feed */}
               <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                 
                 {/* Dummy Activity 1: Creation */}
                 <div className="flex gap-3">
                   <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex justify-center items-center text-[10px] font-bold shrink-0 mt-0.5">
                     {task.assignees?.[0] ? getInitials(task.assignees[0].name) : 'R'}
                   </div>
                   <div className="flex-1">
                     <p className="text-[13px] text-white/60 leading-snug">
                       <span className="font-semibold text-white/80 capitalize mr-1">
                         {task.assignees?.[0]?.name || 'Ramin'}
                       </span>
                       created this task
                     </p>
                     <p className="text-[11px] text-white/30 mt-1">{createdDate} at 9:59 am</p>
                   </div>
                 </div>

                 {/* Dummy Activity 2: Update */}
                 {task.dueDate && (
                   <div className="flex gap-3">
                     <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex justify-center items-center text-[10px] font-bold shrink-0 mt-0.5">
                       {task.assignees?.[0] ? getInitials(task.assignees[0].name) : 'R'}
                     </div>
                     <div className="flex-1">
                       <p className="text-[13px] text-white/60 leading-snug">
                         <span className="font-semibold text-white/80 capitalize mr-1">
                           {task.assignees?.[0]?.name || 'Ramin'}
                         </span>
                         set the due date to <span className="text-white/80">{dateLabel}</span>
                       </p>
                       <p className="text-[11px] text-white/30 mt-1">Recently</p>
                     </div>
                   </div>
                 )}
                 
               </div>

             </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
