import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { SmartReminderModal } from '../../SmartReminderModal';

interface ReminderDropdownProps {
  dueDate?: string;
  currentReminder?: string;
  onReminderChange: (date: string | undefined) => void;
  children: React.ReactNode;
}

export function ReminderDropdown({ dueDate, currentReminder, onReminderChange, children }: ReminderDropdownProps) {
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
          <SmartReminderModal 
            dueDate={dueDate ? new Date(dueDate) : null}
            currentReminder={currentReminder ? new Date(currentReminder) : null}
            onSetReminder={(date) => {
              onReminderChange(date ? date.toISOString() : undefined);
            }}
            onClose={() => setOpen(false)}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
