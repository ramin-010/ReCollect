import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssigneeDropdownProps {
  currentAssignees: any[];
  workspaceMembers: any[];
  onAssign: (email: string, name: string, avatar?: string) => void;
  onUnassign: (email: string) => void;
  children: React.ReactNode;
}

export function AssigneeDropdown({ currentAssignees, workspaceMembers, onAssign, onUnassign, children }: AssigneeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredMembers = workspaceMembers.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) || 
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="w-[240px] bg-[hsl(var(--background))] rounded-xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden text-white/90 z-50 flex flex-col outline-none font-sans"
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-[hsl(var(--border))]">
             <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="text" 
                placeholder="Search or enter email..." 
                className="w-full pl-8 pr-2 py-1.5 bg-[hsl(var(--foreground))]/5 border border-[hsl(var(--border))] focus:border-indigo-500/50 rounded-md outline-none placeholder:text-white/30 text-[13px] text-[hsl(var(--foreground))] transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-[250px] overflow-y-auto py-1">
            {filteredMembers.map(member => {
              const isAssigned = currentAssignees.some(a => a.email === member.email || a._id === member._id);
              return (
                <button
                  key={member._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAssigned) {
                      onUnassign(member.email);
                    } else {
                      onAssign(member.email, member.name, member.avatar);
                    }
                    // Typically assigning doesn't automatically close a dropdown so you can assign multiple, 
                    // but depending on user preference we could setOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors focus:bg-white/5 outline-none group",
                    isAssigned ? "bg-white/[0.03]" : ""
                  )}
                >
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                      {member.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="font-medium text-[13px] text-white/80 group-hover:text-white flex-1 truncate">
                    {member.name}
                  </span>
                  {isAssigned && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
