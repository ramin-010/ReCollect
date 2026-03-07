import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] rounded-none border border-white/10">
      {/* Calendar Header Tools */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white/90 min-w-[140px]">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-0.5">
            <button onClick={prevMonth} className="p-1 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-md">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-md border-x border-white/10">
              Today
            </button>
            <button onClick={nextMonth} className="p-1 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-md">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
         <div className="min-w-[800px] h-full flex flex-col">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-white/10 shrink-0">
              {WEEKDAYS.map(day => (
                <div key={day} className="px-2 py-2 text-[11px] font-semibold text-white/50 border-r border-white/10 last:border-r-0 text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(120px,1fr)]">
              {daysInMonth.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                // Find tasks for this day
                const dayTasks = filteredTasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day));

                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "border-r border-b border-white/10 last:border-r-0 p-1 flex flex-col gap-1 transition-colors hover:bg-white/[0.02] cursor-pointer",
                      !isCurrentMonth && "bg-black/10 opacity-50",
                      isCurrentDay && "bg-indigo-500/[0.03]"
                    )}
                  >
                    {/* Date Number Header */}
                    <div className="flex justify-end pr-1 pt-1">
                      <span className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isCurrentDay ? "bg-indigo-500 text-white" : "text-white/40",
                        !isCurrentMonth && !isCurrentDay && "text-white/20"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Task Chips */}
                    <div className="flex flex-col gap-1 px-1 overflow-y-auto max-h-[100px] no-scrollbar">
                      {dayTasks.map(task => {
                        const isDone = task.status === 'complete';
                        return (
                          <div 
                            key={task._id}
                            onClick={(e) => { e.stopPropagation(); onClick(task); }}
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-1 rounded truncate flex items-center gap-1.5 transition-colors",
                              isDone ? "bg-white/[0.03] text-white/30 line-through decoration-white/20" : "bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                            )}
                          >
                            {isDone ? (
                               <CheckCircle2 className="w-3 h-3 shrink-0 opacity-50" />
                            ) : (
                              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", 
                                task.priority === 'high' ? "bg-rose-400" :
                                task.priority === 'medium' ? "bg-amber-400" :
                                task.priority === 'low' ? "bg-blue-400" :
                                "bg-indigo-400"
                              )} />
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                        );
                      })}
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
