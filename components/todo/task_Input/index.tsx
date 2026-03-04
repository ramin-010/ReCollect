'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Circle, 
  Flag,
  Calendar,
  Bell,
  MoreHorizontal,
  User,
  UserPlus,
  Tag,
  CornerDownLeft,
  X,
  Repeat,
  ListPlus,
  ChevronDown,
  CornerDownRight,
  Plus,
  Paperclip,
  Loader2,
  Search,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { SmartReminderModal } from '../SmartReminderModal';
import { LabelsModal, getLabelColorConfig } from '../LabelsModal';
import { InlineLabelDropdown } from '../InlineLabelDropdown';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui-base/Popover';
import { SmartDatePicker } from '@/components/ui-base/SmartDatePicker';
import { TaskDescriptionEditor } from '../TaskDescriptionEditor';
import { subMinutes } from 'date-fns';

import { TaskInputProps, PRIORITIES } from './types';
import { useTaskInput } from './useTaskInput';
import { getRelativeDateDisplay, getHighlightedContent } from './utils';
import { todoApi } from '@/lib/api/todoApi';

export const TaskInput = forwardRef<HTMLInputElement, TaskInputProps>(({ 
  onSave, 
  isExpanded, 
  onExpandChange, 
  isQuickAdd = false, 
  onClose, 
  initialReferences,
  initialTitle,
  initialDescription,
  demoMode = false
}, ref) => {
  const {
    // State
    title, setTitle,
    description, setDescription,
    priority, setPriority,
    isCalendarOpen, setIsCalendarOpen,
    isReminderOpen, setIsReminderOpen,
    isLabelsOpen, setIsLabelsOpen,
    isInlineLabelOpen, setIsInlineLabelOpen,
    tagSearchQuery,
    currentReminder, setCurrentReminder,
    selectedLabels,
    isRecurring, setIsRecurring,
    recurringInterval, setRecurringInterval,
    recurringUnit, setRecurringUnit,
    subtasks, setSubtasks,
    previewImage, setPreviewImage,
    confirmedDueDate, setConfirmedDueDate,
    isSaving,
    
    // Refs
    fileInputRef,
    inputRef,
    containerRef,
    inlineLabelRef,
    
    // Computed
    parsedResult,
    suggestedDate,
    
    // Handlers
    handleLabelsChange,
    handleTitleChange,
    handleInlineSelectLabel,
    handleInlineCreateLabel,
    acceptSuggestion,
    clearConfirmedDate,
    handleSave,
    handleKeyDown,
    assigneeEmail, setAssigneeEmail,
  } = useTaskInput(onSave, onExpandChange, isExpanded, initialReferences, initialTitle, initialDescription, demoMode);

  useImperativeHandle(ref, () => inputRef.current!);

  // Assignee picker state
  const [isAssigneeOpen, setIsAssigneeOpen] = React.useState(false);
  const [assigneeQuery, setAssigneeQuery] = React.useState('');
  const [assigneeResults, setAssigneeResults] = React.useState<{_id: string; name: string; email: string; avatar?: string}[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = React.useState(false);

  // Debounced user search for assignee picker
  React.useEffect(() => {
    if (!assigneeQuery || assigneeQuery.trim().length < 2) {
      setAssigneeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const users = await todoApi.searchUsers(assigneeQuery.trim());
        setAssigneeResults(users);
      } catch (_) {}
      setIsSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [assigneeQuery]);

  const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const selectAssignee = (email: string, name?: string) => {
    setAssigneeEmail(email);
    setIsAssigneeOpen(false);
    setAssigneeQuery('');
    setAssigneeResults([]);
  };

  const currentPriority = PRIORITIES.find(p => p.value === priority);
  const highlightedOverlay = getHighlightedContent(title, parsedResult, confirmedDueDate, selectedLabels);

  return (
    <div 
      ref={containerRef}
      className="w-full"
      onKeyDown={handleKeyDown}
    >
      <motion.div 
        animate={{ 
          borderColor: (isSaving && isQuickAdd) ? "rgba(129, 140, 248, 0.5)" : (isExpanded ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"),
          boxShadow: (isSaving && isQuickAdd) ? "0 0 20px -2px rgba(99, 102, 241, 0.2)" : (isExpanded ? "0 10px 30px -5px rgba(0,0,0,0.3)" : "none")
        }}
        transition={{ duration: 0.3 }}
        className="relative bg-[#2a2a2a] rounded-xl border border-transparent transition-colors duration-200"
      >
        {/* Main Input Row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Circle className="w-5 h-5 text-white/20 shrink-0" strokeWidth={1.5} />
          
          <div className="relative flex-1">
            {highlightedOverlay}
            <style>{`.task-title-input::selection { background-color: rgba(59,130,246,0.4) !important; color: white !important; }`}</style>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onFocus={() => onExpandChange(true)}
              placeholder="Create a new task..."
              autoComplete="off"
              suppressHydrationWarning={demoMode}
              className={cn(
                "task-title-input w-full bg-transparent placeholder:text-white/40 focus:outline-none font-medium relative",
                highlightedOverlay ? "text-transparent caret-white" : "text-white"
              )}
            />
            
            <InlineLabelDropdown
              ref={inlineLabelRef}
              isOpen={isInlineLabelOpen}
              searchQuery={tagSearchQuery}
              onSelectLabel={handleInlineSelectLabel}
              onCreateLabel={handleInlineCreateLabel}
              onClose={() => setIsInlineLabelOpen(false)}
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 min-h-[32px]">
            <AnimatePresence mode="wait" initial={false}>
              {!(isSaving && isQuickAdd) ? (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1"
                >
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
                </motion.div>
              ) : (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center px-2"
                >
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Date Suggestion Chip */}
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

        {/* Expanded Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pl-13 pb-3">
                <TaskDescriptionEditor
                  content={description}
                  onChange={setDescription}
                  onImageClick={setPreviewImage}
                  placeholder="Add description..."
                />
              </div>

              {/* Subtasks */}
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
                              newSubtasks.splice(index + 1, 0, '');
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
              {!isQuickAdd && (
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-2">
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

                  <Popover open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors",
                        assigneeEmail
                          ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/10"
                          : "border-dashed border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5"
                      )}>
                        {assigneeEmail ? <User className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                        <span>{assigneeEmail || 'Assignee'}</span>
                        {assigneeEmail && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setAssigneeEmail(null); }}
                            className="ml-1 p-0.5 hover:text-white/60 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-64 border-white/10 bg-[#1e1e1e]" align="start" side="bottom" sideOffset={8}>
                      <div className="p-2 border-b border-white/10">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                          <input
                            type="text"
                            value={assigneeQuery}
                            onChange={(e) => setAssigneeQuery(e.target.value)}
                            placeholder="Search or enter email..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-white/30 outline-none focus:border-indigo-500/50"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {isSearchingUsers && (
                          <div className="flex items-center justify-center py-3 text-white/40">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            <span className="text-xs">Searching...</span>
                          </div>
                        )}
                        {!isSearchingUsers && assigneeResults.map(user => (
                          <button
                            key={user._id}
                            onClick={() => selectAssignee(user.email, user.name)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/80 truncate">{user.name}</p>
                              <p className="text-xs text-white/40 truncate">{user.email}</p>
                            </div>
                          </button>
                        ))}
                        {!isSearchingUsers && assigneeQuery.trim() && isValidEmail(assigneeQuery.trim()) && assigneeResults.length === 0 && (
                          <button
                            onClick={() => selectAssignee(assigneeQuery.trim())}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-emerald-400">Invite {assigneeQuery.trim()}</p>
                              <p className="text-xs text-white/40">Will send invitation</p>
                            </div>
                          </button>
                        )}
                        {!assigneeQuery.trim() && (
                          <p className="text-xs text-white/30 text-center py-3">Type to search or enter email</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

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

                  {isRecurring && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/10">
                      <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs text-white/60">every</span>
                      
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
                    'Create Task'
                  )}
                </Button>
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Image Preview Modal */}
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
});

TaskInput.displayName = 'TaskInput';