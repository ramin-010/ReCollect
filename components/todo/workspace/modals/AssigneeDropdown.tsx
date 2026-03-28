import React, { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Search, UserPlus, Loader2, Mail, Check } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { todoApi } from '@/lib/api/todoApi';

interface AssigneeDropdownProps {
  currentAssignees: any[];
  workspaceMembers: any[];
  onAssign: (email: string, name: string, avatar?: string, _id?: string) => void;
  onUnassign: (email: string) => void;
  children: React.ReactNode;
}

export function AssigneeDropdown({ currentAssignees, workspaceMembers, onAssign, onUnassign, children }: AssigneeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await todoApi.searchUsers(search.trim());
        setSearchResults(users);
      } catch (err) {
        console.error("Failed to search users", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

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
          className="w-[240px] bg-[hsl(var(--background))] rounded-xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden text-[hsl(var(--foreground))]/90 z-50 flex flex-col outline-none font-sans"
          sideOffset={4}
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-[hsl(var(--border))]">
             <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]/50" />
              <input 
                type="text" 
                placeholder="Search or enter email..." 
                className="w-full pl-8 pr-2 py-1.5 bg-[hsl(var(--foreground))]/5 border border-[hsl(var(--border))] focus:border-indigo-500/50 rounded-md outline-none placeholder:text-[hsl(var(--muted-foreground))]/50 text-[13px] text-[hsl(var(--foreground))] transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-[250px] overflow-y-auto py-1">
            {isSearching && (
               <div className="flex items-center justify-center py-3 text-[hsl(var(--muted-foreground))]">
                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
                 <span className="text-xs">Searching...</span>
               </div>
            )}
            {!search.trim() && workspaceMembers.length > 0 && (
              <>
                 <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]/50 px-3 pt-2 pb-1 font-medium">Workspace Members</p>
                 {workspaceMembers.map(member => {
                   const isAssigned = currentAssignees.some(a => a.email === member.email || a._id === member._id);
                   return (
                     <button
                       key={member._id}
                       onClick={(e) => {
                         e.stopPropagation();
                         if (isAssigned) onUnassign(member.email);
                         else onAssign(member.email, member.name, member.avatar, member._id);
                       }}
                       className={cn(
                         "w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[hsl(var(--muted))]/30 transition-colors focus:bg-[hsl(var(--muted))]/30 outline-none group",
                         isAssigned ? "bg-[hsl(var(--muted))]/20" : ""
                       )}
                     >
                       {member.avatar ? (
                         <img src={member.avatar} alt={member.name} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full" />
                       ) : (
                         <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                           {getInitials(member.name)}
                         </div>
                       )}
                       <span className="font-medium text-[13px] text-[hsl(var(--foreground))]/80 group-hover:text-[hsl(var(--foreground))] flex-1 truncate">
                         {member.name}
                       </span>
                       {isAssigned && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                     </button>
                   );
                 })}
              </>
            )}
            {!search.trim() && workspaceMembers.length === 0 && (
               <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-3">Type to search or enter email</p>
            )}
            
            {/* Search Results */}
            {!isSearching && search.trim() && searchResults.map(user => {
              const isAssigned = currentAssignees.some(a => a.email === user.email || a._id === user._id);
              return (
                <button
                  key={user._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAssigned) onUnassign(user.email);
                    else onAssign(user.email, user.name, user.avatar, user._id);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 transition-colors text-left",
                    isAssigned ? "bg-indigo-500/10 hover:bg-indigo-500/20" : "hover:bg-[hsl(var(--muted))]/30"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", isAssigned ? "text-indigo-300" : "text-[hsl(var(--foreground))]/80")}>{user.name}</p>
                    <p className={cn("text-xs truncate", isAssigned ? "text-indigo-400/70" : "text-[hsl(var(--muted-foreground))]")}>{user.email}</p>
                  </div>
                  {isAssigned && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              );
            })}
            
            {/* Invite Option via Email */}
            {!isSearching && search.trim() && isValidEmail(search.trim()) && searchResults.length === 0 && (
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   onAssign(search.trim(), search.trim().split('@')[0], undefined, undefined);
                   setSearch('');
                 }}
                 className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[hsl(var(--muted))]/30 transition-colors text-left"
               >
                 <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                   <Mail className="w-3.5 h-3.5" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm text-emerald-400">Invite {search.trim()}</p>
                   <p className="text-xs text-[hsl(var(--muted-foreground))]/70">Will send invite + assign task</p>
                 </div>
               </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
