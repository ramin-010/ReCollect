'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircle2, Loader2, Sparkles } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { todoApi } from '@/lib/api/todoApi';
import { useDebounce } from '@/lib/hooks/useDebounce';

export interface Assignee {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface InlineAssigneeDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  onSelectAssignee: (assignee: Assignee) => void;
  onClose: () => void;
  workspaceMembers?: Assignee[];
  caretPosition?: { top: number; left: number; height: number } | null;
}

export interface InlineAssigneeDropdownHandle {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

export const InlineAssigneeDropdown = forwardRef<InlineAssigneeDropdownHandle, InlineAssigneeDropdownProps>(
  ({ isOpen, searchQuery, onSelectAssignee, onClose, workspaceMembers, caretPosition }, ref) => {
    const [fetchedAssignees, setFetchedAssignees] = useState<Assignee[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const debouncedSearch = useDebounce(searchQuery, 500);

    // Fetch users from API
    useEffect(() => {
        if (!isOpen) return;
        
        const fetchUsers = async () => {
            const aiUser: Assignee = { 
              _id: 'ai-system', 
              name: 'ai', 
              email: 'ai@system', 
              avatar: 'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1773391852/recollect-logo-1024px_4_crmydu.png' 
            };

            if (!debouncedSearch.trim() || debouncedSearch.trim().length < 2) {
                 setFetchedAssignees([aiUser, ...(workspaceMembers || [])]);
                 return;
            }
            
            setIsLoading(true);
            try {
                const users = await todoApi.searchUsers(debouncedSearch.trim());
                // Only prepend AI if it matches the search query
                if ('ai'.includes(debouncedSearch.trim().toLowerCase())) {
                  setFetchedAssignees([aiUser, ...users]);
                } else {
                  setFetchedAssignees(users);
                }
            } catch (err) {
                console.error("Failed to search users", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [debouncedSearch, isOpen, workspaceMembers]);

    // Reset highlighted index
    useEffect(() => {
      setHighlightedIndex(0);
    }, [fetchedAssignees.length]);

    const selectHighlighted = () => {
      if (fetchedAssignees.length > 0 && highlightedIndex < fetchedAssignees.length) {
        onSelectAssignee(fetchedAssignees[highlightedIndex]);
      }
    };

    useImperativeHandle(ref, () => ({
      handleKeyDown: (e: React.KeyboardEvent) => {
        if (!isOpen) return false;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, fetchedAssignees.length - 1));
            return true;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
            return true;
          case 'Enter':
            e.preventDefault();
            e.stopPropagation();
            selectHighlighted();
            return true;
          case 'Escape':
            e.preventDefault();
            onClose();
            return true;
          default:
            return false;
        }
      }
    }));

    // Auto-scroll logic
    useEffect(() => {
      if (isOpen && dropdownRef.current) {
        const highlightedEl = dropdownRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedEl) {
          highlightedEl.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [highlightedIndex, isOpen]);

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute w-64 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{
              top: caretPosition ? caretPosition.top + caretPosition.height + 4 : '100%',
              left: caretPosition ? caretPosition.left : 0,
              marginTop: caretPosition ? 0 : '0.5rem'
            }}
          >
            <div className="p-2 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center gap-2">
              <UserCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                Assign To
              </span>
            </div>
            
            <div 
              ref={dropdownRef}
              className="max-h-48 overflow-y-auto custom-scrollbar p-1"
            >
              {isLoading && (
                <div className="flex items-center justify-center p-3 text-white/30 text-xs gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching...
                </div>
              )}
              
              {!isLoading && fetchedAssignees.length === 0 && (
                <div className="p-3 text-center text-white/30 text-xs">
                  {debouncedSearch.length < 2 && (!workspaceMembers || workspaceMembers.length === 0) 
                    ? "Type mapping to search users..." : "No users found"}
                </div>
              )}

              {fetchedAssignees.map((user, idx) => {
                const isAi = user._id === 'ai-system';
                const isSelected = highlightedIndex === idx;

                return (
                  <button
                    key={user._id}
                    onClick={() => onSelectAssignee(user)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 min-h-[40px] text-left rounded-lg transition-all relative overflow-hidden group",
                      isAi 
                        ? (isSelected ? "bg-indigo-600/10 text-indigo-200 ring-1 ring-indigo-500/30" : "bg-indigo-500/5 text-indigo-300/80")
                        : (isSelected ? "bg-white/5 text-white" : "text-white/70 hover:bg-white/5")
                    )}
                  >
                    {isAi && (
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent pointer-events-none" />
                    )}
                    
                    <div className={cn(
                      "w-7 h-7 shrink-0 rounded-full flex items-center justify-center flex-none overflow-hidden text-[10px] font-bold transition-all duration-300 shadow-sm",
                      isAi 
                        ? "bg-black ring-1 ring-indigo-500/30 p-1 group-hover:scale-110 shadow-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.3)]" 
                        : "bg-indigo-500/15 text-indigo-400"
                    )}>
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt="" 
                          className={cn("w-full h-full", isAi ? "object-contain" : "object-cover")} 
                          referrerPolicy="no-referrer" 
                        />
                      ) : isAi ? (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>

                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <p className={cn(
                          "text-sm truncate leading-snug",
                          isAi ? "font-semibold text-white" : "font-medium"
                        )}>
                          {user.name}
                        </p>
                        {isAi && (
                          <div className="flex items-center">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <p className={cn(
                        "text-[10px] truncate leading-tight",
                        isAi ? "text-indigo-400/70" : "text-white/40"
                      )}>
                        {isAi ? 'AI Assistant' : user.email}
                      </p>
                    </div>

                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

InlineAssigneeDropdown.displayName = 'InlineAssigneeDropdown';
