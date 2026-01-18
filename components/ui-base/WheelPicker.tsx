'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Picker from 'react-mobile-picker';
import { getDaysInMonth, setDate, setMonth, setYear } from 'date-fns';
import { cn } from '@/lib/utils';

interface WheelPickerProps {
  date: Date;
  onChange: (newDate: Date) => void;
}

export function WheelPicker({ date, onChange }: WheelPickerProps) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => String(currentYear - 5 + i));
  const daysInMonth = getDaysInMonth(date);
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  // AM/PM needs enough items to scroll properly - 20 pairs
  const ampmLoop = Array.from({ length: 40 }, (_, i) => {
    const isPm = i % 2 === 1;
    return isPm ? `PM-${Math.floor(i/2)}` : `AM-${Math.floor(i/2)}`;
  });

  const isInternalChange = useRef(false);
  const scrollAcc = useRef<Record<string, number>>({});
  const rafId = useRef<number | null>(null);
  const pendingChanges = useRef<Record<string, number>>({});
  const pendingDate = useRef<Date | null>(null);

  const getInitialAmPm = (d: Date) => {
    const isPm = d.getHours() >= 12;
    return isPm ? 'PM-10' : 'AM-10';
  };

  const [valueGroups, setValueGroups] = useState(() => ({
    month: months[date.getMonth()],
    day: String(date.getDate()),
    year: String(date.getFullYear()),
    hour: String(date.getHours() % 12 || 12),
    minute: String(date.getMinutes()).padStart(2, '0'),
    ampm: getInitialAmPm(date)
  }));

  // Call onChange after render when pendingDate is set
  useEffect(() => {
    if (pendingDate.current) {
      isInternalChange.current = true;
      onChange(pendingDate.current);
      pendingDate.current = null;
    }
  });

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    
    const targetIsPm = date.getHours() >= 12;
    const [currentType, currentIdxStr] = valueGroups.ampm.split('-');
    const currentIdx = parseInt(currentIdxStr);
    const currentIsPm = currentType === 'PM';
    
    let newAmPm = valueGroups.ampm;
    if (targetIsPm !== currentIsPm) {
      newAmPm = targetIsPm ? `PM-${currentIdx}` : `AM-${currentIdx}`;
    }
    
    setValueGroups({
      month: months[date.getMonth()],
      day: String(date.getDate()),
      year: String(date.getFullYear()),
      hour: String(date.getHours() % 12 || 12),
      minute: String(date.getMinutes()).padStart(2, '0'),
      ampm: newAmPm
    });
  }, [date]);

  const applyChange = useCallback((name: string, step: number) => {
    setValueGroups(prev => {
      const newValue = { ...prev };
      
      if (name === 'month') {
        const idx = months.indexOf(prev.month);
        const newIdx = idx + step;
        if (newIdx >= 0 && newIdx < months.length) {
          newValue.month = months[newIdx];
        }
      } else if (name === 'day') {
        const idx = days.indexOf(prev.day);
        const newIdx = idx + step;
        if (newIdx >= 0 && newIdx < days.length) {
          newValue.day = days[newIdx];
        }
      } else if (name === 'year') {
        const idx = years.indexOf(prev.year);
        const newIdx = idx + step;
        if (newIdx >= 0 && newIdx < years.length) {
          newValue.year = years[newIdx];
        }
      } else if (name === 'hour') {
        const idx = hours.indexOf(prev.hour);
        const newIdx = idx + step;
        if (newIdx >= 0 && newIdx < hours.length) {
          newValue.hour = hours[newIdx];
        }
      } else if (name === 'minute') {
        const idx = minutes.indexOf(prev.minute);
        const newIdx = idx + step;
        if (newIdx >= 0 && newIdx < minutes.length) {
          newValue.minute = minutes[newIdx];
        }
      } else if (name === 'ampm') {
        const idx = ampmLoop.indexOf(prev.ampm);
        const newIdx = (idx + step + ampmLoop.length) % ampmLoop.length;
        newValue.ampm = ampmLoop[newIdx];
      }

      // Build date from newValue
      const mIndex = months.indexOf(newValue.month);
      const y = parseInt(newValue.year);
      let d = parseInt(newValue.day);
      let h = parseInt(newValue.hour);
      const m = parseInt(newValue.minute);
      const rawAmPm = newValue.ampm.split('-')[0];
      const isPm = rawAmPm === 'PM';
      
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;

      const daysInTargetMonth = getDaysInMonth(new Date(y, mIndex));
      if (d > daysInTargetMonth) {
        d = daysInTargetMonth;
        newValue.day = String(d);
      }

      // Store pending date - will be sent to parent via useEffect after render
      pendingDate.current = new Date(y, mIndex, d, h, m);
      
      return newValue;
    });
  }, [days, onChange]);

  const processWheel = useCallback(() => {
    rafId.current = null;
    
    for (const name of Object.keys(pendingChanges.current)) {
      const steps = pendingChanges.current[name];
      if (steps !== 0) {
        applyChange(name, steps);
      }
    }
    pendingChanges.current = {};
  }, [applyChange]);

  const handleWheel = useCallback((name: string, e: React.WheelEvent) => {
    const delta = e.deltaY;
    if (!scrollAcc.current[name]) scrollAcc.current[name] = 0;
    scrollAcc.current[name] += delta;

    const THRESHOLD = 80; // Higher = slower

    if (Math.abs(scrollAcc.current[name]) >= THRESHOLD) {
      const steps = Math.sign(scrollAcc.current[name]);
      scrollAcc.current[name] = scrollAcc.current[name] % THRESHOLD;
      
      if (!pendingChanges.current[name]) pendingChanges.current[name] = 0;
      pendingChanges.current[name] += steps;
      
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(processWheel);
      }
    }
  }, [processWheel]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="h-[120px] w-full flex items-center justify-center relative touch-pan-y text-white select-none">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[40px] bg-white/5 mx-2 pointer-events-none rounded-lg border-y border-white/5 z-0" />
      <div 
         className="absolute inset-0 pointer-events-none z-10" 
         style={{ background: 'linear-gradient(to bottom, #1e1e1e 0%, transparent 30%, transparent 70%, #1e1e1e 100%)' }} 
      />

      <div className="w-full h-full z-20">
          <Picker
            value={valueGroups}
            onChange={() => {}} // Disabled - we handle via onWheel
            itemHeight={40}
            height={120}
            wheelMode="off"
            className="flex w-full h-full items-center justify-center px-2"
          >
            <Picker.Column name="month" className="flex-[1.5] text-right pr-1" onWheel={(e) => handleWheel('month', e)}>
              {months.map(m => (
                <Picker.Item key={m} value={m}>{({ selected }) => <div className={cn("flex items-center justify-end h-full w-full transition-all duration-150 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{m.substring(0, 3)}</div>}</Picker.Item>
              ))}
            </Picker.Column>
            
            <Picker.Column name="day" className="flex-[0.8] text-center" onWheel={(e) => handleWheel('day', e)}>
              {days.map(d => (
                <Picker.Item key={d} value={d}>{({ selected }) => <div className={cn("flex items-center justify-center h-full w-full transition-all duration-150 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{d}</div>}</Picker.Item>
              ))}
            </Picker.Column>

            <Picker.Column name="year" className="flex-[1.2] text-left pl-1" onWheel={(e) => handleWheel('year', e)}>
              {years.map(y => (
                <Picker.Item key={y} value={y}>{({ selected }) => <div className={cn("flex items-center justify-start h-full w-full transition-all duration-150 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{y}</div>}</Picker.Item>
              ))}
            </Picker.Column>
            
            <div className="w-px h-[40%] bg-white/10 mx-1" />

            <Picker.Column name="hour" className="flex-[0.8] text-right" onWheel={(e) => handleWheel('hour', e)}>
              {hours.map(h => (
                <Picker.Item key={h} value={h}>{({ selected }) => <div className={cn("flex items-center justify-end h-full w-full transition-all duration-150 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{h}</div>}</Picker.Item>
              ))}
            </Picker.Column>

            <Picker.Column name="minute" className="flex-[0.8] text-center" onWheel={(e) => handleWheel('minute', e)}>
              {minutes.map(m => (
                <Picker.Item key={m} value={m}>{({ selected }) => <div className={cn("flex items-center justify-center h-full w-full transition-all duration-150 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{m}</div>}</Picker.Item>
              ))}
            </Picker.Column>

             <Picker.Column name="ampm" className="flex-[0.8] text-center" onWheel={(e) => handleWheel('ampm', e)}>
              {ampmLoop.map(ap => (
                <Picker.Item key={ap} value={ap}>
                  {({ selected }) => (
                     <div className={cn(
                       "flex items-center justify-center h-full w-full transition-all duration-150 cursor-pointer text-xs",
                       selected ? "text-indigo-400 font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100"
                     )}>
                       {ap.split('-')[0]}
                     </div>
                  )}
                </Picker.Item>
              ))}
            </Picker.Column>
          </Picker>
      </div>
      
      <style jsx global>{`
        .picker-container .picker-highlight, .picker-container .picker-mask { display: none !important; }
      `}</style>
    </div>
  );
}
