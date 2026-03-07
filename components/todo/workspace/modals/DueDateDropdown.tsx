import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, startOfToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface DueDateDropdownProps {
  currentDate?: string;
  onDateChange: (date: string | undefined) => void;
  children: React.ReactNode;
}

export function DueDateDropdown({ currentDate, onDateChange, children }: DueDateDropdownProps) {
  const [open, setOpen] = useState(false);

  // Quick select options matching ClickUp
  const today = startOfToday();
  const QUICK_DATES = [
    { label: 'Today', date: today, hint: 'Sat' }, // Hint is dynamic but hardcoded string suffix per screenshot. We can format it.
    { label: 'Later', isTime: true, hint: '1:57 pm' }, 
    { label: 'Tomorrow', date: addDays(today, 1), hint: format(addDays(today, 1), 'E') },
    { label: 'Next week', date: addDays(today, 7), hint: 'Mon' },
    { label: 'Next weekend', date: addDays(today, 10), hint: format(addDays(today, 10), 'd MMM') },
    { label: '2 weeks', date: addDays(today, 14), hint: format(addDays(today, 14), 'd MMM') },
  ];

  const handleSelectDate = (date: Date) => {
    onDateChange(date.toISOString());
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="w-[260px] bg-[hsl(var(--background))] rounded-xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden text-white/90 z-50 flex flex-col outline-none font-sans"
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex border-b border-[hsl(var(--border))] p-2 bg-[hsl(var(--foreground))]/[0.02]">
             <div className="flex w-full bg-[hsl(var(--foreground))]/5 border border-indigo-500/30 rounded text-[12px] font-medium p-1.5 text-[hsl(var(--foreground))]/90 items-center justify-center gap-2 shadow-[0_0_0_1px_rgba(99,102,241,0.1)]">
               <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" /> 
               {currentDate ? format(parseISO(currentDate), 'MMM d, yyyy') : 'No Due Date'}
             </div>
          </div>

          <div className="flex">
            {/* Quick Select Sidebar */}
            <div className="w-[140px] border-r border-[hsl(var(--border))] py-2 flex flex-col">
              {QUICK_DATES.map((opt, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (opt.date) handleSelectDate(opt.date);
                  }}
                  className="w-full flex justify-between items-center px-3 py-2 hover:bg-white/5 text-[13px] text-white/80 transition-colors group"
                >
                  <span className="font-medium group-hover:text-white">{opt.label}</span>
                  <span className="text-white/30 text-[11px] group-hover:text-white/50">{opt.hint}</span>
                </button>
              ))}
            </div>

            {/* Simple calendar stub */}
            <div className="flex-1 p-3 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-[13px] text-[hsl(var(--foreground))]/70">Custom Date</span>
              </div>
              <input 
                 type="date"
                 className="w-full p-2 bg-transparent border border-[hsl(var(--border))] focus:border-indigo-500/50 rounded-md text-[13px] text-[hsl(var(--foreground))] outline-none cursor-pointer [color-scheme:dark]" 
                 onChange={(e) => {
                   if (e.target.value) {
                     handleSelectDate(new Date(e.target.value));
                   }
                 }}
              />
              <div className="mt-auto pt-4 flex justify-between">
                <button 
                  onClick={() => { onDateChange(undefined); setOpen(false); }} 
                  className="w-full py-1.5 text-[12px] bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 font-semibold rounded transition-colors"
                >
                  Clear Date
                </button>
              </div>
            </div>
          </div>

        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
