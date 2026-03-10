import React, { useState, useRef, useMemo, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Flag, Tag, CheckCircle2, CheckCircle, Share, MoreHorizontal, 
  Sparkles, History, Box, CircleDot, UserCircle2, Bell, Paperclip, ListPlus, 
  Repeat, ChevronDown, CornerDownRight, Plus, Loader2, Save
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { cn, getInitials } from '@/lib/utils';
import { AssigneeDropdown } from './AssigneeDropdown';
import { PriorityDropdown } from './PriorityDropdown';
import { TaskStatusDropdown, TaskStatus } from '../TaskStatusDropdown';
import { TiptapTaskEditor } from '../../TiptapTaskEditor';
import { LabelsModal, Label } from '../../LabelsModal';
import { InlineLabelDropdown, InlineLabelDropdownHandle } from '../../InlineLabelDropdown';
import { InlineAssigneeDropdown, InlineAssigneeDropdownHandle } from '../../InlineAssigneeDropdown';
import { SmartReminderModal } from '../../SmartReminderModal';
import { SmartDatePicker } from '@/components/ui-base/SmartDatePicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui-base/Popover';
import { getHighlightedContent } from '../../task_Input/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';

interface TaskDetailModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  workspaceMembers: any[];
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdateTask, workspaceMembers }: TaskDetailModalProps) {
  if (!task) return null;
  return <TaskDetailContent key={task._id} task={task} isOpen={isOpen} onClose={onClose} onUpdateTask={onUpdateTask} workspaceMembers={workspaceMembers} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Inner component — uses hooks. All changes are buffered locally.
// Nothing is saved until the user clicks the Save button.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TaskDetailContent({ task, isOpen, onClose, onUpdateTask, workspaceMembers }: TaskDetailModalProps & { task: any }) {

  // ── Buffered local state (initialised from task) ──
  const [title, setTitle] = useState<string>(task.title || '');
  const [description, setDescription] = useState<string>(task.description || '');
  const [status, setStatus] = useState<string>(task.status || 'pending');
  const [priority, setPriority] = useState<string>(task.priority || '');
  const [assignees, setAssignees] = useState<any[]>(task.assignees || []);
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate ? parseISO(task.dueDate) : null);
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(
    (task.labels || []).map((l: any) => ({ id: l.id || `label-${l.name}`, name: l.name, color: l.color || 'blue' }))
  );
  const [currentReminder, setCurrentReminder] = useState<Date | null>(
    task.reminderDate ? parseISO(task.reminderDate) : null
  );
  const [subtasks, setSubtasks] = useState<{ id: string; text: string; isCompleted: boolean }[]>(task.subtasks || []);
  const [isRecurring, setIsRecurring] = useState(!!task.recurrence);
  const [recurringInterval, setRecurringInterval] = useState(task.recurrence?.interval || 1);
  const [recurringUnit, setRecurringUnit] = useState<'day' | 'week' | 'month'>(
    task.recurrence?.pattern === 'daily' ? 'day' : task.recurrence?.pattern === 'monthly' ? 'month' : 'week'
  );

  // ── UI State ──
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInlineLabelOpen, setIsInlineLabelOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isInlineAssigneeOpen, setIsInlineAssigneeOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inlineLabelRef = useRef<InlineLabelDropdownHandle>(null);
  const inlineAssigneeRef = useRef<InlineAssigneeDropdownHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mark dirty on any change
  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Computed ──
  const isComplete = status === 'complete';
  const createdDate = task.createdAt ? format(parseISO(task.createdAt), 'MMM d, yyyy') : 'Unknown';
  const dateLabel = dueDate
    ? isToday(dueDate) ? 'Today'
      : isTomorrow(dueDate) ? 'Tomorrow'
      : format(dueDate, 'MMM d, yyyy')
    : null;

  // ━━━━━━━━━━━━━━━━━━━━━━
  // SAVE — single entry point
  // ━━━━━━━━━━━━━━━━━━━━━━
  const handleSave = useCallback(() => {
    setIsSaving(true);
    
    // Extract subtasks from HTML and remove them from description
    let finalDescription = description;
    let extractedSubtasks: { id: string; text: string; isCompleted: boolean }[] = [...subtasks];

    try {
      if (finalDescription) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(finalDescription, 'text/html');
        const widgetNodes = doc.querySelectorAll('div[data-type="subtask-widget"]');
        
        let foundNewSubtasks = false;
        widgetNodes.forEach(node => {
          const rawData = node.getAttribute('data-subtasks');
          if (rawData) {
            try {
              const parsed = JSON.parse(rawData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // If it's the first one we process, we can just replace the old top-level state
                if (!foundNewSubtasks) {
                  extractedSubtasks = [...parsed];
                  foundNewSubtasks = true;
                } else {
                  extractedSubtasks = [...extractedSubtasks, ...parsed];
                }
              }
            } catch (e) {
              console.error("Failed to parse subtasks from HTML widget", e);
            }
          }
          // Remove the widget from the HTML payload so it isn't saved as raw string
          node.remove();
        });

        if (foundNewSubtasks || widgetNodes.length > 0) {
          finalDescription = doc.body.innerHTML;
          // Clean up empty lines that might be left behind
          finalDescription = finalDescription.replace(/<p><\/p>/g, '').trim();
        }
      }
    } catch (e) {
      console.error("Failed to extract subtasks in save", e);
    }

    const updates: any = {
      title: title.replace(/#\w+\s?/g, '').trim(),
      description: finalDescription,
      status,
      priority: priority || undefined,
      assignees,
      dueDate: dueDate?.toISOString() || null,
      reminderDate: currentReminder?.toISOString() || null,
      labels: selectedLabels.map(l => ({ id: l.id, name: l.name, color: l.color })),
      subtasks: extractedSubtasks,
      recurrence: isRecurring
        ? { pattern: recurringUnit === 'day' ? 'daily' : recurringUnit === 'week' ? 'weekly' : 'monthly', interval: recurringInterval }
        : null,
    };
    onUpdateTask(task._id, updates);
    setIsDirty(false);
    setIsSaving(false);
  }, [title, description, status, priority, assignees, dueDate, currentReminder, selectedLabels, subtasks, isRecurring, recurringUnit, recurringInterval, task._id, onUpdateTask]);

  // ── Title handlers ──
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    markDirty();
    const labelMatch = e.target.value.match(/#(\w*)$/);
    if (labelMatch) { setTagSearchQuery(labelMatch[1]); setIsInlineLabelOpen(true); }
    else { setTagSearchQuery(''); setIsInlineLabelOpen(false); }
    
    const assigneeMatch = e.target.value.match(/@(\w*)$/);
    if (assigneeMatch) { setAssigneeSearchQuery(assigneeMatch[1]); setIsInlineAssigneeOpen(true); }
    else { setAssigneeSearchQuery(''); setIsInlineAssigneeOpen(false); }
  };
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (isInlineLabelOpen && inlineLabelRef.current?.handleKeyDown(e)) return;
    if (isInlineAssigneeOpen && inlineAssigneeRef.current?.handleKeyDown(e)) return;
    
    // Handle atomic backspace deletion for tags and assignees
    if (e.key === 'Backspace' && inputRef.current) {
      const cursorPos = inputRef.current.selectionStart || 0;
      const textBeforeCursor = title.slice(0, cursorPos);
      
      // Check labels
      const labelMatch = textBeforeCursor.match(/#(\w+)\s?$/);
      if (labelMatch && selectedLabels.some(l => l.name.toLowerCase() === labelMatch[1].toLowerCase())) {
        e.preventDefault();
        const fullMatch = labelMatch[0];
        setTitle(title.slice(0, cursorPos - fullMatch.length) + title.slice(cursorPos));
        setSelectedLabels(prev => prev.filter(l => l.name.toLowerCase() !== labelMatch[1].toLowerCase()));
        markDirty();
        setTimeout(() => { if (inputRef.current) inputRef.current.setSelectionRange(cursorPos - fullMatch.length, cursorPos - fullMatch.length); }, 0);
        return;
      }
      
      // Check assignees
      const assigneeMatch = textBeforeCursor.match(/@(\w+)\s?$/);
      if (assigneeMatch && assignees.some(a => a.name.toLowerCase().startsWith(assigneeMatch[1].toLowerCase()))) {
        e.preventDefault();
        const fullMatch = assigneeMatch[0];
        setTitle(title.slice(0, cursorPos - fullMatch.length) + title.slice(cursorPos));
        setAssignees(prev => prev.filter(a => !a.name.toLowerCase().startsWith(assigneeMatch[1].toLowerCase())));
        markDirty();
        setTimeout(() => { if (inputRef.current) inputRef.current.setSelectionRange(cursorPos - fullMatch.length, cursorPos - fullMatch.length); }, 0);
        return;
      }
    }

    if (e.key === 'Escape') inputRef.current?.blur();
  };
  const handleInlineSelectAssignee = (assignee: any) => {
    setTitle((prev: string) => prev.replace(/@\w*$/, `@${assignee.name} `));
    if (!assignees.some((a: any) => a._id === assignee._id)) {
      setAssignees((prev: any[]) => [...prev, assignee]);
    }
    setIsInlineAssigneeOpen(false); setAssigneeSearchQuery(''); markDirty();
  };
  const handleInlineSelectLabel = (label: Label) => {
    setTitle((prev: string) => prev.replace(/#\w*$/, `#${label.name} `));
    setSelectedLabels((prev: Label[]) => [...prev, label]);
    setIsInlineLabelOpen(false); setTagSearchQuery(''); markDirty();
  };
  const handleInlineCreateLabel = (label: Label) => {
    setTitle((prev: string) => prev.replace(/#\w*$/, `#${label.name} `));
    setSelectedLabels((prev: Label[]) => [...prev, label]);
    setIsInlineLabelOpen(false); setTagSearchQuery(''); markDirty();
  };

  // ── Subtask helpers ──
  const addSubtask = () => { setSubtasks(prev => [...prev, { id: `st-${Date.now()}`, text: '', isCompleted: false }]); markDirty(); };
  const removeSubtask = (id: string) => { setSubtasks(prev => prev.filter(s => s.id !== id)); markDirty(); };
  const toggleSubtask = (id: string) => { setSubtasks(prev => prev.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s)); markDirty(); };

  // ── Editor-only selection handlers (don't touch title) ──
  const handleEditorSelectAssignee = (user: any) => {
    setAssignees((prev: any[]) => {
      if (prev.some((a: any) => a.email === user.email || a._id === user._id)) return prev;
      return [...prev, { name: user.name, email: user.email, avatar: user.avatar, _id: user._id }];
    });
    markDirty();
  };
  const handleEditorSelectLabel = (label: any) => {
    setSelectedLabels((prev: any[]) => {
      if (prev.some((l: any) => l.name === label.name)) return prev;
      return [...prev, { id: label.id || `tag-${label.name}`, name: label.name, color: label.color || 'blue' }];
    });
    markDirty();
  };

  const handleEditorMentionDelete = (name: string) => {
    setAssignees((prev: any[]) => prev.filter((a: any) => a.name.toLowerCase() !== name.toLowerCase()));
    markDirty();
  };
  const handleEditorLabelDelete = (name: string) => {
    setSelectedLabels((prev: any[]) => prev.filter((l: any) => l.name.toLowerCase() !== name.toLowerCase()));
    markDirty();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-[1200px] h-[90vh] max-h-[900px] bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden outline-none font-sans">
          <Dialog.Title className="sr-only">Task Details</Dialog.Title>

          {/* ═══ Top Bar ═══ */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] shrink-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-white/50">
              <Box className="w-4 h-4" /> Task
            </div>

            <div className="flex items-center gap-3 text-[12px] text-white/50">
              <span>Created {createdDate}</span>
              <button className="flex items-center gap-1.5 hover:text-white transition-colors"><Sparkles className="w-3.5 h-3.5" /> Ask</button>
              <button className="flex items-center gap-1.5 hover:text-white transition-colors"><Share className="w-3.5 h-3.5" /> Share</button>

              {/* ──── SAVE BUTTON ──── */}
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
                  isDirty
                    ? "bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20"
                    : "bg-white/5 text-white/25 cursor-not-allowed"
                )}
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? 'Saving...' : 'Save'}
              </button>

              <button className="hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
              <button onClick={onClose} className="p-1 -mr-1 hover:text-white hover:bg-white/10 rounded transition-colors"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* ═══ Body ═══ */}
          <div className="flex flex-1 overflow-hidden">
            {/* ── Main Content (Left) ── */}
            <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 custom-scrollbar">

              {/* Title */}
              <div className="relative mb-6">
                {getHighlightedContent(title, null, null, selectedLabels, "absolute inset-0 text-[28px] font-bold pointer-events-none overflow-hidden whitespace-pre bg-transparent text-transparent")}
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  onKeyDown={handleTitleKeyDown}
                  className={cn(
                    "w-full bg-transparent text-[28px] font-bold border-none outline-none focus:ring-0 p-0 transition-colors",
                    isComplete ? "text-white/40 line-through" : "text-white/90 placeholder-white/20"
                  )}
                  placeholder="Task title"
                />
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

              {/* Properties Grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 max-w-[800px]">

                {/* Status */}
                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]"><CircleDot className="w-3.5 h-3.5" /> Status</div>
                  <div className="flex-1 flex items-center">
                    <TaskStatusDropdown
                      currentStatus={status as TaskStatus}
                      onStatusChange={(s) => { setStatus(s); markDirty(); }}
                    >
                      <button className={cn(
                        "flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-bold tracking-wide uppercase transition-colors outline-none",
                        isComplete ? "bg-emerald-500 text-black hover:bg-emerald-400"
                          : status === 'in_progress' ? "bg-blue-500 text-white hover:bg-blue-400"
                          : status === 'review' ? "bg-amber-500 text-black hover:bg-amber-400"
                          : status === 'blocked' ? "bg-rose-500 text-white hover:bg-rose-400"
                          : "bg-white/10 text-white hover:bg-white/20"
                      )}>
                        {isComplete ? 'Complete' : status === 'in_progress' ? 'In Progress' : status === 'review' ? 'Review' : status === 'blocked' ? 'Blocked' : 'To Do'}
                        <span className="opacity-50 ml-1 flex items-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg></span>
                      </button>
                    </TaskStatusDropdown>
                    {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2" />}
                  </div>
                </div>

                {/* Assignees */}
                <div className="flex justify-between items-center z-[51]">
                  <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]"><UserCircle2 className="w-3.5 h-3.5" /> Assignees</div>
                  <div className="flex-1 flex items-center">
                    <AssigneeDropdown
                      currentAssignees={assignees}
                      workspaceMembers={workspaceMembers}
                      onAssign={(email, name, avatar, _id) => {
                        setAssignees(prev => [...prev, { _id, email, name, avatar }]);
                        markDirty();
                      }}
                      onUnassign={(email) => {
                        setAssignees(prev => prev.filter((a: any) => a.email !== email));
                        markDirty();
                      }}
                    >
                      <button className="flex flex-wrap items-center gap-1.5 min-h-[28px] hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none">
                        {assignees.length > 0 ? (
                          assignees.map((a: any) => (
                            <div key={a.email} className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 pr-2 rounded-full border border-indigo-500/20" title={a.name}>
                              <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold">
                                {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full rounded-full" /> : getInitials(a.name) || '?'}
                              </div>
                              <span className="text-[12px] font-medium">{a.name}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[13px] text-white/30 hover:text-white/50">Empty</span>
                        )}
                      </button>
                    </AssigneeDropdown>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex justify-between items-center group z-50">
                  <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]"><Calendar className="w-3.5 h-3.5" /> Due Date</div>
                  <div className="flex-1 flex items-center text-[13px]">
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none min-h-[28px]">
                          {dueDate ? <span className="text-white/80 group-hover:text-white">{dateLabel}</span> : <span className="text-white/30 hover:text-white/50">Empty</span>}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto border-none bg-transparent shadow-none" align="start" side="bottom" sideOffset={8}>
                        <SmartDatePicker
                          selectedDate={dueDate}
                          onSelect={(d) => { setDueDate(d); markDirty(); setIsCalendarOpen(false); }}
                          onClose={() => setIsCalendarOpen(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex justify-between items-center group z-40">
                  <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]"><Flag className="w-3.5 h-3.5" /> Priority</div>
                  <div className="flex-1 flex items-center text-[13px]">
                    <PriorityDropdown
                      currentPriority={priority}
                      onPriorityChange={(p) => { setPriority(p); markDirty(); }}
                    >
                      <button className="flex items-center gap-1.5 hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none min-h-[28px]">
                        {priority ? (
                          <>
                            <Flag className={cn("w-3.5 h-3.5",
                              priority === 'high' || priority === 'urgent' ? "text-rose-400 fill-rose-500/20" :
                              priority === 'medium' || priority === 'normal' ? "text-amber-400 fill-amber-500/20" :
                              "text-blue-400 fill-blue-500/20"
                            )} />
                            <span className="text-white/80 capitalize group-hover:text-white">
                              {priority === 'medium' ? 'Normal' : priority}
                            </span>
                          </>
                        ) : (
                          <span className="text-white/30 hover:text-white/50">Empty</span>
                        )}
                      </button>
                    </PriorityDropdown>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex justify-between items-center z-30">
                  <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]"><Tag className="w-3.5 h-3.5" /> Tags</div>
                  <div className="flex-1 flex items-center text-[13px]">
                    <Popover open={isLabelsOpen} onOpenChange={setIsLabelsOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex flex-wrap items-center gap-1.5 min-h-[28px] hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none">
                          {selectedLabels.length > 0 ? (
                            selectedLabels.map(l => (
                              <span key={l.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-500/30 bg-blue-500/10 text-blue-400">{l.name}</span>
                            ))
                          ) : (
                            <span className="text-white/30 hover:text-white/50">Empty</span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto border-none bg-transparent shadow-none" align="start" side="bottom" sideOffset={8}>
                        <LabelsModal
                          selectedLabels={selectedLabels}
                          onLabelsChange={(labels) => { setSelectedLabels(labels); markDirty(); }}
                          onClose={() => setIsLabelsOpen(false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Reminder */}
                <div className="flex justify-between items-center z-20">
                  <div className="flex items-center gap-2 text-[13px] text-white/40 w-[120px]"><Bell className="w-3.5 h-3.5" /> Reminder</div>
                  <div className="flex-1 flex items-center text-[13px]">
                    <Popover open={isReminderOpen} onOpenChange={setIsReminderOpen}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 hover:bg-white/5 rounded px-1 -ml-1 transition-colors text-left outline-none min-h-[28px]">
                          {currentReminder ? (
                            <span className="text-white/80">
                              {isToday(currentReminder) ? `Today at ${format(currentReminder, 'h:mm a')}` :
                               isTomorrow(currentReminder) ? `Tomorrow at ${format(currentReminder, 'h:mm a')}` :
                               format(currentReminder, 'MMM d, yyyy h:mm a')}
                            </span>
                          ) : (
                            <span className="text-white/30 hover:text-white/50">Empty</span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto border-none bg-transparent shadow-none" align="start" side="bottom" sideOffset={8}>
                        <SmartReminderModal
                          dueDate={dueDate}
                          onSetReminder={(d) => { setCurrentReminder(d); markDirty(); }}
                          onClose={() => setIsReminderOpen(false)}
                          currentReminder={currentReminder}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Options Bar */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors">
                  <Paperclip className="w-3.5 h-3.5" /> Attachment
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                  const files = e.target.files;
                  if (!files) return;
                  Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) {
                        const src = ev.target.result as string;
                        setDescription(prev => prev + `<div style="margin:8px 0;"><img src="${src}" style="max-width:280px;max-height:196px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);display:block;"></div>`);
                        markDirty();
                      }
                    };
                    reader.readAsDataURL(file);
                  });
                }} />

                <button onClick={addSubtask} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors">
                  <ListPlus className="w-3.5 h-3.5" /> Sub Task
                </button>

                <button onClick={() => { setIsRecurring(!isRecurring); markDirty(); }} className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors",
                  isRecurring ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/10" : "border-dashed border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5"
                )}>
                  <Repeat className="w-3.5 h-3.5" /> {isRecurring ? 'Recurring' : 'Recurrence'}
                </button>

                {isRecurring && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/10 text-xs">
                    <span className="text-white/50">every</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-0.5 text-xs text-white/80 bg-white/5 hover:bg-white/10 rounded transition-colors">
                          {recurringInterval} <ChevronDown className="w-3 h-3 text-white/40" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-[#1e1e1e] border-white/10 min-w-[48px]">
                        {[1,2,3,4,5,6,7].map(n => (
                          <DropdownMenuItem key={n} onClick={() => { setRecurringInterval(n); markDirty(); }} className={cn("focus:bg-white/10 text-xs", recurringInterval === n && "text-indigo-400")}>{n}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-0.5 text-xs text-white/80 bg-white/5 hover:bg-white/10 rounded transition-colors">
                          {recurringUnit} <ChevronDown className="w-3 h-3 text-white/40" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-[#1e1e1e] border-white/10 min-w-[64px]">
                        {(['day','week','month'] as const).map(u => (
                          <DropdownMenuItem key={u} onClick={() => { setRecurringUnit(u); markDirty(); }} className={cn("focus:bg-white/10 text-xs", recurringUnit === u && "text-indigo-400")}>{u}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button onClick={() => { setIsRecurring(false); markDirty(); }} className="p-0.5 text-white/40 hover:text-white/60 rounded transition-colors ml-1"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>

              {/* Subtasks */}
              {subtasks.length > 0 && (
                <div className="my-4">
                  <div className="border border-white/10 rounded-lg bg-[#1e1e1e]/50 overflow-hidden">
                    <div className="px-4 py-2 text-xs font-medium text-white/40 border-b border-white/5 bg-[#1e1e1e]">
                      Sub-issues ({subtasks.filter(s => s.isCompleted).length}/{subtasks.length})
                    </div>
                    <div className="p-0.5 space-y-0.5">
                      {subtasks.map((st, idx) => (
                        <div key={st.id} className="flex items-center gap-3 px-3 py-2 group">
                          <CornerDownRight className="w-3.5 h-3.5 text-white/30" />
                          <button onClick={() => toggleSubtask(st.id)} className={cn(
                            "w-4 h-4 rounded-sm flex items-center justify-center shrink-0 border transition-colors cursor-pointer",
                            st.isCompleted ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-white/40"
                          )}>
                            {st.isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                          </button>
                          <input
                            type="text" value={st.text}
                            onChange={(e) => { const u = [...subtasks]; u[idx] = { ...u[idx], text: e.target.value }; setSubtasks(u); markDirty(); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } if (e.key === 'Backspace' && st.text === '') { e.preventDefault(); removeSubtask(st.id); } }}
                            placeholder="Issue title"
                            className={cn("flex-1 bg-transparent text-sm placeholder:text-white/30 focus:outline-none", st.isCompleted ? "text-white/40 line-through" : "text-white/80")}
                            autoFocus={st.text === ''}
                          />
                          <button onClick={() => removeSubtask(st.id)} className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-white/40 transition-all"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <button onClick={addSubtask} className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs font-medium text-indigo-400 hover:bg-white/5 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add sub-issue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Description (scrollable, spacious) ── */}
              <div className="flex-1 min-h-[350px] flex flex-col pt-2 pb-4">
                <div className="flex-1 overflow-y-auto custom-scrollbar rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <TiptapTaskEditor
                    content={description}
                    onChange={(val: string) => { setDescription(val); markDirty(); }}
                    onImageClick={setPreviewImage}
                    placeholder="Add description... Write or type / for command and AI action"
                    workspaceMembers={workspaceMembers}
                    onSelectAssignee={handleEditorSelectAssignee}
                    onSelectLabel={handleEditorSelectLabel}
                    onMentionDelete={handleEditorMentionDelete}
                    onLabelDelete={handleEditorLabelDelete}
                  />
                </div>
              </div>
            </div>

            {/* ═══ Activity Sidebar ═══ */}
            <div className="w-[340px] border-l border-[hsl(var(--border))] bg-transparent flex flex-col shrink-0">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white/90">Activity</span>
                <button className="text-white/40 hover:text-white transition-colors" title="History"><History className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex justify-center items-center text-[10px] font-bold shrink-0 mt-0.5">
                    {task.assignees?.[0] ? getInitials(task.assignees[0].name) : 'R'}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] text-white/60 leading-snug">
                      <span className="font-semibold text-white/80 capitalize mr-1">{task.assignees?.[0]?.name || 'Ramin'}</span>
                      created this task
                    </p>
                    <p className="text-[11px] text-white/30 mt-1">{createdDate}</p>
                  </div>
                </div>
                {task.dueDate && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex justify-center items-center text-[10px] font-bold shrink-0 mt-0.5">
                      {task.assignees?.[0] ? getInitials(task.assignees[0].name) : 'R'}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-white/60 leading-snug">
                        <span className="font-semibold text-white/80 capitalize mr-1">{task.assignees?.[0]?.name || 'Ramin'}</span>
                        set the due date to <span className="text-white/80">{dateLabel}</span>
                      </p>
                      <p className="text-[11px] text-white/30 mt-1">Recently</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative max-w-[80vw] max-h-[80vh]" onClick={e => e.stopPropagation()}>
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
              <button onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-5 h-5 text-white" /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
