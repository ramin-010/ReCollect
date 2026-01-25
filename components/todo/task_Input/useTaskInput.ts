import { useState, useRef, useEffect, useMemo } from 'react';
import { parseTaskInput } from '@/lib/utils/smartDateParser';
import { todoApi } from '@/lib/api/todoApi';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { subMinutes } from 'date-fns';
import { TaskData, TaskInputProps } from './types';
import { Label } from '../LabelsModal';
import { InlineLabelDropdownHandle } from '../InlineLabelDropdown';

export const useTaskInput = (
  onSave: TaskInputProps['onSave'],
  onExpandChange: TaskInputProps['onExpandChange'],
  isExpanded: boolean,
  initialReferences?: TaskInputProps['initialReferences']
) => {
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringUnit, setRecurringUnit] = useState<'day' | 'week' | 'month'>('week');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [isSubtaskFormOpen, setIsSubtaskFormOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskDescription, setSubtaskDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirmedDueDate, setConfirmedDueDate] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineLabelRef = useRef<InlineLabelDropdownHandle>(null);
  const isMouseDownInsideRef = useRef(false);
  const isExpandedRef = useRef(isExpanded);
  const savingRef = useRef(false);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const parsedResult = useMemo(() => {
    if (!title.trim()) return null;
    return parseTaskInput(title);
  }, [title]);

  const suggestedDate = parsedResult?.dueDate && !confirmedDueDate ? parsedResult.dueDate : null;

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

  const handleSave = async () => {
    console.log('[TaskInput] handleSave called. isSaving:', isSaving, 'savingRef:', savingRef.current);
    
    if (!title.trim() || isSaving || savingRef.current) {
      console.log('[TaskInput] Blocked - already saving or no title');
      return;
    }
    
    savingRef.current = true;
    setIsSaving(true);
    
    const finalDueDate = confirmedDueDate || suggestedDate;

    let rawTitle = confirmedDueDate 
      ? title.trim() 
      : (parsedResult?.cleanText || title.trim());
    
    const taskTitle = rawTitle.replace(/@\w+\s?/g, '').trim();
    
    const formattedSubtasks = subtasks
      .filter(t => t.trim().length > 0)
      .map(text => ({ id: nanoid(8), text: text.trim(), isCompleted: false }));
    
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
      tags: selectedLabels.length > 0 ? selectedLabels.map(l => l.name) : undefined,
      recurrence: recurrenceData,
      references: initialReferences && initialReferences.length > 0 ? initialReferences : undefined,
    };
    
    console.log('[TaskInput] Calling todoApi.createTodo...');
    
    try {
      const result = await todoApi.createTodo(taskData);
      
      if (result.success && result.data) {
        toast.success('Task created!');
        onSave?.(result.data);
        
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
        const labelName = labelMatch[1];
        const fullMatch = labelMatch[0];
        
        const isConfirmedLabel = selectedLabels.some(
          l => l.name.toLowerCase() === labelName.toLowerCase()
        );

        if (isConfirmedLabel) {
            e.preventDefault();
            
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
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInsideContainer = containerRef.current && containerRef.current.contains(target);
      const isInsidePopover = target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="dialog"]');
      
      if (isInsideContainer || isInsidePopover) {
        isMouseDownInsideRef.current = true;
      } else {
        isMouseDownInsideRef.current = false;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isMouseDownInsideRef.current) {
        isMouseDownInsideRef.current = false;
        return;
      }

      if (!isExpandedRef.current && !title.trim()) return;

      const target = e.target as HTMLElement;
      const isInsideContainer = containerRef.current && containerRef.current.contains(target);
      const isInsidePopover = target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="dialog"]');

      const isInteractive = target.closest(
        'button, a, input, textarea, select, [role="button"], [role="checkbox"], [role="menuitem"], [role="option"], [role="switch"], [role="tab"]'
      );

      if (!isInsideContainer && !isInsidePopover && !isInteractive) {
        if (isExpandedRef.current && !title.trim()) {
           onExpandChange(false);
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [title, onExpandChange]);

  return {
    // State
    title, setTitle,
    description, setDescription,
    priority, setPriority,
    status, setStatus,
    isCalendarOpen, setIsCalendarOpen,
    isReminderOpen, setIsReminderOpen,
    isLabelsOpen, setIsLabelsOpen,
    isInlineLabelOpen, setIsInlineLabelOpen,
    tagSearchQuery, setTagSearchQuery,
    currentReminder, setCurrentReminder,
    selectedLabels, setSelectedLabels,
    isRecurring, setIsRecurring,
    recurringInterval, setRecurringInterval,
    recurringUnit, setRecurringUnit,
    subtasks, setSubtasks,
    isSubtaskFormOpen, setIsSubtaskFormOpen,
    subtaskTitle, setSubtaskTitle,
    subtaskDescription, setSubtaskDescription,
    previewImage, setPreviewImage,
    confirmedDueDate, setConfirmedDueDate,
    isSaving,
    
    // Refs
    fileInputRef,
    descriptionEditorRef,
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
  };
};