import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { SmartDatePicker } from '@/components/ui-base/SmartDatePicker';

interface DueDateDropdownProps {
  currentDate?: string;
  onDateChange: (date: string | undefined) => void;
  children: React.ReactNode;
}

export function DueDateDropdown({ currentDate, onDateChange, children }: DueDateDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="p-0 w-auto border-none bg-transparent shadow-none z-50 outline-none"
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <SmartDatePicker 
            selectedDate={currentDate ? new Date(currentDate) : undefined}
            onSelect={(date) => {
              onDateChange(date ? date.toISOString() : undefined);
            }}
            onClose={() => setOpen(false)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
