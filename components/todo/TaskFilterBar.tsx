'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Inbox, 
  Calendar, 
  Clock, 
  CheckCircle2,
  ChevronDown,
  ArrowUpDown,
  Search,
  FileText,
  StickyNote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';

// Filter types
type FilterType = 'inbox' | 'today' | 'upcoming' | 'completed' | 'workspace' | 'docs' | 'notes';
type SortType = 'priority' | 'dueDate' | 'createdAt';

interface TaskFilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  sortBy: SortType;
  onSortChange: (sort: SortType) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const FILTERS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" /> },
  { value: 'today', label: 'Today', icon: <Calendar className="w-4 h-4" /> },
  { value: 'upcoming', label: 'Upcoming', icon: <Clock className="w-4 h-4" /> },
  { value: 'docs', label: 'Docs', icon: <FileText className="w-4 h-4" /> },
  { value: 'notes', label: 'Notes', icon: <StickyNote className="w-4 h-4" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" /> },
];

const SORTS: { value: SortType; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'createdAt', label: 'Created' },
];

export function TaskFilterBar({
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}: TaskFilterBarProps) {
  
  const currentSort = SORTS.find(s => s.value === sortBy) || SORTS[0];

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      {/* Filter Pills */}
      <div className="flex items-center gap-1 bg-[hsl(var(--muted))]/20 rounded-lg p-1">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
              activeFilter === filter.value
                ? "text-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            )}
          >
            {activeFilter === filter.value && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0 bg-[hsl(var(--muted))]/40 rounded-md"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {filter.icon}
              <span className="hidden sm:inline">{filter.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Right Side: Search + Sort */}
      <div className="flex items-center gap-3">
        {/* Inline Search (optional) */}
        {onSearchChange && (
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]/60" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks..."
              className="w-48 pl-9 pr-3 py-1.5 bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--border))]"
            />
          </div>
        )}

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/20 rounded-lg transition-colors">
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">{currentSort.label}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
            {SORTS.map((sort) => (
              <DropdownMenuItem
                key={sort.value}
                onClick={() => onSortChange(sort.value)}
                className={cn(
                  "text-[hsl(var(--muted-foreground))] focus:text-[hsl(var(--foreground))] focus:bg-[hsl(var(--muted))]/30",
                  sortBy === sort.value && "text-emerald-500"
                )}
              >
                {sort.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
