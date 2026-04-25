import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Flag, AlignLeft, Plus, MoreHorizontal, UserPlus, Square, CheckSquare, Check, Calendar } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { parseISO, differenceInSeconds, differenceInHours, isTomorrow, format, subMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import { getPriorityTextConfig } from './utils';

/**
 * Smart date formatting copied from TaskRow
 */
function formatSmartDate(dateStr: string, isDueDate: boolean = true): { text: string; isOverdue: boolean } {
  const now = new Date();
  const date = parseISO(dateStr);
  const MathAbs = Math.abs; // for safe usage
  const diffSecs = differenceInSeconds(date, now);

  if (diffSecs < 0) {
    const diffDays = Math.ceil(MathAbs(diffSecs) / 86400);
    return { text: `Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`, isOverdue: true };
  }
  const diffHrs = differenceInHours(date, now);
  if (diffHrs < 24) {
    if (diffSecs < 60) return { text: `${isDueDate ? 'Due in' : 'In'} ${diffSecs}s`, isOverdue: false };
    if (diffSecs < 3600) return { text: `${isDueDate ? 'Due in' : 'In'} ${Math.floor(diffSecs / 60)}min`, isOverdue: false };
    return { text: `${isDueDate ? 'Due in' : 'In'} ${diffHrs}hr`, isOverdue: false };
  }
  if (isTomorrow(date)) return { text: `${isDueDate ? 'Due tomorrow' : 'Tomorrow'}`, isOverdue: false };
  return { text: format(date, 'dd/MM/yy'), isOverdue: false };
}

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
  selectedTasks: Set<string>;
  onToggleSelect: (id: string) => void;
}

export function TableView({
  filteredTasks,
  workspaceMembers = [],
  onStatusChange,
  onUpdateTask,
  onClick,
  taskFilter,
  isViewer,
  selectedTasks,
  onToggleSelect
}: TableViewProps) {
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());

  // Use refs for 60fps resizing without React re-renders
  const colWidths = useRef({
    index: 40,
    check: 35,
    name: 300,        
    assignee: 140,
    dueDate: 140,
    status: 140,
    priority: 120
  });

  const resizingCol = useRef<keyof typeof colWidths.current | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // Apply CSS variables to the container for 60fps resizing without React re-renders wiping it out
  const applyColWidths = (widths: typeof colWidths.current) => {
    if (!tableRef.current) return;
    Object.entries(widths).forEach(([key, val]) => {
      if (tableRef.current) {
        tableRef.current.style.setProperty(`--col-${key}`, `${val}px`);
      }
    });
  };

  const handleMouseDown = (e: React.MouseEvent, colKey: keyof typeof colWidths.current) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = colWidths.current[colKey];
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const dx = e.clientX - startX.current;
    let newWidth = Math.max(50, startWidth.current + dx); 
    
    // special rule for the smallest columns
    if (resizingCol.current === 'index' || resizingCol.current === 'check') {
      newWidth = Math.max(30, startWidth.current + dx);
    }

    colWidths.current[resizingCol.current] = newWidth;
    
    // Apply DOM updates instantly via CSS variables
    requestAnimationFrame(() => applyColWidths(colWidths.current));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingCol.current = null;
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Measure container width and expand Name column on mount so it looks full-width naturally
  useEffect(() => {
    if (tableRef.current) {
      const fixedTotal = 40 + 35 + 140 + 140 + 140 + 120; // Sum of default widths of other columns
      const availableSpace = tableRef.current.clientWidth - fixedTotal;
      if (availableSpace > colWidths.current.name) {
        colWidths.current.name = availableSpace - 20; // Leave tiny buffer
      }
      applyColWidths(colWidths.current);
    }
  }, []);

  // A helper component to render grid cells with vertical borders
  const Cell = ({ children, className, borderRight = true, onClick, onMouseDownResizer, onMouseUpResizer }: any) => (
    <div 
      onClick={onClick}
      className={cn(
        "relative flex items-center px-4 py-3 text-[15px] text-[hsl(var(--foreground))]/80 h-full",
        borderRight && "border-r border-[hsl(var(--border))]",
        className
      )}
    >
      {children}
      {onMouseDownResizer && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-20 shrink-0"
          onMouseDown={onMouseDownResizer}
          onMouseUp={onMouseUpResizer}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );

  // The CSS property linking to our custom variables
  const gridStyle = { 
    // All specific columns are strictly bounded to their variables so dragging is 1:1. 
    // The trailing minmax(0, 1fr) dummy column absorbs any extra space on massive screens.
    gridTemplateColumns: 'var(--col-index, 40px) var(--col-check, 35px) var(--col-name, 300px) var(--col-assignee, 140px) var(--col-dueDate, 140px) var(--col-status, 140px) var(--col-priority, 120px) minmax(0, 1fr)' 
  };

  return (
    <div className="py-2 w-full">
      <div 
        className="w-full overflow-x-auto relative"
        ref={tableRef}
      >
        <div className="min-w-[900px]">
          {/* Table Header */}
          <div 
             className="table-header grid border-b border-[hsl(var(--border))]/80 text-[12px] font-medium text-[hsl(var(--muted-foreground))] sticky top-0 z-10 w-full"
             style={gridStyle}
          >
            <Cell borderRight={false} className="justify-center text-[10px] text-[hsl(var(--muted-foreground))]/40 pl-4">#</Cell>
          <Cell borderRight={false} className="justify-center px-1 border-r border-[hsl(var(--border))]/70">
            <CheckCircle2 className="w-3.5 h-3.5 opacity-50" />
          </Cell>
          <Cell className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e: any) => handleMouseDown(e, 'name')}>Name</Cell>
          <Cell className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e: any) => handleMouseDown(e, 'assignee')}>Assignee</Cell>
          <Cell className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e: any) => handleMouseDown(e, 'dueDate')}>Due date</Cell>
          <Cell className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e: any) => handleMouseDown(e, 'status')}>Status</Cell>
          <Cell borderRight={false} className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e: any) => handleMouseDown(e, 'priority')}>Priority</Cell>
          {/* Dummy element to fill minmax(0, 1fr) */}
          <div className="w-full" />
        </div>

        {/* Table Body */}
        <div className="flex flex-col flex-1 w-full bg-transparent border-t border-[hsl(var(--border))]/40">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 border-b border-[hsl(var(--border))]/70">
               <p className="text-sm text-[hsl(var(--muted-foreground))]">No tasks available in table view.</p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const assignee = task.assignees && task.assignees.length > 0 ? task.assignees[0] : null;
              const isCompleting = completingTaskIds.has(task._id);
              const isDone = task.status === 'complete' || isCompleting;

              const isSelected = selectedTasks.has(task._id);

              return (
                <div 
                  key={task._id}
                  onClick={() => onClick(task)}
                  className={cn(
                    "table-row group grid border-b border-[hsl(var(--border))]/100 hover:bg-[hsl(var(--muted))]/30 transition-all cursor-pointer w-full bg-transparent last:border-b-0",
                    isSelected && "bg-indigo-500/[0.06] hover:bg-indigo-500/[0.10]",
                    isCompleting && "opacity-0 duration-1000 delay-1000 pointer-events-none scale-[0.98]"
                  )}
                  style={gridStyle}
                >
                  {/* # Column / Hover Select */}
                  <Cell borderRight={false} className="relative justify-center text-[10px] text-[hsl(var(--muted-foreground))]/40 pl-4 select-none group-hover:text-[hsl(var(--muted-foreground))]">
                     <div className={cn(
                          "absolute inset-0 flex items-center justify-center transition-opacity z-10",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        style={{ backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.06)' : '#222222ff' }}>
                        {/* We set hover background to a solid #232323 (slightly lighter than row base #1e1e1e) to fully hide the number behind it */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onToggleSelect(task._id); }}
                          className={cn(
                             "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors focus:outline-none",
                             isSelected 
                               ? "bg-indigo-500 border-indigo-500 text-[hsl(var(--background))]" 
                               : "bg-transparent border-[hsl(var(--foreground))]/20 hover:border-[hsl(var(--foreground))]/40 text-transparent"
                          )}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                     </div>
                     <span className={cn("transition-opacity", isSelected && "opacity-0")}>{index + 1}</span>
                  </Cell>

                  {/* Completion Toggle */}
                  <Cell borderRight={false} className={cn("justify-center px-1 border-r border-[hsl(var(--border))]/70", isViewer && "pointer-events-none")} onClick={(e: any) => e.stopPropagation()}>
                    <TaskStatusDropdown 
                      currentStatus={(isCompleting ? 'complete' : task.status) as any}
                      onStatusChange={(newStatus) => {
                        if (newStatus === 'complete' && task.status !== 'complete') {
                          setCompletingTaskIds(prev => new Set(prev).add(task._id));
                          setTimeout(() => {
                            onStatusChange(task._id, newStatus);
                            setCompletingTaskIds(prev => {
                              const next = new Set(prev);
                              next.delete(task._id);
                              return next;
                            });
                          }, 2000);
                        } else {
                          onStatusChange(task._id, newStatus);
                        }
                      }}
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
                          <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-dashed border-[hsl(var(--muted-foreground))] group-hover:border-solid group-hover:border-[hsl(var(--foreground))]/100 transition-all flex items-center justify-center" />
                        )}
                      </button>
                    </TaskStatusDropdown>
                  </Cell>

                  {/* Name */}
                  <Cell className="font-medium">
                    <span className={cn("truncate", isDone && "line-through  text-[hsl(var(--muted-foreground))] decoration-[hsl(var(--muted-foreground))]/40")}>
                      {task.title}
                    </span>
                    {task.description && (
                      <AlignLeft className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]/40 ml-2 shrink-0 group-hover:text-[hsl(var(--muted-foreground))]" />
                    )}
                  </Cell>

                  {/* Assignee */}
                  <Cell onClick={(e: any) => e.stopPropagation()} className="p-0">
                    <div className={cn("w-full h-full", isViewer ? "pointer-events-none" : "hover:bg-[hsl(var(--muted))]/10")}>
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
                          <button className="w-full h-full flex items-center gap-1.5 px-3 cursor-pointer focus:outline-none">
                            {assignee ? (
                              <>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold shrink-0">
                                    {assignee.avatar ? (
                                      <img src={assignee.avatar} alt="avatar" className="w-full h-full rounded-full" />
                                    ) : (
                                      getInitials(assignee.name)
                                    )}
                                  </div>
                                  <span className="text-[11px] truncate">{assignee.name || assignee.email}</span>
                                </div>
                                {task.assignees?.length > 1 && (
                                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium shrink-0">+{task.assignees.length - 1}</div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-5 h-5 rounded-full border border-dashed border-[hsl(var(--border))] flex items-center justify-center">
                                  <UserPlus className="w-3 h-3 text-[hsl(var(--muted-foreground))]/40" />
                                </div>
                                <span className="text-[11px] text-[hsl(var(--muted-foreground))]/50">Set assignee</span>
                              </div>
                            )}
                          </button>
                        </AssigneeDropdown>
                    </div>
                  </Cell>

                  {/* Due Date */}
                  <Cell onClick={(e: any) => e.stopPropagation()} className="p-0">
                     <div className={cn("w-full h-full", isViewer ? "pointer-events-none" : "hover:bg-[hsl(var(--muted))]/10")}>
                         <DueDateDropdown 
                            currentDate={task.dueDate}
                            onDateChange={(date) => {
                               const updates: any = { dueDate: date };
                               if (date) {
                                 updates.reminderDate = subMinutes(new Date(date), 10).toISOString();
                               } else {
                                 updates.reminderDate = undefined;
                               }
                               onUpdateTask(task._id, updates);
                            }}
                          >
                            <button className={cn(
                              "w-full h-full flex items-center px-3 cursor-pointer text-[11px] whitespace-nowrap focus:outline-none transition-colors",
                              task.dueDate && formatSmartDate(task.dueDate).isOverdue ? "text-rose-400 font-semibold" : task.dueDate ? "text-[hsl(var(--foreground))]/70" : "text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--muted-foreground))]"
                            )}>
                              {task.dueDate ? (
                                <span>{formatSmartDate(task.dueDate).text}</span>
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))]/40 text-[11px] flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 opacity-40" /> Set date</span>
                              )}
                            </button>
                          </DueDateDropdown>
                     </div>
                  </Cell>

                  {/* Status */}
                  <Cell onClick={(e: any) => e.stopPropagation()} className="p-0">
                    <div className={cn("w-full h-full flex items-center px-3", isViewer ? "pointer-events-none" : "hover:bg-[hsl(var(--muted))]/30")}>                         <TaskStatusDropdown
                            currentStatus={(isCompleting ? 'complete' : task.status) as any}
                            onStatusChange={(status) => {
                              if (status === 'complete' && task.status !== 'complete') {
                                setCompletingTaskIds(prev => new Set(prev).add(task._id));
                                setTimeout(() => {
                                  onStatusChange(task._id, status);
                                  setCompletingTaskIds(prev => {
                                    const next = new Set(prev);
                                    next.delete(task._id);
                                    return next;
                                  });
                                }, 2000);
                              } else {
                                onStatusChange(task._id, status);
                              }
                            }}
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
                                      : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/30"
                            )}>
                               {isDone ? 'COMPLETE' :
                                task.status === 'in_progress' ? 'IN PROGRESS' :
                                task.status === 'review' ? 'REVIEW' :
                                task.status === 'blocked' ? 'BLOCKED' : 'TO DO'}
                            </button>
                          </TaskStatusDropdown>
                    </div>
                  </Cell>

                  {/* Priority */}
                  <Cell borderRight={false} onClick={(e: any) => e.stopPropagation()} className="p-0">
                     <div className={cn("w-full h-full", isViewer ? "pointer-events-none" : "hover:bg-[hsl(var(--muted))]/30")}>
                        <PriorityDropdown 
                          currentPriority={task.priority}
                          onPriorityChange={(priority) => onUpdateTask(task._id, { priority })}
                        >
                          <div className="w-full h-full flex items-center px-4 cursor-pointer">
                              {task.priority ? (
                                <div className="flex items-center gap-2 focus:outline-none">
                                  <Flag className={cn(
                                    "w-3.5 h-3.5",
                                    task.priority === 'urgent' ? 'text-rose-400' :
                                    task.priority === 'high' ? 'text-amber-400' :
                                    task.priority === 'low' ? 'text-blue-400' :
                                    'text-[hsl(var(--muted-foreground))]' // normal priority
                                  )} />
                                  <span className={cn(
                                    "capitalize text-[13px]",
                                    task.priority === 'urgent' ? 'text-rose-400' :
                                    task.priority === 'high' ? 'text-amber-400' :
                                    task.priority === 'low' ? 'text-blue-400' :
                                    'text-[hsl(var(--foreground))]/60'
                                  )}>
                                    {task.priority === 'normal' ? 'Normal' : task.priority}
                                  </span>
                                </div>
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))]/50 hover:text-[hsl(var(--muted-foreground))] transition-opacity flex items-center gap-1.5 text-[12px]">
                                  <Flag className="w-3.5 h-3.5" />
                                  Set priority
                                </span>
                              )}
                          </div>
                        </PriorityDropdown>
                     </div>
                  </Cell>

                  {/* Dummy element to fill minmax(0, 1fr) tracking */}
                  <div className="w-full" />
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
