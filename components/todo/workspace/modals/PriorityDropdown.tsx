import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Flag, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PriorityLevel = 'urgent' | 'high' | 'normal' | 'low';

interface PriorityDropdownProps {
  currentPriority?: string; 
  onPriorityChange: (priority: string) => void;
  children: React.ReactNode;
}

const OPTIONS = [
  { value: 'urgent', label: 'Urgent', color: 'text-rose-500', fill: 'fill-rose-500' },
  { value: 'high', label: 'High', color: 'text-amber-500', fill: 'fill-amber-500' },
  { value: 'normal', label: 'Normal', color: 'text-blue-500', fill: 'fill-blue-500' },
  { value: 'low', label: 'Low', color: 'text-zinc-400', fill: 'fill-zinc-400' },
];

export function PriorityDropdown({ currentPriority, onPriorityChange, children }: PriorityDropdownProps) {
  const [open, setOpen] = useState(false);

  // Normalize legacy 'medium' to 'normal' for display
  const normalizedPriority = currentPriority === 'medium' ? 'normal' : currentPriority;

  const handleSelect = (val: string) => {
    onPriorityChange(val);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="w-[180px] bg-[#1a1a1a] rounded-xl shadow-xl border border-white/10 overflow-hidden text-white/90 z-50 text-[13px] outline-none font-sans"
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col py-1.5 px-1.5">
            {OPTIONS.map(option => {
              const isSelected = normalizedPriority === option.value;
              return (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 hover:bg-white/5 transition-colors focus:bg-white/5 outline-none group",
                    isSelected ? "bg-white/[0.04]" : ""
                  )}
                >
                  <Flag className={cn("w-4 h-4", option.color, option.fill)} />
                  <span className={cn(
                    "font-medium text-[13px] flex-1",
                    isSelected ? "text-white/90" : "text-white/60 group-hover:text-white/90 transition-colors"
                  )}>
                    {option.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-white/40 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
