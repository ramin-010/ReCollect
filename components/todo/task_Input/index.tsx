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
  Mail,
  Check,
  Sparkles
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
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
import { InlineAssigneeDropdown } from '../InlineAssigneeDropdown';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui-base/Popover';
import { SmartDatePicker } from '@/components/ui-base/SmartDatePicker';
import { TiptapTaskEditor } from '../TiptapTaskEditor';
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
  demoMode = false,
  workspaceId,
  spaceId,
  visibility,
  workspaceMembers = []
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
    isInlineAssigneeOpen, setIsInlineAssigneeOpen,
    assigneeSearchQuery,
    currentReminder, setCurrentReminder,
    selectedLabels, setSelectedLabels,
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
    inlineAssigneeRef,
    
    // Computed
    parsedResult,
    suggestedDate,
    
    // Handlers
    handleLabelsChange,
    handleTitleChange,
    handleInlineSelectLabel,
    handleInlineCreateLabel,
    handleInlineSelectAssignee,
    acceptSuggestion,
    clearConfirmedDate,
    handleSave,
    handleKeyDown: hookKeyDown,
    assignees, setAssignees,
    isAiGenerating,
    handleAiGenerate,
  } = useTaskInput(onSave, onExpandChange, isExpanded, initialReferences, initialTitle, initialDescription, demoMode, workspaceId, spaceId, visibility);

  // Wrap handleKeyDown to inject workspaceMembers for @ai
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Before delegating back to the hook, intercept Enter for @ai
    const isInput = (e.target as HTMLElement).tagName.toLowerCase() === 'input';
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (e.key === 'Enter' && (isCtrlOrCmd || (isInput && !e.shiftKey))) {
      const aiMatch = title.match(/^@ai\s+(.+)/i);
      if (aiMatch) {
        e.preventDefault();
        handleAiGenerate(aiMatch[1].trim(), workspaceMembers || []);
        return;
      }
    }
    hookKeyDown(e);
  };

  useImperativeHandle(ref, () => inputRef.current!);

  // Editor-only selection handlers (don't touch title text)
  const handleEditorSelectAssignee = React.useCallback((user: any) => {
    setAssignees((prev: any[]) => {
      if (prev.some((a: any) => a.email === user.email || a._id === user._id)) return prev;
      return [...prev, { name: user.name, email: user.email, avatar: user.avatar, _id: user._id }];
    });
  }, [setAssignees]);

  const handleEditorSelectLabel = React.useCallback((label: any) => {
    setSelectedLabels((prev: any[]) => {
      if (prev.some((l: any) => l.name === label.name)) return prev;
      return [...prev, { id: label.id || `tag-${label.name}`, name: label.name, color: label.color || 'blue' }];
    });
  }, [setSelectedLabels]);

  const handleEditorMentionDelete = React.useCallback((name: string) => {
    setAssignees((prev: any[]) => prev.filter((a: any) => a.name.toLowerCase() !== name.toLowerCase()));
  }, [setAssignees]);

  const handleEditorLabelDelete = React.useCallback((name: string) => {
    setSelectedLabels((prev: any[]) => prev.filter((l: any) => l.name.toLowerCase() !== name.toLowerCase()));
  }, [setSelectedLabels]);

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

  const selectAssignee = (email: string, name?: string, avatar?: string) => {
    const isSelected = assignees.some(a => a.email.toLowerCase() === email.toLowerCase());
    if (isSelected) {
      setAssignees(prev => prev.filter(a => a.email.toLowerCase() !== email.toLowerCase()));
    } else {
      setAssignees(prev => [...prev, { email, name: name || email.split('@')[0], avatar }]);
    }
  };

  const currentPriority = PRIORITIES.find(p => p.value === priority);
  const highlightedOverlay = getHighlightedContent(title, parsedResult, confirmedDueDate, selectedLabels);

  const isAiMode = title.trim().toLowerCase().startsWith('@ai');

  const handlePrimaryClick = () => {
    if (isAiGenerating) return;
    if (isAiMode) {
      const match = title.match(/^@ai\s+(.+)/i);
      if (match) {
        handleAiGenerate(match[1].trim(), workspaceMembers || []);
      }
    } else {
      handleSave();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full"
      onKeyDown={handleKeyDown}
    >
      <motion.div 
        animate={{ 
          borderColor: isAiGenerating ? "rgba(168, 85, 247, 0.4)" : isAiMode ? "rgba(168, 85, 247, 0.2)" : (isSaving && isQuickAdd) ? "rgba(129, 140, 248, 0.5)" : (isExpanded ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"),
          boxShadow: isAiGenerating ? "0 0 25px -5px rgba(168, 85, 247, 0.25)" : isAiMode ? "0 0 15px -5px rgba(168, 85, 247, 0.15)" : (isSaving && isQuickAdd) ? "0 0 20px -2px rgba(99, 102, 241, 0.2)" : (isExpanded ? "0 10px 30px -5px rgba(0,0,0,0.3)" : "none")
        }}
        transition={{ duration: 0.3 }}
        className= {cn("relative bg-[#2a2a2a] rounded-xl border transition-colors duration-200", isAiMode && !isAiGenerating && "bg-[#2a2638] border-purple-500/10")}
      >
        {/* Main Input Row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {(isAiMode || isAiGenerating) ? (
            <Sparkles className="w-5 h-5 text-purple-400 shrink-0" strokeWidth={1.5} />
          ) : (
            <Circle className="w-5 h-5 text-white/20 shrink-0" strokeWidth={1.5} />
          )}
          
          <div className="relative flex-1">
            {highlightedOverlay}
            <style>{`.task-title-input::selection { background-color: rgba(59,130,246,0.4) !important; color: white !important; }`}</style>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onFocus={() => onExpandChange(true)}
              placeholder="Create a new task or type @ai to generate..."
              autoComplete="off"
              suppressHydrationWarning={demoMode}
              className={cn(
                "task-title-input w-full bg-transparent placeholder:text-white/40 focus:outline-none font-medium relative transition-colors duration-300",
                highlightedOverlay && !isAiGenerating ? "text-transparent caret-white" : (isAiMode || isAiGenerating ? "text-purple-200" : "text-white")
              )}
            />

            {/* AI generating loading indicator */}
            {isAiGenerating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-indigo-400">AI generating...</span>
              </div>
            )}
            
            <InlineLabelDropdown
              ref={inlineLabelRef}
              isOpen={isInlineLabelOpen}
              searchQuery={tagSearchQuery}
              onSelectLabel={handleInlineSelectLabel}
              onCreateLabel={handleInlineCreateLabel}
              onClose={() => setIsInlineLabelOpen(false)}
            />
            <InlineAssigneeDropdown
              ref={inlineAssigneeRef}
              isOpen={isInlineAssigneeOpen}
              searchQuery={assigneeSearchQuery}
              onSelectAssignee={handleInlineSelectAssignee}
              onClose={() => setIsInlineAssigneeOpen(false)}
              workspaceMembers={workspaceMembers}
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

                  {!isAiMode && (
                    <>
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
                    </>
                  )}

                  {isAiMode && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              currentPriority?.value !== 'normal' ? "text-indigo-400" : "text-white/30 hover:text-white/60"
                            )}>
                            <Flag className={cn("w-4 h-4", currentPriority?.value !== 'normal' ? currentPriority?.color : "text-white/30")} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-[#1e1e1e] border-white/10">
                          {PRIORITIES.map((p) => (
                            <DropdownMenuItem 
                              key={p.value} 
                              onClick={() => setPriority(p.value as 'low' | 'normal' | 'high' | 'urgent')}
                              className={cn("focus:bg-white/10", p.color)}
                            >
                              <Flag className="w-3.5 h-3.5 mr-2" />
                              <span>{p.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Popover open={isAssigneeOpen} onOpenChange={setIsAssigneeOpen}>
                        <PopoverTrigger asChild>
                          <button className={cn(
                            "p-1.5 rounded-md transition-colors",
                            assignees.length > 0 ? "text-indigo-400" : "text-white/30 hover:text-white/60"
                          )}>
                            {assignees.length === 0 ? (
                              <UserPlus className="w-4 h-4" />
                            ) : (
                              <div className="flex -space-x-1.5">
                                {assignees.slice(0, 2).map((a, i) => (
                                  <div key={i} className="w-4 h-4 rounded-full ring-1 ring-[#2a2a2a] bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[8px] font-bold overflow-hidden" title={a.name}>
                                    {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full object-cover"/> : getInitials(a.name)}
                                  </div>
                                ))}
                                {assignees.length > 2 && (
                                  <div className="w-4 h-4 rounded-full ring-1 ring-[#2a2a2a] bg-[#3a3a3a] text-white/60 flex items-center justify-center text-[8px] font-bold">
                                    +{assignees.length - 2}
                                  </div>
                                )}
                              </div>
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
                            {!assigneeQuery.trim() && workspaceMembers.length > 0 && (
                              <>
                                <p className="text-[10px] uppercase tracking-wider text-white/25 px-3 pt-2 pb-1 font-medium">Workspace Members</p>
                                {workspaceMembers.map(member => {
                                  const isSelected = assignees.some(a => a.email === member.email);
                                  return (
                                  <button
                                    key={member._id}
                                    onClick={() => selectAssignee(member.email, member.name, member.avatar)}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-2 transition-colors text-left",
                                      isSelected ? "bg-indigo-500/10 hover:bg-indigo-500/20" : "hover:bg-white/5"
                                    )}
                                  >
                                    <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                      {member.avatar ? (
                                        <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                      ) : (
                                        getInitials(member.name)
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn("text-sm truncate", isSelected ? "text-indigo-300" : "text-white/80")}>{member.name}</p>
                                      <p className={cn("text-xs truncate", isSelected ? "text-indigo-400/70" : "text-white/40")}>{member.email}</p>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                                  </button>
                                )})}
                              </>
                            )}
                            {!assigneeQuery.trim() && workspaceMembers.length === 0 && (
                              <p className="text-xs text-white/30 text-center py-3">Type to search or enter email</p>
                            )}
                            {!isSearchingUsers && assigneeQuery.trim() && assigneeResults.map(user => {
                              const isSelected = assignees.some(a => a.email === user.email);
                              return (
                              <button
                                key={user._id}
                                onClick={() => selectAssignee(user.email, user.name, user.avatar)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2 transition-colors text-left",
                                  isSelected ? "bg-indigo-500/10 hover:bg-indigo-500/20" : "hover:bg-white/5"
                                )}
                              >
                                <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                  {user.avatar ? (
                                    <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    getInitials(user.name)
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm truncate", isSelected ? "text-indigo-300" : "text-white/80")}>{user.name}</p>
                                  <p className={cn("text-xs truncate", isSelected ? "text-indigo-400/70" : "text-white/40")}>{user.email}</p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                              </button>
                            )})}
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
                                  <p className="text-xs text-white/40">Will send workspace invite + assign task</p>
                                </div>
                              </button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
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
          {isExpanded && !isAiMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pl-13 pb-3">
                <TiptapTaskEditor
                  content={description}
                  onChange={setDescription}
                  onImageClick={setPreviewImage}
                  placeholder="Add description..."
                  workspaceMembers={workspaceMembers}
                  onSelectAssignee={handleEditorSelectAssignee}
                  onSelectLabel={handleEditorSelectLabel}
                  onMentionDelete={handleEditorMentionDelete}
                  onLabelDelete={handleEditorLabelDelete}
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
                {!isAiMode && (
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
                        assignees.length > 0
                          ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/10"
                          : "border-dashed border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5"
                      )}>
                        {assignees.length === 0 ? (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assignee</span>
                          </>
                        ) : (
                          <div className="flex items-center">
                            <div className="flex -space-x-1.5 mr-1.5">
                              {assignees.map((assignee, idx) => (
                                <div key={assignee.email} className="w-5 h-5 rounded-full ring-2 ring-[#2a2a2a] bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[8px] font-bold overflow-hidden" title={assignee.name}>
                                  {assignee.avatar ? (
                                    <img src={assignee.avatar} alt={assignee.name} className="w-full h-full object-cover" />
                                  ) : (
                                    getInitials(assignee.name)
                                  )}
                                </div>
                              ))}
                            </div>
                            <span>{assignees.length} assigned</span>
                            <span
                              onClick={(e) => { e.stopPropagation(); setAssignees([]); }}
                              className="ml-1 p-0.5 hover:text-white/60 rounded cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </span>
                          </div>
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
                        {/* Workspace members as default suggestions (when no query) */}
                        {!assigneeQuery.trim() && workspaceMembers.length > 0 && (
                          <>
                            <p className="text-[10px] uppercase tracking-wider text-white/25 px-3 pt-2 pb-1 font-medium">Workspace Members</p>
                            {workspaceMembers.map(member => {
                              const isSelected = assignees.some(a => a.email === member.email);
                              return (
                              <button
                                key={member._id}
                                onClick={() => selectAssignee(member.email, member.name, member.avatar)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2 transition-colors text-left",
                                  isSelected ? "bg-indigo-500/10 hover:bg-indigo-500/20" : "hover:bg-white/5"
                                )}
                              >
                                <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                  {member.avatar ? (
                                    <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    getInitials(member.name)
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm truncate", isSelected ? "text-indigo-300" : "text-white/80")}>{member.name}</p>
                                  <p className={cn("text-xs truncate", isSelected ? "text-indigo-400/70" : "text-white/40")}>{member.email}</p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                              </button>
                            )})}
                          </>
                        )}
                        {!assigneeQuery.trim() && workspaceMembers.length === 0 && (
                          <p className="text-xs text-white/30 text-center py-3">Type to search or enter email</p>
                        )}
                        {/* Search results (when query exists) */}
                        {!isSearchingUsers && assigneeQuery.trim() && assigneeResults.map(user => {
                          const isSelected = assignees.some(a => a.email === user.email);
                          return (
                          <button
                            key={user._id}
                            onClick={() => selectAssignee(user.email, user.name, user.avatar)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 transition-colors text-left",
                              isSelected ? "bg-indigo-500/10 hover:bg-indigo-500/20" : "hover:bg-white/5"
                            )}
                          >
                            <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                              {user.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                getInitials(user.name)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm truncate", isSelected ? "text-indigo-300" : "text-white/80")}>{user.name}</p>
                              <p className={cn("text-xs truncate", isSelected ? "text-indigo-400/70" : "text-white/40")}>{user.email}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                          </button>
                        )})}
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
                              <p className="text-xs text-white/40">Will send workspace invite + assign task</p>
                            </div>
                          </button>
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
                          onClick={() => setPriority(p.value as 'low' | 'normal' | 'high' | 'urgent')}
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
                )}

                <div className={cn("flex items-center gap-3 justify-end", isAiMode && "w-full justify-between")}>
                  {isAiMode && (
                    <span className="text-xs text-purple-400/60 font-medium px-2 italic">Describe the task and let AI magically populate the rest ✨</span>
                  )}
                  <Button
                    onClick={handlePrimaryClick}
                    disabled={!title.trim() || isSaving || isAiGenerating}
                    className={cn(
                      "text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 min-w-[80px] transition-all duration-300",
                      (isAiMode || isAiGenerating) ? "bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_-3px_rgba(168,85,247,0.4)]" : "bg-indigo-500 hover:bg-indigo-400"
                    )}
                  >
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating</span>
                      </div>
                    ) : isAiGenerating ? (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>Generating</span>
                      </div>
                    ) : isAiMode ? (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Generate</span>
                      </div>
                    ) : (
                      'Create Task'
                    )}
                  </Button>
                </div>
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