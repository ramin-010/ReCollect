'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, UserPlus, X, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todoApi } from '@/lib/api/todoApi';

interface UserResult {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AssigneePickerProps {
  taskId: string;
  currentAssignee?: string | { _id: string; name: string; email: string; avatar?: string } | null;
  onAssigned: (updatedTask: any) => void;
  onUnassigned: () => void;
}

export function AssigneePicker({ taskId, currentAssignee, onAssigned, onUnassigned }: AssigneePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await todoApi.searchUsers(query.trim());
        setResults(users);
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const handleAssign = async (email: string) => {
    setIsAssigning(true);
    try {
      const result = await todoApi.assignTask(taskId, email);
      if (result.success && result.data) {
        onAssigned(result.data);
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    } catch (e) {
      console.error('Assign failed:', e);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    setIsAssigning(true);
    try {
      const result = await todoApi.unassignTask(taskId);
      if (result.success) {
        onUnassigned();
      }
    } catch (e) {
      console.error('Unassign failed:', e);
    } finally {
      setIsAssigning(false);
    }
  };

  // Extract assignee info
  const assigneeInfo = currentAssignee
    ? typeof currentAssignee === 'string'
      ? { name: currentAssignee, email: currentAssignee, avatar: undefined }
      : currentAssignee
    : null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger: Show assignee or "Unassigned" */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 group cursor-pointer hover:bg-[hsl(var(--foreground))]/5 -mx-2 px-2 py-1.5 rounded-md transition-colors"
      >
        {assigneeInfo ? (
          <>
            {assigneeInfo.avatar ? (
              <img src={assigneeInfo.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[hsl(var(--brand-primary))]/20 text-[hsl(var(--brand-primary))] flex items-center justify-center text-[10px] font-bold border border-[hsl(var(--brand-primary))]/30">
                {getInitials(assigneeInfo.name)}
              </div>
            )}
            <span className="text-sm text-[hsl(var(--foreground))]/70 truncate">{assigneeInfo.name}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5 text-[hsl(var(--foreground))]/30 group-hover:text-[hsl(var(--foreground))]/50" />
            <span className="text-sm italic text-[hsl(var(--foreground))]/30 group-hover:text-[hsl(var(--foreground))]/50">Assign someone</span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-[hsl(var(--border))]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--brand-primary))]/50"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-48 overflow-y-auto">
            {isSearching && (
              <div className="flex items-center justify-center py-4 text-[hsl(var(--muted-foreground))]">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Searching...</span>
              </div>
            )}

            {!isSearching && results.length > 0 && results.map(user => (
              <button
                key={user._id}
                onClick={() => handleAssign(user.email)}
                disabled={isAssigning}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[hsl(var(--muted))]/30 transition-colors text-left disabled:opacity-50"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[hsl(var(--brand-primary))]/15 text-[hsl(var(--brand-primary))] flex items-center justify-center text-[10px] font-bold">
                    {getInitials(user.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{user.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user.email}</p>
                </div>
              </button>
            ))}

            {/* Invite by email option */}
            {!isSearching && query.trim() && isValidEmail(query.trim()) && results.length === 0 && (
              <button
                onClick={() => handleAssign(query.trim())}
                disabled={isAssigning}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[hsl(var(--muted))]/30 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-400">Invite {query.trim()}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Send task invitation via email</p>
                </div>
              </button>
            )}

            {!isSearching && query.trim().length >= 2 && !isValidEmail(query.trim()) && results.length === 0 && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">No users found. Type a full email to invite.</p>
            )}

            {!query.trim() && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">Type to search users or enter an email</p>
            )}
          </div>

          {/* Remove assignee option */}
          {assigneeInfo && (
            <div className="border-t border-[hsl(var(--border))]">
              <button
                onClick={handleUnassign}
                disabled={isAssigning}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors text-sm disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Remove assignee
              </button>
            </div>
          )}

          {/* Loading overlay */}
          {isAssigning && (
            <div className="absolute inset-0 bg-[hsl(var(--background))]/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--brand-primary))]" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
