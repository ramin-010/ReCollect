import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday
} from 'date-fns';

interface CalendarViewProps {
  filteredTasks: any[];
  onClick: (task: any) => void;
  onUpdateTask?: (id: string, updates: any) => void;
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-rose-500',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
  none: 'bg-[hsl(var(--border))]',
};

export function CalendarView({ filteredTasks, onClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-[var(--surface-elevated)]/30 rounded-xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden relative h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-semibold text-[hsl(var(--foreground))] min-w-[130px] tracking-tight">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center bg-[hsl(var(--background))]/40 border border-[hsl(var(--border))] rounded-lg p-0.5">
            <button onClick={prevMonth} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]/20 rounded-md">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]/20 rounded-md">
              Today
            </button>
            <button onClick={nextMonth} className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]/20 rounded-md">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid — no internal scrollbar, relies on parent height */}
      <div className="flex-1 overflow-hidden">
         <div className="min-w-[700px]  h-full flex flex-col">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--surface-raised)]/30">
              {WEEKDAYS.map(day => (
                <div key={day} className="px-2 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid — auto-rows-fr ensures rows share space exactly */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {daysInMonth.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                const dayTasks = filteredTasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day));
                const MAX_VISIBLE = 3;
                const visibleTasks = dayTasks.slice(0, MAX_VISIBLE);
                const overflowCount = dayTasks.length - MAX_VISIBLE;

                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "border-r border-b border-[hsl(var(--border))]/70 p-1.5 flex flex-col transition-colors group/day",
                      !isCurrentMonth ? "bg-[hsl(var(--background))]/50 opacity-30" : "bg-transparent",
                      isCurrentDay && "bg-indigo-500/[0.06] relative",
                      isCurrentMonth && "hover:bg-indigo-500/[0.03]"
                    )}
                  >
                    {isCurrentDay && <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500" />}
                    {/* Date Number */}
                    <div className="flex justify-end mb-1">
                      <span className={cn(
                        "text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full leading-none",
                        isCurrentDay ? "bg-indigo-500 text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Task Chips — compact single-line pills */}
                    <div className="flex flex-col gap-[3px] flex-1 min-h-0">
                      {visibleTasks.map(task => {
                        const isDone = task.status === 'complete';
                        const assignee = task.assignees?.[0];
                        const priorityDot = PRIORITY_DOT[task.priority] || PRIORITY_DOT.none;

                        return (
                          <button
                            key={task._id}
                            onClick={(e) => { e.stopPropagation(); onClick(task); }}
                            className={cn(
                              "flex items-center gap-1.5 px-1.5 py-[3px] rounded-[4px] text-left transition-all outline-none group/chip border border-[var(--surface-raised)] hover:border-[var(--border-subtle)]",
                              isDone 
                                ? "bg-[hsl(var(--background))]/40 hover:bg-[hsl(var(--background))]/60 opacity-60" 
                                : "bg-[var(--surface-raised)] hover:bg-[var(--hover-bg)] shadow-sm shadow-black/10"
                            )}
                          >
                            {/* Priority dot or done check */}
                            {isDone ? (
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-500/60" />
                            ) : (
                              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDot)} />
                            )}

                            {/* Title */}
                            <span className={cn(
                              "text-[10px] font-medium truncate flex-1 leading-tight",
                              isDone ? "text-[hsl(var(--muted-foreground))] line-through" : "text-[hsl(var(--foreground))]/80"
                            )}>
                              {task.title}
                            </span>

                            {/* Assignee mini avatar */}
                            {assignee && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                {assignee.avatar ? (
                                  <img 
                                    src={assignee.avatar} 
                                    alt="" 
                                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0 ring-1 ring-black/20" 
                                  />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full bg-indigo-500/25 text-indigo-400 flex items-center justify-center text-[6px] font-bold shrink-0">
                                    {getInitials(assignee.name)}
                                  </div>
                                )}
                                {task.assignees?.length > 1 && (
                                  <span className="text-[8px] font-medium text-[hsl(var(--muted-foreground))] tracking-tighter shrink-0">+{task.assignees.length - 1}</span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* Overflow indicator */}
                      {overflowCount > 0 && (
                        <span className="text-[9px] text-[hsl(var(--muted-foreground))] font-medium px-1.5 mt-0.5">
                          +{overflowCount} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
      </div>
    </div>
  );
}
