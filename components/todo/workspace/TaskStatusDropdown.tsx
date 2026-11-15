import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';
import { TaskStatusMark } from '../TaskMarks';
import { STATUS_WORDS } from '../taskWords';

export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'blocked' | 'complete';

interface TaskStatusDropdownProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  children: React.ReactNode;
}

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'review', 'blocked', 'complete'];

/**
 * A task's status picker on theme v2 (the float layer, the slash menu's rows): each status with the
 * mark the list draws for it and its words in sentence case, a check on the current one.
 */
export function TaskStatusDropdown({ currentStatus, onStatusChange, children }: TaskStatusDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={cn(rcScope, 'rc-float z-50 w-[188px] rounded-[10px] p-1 text-[14px] outline-none')}
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div role="menu" aria-label="Status" className="flex flex-col">
            {STATUSES.map((value) => {
              const isSelected = currentStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    onStatusChange(value);
                    setOpen(false);
                  }}
                  className="flex h-8 w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[var(--rc-ink-1)] outline-none transition-colors hover:bg-[var(--rc-hover)] focus-visible:bg-[var(--rc-hover)]"
                >
                  <TaskStatusMark status={value} className="h-4 w-4" />
                  <span className="flex-1">{STATUS_WORDS[value]}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--rc-ink-2)]" aria-hidden />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
