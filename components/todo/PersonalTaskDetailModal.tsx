'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Flag, Tag, CircleDot, Bell, Paperclip, Repeat, ChevronDown, Plus, Loader2,
  FileText, LayoutTemplate, Link2, Check,
} from 'lucide-react';
import { RcButton, RcCheck, RcIconButton, rcScope } from '@/components/rc-ui';
import { TaskStatusMark, PriorityBars } from './TaskMarks';
import { PRIORITY_WORDS, STATUS_WORDS } from './taskWords';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { PriorityDropdown } from './workspace/modals/PriorityDropdown';
import { TaskStatusDropdown, TaskStatus } from './workspace/TaskStatusDropdown';
import { TiptapTaskEditor } from './TiptapTaskEditor';
import { LabelsModal, Label } from './LabelsModal';
import { InlineLabelDropdown, InlineLabelDropdownHandle } from './InlineLabelDropdown';
import { SmartReminderModal } from './SmartReminderModal';
import { SmartDatePicker } from '@/components/ui-base/SmartDatePicker';
import { todoApi } from '@/lib/api/todoApi';
import { labelsFromTask, tagNamesChanged, tagNamesForPayload } from '@/lib/utils/todoTags';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui-base/Popover';
import { getHighlightedContent } from './task_Input/utils';
import { REFERENCE_PICKER_COPY } from './task_Input/types';
import TextareaAutosize from 'react-textarea-autosize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';

export interface PersonalTaskReference {
  type: 'doc' | 'slide';
  refId: string;
  title: string;
}

interface PersonalTaskDetailModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
}

/** One property row: a quiet label, then its value as a button that opens its picker. */
function Prop({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[34px] grid-cols-[120px_minmax(0,1fr)] items-center gap-x-2">
      <div className="flex items-center gap-2 text-[13px] text-[var(--rc-ink-3)] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:shrink-0">
        {icon}
        {label}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

export function PersonalTaskDetailModal({ task, isOpen, onClose, onUpdateTask }: PersonalTaskDetailModalProps) {
  if (!task) return null;
  return <PersonalTaskDetailContent key={task._id} task={task} isOpen={isOpen} onClose={onClose} onUpdateTask={onUpdateTask} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Inner component — all state is local, nothing touches workspace
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PersonalTaskDetailContent({ task, isOpen, onClose, onUpdateTask }: PersonalTaskDetailModalProps & { task: any }) {

  // ── Buffered local state ──
  const [title, setTitle] = useState<string>(task.title || '');
  const [description, setDescription] = useState<string>(task.description || '');
  const [status, setStatus] = useState<string>(task.status || 'pending');
  const [priority, setPriority] = useState<string>(task.priority || '');
  const [references, setReferences] = useState<PersonalTaskReference[]>(
    (task.references || []).map((r: any) => ({ type: r.type, refId: r.refId, title: r.title }))
  );
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate ? parseISO(task.dueDate) : null);
  // The API returns `tags: [{ _id, name }]` (there is no `labels` field).
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(() => labelsFromTask(task));
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ── Reference picker state ──
  const [isReferencePickerOpen, setIsReferencePickerOpen] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceResults, setReferenceResults] = useState<PersonalTaskReference[]>([]);
  const [isSearchingRefs, setIsSearchingRefs] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const inlineLabelRef = useRef<InlineLabelDropdownHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Reference search debounce ──
  useEffect(() => {
    if (!isReferencePickerOpen) { setReferenceQuery(''); setReferenceResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearchingRefs(true);
      try {
        const data = await todoApi.searchReferences(referenceQuery.trim());
        setReferenceResults(data);
      } catch { setReferenceResults([]); }
      setIsSearchingRefs(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [referenceQuery, isReferencePickerOpen]);

  // ── Computed ──
  const isComplete = status === 'complete';
  const createdDate = task.createdAt ? format(parseISO(task.createdAt), 'MMM d, yyyy') : 'Unknown';
  const dateLabel = dueDate
    ? isToday(dueDate) ? 'Today'
      : isTomorrow(dueDate) ? 'Tomorrow'
      : format(dueDate, 'MMM d, yyyy')
    : null;

  // ─── SAVE ───
  // Uses todoApi.updateTodo() which handles base64 image extraction → FormData → cloud upload
  const handleSave = useCallback(async () => {
    setIsSaving(true);

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
                if (!foundNewSubtasks) { extractedSubtasks = [...parsed]; foundNewSubtasks = true; }
                else { extractedSubtasks = [...extractedSubtasks, ...parsed]; }
              }
            } catch {}
          }
          node.remove();
        });

        if (foundNewSubtasks || widgetNodes.length > 0) {
          finalDescription = doc.body.innerHTML;
          finalDescription = finalDescription.replace(/<p><\/p>/g, '').trim();
        }
      }
    } catch {}

    const updates: any = {
      title: title.replace(/#\w+\s?/g, '').trim(),
      description: finalDescription,
      status,
      priority: priority || undefined,
      dueDate: dueDate?.toISOString() || null,
      subtasks: extractedSubtasks,
      references: references.map(r => ({ type: r.type, refId: r.refId, title: r.title })),
      recurrence: isRecurring
        ? { pattern: recurringUnit === 'day' ? 'daily' : recurringUnit === 'week' ? 'weekly' : 'monthly', interval: recurringInterval }
        : null,
    };

    // Tags go as names, only when they changed. Note: the backend ignores an empty list for now,
    // so removing every tag is not saved (the server's tags come back below).
    const tagNames = tagNamesForPayload(selectedLabels);
    if (tagNamesChanged(tagNames, tagNamesForPayload(labelsFromTask(task)))) {
      updates.tags = tagNames;
    }

    const originalReminderMs = task.reminderDate ? new Date(task.reminderDate).getTime() : null;
    const newReminderMs = currentReminder ? currentReminder.getTime() : null;
    if (originalReminderMs !== newReminderMs) {
      updates.reminderDate = currentReminder?.toISOString() || null;
    }

    try {
      // Use todoApi.updateTodo which handles base64→cloud image upload via FormData
      const result = await todoApi.updateTodo(task._id, updates);

      if (result.success && result.data) {
        // Update local description state with cloud-resolved URLs from API response
        // so subsequent saves don't re-upload the same images
        if (result.data.description !== undefined) {
          setDescription(result.data.description || '');
        }
        // Same for tags: take the server's list (real ids for new tags; shows what was really saved).
        if (Array.isArray(result.data.tags)) {
          setSelectedLabels(labelsFromTask(result.data));
        }
        // Sync parent state (for the task list UI)
        onUpdateTask(task._id, result.data);
      } else {
        // Fallback: at least sync the local updates to parent
        onUpdateTask(task._id, updates);
      }
    } catch {
      // On error, still sync local state to parent so UI stays consistent
      onUpdateTask(task._id, updates);
    }

    setIsDirty(false);
    setIsSaving(false);
  }, [title, description, status, priority, dueDate, currentReminder, selectedLabels, subtasks, references, isRecurring, recurringUnit, recurringInterval, task._id, onUpdateTask, task]);

  // Closing keeps what was changed (the owner, 11-21: the task window redone): no lost edits.
  const closeAndSave = useCallback(async () => {
    if (isDirty && !isSaving) await handleSave();
    onClose();
  }, [isDirty, isSaving, handleSave, onClose]);

  // ── Title handlers ──
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    markDirty();
    const labelMatch = e.target.value.match(/#(\w*)$/);
    if (labelMatch) { setTagSearchQuery(labelMatch[1]); setIsInlineLabelOpen(true); }
    else { setTagSearchQuery(''); setIsInlineLabelOpen(false); }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (isInlineLabelOpen && inlineLabelRef.current?.handleKeyDown(e)) return;
    if (e.key === 'Escape') inputRef.current?.blur();
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

  // ── Reference helpers ──
  const toggleReference = (ref: PersonalTaskReference) => {
    setReferences(prev => {
      const exists = prev.some(r => r.refId === ref.refId && r.type === ref.type);
      if (exists) return prev.filter(r => !(r.refId === ref.refId && r.type === ref.type));
      return [...prev, ref];
    });
    markDirty();
  };

  // ── Editor callbacks (label only, no user mentions for personal) ──
  const handleEditorSelectLabel = (label: any) => {
    setSelectedLabels((prev: any[]) => {
      if (prev.some((l: any) => l.name === label.name)) return prev;
      return [...prev, { id: label.id || `tag-${label.name}`, name: label.name, color: label.color || 'blue' }];
    });
    markDirty();
  };
  const handleEditorLabelDelete = (name: string) => {
    setSelectedLabels((prev: any[]) => prev.filter((l: any) => l.name.toLowerCase() !== name.toLowerCase()));
    markDirty();
  };

  const priorityKey = priority === 'medium' ? 'normal' : priority;
  const reminderLabel = currentReminder
    ? isToday(currentReminder)
      ? `Today at ${format(currentReminder, 'h:mm a')}`
      : isTomorrow(currentReminder)
        ? `Tomorrow at ${format(currentReminder, 'h:mm a')}`
        : format(currentReminder, 'EEE d MMM, h:mm a')
    : null;
  const doneSubtasks = subtasks.filter((st) => st.isCompleted).length;

  const valueBtn = 'rc-hoverable -ml-2 inline-flex min-h-[30px] max-w-full items-center gap-1.5 rounded-[6px] px-2 text-left text-[14px] text-[var(--rc-ink-1)] outline-none';
  const empty = (words: string) => <span className="text-[var(--rc-ink-3)]">{words}</span>;

  return (
    <>
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && previewImage) return;
        if (!open) void closeAndSave();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cn(rcScope, 'rc-overlay')} />
        <Dialog.Content
          className={cn(rcScope, 'rc-float rc-sheet rc-task-sheet outline-none')}
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            if (previewImage) { e.preventDefault(); setPreviewImage(null); }
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (isDirty) void handleSave(); }
          }}
        >
          <Dialog.Title className="sr-only">Task: {title || 'Untitled'}</Dialog.Title>

          {/* Head: where it stands and when it was made; the status is the one control up here. */}
          <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
            <TaskStatusDropdown currentStatus={status as TaskStatus} onStatusChange={(st) => { setStatus(st); markDirty(); }}>
              <button type="button" className="rc-hoverable -ml-2 inline-flex h-[30px] items-center gap-2 rounded-[6px] px-2 text-[13px] font-[500] text-[var(--rc-ink-1)] outline-none">
                <TaskStatusMark status={status} />
                {STATUS_WORDS[status] ?? 'To do'}
                <ChevronDown className="h-3.5 w-3.5 text-[var(--rc-icon)]" aria-hidden />
              </button>
            </TaskStatusDropdown>
            <div className="flex items-center gap-2">
              <span className="rc-meta">Created {createdDate}</span>
              <RcIconButton label="Close" className="-mr-2" onClick={() => void closeAndSave()}>
                <X />
              </RcIconButton>
            </div>
          </div>

          <div className="rc-sheet-body !px-5 custom-scrollbar">
            {/* Title */}
            <div className="relative mt-2">
              {getHighlightedContent(title, null, null, selectedLabels, 'absolute inset-0 text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] pointer-events-none overflow-hidden whitespace-pre-wrap break-words bg-transparent text-transparent')}
              <TextareaAutosize
                ref={inputRef as any}
                value={title}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                aria-label="Task title"
                className={cn(
                  'w-full resize-none overflow-hidden border-none bg-transparent p-0 text-[22px] font-semibold leading-[1.3] tracking-[-0.01em] outline-none focus:ring-0',
                  isComplete ? 'text-[var(--rc-ink-3)] line-through' : 'text-[var(--rc-ink-1)] placeholder:text-[var(--rc-ink-3)]',
                )}
                placeholder="Task title"
                minRows={1}
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

            {/* Properties: one column, the label quiet, the value the thing to click. */}
            <div className="mt-4 flex flex-col">
              <Prop icon={<Calendar />} label="Due">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className={valueBtn}>{dueDate ? dateLabel : empty('Add a date')}</button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" side="bottom" sideOffset={6}>
                    <SmartDatePicker selectedDate={dueDate} onSelect={(d) => { setDueDate(d); markDirty(); setIsCalendarOpen(false); }} onClose={() => setIsCalendarOpen(false)} />
                  </PopoverContent>
                </Popover>
                {dueDate && (
                  <RcIconButton size="sm" label="Clear the date" className="rc-prop-clear" onClick={() => { setDueDate(null); markDirty(); }}>
                    <X />
                  </RcIconButton>
                )}
              </Prop>

              <Prop icon={<Bell />} label="Reminder">
                <Popover open={isReminderOpen} onOpenChange={setIsReminderOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className={valueBtn}>{reminderLabel ?? empty('Remind me')}</button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" side="bottom" sideOffset={6}>
                    <SmartReminderModal dueDate={dueDate} onSetReminder={(d) => { setCurrentReminder(d); markDirty(); }} onClose={() => setIsReminderOpen(false)} currentReminder={currentReminder} />
                  </PopoverContent>
                </Popover>
                {currentReminder && (
                  <RcIconButton size="sm" label="Clear the reminder" className="rc-prop-clear" onClick={() => { setCurrentReminder(null); markDirty(); }}>
                    <X />
                  </RcIconButton>
                )}
              </Prop>

              <Prop icon={<Repeat />} label="Repeat">
                {isRecurring ? (
                  <span className="inline-flex flex-wrap items-center gap-1 text-[14px] text-[var(--rc-ink-1)]">
                    Every
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(valueBtn, '!ml-0 !px-1.5 rc-num')}>
                          {recurringInterval} <ChevronDown className="h-3 w-3 text-[var(--rc-icon)]" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className={cn(rcScope, 'rc-float min-w-[56px] !border-0 z-[10002]')}>
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <DropdownMenuItem key={n} onClick={() => { setRecurringInterval(n); markDirty(); }} className="text-[13px]">
                            {n} {recurringInterval === n && <Check className="ml-auto h-3.5 w-3.5" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(valueBtn, '!ml-0 !px-1.5')}>
                          {recurringUnit}{recurringInterval > 1 ? 's' : ''} <ChevronDown className="h-3 w-3 text-[var(--rc-icon)]" aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className={cn(rcScope, 'rc-float min-w-[88px] !border-0 z-[10002]')}>
                        {(['day', 'week', 'month'] as const).map((u) => (
                          <DropdownMenuItem key={u} onClick={() => { setRecurringUnit(u); markDirty(); }} className="text-[13px]">
                            {u} {recurringUnit === u && <Check className="ml-auto h-3.5 w-3.5" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <RcIconButton size="sm" label="Stop repeating" className="rc-prop-clear" onClick={() => { setIsRecurring(false); markDirty(); }}>
                      <X />
                    </RcIconButton>
                  </span>
                ) : (
                  <button type="button" className={valueBtn} onClick={() => { setIsRecurring(true); markDirty(); }}>
                    {empty('Doesn’t repeat')}
                  </button>
                )}
              </Prop>

              <Prop icon={<Flag />} label="Priority">
                <PriorityDropdown currentPriority={priority} onPriorityChange={(pr) => { setPriority(pr); markDirty(); }}>
                  <button type="button" className={valueBtn}>
                    {priorityKey ? (
                      <>
                        <PriorityBars priority={priorityKey} />
                        {PRIORITY_WORDS[priorityKey] ?? priorityKey}
                      </>
                    ) : (
                      empty('None')
                    )}
                  </button>
                </PriorityDropdown>
              </Prop>

              <Prop icon={<Tag />} label="Tags">
                <Popover open={isLabelsOpen} onOpenChange={setIsLabelsOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className={cn(valueBtn, 'flex-wrap py-1')}>
                      {selectedLabels.length > 0
                        ? selectedLabels.map((l) => (
                            <span key={l.id} className="rounded-[4px] bg-[var(--rc-surface-2)] px-1.5 py-0.5 text-[12.5px] font-[500] text-[var(--rc-ink-2)]">
                              {l.name}
                            </span>
                          ))
                        : empty('Add tags')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border-none bg-transparent p-0 shadow-none" align="start" side="bottom" sideOffset={6}>
                    <LabelsModal selectedLabels={selectedLabels} onLabelsChange={(labels) => { setSelectedLabels(labels); markDirty(); }} onClose={() => setIsLabelsOpen(false)} />
                  </PopoverContent>
                </Popover>
              </Prop>

              <Prop icon={<Link2 />} label="Linked docs">
                <Popover open={isReferencePickerOpen} onOpenChange={setIsReferencePickerOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className={cn(valueBtn, 'flex-wrap py-1')}>
                      {references.length > 0
                        ? references.map((r) => {
                            const Icon = r.type === 'doc' ? FileText : LayoutTemplate;
                            return (
                              <span key={`${r.type}-${r.refId}`} className="inline-flex max-w-[220px] items-center gap-1 rounded-[4px] bg-[var(--rc-surface-2)] px-1.5 py-0.5 text-[12.5px] font-[500] text-[var(--rc-ink-2)]">
                                <Icon className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="truncate">{r.title}</span>
                              </span>
                            );
                          })
                        : empty('Link a doc')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className={cn(rcScope, 'rc-float w-80 overflow-hidden rounded-[10px] p-0')} align="start" side="bottom" sideOffset={6}>
                    <div className="border-b border-[var(--rc-line)] p-2">
                      <input
                        type="text"
                        value={referenceQuery}
                        onChange={(e) => setReferenceQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder={REFERENCE_PICKER_COPY.placeholder}
                        className="rc-input w-full"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1">
                      {isSearchingRefs && (
                        <div className="flex items-center justify-center gap-2 py-3 text-[13px] text-[var(--rc-ink-3)]">
                          <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                        </div>
                      )}
                      {!isSearchingRefs && referenceResults.length === 0 && (
                        <p className="py-3 text-center text-[13px] text-[var(--rc-ink-3)]">{referenceQuery ? REFERENCE_PICKER_COPY.noResults : REFERENCE_PICKER_COPY.hint}</p>
                      )}
                      {!isSearchingRefs &&
                        referenceResults.map((item) => {
                          const isSelected = references.some((r) => r.refId === item.refId && r.type === item.type);
                          const Icon = item.type === 'doc' ? FileText : LayoutTemplate;
                          return (
                            <button
                              key={`${item.type}-${item.refId}`}
                              type="button"
                              onClick={() => toggleReference(item)}
                              className="rc-hoverable flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left text-[14px]"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" aria-hidden />
                              <span className="min-w-0 flex-1 truncate text-[var(--rc-ink-1)]">{item.title}</span>
                              {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--rc-ink-2)]" aria-hidden />}
                            </button>
                          );
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              </Prop>
            </div>

            {/* Subtasks */}
            <div className="mt-6">
              <div className="flex min-h-[26px] items-center justify-between border-b border-[var(--rc-line)] pb-1.5 text-[13px]">
                <span className="font-[600] text-[var(--rc-ink-2)]">
                  Subtasks {subtasks.length > 0 && <span className="rc-num font-[400] text-[var(--rc-ink-3)]">{doneSubtasks} of {subtasks.length}</span>}
                </span>
              </div>
              <ul className="mt-0.5">
                {subtasks.map((st, idx) => (
                  <li key={st.id} className="rc-row rc-hoverable group -mx-2 flex items-center gap-3 px-2 py-[5px]">
                    <RcCheck checked={st.isCompleted} onToggle={() => toggleSubtask(st.id)} label={st.isCompleted ? `Mark “${st.text}” not done` : `Mark “${st.text}” done`} />
                    <input
                      type="text"
                      value={st.text}
                      onChange={(e) => { const u = [...subtasks]; u[idx] = { ...u[idx], text: e.target.value }; setSubtasks(u); markDirty(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
                        if (e.key === 'Backspace' && st.text === '') { e.preventDefault(); removeSubtask(st.id); }
                      }}
                      placeholder="A step"
                      aria-label="Subtask"
                      className={cn('min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--rc-ink-3)]', st.isCompleted ? 'text-[var(--rc-ink-3)] line-through' : 'text-[var(--rc-ink-1)]')}
                      autoFocus={st.text === ''}
                    />
                    <div className="rc-row-actions">
                      <RcIconButton size="sm" label={`Remove “${st.text || 'this step'}”`} onClick={() => removeSubtask(st.id)}>
                        <X />
                      </RcIconButton>
                    </div>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={addSubtask} className="rc-hoverable -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-[6px] px-2 py-[6px] text-left text-[14px] text-[var(--rc-ink-3)]">
                    <Plus className="h-[18px] w-[18px] text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden /> Add a step
                  </button>
                </li>
              </ul>
            </div>

            {/* Notes: the editor straight on the sheet, no box. */}
            <div className="mt-6 flex min-h-[260px] flex-col">
              <div className="flex min-h-[26px] items-center justify-between border-b border-[var(--rc-line)] pb-1.5 text-[13px]">
                <span className="font-[600] text-[var(--rc-ink-2)]">Notes</span>
                <RcButton size="sm" variant="quiet" className="-my-1 -mr-2" icon={<Paperclip />} onClick={() => fileInputRef.current?.click()}>
                  Add image
                </RcButton>
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
              </div>
              <div className="rc-task-notes flex-1 pt-2">
                <TiptapTaskEditor
                  content={description}
                  onChange={(val: string) => { setDescription(val); markDirty(); }}
                  onImageClick={setPreviewImage}
                  placeholder="Write anything, or type / for commands"
                  onSelectLabel={handleEditorSelectLabel}
                  onLabelDelete={handleEditorLabelDelete}
                />
              </div>
            </div>
          </div>

          {/* Saving: what changed is kept on close; the foot says so and saves now on a click (or Ctrl S). */}
          <div className={cn('rc-sheet-foot justify-between !py-2.5 transition-opacity', isDirty || isSaving ? 'opacity-100' : 'pointer-events-none opacity-0')} aria-hidden={!isDirty && !isSaving}>
            <span className="rc-meta">{isSaving ? 'Saving…' : 'Unsaved changes · saved when you close'}</span>
            <RcButton size="sm" variant="main" busy={isSaving} disabled={!isDirty || isSaving} onClick={() => void handleSave()}>
              Save
            </RcButton>
          </div>
        </Dialog.Content>

        {/* Image preview */}
        <AnimatePresence>
          {previewImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto" onClick={() => setPreviewImage(null)}>
              <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} className="relative max-w-[80vw] max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <img src={previewImage} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
                <button onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }} className="absolute -top-3 -right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer" aria-label="Close the preview"><X className="w-5 h-5 text-white" /></button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}
