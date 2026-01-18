'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Circle, 
  Flag,
  Calendar,
  Bell,
  MoreHorizontal,
  User,
  Tag,
  CornerDownLeft,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { parseTaskInput } from '@/lib/utils/smartDateParser';
import { format, isToday, isTomorrow, addDays, differenceInDays } from 'date-fns';

// Types
interface TaskData {
  text: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'complete';
  dueDate?: string;
}

interface TaskInputProps {
  onSave: (task: TaskData) => void;
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

// Priority config
const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'high', label: 'High', color: 'text-rose-400', bg: 'bg-rose-500/10' },
];

// Status config  
const STATUSES = [
  { value: 'pending', label: 'Backlog', icon: <Circle className="w-3.5 h-3.5" /> },
  { value: 'complete', label: 'Done', icon: <Circle className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" /> },
];

export function TaskInput({ onSave, isExpanded, onExpandChange }: TaskInputProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'pending' | 'complete'>('pending');
  
  // Date state: suggested (from parser) vs confirmed (user accepted)
  const [confirmedDueDate, setConfirmedDueDate] = useState<Date | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse date from title as user types
  const parsedResult = useMemo(() => {
    if (!title.trim()) return null;
    return parseTaskInput(title);
  }, [title]);

  // Suggested date (not yet confirmed)
  const suggestedDate = parsedResult?.dueDate && !confirmedDueDate ? parsedResult.dueDate : null;
  const matchedText = parsedResult?.matchedText;

  // Format date for display (helper)
  const getRelativeDateDisplay = (date: Date) => {
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
    if (date < addDays(new Date(), 7)) return format(date, 'EEEE h:mm a'); // e.g. "Monday 5:00 PM"
    
    // If year is different from current year, show year
    if (date.getFullYear() !== new Date().getFullYear()) {
      return format(date, 'MMM d yyyy, h:mm a'); // e.g. "Jan 1 2027, 5:00 PM"
    }
    
    return format(date, 'MMM d, h:mm a'); // e.g. "Dec 19, 5:00 PM"
  };

  // Accept the suggested date
  const acceptSuggestion = () => {
    if (suggestedDate && parsedResult) {
      setConfirmedDueDate(suggestedDate);
      // Replace matched text in title with clean version
      setTitle(parsedResult.cleanText);
    }
  };

  // Clear confirmed date
  const clearConfirmedDate = () => {
    setConfirmedDueDate(null);
  };

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isExpanded && !title.trim()) {
          onExpandChange(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, title, onExpandChange]);

  // Handle save
  const handleSave = () => {
    if (!title.trim()) return;
    
    // Use confirmed date if available, otherwise try suggested
    const finalDueDate = confirmedDueDate || suggestedDate;
    const taskText = confirmedDueDate 
      ? title.trim() 
      : (parsedResult?.cleanText || title.trim());
    
    onSave({
      text: taskText,
      description: description.trim() || undefined,
      priority,
      status,
      dueDate: finalDueDate?.toISOString(),
    });
    
    // Reset
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus('pending');
    setConfirmedDueDate(null);
    onExpandChange(false);
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onExpandChange(false);
      inputRef.current?.blur();
    }
    // Tab or Enter to accept date suggestion
    if ((e.key === 'Tab' || e.key === 'Enter') && suggestedDate && !e.shiftKey) {
      e.preventDefault();
      acceptSuggestion();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Enter' && !e.shiftKey && !isExpanded && !suggestedDate) {
      e.preventDefault();
      handleSave();
    }
  };

  const currentPriority = PRIORITIES.find(p => p.value === priority);

  // Build highlighted text content
  const getHighlightedContent = () => {
    if (!parsedResult?.matchedSegments?.length || confirmedDueDate || !title) return null;

    // To avoid complexity, we can use a regex constructed from segments
    // Escape regex characters in segments
    const uniqueSegments = Array.from(new Set(parsedResult.matchedSegments)).sort((a: string, b: string) => b.length - a.length);

    // Construct a regex that matches any of the segments
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${uniqueSegments.map(escapeRegExp).join('|')})`, 'gi');
    
    const splitParts = title.split(pattern);

    return (
        <div 
          className="absolute inset-0 flex items-center font-medium pointer-events-none overflow-hidden whitespace-pre"
          aria-hidden="true"
        >
          {splitParts.map((part, i) => {
            const isMatch = uniqueSegments.some((s: string) => s.toLowerCase() === part.toLowerCase());
            return isMatch ? (
               <span key={i} className="bg-indigo-500/20 text-white rounded-sm">{part}</span>
            ) : (
               <span key={i} className="text-white">{part}</span>
            );
          })}
        </div>
    );
  };
    
  const highlightedOverlay = getHighlightedContent();

  return (
    <div 
      ref={containerRef}
      className="w-full"
      onKeyDown={handleKeyDown}
    >
      <div className={cn(
        "bg-[#2a2a2a] border border-white/10 rounded-xl transition-all duration-200",
        isExpanded && "border-white/20 shadow-lg"
      )}>
        {/* Main Input Row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Checkbox Circle */}
          <Circle 
            className="w-5 h-5 text-white/20 shrink-0" 
            strokeWidth={1.5} 
          />
          
          {/* Input with backdrop highlight */}
          <div className="relative flex-1">
            {/* Backdrop layer - text with highlight background */}
            {highlightedOverlay}
            {/* Actual input - text is visible only when no highlight */}
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => onExpandChange(true)}
              placeholder="Create a new task..."
              autoComplete="off"
              className={cn(
                "w-full bg-transparent placeholder:text-white/40 focus:outline-none font-medium relative",
                highlightedOverlay ? "text-transparent caret-white" : "text-white"
              )}
            />
          </div>

          {/* Action Buttons (Right Side) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Calendar */}
            <button className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-md transition-colors">
              <Calendar className="w-4 h-4" />
            </button>
            
            {/* Reminder */}
            <button className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-md transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            
            {/* Priority */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "p-1.5 rounded-md transition-colors",
                  currentPriority ? currentPriority.color : "text-white/30 hover:text-white/60 hover:bg-white/5"
                )}>
                  <Flag className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-white/10">
                {PRIORITIES.map((p) => (
                  <DropdownMenuItem 
                    key={p.value} 
                    onClick={() => setPriority(p.value as 'low' | 'medium' | 'high')}
                    className={cn("focus:bg-white/10", p.color)}
                  >
                    <Flag className="w-3.5 h-3.5 mr-2" />
                    <span>{p.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* More Options */}
            <button className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Suggestion Chip - Click or Enter to accept */}
        <AnimatePresence>
          {suggestedDate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 pb-3 pl-12">
                <button
                  onClick={acceptSuggestion}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252525] rounded-lg border border-white/10 transition-colors cursor-pointer group"
                >
                  <Calendar className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-sm text-white/70">{getRelativeDateDisplay(suggestedDate)}</span>
                  <span className="text-xs text-white/30 group-hover:text-white/50 flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" />
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded Section - Description & Meta Bar */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              {/* Description */}
              <div className="px-4 pb-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description..."
                  rows={2}
                  className="w-full bg-transparent text-sm text-white/70 placeholder:text-white/30 focus:outline-none resize-none pl-8"
                />
              </div>

              {/* Meta Bar / Footer */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {/* Confirmed Due Date (shown in footer after accepting) */}
                  {confirmedDueDate && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{getRelativeDateDisplay(confirmedDueDate)}</span>
                      <button 
                        onClick={clearConfirmedDate}
                        className="ml-1 p-0.5 text-emerald-400/60 hover:text-emerald-400 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Status */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-md border border-white/10 transition-colors">
                        {STATUSES.find(s => s.value === status)?.icon}
                        <span>{STATUSES.find(s => s.value === status)?.label}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#1e1e1e] border-white/10">
                      {STATUSES.map((s) => (
                        <DropdownMenuItem 
                          key={s.value} 
                          onClick={() => setStatus(s.value as 'pending' | 'complete')}
                          className="text-white/70 focus:text-white focus:bg-white/10"
                        >
                          {s.icon}
                          <span className="ml-2">{s.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Assignee */}
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/5 rounded-md border border-dashed border-white/10 transition-colors">
                    <User className="w-3.5 h-3.5" />
                    <span>Assignee</span>
                  </button>

                  {/* Labels */}
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/5 rounded-md border border-dashed border-white/10 transition-colors">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Labels</span>
                  </button>
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Create task
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
