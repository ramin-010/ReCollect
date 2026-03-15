import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'blocked' | 'complete';

interface TaskStatusDropdownProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  children: React.ReactNode;
}

export function TaskStatusDropdown({ currentStatus, onStatusChange, children }: TaskStatusDropdownProps) {
  const [open, setOpen] = useState(false);

  const STATUSES = [
    { value: 'pending', label: 'To Do', colorClass: 'text-zinc-500' },
    { value: 'in_progress', label: 'In Progress', colorClass: 'text-blue-500', fillClass: 'bg-blue-500' },
    { value: 'review', label: 'Review', colorClass: 'text-amber-400', fillClass: 'bg-amber-400' },
    { value: 'blocked', label: 'Blocked', colorClass: 'text-rose-500', fillClass: 'bg-rose-500' },
    { value: 'complete', label: 'Complete', colorClass: 'text-emerald-500', isCheck: true },
  ];

  const handleSelect = (val: TaskStatus) => {
    onStatusChange(val);
    setOpen(false);
  };

  const renderIcon = (option: any) => {
    if (option.value === 'pending') {
      return <div className="w-[14px] h-[14px] rounded-full border-[1.5px] border-dashed border-white/40 shrink-0" />;
    }
    if (option.isCheck) {
      return <CheckCircle2 className={cn("w-[16px] h-[16px] shrink-0 fill-emerald-500/20 ml-[-1px]", option.colorClass)} />;
    }
    return (
      <div className={cn("w-[14px] h-[14px] rounded-full border-[2px] shrink-0 flex items-center justify-center", option.colorClass, "border-current")}>
        <div className={cn("w-[5px] h-[5px] rounded-full", option.fillClass)} />
      </div>
    );
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
            {STATUSES.map(option => {
              const isSelected = currentStatus === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value as TaskStatus)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 hover:bg-white/5 transition-colors focus:bg-white/5 outline-none group",
                    isSelected ? "bg-white/[0.04]" : ""
                  )}
                >
                  <div className="flex items-center justify-center w-4 h-4">
                    {renderIcon(option)}
                  </div>
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
