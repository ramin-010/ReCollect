'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addDays, 
  nextSaturday, 
  setHours, 
  setMinutes, 
  startOfToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Zap, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Moon,
  Sun,
  Sunrise,
  Sunset
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';

interface SmartDatePickerProps {
  onSelect: (date: Date) => void;
  selectedDate?: Date | null;
  onClose?: () => void;
}

type Tab = 'quick' | 'calendar' | 'time';

export function SmartDatePicker({ onSelect, selectedDate, onClose }: SmartDatePickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('quick');
  const [internalDate, setInternalDate] = useState<Date>(selectedDate || new Date());
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date()); // For calendar navigation

  // --- Handlers ---
  
  const handleDateSelect = (date: Date) => {
    // Preserve time from internalDate if set, otherwise default to current time or 9am?
    // Actually, if we are just picking a date, we might want to keep the time.
    const newDate = new Date(date);
    newDate.setHours(internalDate.getHours());
    newDate.setMinutes(internalDate.getMinutes());
    setInternalDate(newDate);
    // Auto-switch to time if in calendar mode? or just stay? 
    // Let's stay for now, but valid feedback would be visual.
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDate = new Date(internalDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setInternalDate(newDate);
  };

  const confirmSelection = () => {
    onSelect(internalDate);
    onClose?.();
  };

  // --- Renderers ---

  return (
    <div className="w-[320px] bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header Tabs */}
      <div className="flex items-center p-1 bg-black/20 m-2 rounded-xl">
        <TabButton active={activeTab === 'quick'} onClick={() => setActiveTab('quick')} icon={Zap} label="Quick" />
        <TabButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={CalendarIcon} label="Calendar" />
        <TabButton active={activeTab === 'time'} onClick={() => setActiveTab('time')} icon={Clock} label="Time" />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-[300px] relative">
        <AnimatePresence mode="wait">
          {activeTab === 'quick' && (
            <QuickView 
              key="quick" 
              onSelect={(d) => {
                setInternalDate(d);
                if (d.getHours() === 0 && d.getMinutes() === 0) {
                   // If preset didn't specify time (e.g. just "Tomorrow"), maybe ask for time?
                   // For now, let's just select it.
                }
                onSelect(d); // Quick select usually confirms immediately
                onClose?.();
              }} 
            />
          )}
          {activeTab === 'calendar' && (
             <CalendarView 
               key="calendar" 
               viewDate={viewDate}
               selectedDate={internalDate}
               onViewChange={setViewDate}
               onSelect={handleDateSelect}
             />
          )}
          {activeTab === 'time' && (
            <TimeView 
              key="time"
              date={internalDate}
              onChange={handleTimeSelect}
            />
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer (only for Calendar/Time manual modes) */}
      {activeTab !== 'quick' && (
        <div className="p-3 border-t border-white/5 flex justify-between items-center bg-black/20">
          <div className="text-xs text-white/50">
            {format(internalDate, 'MMM d, h:mm a')}
          </div>
          <Button 
            className="h-8 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium"
            onClick={confirmSelection}
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
        active ? "bg-[#3a3a3a] text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/5"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// 1. Quick View
function QuickView({ onSelect }: { onSelect: (date: Date) => void }) {
  const presets = [
    { label: 'Later Today', time: '18:00', icon: Sunset, get: () => setHours(startOfToday(), 18) },
    { label: 'Tomorrow Morning', time: '9:00 AM', icon: Sunrise, get: () => setHours(addDays(startOfToday(), 1), 9) },
    { label: 'Tomorrow Evening', time: '6:00 PM', icon: Moon, get: () => setHours(addDays(startOfToday(), 1), 18) },
    { label: 'This Weekend', time: 'Sat 9:00 AM', icon: CalendarIcon, get: () => setHours(nextSaturday(startOfToday()), 9) },
    { label: 'Next Week', time: 'Mon 9:00 AM', icon: Check, get: () => setHours(addDays(startOfToday(), 7), 9) }, // Simplified "Next Week"
    { label: 'No Date', time: 'Clear', icon: Zap, get: () => null } // Special case
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      className="p-3 grid grid-cols-1 gap-1"
    >
      <div className="text-xs font-medium text-white/40 mb-2 px-1 uppercase tracking-wider">Suggested</div>
      {presets.map((p, i) => (
        <button
          key={i}
          onClick={() => {
            const d = p.get();
            if (d) onSelect(d);
          }}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 group text-left transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
            <p.icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white/90 group-hover:text-white">{p.label}</div>
            <div className="text-xs text-white/40">{p.time}</div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
        </button>
      ))}
    </motion.div>
  );
}

// 2. Calendar View
function CalendarView({ viewDate, selectedDate, onViewChange, onSelect }: any) {
  const days = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return eachDayOfInterval({ start, end });
  }, [viewDate]);
  
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const startDayOffset = getDay(startOfMonth(viewDate));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onViewChange(subMonths(viewDate, 1))} className="p-1 hover:bg-white/10 rounded-full text-white/60">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm font-medium text-white">
          {format(viewDate, 'MMMM yyyy')}
        </div>
        <button onClick={() => onViewChange(addMonths(viewDate, 1))} className="p-1 hover:bg-white/10 rounded-full text-white/60">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-white/30 uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={cn(
                "h-8 rounded-lg flex items-center justify-center text-xs relative transition-all",
                isSelected 
                  ? "bg-indigo-500 text-white font-medium shadow-md" 
                  : "text-white/70 hover:bg-white/10",
                isCurrentDay && !isSelected && "text-indigo-400 font-medium",
              )}
            >
               {format(day, 'd')}
               {isCurrentDay && !isSelected && (
                 <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
               )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// 3. Time View (Experimental/Innovative)
function TimeView({ date, onChange }: { date: Date, onChange: (h: number, m: number) => void }) {
  // Simple vertical sliders for now, maybe upgrade to circular later
  const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  
  const currentHour = date.getHours();
  const isPm = currentHour >= 12;
  const displayHour = currentHour % 12 || 12;
  const displayMinute = Math.round(date.getMinutes() / 5) * 5; // Snap to 5

  const setTime = (h: number, m: number, pm: boolean) => {
    let finalH = h;
    if (pm && h < 12) finalH += 12;
    if (!pm && h === 12) finalH = 0;
    onChange(finalH, m);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="p-4 h-full flex flex-col items-center justify-center gap-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-col items-center">
             <div className="text-3xl font-bold text-white tracking-tight">
               {displayHour}:{displayMinute.toString().padStart(2, '0')}
             </div>
             <div className="text-xs text-white/30 uppercase tracking-widest mt-1">
               {isPm ? 'PM' : 'AM'}
             </div>
        </div>
      </div>

      {/* AM/PM Toggle */}
      <div className="flex bg-black/30 p-1 rounded-lg border border-white/5">
        <button 
          onClick={() => setTime(displayHour, displayMinute, false)}
          className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all", !isPm ? "bg-indigo-500/20 text-indigo-300" : "text-white/40 hover:text-white/60")}
        >
          AM
        </button>
        <div className="w-px bg-white/10 mx-1" />
        <button 
          onClick={() => setTime(displayHour, displayMinute, true)}
          className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all", isPm ? "bg-indigo-500/20 text-indigo-300" : "text-white/40 hover:text-white/60")}
        >
          PM
        </button>
      </div>

      {/* Sliders Area (Fake stylized sliders/grid for now) */}
      <div className="w-full grid grid-cols-6 gap-2 mt-4">
        {/* Simplified Hours Grid */}
        <div className="col-span-6 text-xs text-white/30 uppercase text-center mb-1">Hours</div>
        {hours.map(h => (
           <button
             key={h}
             onClick={() => setTime(h, displayMinute, isPm)}
             className={cn(
               "h-8 rounded flex items-center justify-center text-xs transition-all",
               h === displayHour ? "bg-indigo-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
             )}
           >
             {h}
           </button>
        ))}
      </div>
      
    </motion.div>
  );
}
