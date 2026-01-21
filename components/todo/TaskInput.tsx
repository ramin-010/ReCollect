'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  Repeat,
  ListPlus,
  ChevronDown,
  CornerDownRight,
  Plus,
  Paperclip,
  Loader2
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
import { format, isToday, isTomorrow, addDays, differenceInDays, subMinutes } from 'date-fns';
import { SmartReminderModal } from './SmartReminderModal';
import { LabelsModal, Label, getLabelColorConfig } from './LabelsModal';
import { todoApi } from '@/lib/api/todoApi';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { InlineLabelDropdown, InlineLabelDropdownHandle } from './InlineLabelDropdown';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui-base/Popover';
import { SmartDatePicker } from '@/components/ui-base/SmartDatePicker';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';


interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'complete';
  dueDate?: string;
  reminderDate?: string;
  subtasks?: { id: string; text: string; isCompleted: boolean }[];
  labels?: { id: string; name: string; color: string }[];
  recurrence?: { pattern: 'daily' | 'weekly' | 'monthly'; interval?: number };
}

interface TaskInputProps {
  onSave?: (task: TaskData) => void; // Optional callback after API success
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}


const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'high', label: 'High', color: 'text-rose-400', bg: 'bg-rose-500/10' },
];


const STATUSES = [
  { value: 'pending', label: 'Backlog', icon: <Circle className="w-3.5 h-3.5" /> },
  { value: 'complete', label: 'Done', icon: <Circle className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" /> },
];

export function TaskInput({ onSave, isExpanded, onExpandChange }: TaskInputProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'pending' | 'complete'>('pending');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isInlineLabelOpen, setIsInlineLabelOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [currentReminder, setCurrentReminder] = useState<Date | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([]);
  
  // Recurring task state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringUnit, setRecurringUnit] = useState<'day' | 'week' | 'month'>('week');
  
  // Subtasks state
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [isSubtaskFormOpen, setIsSubtaskFormOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');

  // Image attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);

  
  const handleLabelsChange = (labels: Label[]) => {
    
    const newLabel = labels.find(l => !selectedLabels.some(sl => sl.id === l.id));
    if (newLabel) {
      
      setTitle(prev => `${prev.trim()} @${newLabel.name}`.trim());
    }
    
    
    const removedLabel = selectedLabels.find(sl => !labels.some(l => l.id === sl.id));
    if (removedLabel) {
      setTitle(prev => prev.replace(new RegExp(`@${removedLabel.name}\\s?`, 'gi'), '').trim());
    }
    
    setSelectedLabels(labels);
    setTagSearchQuery('');
  };

  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);

    
    const labelsInText = value.match(/@(\w+)/g)?.map(m => m.slice(1).toLowerCase()) || [];
    setSelectedLabels(prev => 
      prev.filter(label => labelsInText.includes(label.name.toLowerCase()))
    );

    
    const match = value.match(/@(\w*)$/);
    if (match) {
      const query = match[1]; 
      setTagSearchQuery(query);
      setIsInlineLabelOpen(true);
    } else {
      setTagSearchQuery('');
      
      setIsInlineLabelOpen(false);
    }
  };
  
  
  const [confirmedDueDate, setConfirmedDueDate] = useState<Date | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineLabelRef = useRef<InlineLabelDropdownHandle>(null);

  
  const handleInlineSelectLabel = (label: Label) => {
    setTitle(prev => prev.replace(/@\w*$/, `@${label.name} `));
    setSelectedLabels(prev => [...prev, label]);
    setIsInlineLabelOpen(false);
    setTagSearchQuery('');
  };

  
  const handleInlineCreateLabel = (label: Label) => {
    setTitle(prev => prev.replace(/@\w*$/, `@${label.name} `));
    setSelectedLabels(prev => [...prev, label]);
    setIsInlineLabelOpen(false);
    setTagSearchQuery('');
  };

  
  const parsedResult = useMemo(() => {
    if (!title.trim()) return null;
    return parseTaskInput(title);
  }, [title]);

  
  const suggestedDate = parsedResult?.dueDate && !confirmedDueDate ? parsedResult.dueDate : null;
  const matchedText = parsedResult?.matchedText;

  
  const getRelativeDateDisplay = (date: Date) => {
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
    if (date < addDays(new Date(), 7)) return format(date, 'EEEE h:mm a'); 
    
    
    if (date.getFullYear() !== new Date().getFullYear()) {
      return format(date, 'MMM d yyyy, h:mm a'); 
    }
    
    return format(date, 'MMM d, h:mm a'); 
  };

  
  const acceptSuggestion = () => {
    if (suggestedDate && parsedResult) {
      setConfirmedDueDate(suggestedDate);
      
      setCurrentReminder(subMinutes(suggestedDate, 10));
      
      setTitle(parsedResult.cleanText);
    }
  };

  
  const clearConfirmedDate = () => {
    setConfirmedDueDate(null);
    setCurrentReminder(null);
  };

  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      
      const isInsideContainer = containerRef.current && containerRef.current.contains(e.target as Node);
      
      
      
      const target = e.target as HTMLElement;
      const isInsidePopover = target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="dialog"]');

      if (!isInsideContainer && !isInsidePopover) {
        if (isExpanded && !title.trim()) {
          onExpandChange(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, title, onExpandChange]);

  
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const handleSave = async () => {
    console.log('[TaskInput] handleSave called. isSaving:', isSaving, 'savingRef:', savingRef.current);
    
    // Double-guard with both state and ref
    if (!title.trim() || isSaving || savingRef.current) {
      console.log('[TaskInput] Blocked - already saving or no title');
      return;
    }
    
    savingRef.current = true;
    setIsSaving(true);
    
    const finalDueDate = confirmedDueDate || suggestedDate;
    const taskTitle = confirmedDueDate 
      ? title.trim() 
      : (parsedResult?.cleanText || title.trim());
    
    // Build subtasks with IDs
    const formattedSubtasks = subtasks
      .filter(t => t.trim().length > 0)
      .map(text => ({ id: nanoid(8), text: text.trim(), isCompleted: false }));
    
    // Build recurrence if set
    const recurrenceData = isRecurring 
      ? { 
          pattern: (recurringUnit === 'day' ? 'daily' : recurringUnit === 'week' ? 'weekly' : 'monthly') as 'daily' | 'weekly' | 'monthly', 
          interval: recurringInterval 
        }
      : undefined;
    
    const taskData: TaskData = {
      title: taskTitle,
      description: description.trim() || undefined,
      priority,
      status,
      dueDate: finalDueDate?.toISOString(),
      reminderDate: currentReminder?.toISOString(),
      subtasks: formattedSubtasks.length > 0 ? formattedSubtasks : undefined,
      labels: selectedLabels.length > 0 ? selectedLabels : undefined,
      recurrence: recurrenceData,
    };
    
    console.log('[TaskInput] Calling todoApi.createTodo...');
    
    try {
      const result = await todoApi.createTodo(taskData);
      
      if (result.success && result.data) {
        toast.success('Task created!');
        onSave?.(result.data); // Pass API response (with _id) to parent for store update
        
        // Reset form
        setTitle('');
        setDescription('');
        setSubtasks([]);
        setSelectedLabels([]);
        setPriority('medium');
        setStatus('pending');
        setConfirmedDueDate(null);
        setCurrentReminder(null);
        setIsRecurring(false);
        onExpandChange(false);
      } else {
        toast.error(result.message || 'Failed to create task');
      }
    } catch (error: any) {
      console.error('[TaskInput] Save failed:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    
    if (isInlineLabelOpen && inlineLabelRef.current?.handleKeyDown(e)) {
      return;
    }

    
    if (e.key === 'Backspace' && inputRef.current) {
      const cursorPos = inputRef.current.selectionStart || 0;
      const textBeforeCursor = title.slice(0, cursorPos);
      
      
      const labelMatch = textBeforeCursor.match(/@(\w+)\s?$/);
      if (labelMatch) {
        e.preventDefault();
        const labelName = labelMatch[1];
        const fullMatch = labelMatch[0]; 
        
        
        const newTitle = title.slice(0, cursorPos - fullMatch.length) + title.slice(cursorPos);
        setTitle(newTitle);
        
        
        setSelectedLabels(prev => 
          prev.filter(label => label.name.toLowerCase() !== labelName.toLowerCase())
        );
        
        
        setTimeout(() => {
          if (inputRef.current) {
            const newPos = cursorPos - fullMatch.length;
            inputRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }
    }

    if (e.key === 'Escape') {
      onExpandChange(false);
      inputRef.current?.blur();
    }
    
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

  
  const getHighlightedContent = () => {
    if (!title) return null;

    
    const highlightSegments: { text: string; type: 'date' | 'tag' }[] = [];

    
    if (parsedResult?.matchedSegments?.length && !confirmedDueDate) {
      parsedResult.matchedSegments.forEach((segment: string) => {
        highlightSegments.push({ text: segment, type: 'date' });
      });
    }

    
    const tagMatches = title.match(/@\w+/g);
    if (tagMatches) {
      tagMatches.forEach((tag) => {
        highlightSegments.push({ text: tag, type: 'tag' });
      });
    }

    if (highlightSegments.length === 0) return null;

    
    const uniqueTexts = Array.from(new Set(highlightSegments.map(s => s.text))).sort((a, b) => b.length - a.length);

    
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${uniqueTexts.map(escapeRegExp).join('|')})`, 'gi');
    
    const splitParts = title.split(pattern);

    return (
      <div 
        className="absolute inset-0 flex items-center font-medium pointer-events-none overflow-hidden whitespace-pre"
        aria-hidden="true"
      >
        {splitParts.map((part, i) => {
          const segment = highlightSegments.find(s => s.text.toLowerCase() === part.toLowerCase());
          if (segment?.type === 'tag') {
            return <span key={i} className="bg-blue-500/20 text-blue-300 rounded-sm">{part}</span>;
          } else if (segment?.type === 'date') {
            return <span key={i} className="bg-indigo-500/20 text-white rounded-sm">{part}</span>;
          }
          return <span key={i} className="text-white">{part}</span>;
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
        "relative bg-[#2a2a2a] border border-white/10 rounded-xl transition-all duration-200",
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
            {/* Actual input */}
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onFocus={() => onExpandChange(true)}
              placeholder="Create a new task..."
              autoComplete="off"
              className={cn(
                "w-full bg-transparent placeholder:text-white/40 focus:outline-none font-medium relative",
                highlightedOverlay ? "text-transparent caret-white" : "text-white"
              )}
            />
            
            {/* Inline Label Dropdown - Shows when typing @ */}
            <InlineLabelDropdown
              ref={inlineLabelRef}
              isOpen={isInlineLabelOpen}
              searchQuery={tagSearchQuery}
              onSelectLabel={handleInlineSelectLabel}
              onCreateLabel={handleInlineCreateLabel}
              onClose={() => {
                setIsInlineLabelOpen(false);
                setTagSearchQuery('');
              }}
            />
          </div>

          {/* Action Buttons (Right Side) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Calendar */}
            {/* Calendar - Inline Trigger */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <button 
                  type="button" 
                  className={cn(
                  "p-1.5 rounded-md transition-colors",
                  isCalendarOpen || confirmedDueDate 
                    ? "text-indigo-400" 
                    : "text-white/30 hover:text-white/60"
                )}>
                  <Calendar className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto border-none bg-transparent shadow-none" align="end" side="bottom" sideOffset={8}>
                <SmartDatePicker 
                  selectedDate={confirmedDueDate}
                  onSelect={(date) => {
                    setConfirmedDueDate(date);
                    if (date) {
                      setCurrentReminder(subMinutes(date, 10));
                    } else {
                      setCurrentReminder(null);
                    }
                  }}
                  onClose={() => setIsCalendarOpen(false)}
                />
              </PopoverContent>
            </Popover>
            
            {/* Reminder */}
            <Popover open={isReminderOpen} onOpenChange={setIsReminderOpen}>
              <PopoverTrigger asChild>
                <button 
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    isReminderOpen || currentReminder
                      ? "text-indigo-400" 
                      : "text-white/30 hover:text-white/60"
                  )}
                >
                  <Bell className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto border-none bg-transparent shadow-none" align="end" side="bottom" sideOffset={8}>
                <SmartReminderModal 
                  dueDate={confirmedDueDate || suggestedDate}
                  onSetReminder={setCurrentReminder}
                  onClose={() => setIsReminderOpen(false)}
                  currentReminder={currentReminder}
                />
              </PopoverContent>
            </Popover>



            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-white/30 hover:text-white/60 rounded-md transition-colors"
              title="Add attachment"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  // We need to pass these files to the editor
                  // Dispatch a custom event or update the editor content directly
                  // Since we don't have direct access to the editor's insertImage function from here easily without lifting state up more complexly,
                  // we'll use a hack to dispatch an event that the editor listens to, or just pass the files via props if we refactor.
                  // BETTER: Let's pass a ref to the editor component so we can call insertImage on it.
                  // But for now, let's just trigger the file read here and append to description.
                  
                  Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result as string) {
                         const src = event.target?.result as string;
                         const imgHtml = `<div class="img-container" contenteditable="false" style="position: relative; display: block; width: fit-content; margin: 8px 0;">
                           <img src="${src}" style="max-width: 280px; max-height: 196px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1); display: block; cursor: default;">
                           <div class="img-overlay" style="position: absolute; top: 0; right: 0; display: flex; gap: 4px; padding: 6px; opacity: 0; transition: opacity 0.2s;">
                             <button class="img-expand-btn" style="width: 26px; height: 26px; border-radius: 6px; background: rgba(0,0,0,0.7); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                 <polyline points="15 3 21 3 21 9"></polyline>
                                 <polyline points="9 21 3 21 3 15"></polyline>
                                 <line x1="21" y1="3" x2="14" y2="10"></line>
                                 <line x1="3" y1="21" x2="10" y2="14"></line>
                               </svg>
                             </button>
                             <button class="img-delete-btn" style="width: 26px; height: 26px; border-radius: 6px; background: rgba(220,38,38,0.8); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                 <line x1="18" y1="6" x2="6" y2="18"></line>
                                 <line x1="6" y1="6" x2="18" y2="18"></line>
                               </svg>
                             </button>
                           </div>
                         </div><p style="margin: 0; min-height: 1em;"></p>`;
                         setDescription(prev => prev + imgHtml);
                      }
                    };
                    reader.readAsDataURL(file);
                  });
              }}}
            />
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
                <TaskDescriptionEditor
                  content={description}
                  onChange={setDescription}
                  onImageClick={setPreviewImage}
                  placeholder="Add description..."
                />
              </div>

              {/* Subtasks Section */}
              {subtasks.length > 0 && (
                <div className="mx-4 mt-2 mb-4 border border-white/10 rounded-lg bg-[#1e1e1e]/50 overflow-hidden">
                  <div className="px-4 py-2 text-xs font-medium text-white/40 border-b border-white/5 bg-[#1e1e1e]">
                    Sub-issues
                  </div>
                  <div className="p-0.5 space-y-0.5">
                    {subtasks.map((task, index) => (
                      <div key={index} className="flex items-center gap-3 px-3 py-2 group">
                        <CornerDownRight className="w-3.5 h-3.5 text-white/30" />
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => {
                            const newSubtasks = [...subtasks];
                            newSubtasks[index] = e.target.value;
                            setSubtasks(newSubtasks);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newSubtasks = [...subtasks];
                              newSubtasks.splice(index + 1, 0, ''); // Insert empty after current
                              setSubtasks(newSubtasks);
                            }
                            if (e.key === 'Backspace' && task === '') {
                              e.preventDefault();
                              const newSubtasks = subtasks.filter((_, i) => i !== index);
                              setSubtasks(newSubtasks);
                            }
                          }}
                          placeholder="Issue title"
                          className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
                          autoFocus={task === ''} 
                        />
                        <button 
                          onClick={() => setSubtasks(prev => prev.filter((_, i) => i !== index))}
                          className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-white/40 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setSubtasks(prev => [...prev, ''])}
                      className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs font-medium text-indigo-400 hover:bg-white/5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add sub-issue</span>
                    </button>
                  </div>
                </div>
              )}


              {/* Meta Bar / Footer */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {/* Confirmed Due Date (shown in footer after accepting) */}
                  {confirmedDueDate && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-white/10 text-white/60">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{getRelativeDateDisplay(confirmedDueDate)}</span>
                      <button 
                        onClick={clearConfirmedDate}
                        className="ml-1 p-0.5 text-white/40 hover:text-white/60 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}


                  {/* Assignee */}
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/5 rounded-md border border-dashed border-white/10 transition-colors">
                    <User className="w-3.5 h-3.5" />
                    <span>Assignee</span>
                  </button>

                  {/* Labels */}
                  <Popover open={isLabelsOpen} onOpenChange={setIsLabelsOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-white/10 text-white/60 hover:text-white/80 transition-colors">
                        <Tag className={cn("w-3.5 h-3.5", selectedLabels.length > 0 ? "text-indigo-400" : "text-white/40")} />
                        <span>{selectedLabels.length > 0 ? `${selectedLabels.length} Labels` : 'Labels'}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto border-none bg-transparent shadow-none" align="start" side="bottom" sideOffset={8}>
                      <LabelsModal
                        selectedLabels={selectedLabels}
                        onLabelsChange={handleLabelsChange}
                        onClose={() => setIsLabelsOpen(false)}
                        initialSearchQuery={tagSearchQuery}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Priority */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-white/10 text-white/60 hover:text-white/80 transition-colors">
                        <Flag className={cn("w-3.5 h-3.5", currentPriority?.color || "text-white/40")} />
                        <span>{currentPriority?.label || 'Priority'}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#1e1e1e] border-white/10">
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

                  {/* Recurring Settings (shown when enabled) */}
                  {isRecurring && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/10">
                      <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs text-white/60">every</span>
                      
                      {/* Interval Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 px-2 py-0.5 text-xs text-white/80 bg-white/5 hover:bg-white/10 rounded transition-colors">
                            <span>{recurringInterval}</span>
                            <ChevronDown className="w-3 h-3 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-[#1e1e1e] border-white/10 min-w-[48px]">
                          {[1, 2, 3, 4, 5, 6, 7].map(n => (
                            <DropdownMenuItem 
                              key={n} 
                              onClick={() => setRecurringInterval(n)}
                              className={cn("focus:bg-white/10 text-xs", recurringInterval === n && "text-indigo-400")}
                            >
                              {n}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Unit Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 px-2 py-0.5 text-xs text-white/80 bg-white/5 hover:bg-white/10 rounded transition-colors">
                            <span>{recurringUnit}</span>
                            <ChevronDown className="w-3 h-3 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-[#1e1e1e] border-white/10 min-w-[64px]">
                          {(['day', 'week', 'month'] as const).map(unit => (
                            <DropdownMenuItem 
                              key={unit} 
                              onClick={() => setRecurringUnit(unit)}
                              className={cn("focus:bg-white/10 text-xs", recurringUnit === unit && "text-indigo-400")}
                            >
                              {unit}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button 
                        onClick={() => setIsRecurring(false)}
                        className="p-0.5 text-white/40 hover:text-white/60 rounded transition-colors ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* More Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-white/10">
                      <DropdownMenuItem 
                        onClick={() => setIsRecurring(!isRecurring)}
                        className="focus:bg-white/10"
                      >
                        <Repeat className="w-3.5 h-3.5 mr-2" />
                        <span>{isRecurring ? 'Remove Recurring' : 'Make Recurring'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSubtasks(prev => [...prev, ''])}
                        className="focus:bg-white/10"
                      >
                        <ListPlus className="w-3.5 h-3.5 mr-2" />
                        <span>Add Sub Task</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleSave}
                  disabled={!title.trim() || isSaving}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 min-w-[80px]"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating</span>
                    </div>
                  ) : (
                    <>
                      Create Task
                      {/* <span className="ml-2 opacity-60 text-xs">Cmd+Enter</span> */}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Preview Modal with Smooth Animation */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative max-w-[80vw] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={previewImage} 
                alt="Preview"
                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

