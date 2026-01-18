'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  
  // Calculate days based on CURRENT selected date to ensure correct number of days (28/30/31)
  const daysInMonth = getDaysInMonth(date);
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  // Time arrays
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  
  // AM/PM Infinite Loop Setup (to fix alignment issues with short lists)
  // We create 100 pairs of AM/PM with unique IDs to simulate a scrollable wheel
  const ampmLoop = Array.from({ length: 100 }, (_, i) => {
     const isPm = i % 2 === 1;
     return isPm ? `PM-${Math.floor(i/2)}` : `AM-${Math.floor(i/2)}`;
  }); 

  // Helper to get initial AM/PM value in the middle of the loop
  const getInitialAmPm = (d: Date) => {
      const isPm = d.getHours() >= 12;
      const midPoint = 50; // Start in the middle
      return isPm ? `PM-${midPoint}` : `AM-${midPoint}`;
  };

  const [valueGroups, setValueGroups] = useState({
    month: months[date.getMonth()],
    day: String(date.getDate()),
    year: String(date.getFullYear()),
    hour: String(date.getHours() % 12 || 12),
    minute: String(date.getMinutes()).padStart(2, '0'),
    ampm: getInitialAmPm(date)
  });

  // Sync internal state when external date prop changes
  useEffect(() => {
    // Calculate intelligent AM/PM sync to prevent jumping
    const targetIsPm = date.getHours() >= 12;
    const currentVal = valueGroups.ampm; // e.g., "AM-50"
    const [currentType, currentIndexStr] = currentVal.split('-');
    const currentIndex = parseInt(currentIndexStr);
    
    // We want a value in ampmLoop that matches targetIsPm
    // AND is numerically closest to currentIndex to avoid scroll jumps.
    // The loop has indices 0 to 99.
    // "AM" are at even indices (0, 2, ...), "PM" at odd (1, 3, ...). actually my loop logic:
    // ampmLoop index i:
    // i=0: AM-0
    // i=1: PM-0
    // i=2: AM-1
    // i=3: PM-1
    // So visual "Value" suffix is floor(i/2).
    // Let's rely on the *value string* matching logic I built: `PM-${Math.floor(i/2)}`
    
    // If current is "AM-50", and we need "AM", keep "AM-50".
    // If current is "AM-50" and we need "PM", switch to "PM-50" (closest peer).
    
    let newAmPm = currentVal;
    const currentIsPm = currentType === 'PM';
    
    if (targetIsPm !== currentIsPm) {
       // Need to switch type. Keep the same "loop index" (suffix) if possible.
       newAmPm = targetIsPm ? `PM-${currentIndex}` : `AM-${currentIndex}`;
    }

    setValueGroups(prev => ({
      month: months[date.getMonth()],
      day: String(date.getDate()),
      year: String(date.getFullYear()),
      hour: String(date.getHours() % 12 || 12),
      minute: String(date.getMinutes()).padStart(2, '0'), // No rounding
      ampm: newAmPm
    }));
  }, [date]);

  const handleChange = (newValue: { month: string, day: string, year: string, hour: string, minute: string, ampm: string }, key: string) => {
    let newDate = new Date(date);
    
    // Date Logic
    const mIndex = months.indexOf(newValue.month);
    const y = parseInt(newValue.year);
    const d = parseInt(newValue.day);
    
    // Time Logic
    let h = parseInt(newValue.hour);
    const m = parseInt(newValue.minute);
    
    // Parse AM/PM from the unique value (e.g. "PM-50")
    const rawAmPm = newValue.ampm.split('-')[0]; // "AM" or "PM"
    const isPm = rawAmPm === 'PM';
    
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;

    newDate = setYear(newDate, y);
    newDate = setMonth(newDate, mIndex);
    newDate = setDate(newDate, d);
    newDate.setHours(h);
    newDate.setMinutes(m);

    // Overflow Handling
    const daysInTargetMonth = getDaysInMonth(new Date(y, mIndex));
    if (d > daysInTargetMonth) {
        newDate = new Date(y, mIndex, daysInTargetMonth, h, m);
        newValue.day = String(daysInTargetMonth); 
    }

    onChange(newDate);
    setValueGroups(newValue);
  };

  // Scroll Accumulator for custom dampening (name -> accumulated delta)
  const scrollAcc = useRef<Record<string, number>>({});

  const handleWheel = (name: string, e: React.WheelEvent) => {
    // Prevent default scroll
    // e.preventDefault(); // React synthetic events might not need this if we handle it well, but pure JS logic often does.
    // Actually, react-mobile-picker might still have listeners that we want to bypass. 
    // Since we set wheelMode="off", the library does nothing. 
    // We just need to stop the PARENT from scrolling if we are boundaries.
    
    // Accumulate delta
    // Normalizing delta: 
    // WheelDown (positive delta) -> Next Item -> Index Increase
    // WheelUp (negative delta) -> Prev Item -> Index Decrease
    
    const delta = e.deltaY;
    
    if (!scrollAcc.current[name]) scrollAcc.current[name] = 0;
    scrollAcc.current[name] += delta;

    // Threshold: How much "scroll" pixels needed to move 1 item. 
    // Default libraries usually trigger on ~40-100. 
    // User wants "slower", so let's set a high threshold.
    const THRESHOLD = 60; 

    if (Math.abs(scrollAcc.current[name]) >= THRESHOLD) {
       const steps = Math.floor(Math.abs(scrollAcc.current[name]) / THRESHOLD); // How many items to jump? usually just 1 if we debounce
       const direction = Math.sign(scrollAcc.current[name]); // 1 or -1
       
       // Handle Change (move index by direction * steps)
       // We only move 1 step at a time for smoothness/control if the accumulated is crazy? 
       // Or handle fast scroll? User wanted "slower", so 1 step per threshold is safer.
       
       const changeStep = direction; // 1 or -1
       
       // Call change logic based on name
       handleStepChange(name, changeStep);
       
       // Reset/Reduce accumulator
       // keeping remainder makes it smooth continuous
       scrollAcc.current[name] = scrollAcc.current[name] % THRESHOLD;
    }
  };

  const handleStepChange = (name: string, step: number) => {
     // Values
     const mIndex = months.indexOf(valueGroups.month);
     const dIndex = days.indexOf(valueGroups.day);
     const yIndex = years.indexOf(valueGroups.year);
     
     const hIndex = hours.indexOf(valueGroups.hour);
     const minIndex = minutes.indexOf(valueGroups.minute);
     
     const currentAmPmIdx = parseInt(valueGroups.ampm.split('-')[1]);
     const currentAmPmType = valueGroups.ampm.split('-')[0];
     // For AMPM, we have to find the current item in the Loop array? 
     // We used 'ampmLoop' which is just strings. 
     // Index in ampmLoop:
     // we stored "AM-50". logic of ampmLoop was "AM-50" at index (50*2) + 0?
     // AM-0 (idx 0), PM-0 (idx 1), AM-1 (idx 2)...
     // So index = suffix * 2 + (type=='PM' ? 1 : 0)
     const amPmLoopIndex = (currentAmPmIdx * 2) + (currentAmPmType === 'PM' ? 1 : 0);

     let newValue = { ...valueGroups };
     let changed = false;

     if (name === 'month') {
        const newIndex = mIndex + step;
        if (newIndex >= 0 && newIndex < months.length) {
            newValue.month = months[newIndex];
            changed = true;
        }
     } else if (name === 'day') {
        const newIndex = dIndex + step;
        if (newIndex >= 0 && newIndex < days.length) {
            newValue.day = days[newIndex];
            changed = true;
        }
     } else if (name === 'year') {
        const newIndex = yIndex + step;
        if (newIndex >= 0 && newIndex < years.length) {
            newValue.year = years[newIndex];
            changed = true;
        }
     } else if (name === 'hour') {
        const newIndex = hIndex + step;
        if (newIndex >= 0 && newIndex < hours.length) {
            newValue.hour = hours[newIndex];
            changed = true;
        }
     } else if (name === 'minute') {
        const newIndex = minIndex + step;
        if (newIndex >= 0 && newIndex < minutes.length) {
            newValue.minute = minutes[newIndex];
            changed = true;
        }
     } else if (name === 'ampm') {
        const newIndex = amPmLoopIndex + step;
        if (newIndex >= 0 && newIndex < ampmLoop.length) {
            newValue.ampm = ampmLoop[newIndex];
            changed = true;
        }
     }

     if (changed) {
        // We reuse the existing handleChange logic which clamps/overflows
        handleChange(newValue, name);
     }
  };

  return (
    <div className="h-[120px] w-full flex items-center justify-center relative touch-pan-y text-white select-none">
      {/* Custom Highlight Overlay (Pointer events none to allow reach through) */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[40px] bg-white/5 mx-2 pointer-events-none rounded-lg border-y border-white/5 z-0" />

      {/* Custom Gradient Mask */}
      <div 
         className="absolute inset-0 pointer-events-none z-10" 
         style={{ background: 'linear-gradient(to bottom, #1e1e1e 0%, transparent 30%, transparent 70%, #1e1e1e 100%)' }} 
      />

      <div className="w-full h-full z-20">
          <Picker
            value={valueGroups}
            onChange={handleChange}
            itemHeight={40}
            height={120}
            wheelMode="off" // DISABLE native handler to use manual dampening
            className="flex w-full h-full items-center justify-center px-2"
          >
            {/* Date Section */}
            <Picker.Column name="month" className="flex-[1.5] text-right pr-1" onWheel={(e) => handleWheel('month', e)}>
              {months.map(m => (
                <Picker.Item key={m} value={m}>{({ selected }) => <div className={cn("flex items-center justify-end h-full w-full transition-all duration-200 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{m.substring(0, 3)}</div>}</Picker.Item>
              ))}
            </Picker.Column>
            
            <Picker.Column name="day" className="flex-[0.8] text-center" onWheel={(e) => handleWheel('day', e)}>
              {days.map(d => (
                <Picker.Item key={d} value={d}>{({ selected }) => <div className={cn("flex items-center justify-center h-full w-full transition-all duration-200 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{d}</div>}</Picker.Item>
              ))}
            </Picker.Column>

            <Picker.Column name="year" className="flex-[1.2] text-left pl-1" onWheel={(e) => handleWheel('year', e)}>
              {years.map(y => (
                <Picker.Item key={y} value={y}>{({ selected }) => <div className={cn("flex items-center justify-start h-full w-full transition-all duration-200 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{y}</div>}</Picker.Item>
              ))}
            </Picker.Column>
            
             {/* Divider */}
            <div className="w-px h-[40%] bg-white/10 mx-1" />

            {/* Time Section */}
            <Picker.Column name="hour" className="flex-[0.8] text-right" onWheel={(e) => handleWheel('hour', e)}>
              {hours.map(h => (
                <Picker.Item key={h} value={h}>{({ selected }) => <div className={cn("flex items-center justify-end h-full w-full transition-all duration-200 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{h}</div>}</Picker.Item>
              ))}
            </Picker.Column>

            <Picker.Column name="minute" className="flex-[0.8] text-center" onWheel={(e) => handleWheel('minute', e)}>
              {minutes.map(m => (
                <Picker.Item key={m} value={m}>{({ selected }) => <div className={cn("flex items-center justify-center h-full w-full transition-all duration-200 cursor-pointer text-xs", selected ? "text-white font-bold opacity-100 scale-105" : "text-white/40 font-medium opacity-50 scale-100")}>{m}</div>}</Picker.Item>
              ))}
            </Picker.Column>

             <Picker.Column name="ampm" className="flex-[0.8] text-center" onWheel={(e) => handleWheel('ampm', e)}>
              {ampmLoop.map(ap => (
                <Picker.Item key={ap} value={ap}>
                  {({ selected }) => (
                     <div className={cn(
                       "flex items-center justify-center h-full w-full transition-all duration-200 cursor-pointer text-xs",
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
