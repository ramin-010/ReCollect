'use client';

import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui-base/Button';
import { WheelPicker } from '@/components/ui-base/WheelPicker';

interface SmartDatePickerProps {
  onSelect: (date: Date) => void;
  selectedDate?: Date | null;
  onClose?: () => void;
}

export function SmartDatePicker({ onSelect, selectedDate, onClose }: SmartDatePickerProps) {
  const [internalDate, setInternalDate] = useState<Date>(selectedDate || new Date());
  
  const handleDateChange = useCallback((newDate: Date) => {
    // WheelPicker now handles both Date and Time, so we just accept the new Date object fully.
    setInternalDate(newDate);
  }, []);

  const confirmSelection = () => {
    onSelect(internalDate);
    onClose?.();
  };

  return (
    <div className="w-[300px] bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none">
      {/* Header / Title removed since it's just one view now? Or maybe keep a minimal title? 
          User said "remove the other two things". Let's keep it minimal. */}

      {/* Content Area */}
      <div className="flex-1 h-[150px] relative mt-2">
         <WheelPicker 
           date={internalDate}
           onChange={handleDateChange}
         />
      </div>
      
      {/* Footer (Manual Confirm) */}
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
    </div>
  );
}
