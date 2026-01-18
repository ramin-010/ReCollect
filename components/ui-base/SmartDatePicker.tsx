'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addDays, 
  nextSaturday, 
  setHours, 
  startOfToday
} from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Zap, 
  ChevronRight, 
  Check,
  Moon,
  Sunrise,
  Sunset
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';
import { WheelPicker } from '@/components/ui-base/WheelPicker';

interface SmartDatePickerProps {
  onSelect: (date: Date) => void;
  selectedDate?: Date | null;
  onClose?: () => void;
}

type Tab = 'quick' | 'date' | 'time';

export function SmartDatePicker({ onSelect, selectedDate, onClose }: SmartDatePickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('quick');
  const [internalDate, setInternalDate] = useState<Date>(selectedDate || new Date());
  
  const handleDateChange = useCallback((newDate: Date) => {
    // WheelPicker now handles both Date and Time, so we just accept the new Date object fully.
    setInternalDate(newDate);
  }, []);

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

  return (
    <div className="w-[300px] bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
      {/* Header Tabs */}
      <div className="flex items-center p-1 bg-black/20 m-2 rounded-xl">
        <TabButton active={activeTab === 'quick'} onClick={() => setActiveTab('quick')} icon={Zap} label="Quick" />
        <TabButton active={activeTab === 'date'} onClick={() => setActiveTab('date')} icon={CalendarIcon} label="Date" />
        <TabButton active={activeTab === 'time'} onClick={() => setActiveTab('time')} icon={Clock} label="Time" />
      </div>

      {/* Content Area */}
      <div className="flex-1 h-[180px] relative">
        <AnimatePresence mode="wait">
          {activeTab === 'quick' && (
            <QuickView 
              key="quick" 
              onSelect={(d) => {
                setInternalDate(d);
                onSelect(d);
                onClose?.();
              }} 
            />
          )}
          {activeTab === 'date' && (
             <WheelPicker 
               key="date" 
               date={internalDate}
               onChange={handleDateChange}
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
      
      {/* Footer (Manual Confirm) */}
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

// --- Tab Button ---
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

// --- 1. Quick View ---
function QuickView({ onSelect }: { onSelect: (date: Date) => void }) {
  const presets = [
    { label: 'Later Today', time: '18:00', icon: Sunset, get: () => setHours(startOfToday(), 18) },
    { label: 'Tomorrow Morning', time: '9:00 AM', icon: Sunrise, get: () => setHours(addDays(startOfToday(), 1), 9) },
    { label: 'Tomorrow Evening', time: '6:00 PM', icon: Moon, get: () => setHours(addDays(startOfToday(), 1), 18) },
    { label: 'This Weekend', time: 'Sat 9:00 AM', icon: CalendarIcon, get: () => setHours(nextSaturday(startOfToday()), 9) },
    { label: 'Next Week', time: 'Mon 9:00 AM', icon: Check, get: () => setHours(addDays(startOfToday(), 7), 9) },
    { label: 'No Date', time: 'Clear', icon: Zap, get: () => null }
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

// --- 3. Time View ---
function TimeView({ date, onChange }: { date: Date, onChange: (h: number, m: number) => void }) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
  const currentHour = date.getHours();
  const isPm = currentHour >= 12;
  const displayHour = currentHour % 12 || 12;
  const displayMinute = Math.round(date.getMinutes() / 5) * 5; 

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

      <div className="w-full grid grid-cols-6 gap-2 mt-4">
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
