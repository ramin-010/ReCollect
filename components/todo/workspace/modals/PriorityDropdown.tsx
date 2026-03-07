import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Flag, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low' | 'clear';
// Note: We'll map these to backend ('high', 'medium', 'low', undefined) 
// User wants 'Urgent', 'High', 'Normal' (medium), 'Low', 'Clear'.

interface PriorityDropdownProps {
  currentPriority?: string; 
  onPriorityChange: (priority: string | undefined) => void;
  children: React.ReactNode;
}

export function PriorityDropdown({ currentPriority, onPriorityChange, children }: PriorityDropdownProps) {
  const [open, setOpen] = useState(false);

  // Map backend 'medium' -> 'Normal', mapped internal High/Urgent -> backend High
  const OPTIONS = [
    { value: 'urgent', label: 'Urgent', color: 'text-rose-500', fill: 'fill-rose-500', isFlag: true },
    { value: 'high', label: 'High', color: 'text-amber-500', fill: 'fill-amber-500', isFlag: true },
    { value: 'medium', label: 'Normal', color: 'text-blue-500', fill: 'fill-blue-500', isFlag: true },
    { value: 'low', label: 'Low', color: 'text-zinc-400', fill: 'fill-zinc-400', isFlag: true },
    { value: 'clear', label: 'Clear', color: 'text-zinc-400', isFlag: false },
  ];

  const handleSelect = (val: string) => {
    if (val === 'clear') {
      onPriorityChange(undefined);
    } else {
      // For backend we only have high|medium|low right now, so urgent maps to high in the change handler
      const backendVal = val === 'urgent' ? 'high' : val;
      onPriorityChange(backendVal);
    }
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="w-[200px] bg-[hsl(var(--background))] rounded-xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden text-white/90 z-50 py-2 outline-none font-sans"
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 pb-1.5 text-[11px] font-semibold text-white/40 tracking-wide">
            Task Priority
          </div>

          <div className="flex flex-col">
            {OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.value);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors focus:bg-white/5 outline-none group"
              >
                {option.isFlag ? (
                  <Flag className={cn("w-4 h-4", option.color, option.fill)} />
                ) : (
                  <XCircle className="w-4 h-4 text-white/30" />
                )}
                <span className="font-medium text-[13px] text-white/80 group-hover:text-white">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
