'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, AlignLeft, Calendar, Check, Clock } from 'lucide-react';
import { TaskStatusMark, PriorityBars } from './TaskMarks';
import { dueWords, PRIORITY_WORDS, STATUS_WORDS } from './taskWords';
import { cn } from '@/lib/utils';
import { subMinutes } from 'date-fns';
import { TaskStatusDropdown } from './workspace/TaskStatusDropdown';
import type { TaskStatus } from './workspace/TaskStatusDropdown';
import { DueDateDropdown } from './workspace/modals/DueDateDropdown';
import { PriorityDropdown } from './workspace/modals/PriorityDropdown';

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
        'relative flex items-center px-4 py-3 text-[14px] text-[var(--rc-ink-1)] h-full',
        borderRight && 'border-r border-[var(--rc-line)]',
        className
      )}
    >
      {children}
      {onMouseDownResizer && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[var(--rc-accent-fill)] transition-colors z-20"
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
            className="grid border-b border-[var(--rc-line-strong)] text-[13px] font-medium text-[var(--rc-ink-3)] sticky top-0 z-10 bg-[var(--rc-ground)]"
            style={gridStyle}
          >
            <Cell borderRight={false} className="justify-center text-[12px] text-[var(--rc-ink-3)] pl-4">#</Cell>
            <Cell borderRight={false} className="justify-center px-1 border-r border-[var(--rc-line)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--rc-icon)]" aria-label="Status" />
            </Cell>
            <Cell className="text-[var(--rc-ink-3)]" onMouseDownResizer={(e) => handleMouseDown(e, 'name')}>Task</Cell>
            <Cell className="text-[var(--rc-ink-3)]" onMouseDownResizer={(e) => handleMouseDown(e, 'dueDate')}>Due</Cell>
            <Cell className="text-[var(--rc-ink-3)]" onMouseDownResizer={(e) => handleMouseDown(e, 'status')}>Status</Cell>
            <Cell borderRight={false} className="text-[var(--rc-ink-3)]" onMouseDownResizer={(e) => handleMouseDown(e, 'priority')}>Priority</Cell>
            <div className="w-full" />
          </div>

          {/* Body */}
          <div className="flex flex-col flex-1 w-full">
            {filteredTasks.length === 0 ? (
              <div className="py-6 px-4">
                <p className="text-[15px] text-[var(--rc-ink-2)]">Nothing here.</p>
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const isCompleting = completingTaskIds.has(task._id);
                const isDone = task.status === 'complete' || isCompleting;
                const isSelected = selectedTasks.has(task._id);
                const due = task.dueDate ? dueWords(task.dueDate) : null;
                const status = isCompleting ? 'complete' : task.status;

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
                      'group grid border-b border-[var(--rc-line)] hover:bg-[var(--rc-hover)] transition-[background-color,opacity] cursor-pointer w-full bg-transparent last:border-b-0',
                      isSelected && 'bg-[var(--rc-selected)] hover:bg-[var(--rc-selected)]',
                      isCompleting && 'opacity-0 duration-700 delay-[900ms] pointer-events-none'
                    )}
                    style={gridStyle}
                  >
                    {/* # / hover checkbox */}
                    <Cell borderRight={false} className="relative justify-center text-[12px] text-[var(--rc-ink-3)] pl-4 select-none tabular-nums">
                      <div
                        className={cn(
                          "absolute inset-0 flex items-center justify-center transition-opacity z-10",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        style={{ backgroundColor: isSelected ? 'transparent' : 'var(--rc-ground)' }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(task._id);
                          }}
                          className={cn(
                            'w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors focus:outline-none',
                            isSelected ? 'bg-[var(--rc-accent-fill)] border-[var(--rc-accent-fill)] text-white' : 'bg-transparent border-[var(--rc-icon)] hover:border-[var(--rc-ink-2)] text-transparent'
                          )}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                      <span className={cn('transition-opacity', isSelected && 'opacity-0')}>{index + 1}</span>
                    </Cell>

                    {/* Completion toggle */}
                    <Cell borderRight={false} className="justify-center px-1 border-r border-[var(--rc-line)]" onClick={(e) => e.stopPropagation()}>
                      <TaskStatusDropdown
                        currentStatus={(isCompleting ? 'complete' : task.status) as TaskStatus}
                        onStatusChange={triggerComplete}
                      >
                        <button type="button" aria-label={`Status: ${STATUS_WORDS[status] ?? 'To do'}. Change it`} className="group/mark grid h-7 w-7 place-items-center rounded-[6px] hover:bg-[var(--rc-hover)] focus:outline-none">
                          <TaskStatusMark status={status} />
                        </button>
                      </TaskStatusDropdown>
                    </Cell>

                    {/* Name */}
                    <Cell className="py-2.5">
                      <span className={cn('break-words', isDone && 'line-through text-[var(--rc-ink-3)]')}>
                        {task.title}
                      </span>
                      {task.description && (
                        <AlignLeft className="w-3.5 h-3.5 text-[var(--rc-icon)] ml-2 shrink-0" />
                      )}
                      {isDone && task.references && task.references.length > 0 && (
                        <span className="ml-2 px-1.5 py-[1px] rounded-[4px] bg-[var(--rc-surface-2)] text-[var(--rc-ink-2)] text-[12px] font-medium shrink-0" title="Linked to content">
                          {task.references[0].type === 'doc' ? 'Doc' : task.references[0].type}
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
                          'w-full h-full flex items-center gap-1.5 px-3 cursor-pointer text-[13px] whitespace-nowrap focus:outline-none transition-colors hover:bg-[var(--rc-hover)]',
                          due?.late && !isDone ? 'text-[var(--rc-attn)]' : 'text-[var(--rc-ink-2)]'
                        )}>
                          {due ? (
                            <>
                              {due.late && !isDone && <Clock className="w-3.5 h-3.5" aria-hidden />}
                              <span className="tabular-nums">{due.text}</span>
                            </>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 text-[var(--rc-ink-3)] flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 opacity-40" /> Set date
                            </span>
                          )}
                        </button>
                      </DueDateDropdown>
                    </Cell>

                    {/* Status */}
                    <Cell onClick={(e) => e.stopPropagation()} className="p-0">
                      <div className="w-full h-full flex items-center px-3 hover:bg-[var(--rc-hover)]">
                        <TaskStatusDropdown
                          currentStatus={(isCompleting ? 'complete' : task.status) as TaskStatus}
                          onStatusChange={triggerComplete}
                        >
                          <button type="button" className="flex items-center gap-1.5 rounded-[4px] bg-[var(--rc-surface-2)] px-1.5 py-[1px] text-[12.5px] font-medium text-[var(--rc-ink-2)] focus:outline-none">
                            {STATUS_WORDS[status] ?? 'To do'}
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
                        <div className="w-full h-full flex items-center px-4 cursor-pointer hover:bg-[var(--rc-hover)]">
                          {task.priority ? (
                            <div className={cn('flex items-center gap-2 text-[13px]', (task.priority as string) === 'urgent' ? 'text-[var(--rc-attn)]' : 'text-[var(--rc-ink-2)]')}>
                              <PriorityBars priority={task.priority} />
                              <span>{PRIORITY_WORDS[task.priority] ?? task.priority}</span>
                            </div>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 text-[var(--rc-ink-3)] transition-opacity flex items-center gap-1.5 text-[13px]">
                              <PriorityBars priority={null} /> Set priority
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
