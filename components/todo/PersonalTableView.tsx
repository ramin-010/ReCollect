'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, Flag, AlignLeft, Calendar, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { parseISO, differenceInSeconds, differenceInHours, isTomorrow, format, subMinutes } from 'date-fns';
import { TaskStatusDropdown } from './workspace/TaskStatusDropdown';
import type { TaskStatus } from './workspace/TaskStatusDropdown';
import { DueDateDropdown } from './workspace/modals/DueDateDropdown';
import { PriorityDropdown } from './workspace/modals/PriorityDropdown';

function formatSmartDate(dateStr: string): { text: string; isOverdue: boolean } {
  const now = new Date();
  const date = parseISO(dateStr);
  const diffSecs = differenceInSeconds(date, now);

  if (diffSecs < 0) {
    const diffDays = Math.ceil(Math.abs(diffSecs) / 86400);
    return { text: `Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`, isOverdue: true };
  }
  const diffHrs = differenceInHours(date, now);
  if (diffHrs < 24) {
    if (diffSecs < 60) return { text: `Due in ${diffSecs}s`, isOverdue: false };
    if (diffSecs < 3600) return { text: `Due in ${Math.floor(diffSecs / 60)}min`, isOverdue: false };
    return { text: `Due in ${diffHrs}hr`, isOverdue: false };
  }
  if (isTomorrow(date)) return { text: 'Due tomorrow', isOverdue: false };
  return { text: format(date, 'dd/MM/yy'), isOverdue: false };
}

type ColKey = 'index' | 'check' | 'name' | 'dueDate' | 'status' | 'priority';

interface ColWidths {
  index: number;
  check: number;
  name: number;
  dueDate: number;
  status: number;
  priority: number;
}

interface PersonalTask {
  _id: string;
  title: string;
  status: string;
  priority?: string;
  dueDate?: string;
  description?: string;
  references?: { type: string }[];
}

interface PersonalTableViewProps {
  filteredTasks: PersonalTask[];
  onStatusChange: (id: string, newStatus: string) => void;
  onUpdateTask: (id: string, updates: Record<string, unknown>) => void;
  onClick: (task: PersonalTask) => void;
  selectedTasks: Set<string>;
  onToggleSelect: (id: string) => void;
}

interface CellProps {
  children: React.ReactNode;
  className?: string;
  borderRight?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDownResizer?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function Cell({ children, className, borderRight = true, onClick: cellClick, onMouseDownResizer }: CellProps) {
  return (
    <div
      onClick={cellClick}
      className={cn(
        'relative flex items-center px-4 py-3 text-[13px] text-[hsl(var(--foreground))]/80 h-full',
        borderRight && 'border-r border-[hsl(var(--border))]/30',
        className
      )}
    >
      {children}
      {onMouseDownResizer && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/50 transition-colors z-20"
          onMouseDown={onMouseDownResizer}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

export function PersonalTableView({ filteredTasks, onStatusChange, onUpdateTask, onClick, selectedTasks, onToggleSelect }: PersonalTableViewProps) {
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());

  const colWidths = useRef<ColWidths>({
    index: 40,
    check: 35,
    name: 300,
    dueDate: 160,
    status: 150,
    priority: 130,
  });

  const resizingCol = useRef<ColKey | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const applyColWidths = (widths: ColWidths) => {
    if (!tableRef.current) return;
    (Object.entries(widths) as [string, number][]).forEach(([key, val]) => {
      tableRef.current!.style.setProperty(`--col-${key}`, `${val}px`);
    });
  };

  const handleMouseDown = (e: React.MouseEvent, colKey: ColKey) => {
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
    const newWidth = Math.max(50, startWidth.current + dx);
    colWidths.current[resizingCol.current] = newWidth;
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

  useEffect(() => {
    if (tableRef.current) {
      const fixedTotal = 40 + 35 + 160 + 150 + 130;
      const availableSpace = tableRef.current.clientWidth - fixedTotal;
      if (availableSpace > colWidths.current.name) {
        colWidths.current.name = availableSpace - 20;
      }
      applyColWidths(colWidths.current);
    }
  }, []);

  const gridStyle = {
    gridTemplateColumns:
      'var(--col-index, 40px) var(--col-check, 35px) var(--col-name, 300px) var(--col-dueDate, 160px) var(--col-status, 150px) var(--col-priority, 130px) minmax(0, 1fr)',
  };

  return (
    <div className="py-2 w-full">
      <div className="w-full overflow-x-auto relative" ref={tableRef}>
        <div className="min-w-[700px]">
          {/* Header */}
          <div
            className="grid border-b border-[hsl(var(--border))]/50 text-[12px] font-medium text-[hsl(var(--muted-foreground))] sticky top-0 z-10 bg-[hsl(var(--background))]"
            style={gridStyle}
          >
            <Cell borderRight={false} className="justify-center text-[10px] text-[hsl(var(--muted-foreground))]/50 pl-4">#</Cell>
            <Cell borderRight={false} className="justify-center px-1 border-r border-[hsl(var(--border))]/30">
              <CheckCircle2 className="w-3.5 h-3.5 opacity-50" />
            </Cell>
            <Cell className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e) => handleMouseDown(e, 'name')}>Task</Cell>
            <Cell className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e) => handleMouseDown(e, 'dueDate')}>Due Date</Cell>
            <Cell className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e) => handleMouseDown(e, 'status')}>Status</Cell>
            <Cell borderRight={false} className="text-[hsl(var(--muted-foreground))]" onMouseDownResizer={(e) => handleMouseDown(e, 'priority')}>Priority</Cell>
            <div className="w-full" />
          </div>

          {/* Body */}
          <div className="flex flex-col flex-1 w-full">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 border-b border-[hsl(var(--border))]/30">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No tasks here.</p>
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const isCompleting = completingTaskIds.has(task._id);
                const isDone = task.status === 'complete' || isCompleting;
                const isSelected = selectedTasks.has(task._id);
                const dueDateInfo = task.dueDate ? formatSmartDate(task.dueDate) : null;

                const triggerComplete = (newStatus: string) => {
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
                };

                return (
                  <div
                    key={task._id}
                    onClick={() => onClick(task)}
                    className={cn(
                      'group grid border-b border-white/[0.03] hover:bg-white/[0.02] transition-all cursor-pointer w-full bg-transparent last:border-b-0',
                      isSelected && 'bg-indigo-500/[0.06] hover:bg-indigo-500/[0.10]',
                      isCompleting && 'opacity-0 duration-1000 delay-1000 pointer-events-none scale-[0.98]'
                    )}
                    style={gridStyle}
                  >
                    {/* # / hover checkbox */}
                    <Cell borderRight={false} className="relative justify-center text-[10px] text-white/20 pl-4 select-none group-hover:text-white/40">
                      <div
                        className={cn(
                          "absolute inset-0 flex items-center justify-center transition-opacity z-10",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        style={{ backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'hsl(var(--card))' }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(task._id);
                          }}
                          className={cn(
                            'w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors focus:outline-none',
                            isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-transparent border-white/30 hover:border-white/60 text-transparent'
                          )}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                      <span className={cn('transition-opacity', isSelected && 'opacity-0')}>{index + 1}</span>
                    </Cell>

                    {/* Completion toggle */}
                    <Cell borderRight={false} className="justify-center px-1 border-r border-[hsl(var(--border))]/30" onClick={(e) => e.stopPropagation()}>
                      <TaskStatusDropdown
                        currentStatus={(isCompleting ? 'complete' : task.status) as TaskStatus}
                        onStatusChange={triggerComplete}
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
                            <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-dashed border-[hsl(var(--muted-foreground))] group-hover:border-solid group-hover:border-[hsl(var(--foreground))]/100 transition-all" />
                          )}
                        </button>
                      </TaskStatusDropdown>
                    </Cell>

                    {/* Name */}
                    <Cell className="font-medium">
                      <span className={cn('truncate', isDone && 'line-through text-[hsl(var(--muted-foreground))] decoration-[hsl(var(--muted-foreground))]/40')}>
                        {task.title}
                      </span>
                      {task.description && (
                        <AlignLeft className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]/40 ml-2 shrink-0 group-hover:text-[hsl(var(--muted-foreground))]" />
                      )}
                      {isDone && task.references && task.references.length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))]/50 text-[hsl(var(--muted-foreground))] text-[9px] font-medium uppercase tracking-wider shrink-0" title="Linked to content">
                          {task.references[0].type}
                        </span>
                      )}
                    </Cell>

                    {/* Due Date */}
                    <Cell onClick={(e) => e.stopPropagation()} className="p-0">
                      <DueDateDropdown
                        currentDate={task.dueDate}
                        onDateChange={(date) => {
                          const updates: Record<string, unknown> = { dueDate: date };
                          if (date) updates.reminderDate = subMinutes(new Date(date), 10).toISOString();
                          else updates.reminderDate = undefined;
                          onUpdateTask(task._id, updates);
                        }}
                      >
                        <button className={cn(
                          'w-full h-full flex items-center px-3 cursor-pointer text-[11px] whitespace-nowrap focus:outline-none transition-colors hover:bg-[hsl(var(--muted))]/30',
                          dueDateInfo?.isOverdue ? 'text-rose-400 font-semibold' : task.dueDate ? 'text-[hsl(var(--foreground))]/70' : 'text-[hsl(var(--muted-foreground))]/50 hover:text-[hsl(var(--muted-foreground))]'
                        )}>
                          {task.dueDate && dueDateInfo ? (
                            <span>{dueDateInfo.text}</span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 text-white/20 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 opacity-40" /> Set date
                            </span>
                          )}
                        </button>
                      </DueDateDropdown>
                    </Cell>

                    {/* Status */}
                    <Cell onClick={(e) => e.stopPropagation()} className="p-0">
                      <div className="w-full h-full flex items-center px-3 hover:bg-white/[0.04]">
                        <TaskStatusDropdown
                          currentStatus={(isCompleting ? 'complete' : task.status) as TaskStatus}
                          onStatusChange={triggerComplete}
                        >
                          <button className={cn(
                            'px-2.5 py-1 rounded-[4px] text-[10px] font-bold tracking-wide uppercase focus:outline-none transition-colors',
                            isDone ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                              : task.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
                              : task.status === 'review' ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                              : task.status === 'blocked' ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                              : 'bg-[hsl(var(--muted))]/30 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50'
                          )}>
                            {isDone ? 'COMPLETE' : task.status === 'in_progress' ? 'IN PROGRESS' : task.status === 'review' ? 'REVIEW' : task.status === 'blocked' ? 'BLOCKED' : 'TO DO'}
                          </button>
                        </TaskStatusDropdown>
                      </div>
                    </Cell>

                    {/* Priority */}
                    <Cell borderRight={false} onClick={(e) => e.stopPropagation()} className="p-0">
                      <PriorityDropdown
                        currentPriority={task.priority}
                        onPriorityChange={(priority) => onUpdateTask(task._id, { priority })}
                      >
                        <div className="w-full h-full flex items-center px-4 cursor-pointer hover:bg-white/[0.04]">
                          {task.priority ? (
                            <div className="flex items-center gap-2">
                              <Flag className={cn(
                                'w-3.5 h-3.5',
                                task.priority === 'urgent' ? 'text-rose-500'
                                  : task.priority === 'high' ? 'text-amber-500'
                                  : task.priority === 'low' ? 'text-blue-400'
                                  : 'text-white/40'
                              )} />
                              <span className={cn(
                                'capitalize text-[13px]',
                                task.priority === 'urgent' ? 'text-rose-500'
                                  : task.priority === 'high' ? 'text-amber-500'
                                  : task.priority === 'low' ? 'text-blue-400'
                                  : 'text-white/60'
                              )}>
                                {task.priority === 'normal' ? 'Normal' : task.priority}
                              </span>
                            </div>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))]/50 hover:text-[hsl(var(--muted-foreground))] transition-opacity flex items-center gap-1.5 text-[12px]">
                              <Flag className="w-3.5 h-3.5" /> Set priority
                            </span>
                          )}
                        </div>
                      </PriorityDropdown>
                    </Cell>

                    {/* Spacer */}
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
