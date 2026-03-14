import { useState, useRef, useEffect, useMemo } from 'react';
import { parseTaskInput } from '@/lib/utils/smartDateParser';
import { todoApi } from '@/lib/api/todoApi';
import { TaskReference } from './types';
import { workspaceTodoApi } from '@/lib/api/workspaceTodoApi';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import { subMinutes } from 'date-fns';
import getCaretCoordinates from 'textarea-caret';
import { TaskData, TaskInputProps } from './types';
import { Label } from '../LabelsModal';
import { InlineLabelDropdownHandle } from '../InlineLabelDropdown';
import { InlineAssigneeDropdownHandle, Assignee } from '../InlineAssigneeDropdown';

export const useTaskInput = (
  onSave: TaskInputProps['onSave'],
  onExpandChange: TaskInputProps['onExpandChange'],
  isExpanded: boolean,
  initialReferences?: TaskInputProps['initialReferences'],
  initialTitle?: TaskInputProps['initialTitle'],
  initialDescription?: TaskInputProps['initialDescription'],
  demoMode?: boolean,
  workspaceId?: string,
  spaceId?: string,
  visibility?: 'private' | 'workspace' | 'public'
) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [status, setStatus] = useState<'pending' | 'complete'>('pending');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isInlineLabelOpen, setIsInlineLabelOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isInlineAssigneeOpen, setIsInlineAssigneeOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
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
  const [assignees, setAssignees] = useState<{ name: string; email: string; avatar?: string }[]>([]);
  const [references, setReferences] = useState<TaskReference[]>(initialReferences || []);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [caretPosition, setCaretPosition] = useState<{ top: number; left: number; height: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineLabelRef = useRef<InlineLabelDropdownHandle>(null);
  const inlineAssigneeRef = useRef<InlineAssigneeDropdownHandle>(null);
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTitle(value);

    const labelsInText = value.match(/#(\w+)/g)?.map(m => m.slice(1).toLowerCase()) || [];
    setSelectedLabels(prev => 
      prev.filter(label => labelsInText.includes(label.name.toLowerCase()))
    );

    const assigneesInText = value.match(/@(\w+)/g)?.map(m => m.slice(1).toLowerCase()) || [];
    setAssignees(prev =>
      prev.filter(a => assigneesInText.some(t => a.name.toLowerCase().startsWith(t)))
    );
    const match = value.match(/#(\w*)$/);
    let isMenuOpen = false;

    if (match) {
      const query = match[1]; 
      setTagSearchQuery(query);
      setIsInlineLabelOpen(true);
      isMenuOpen = true;
    } else {
      setTagSearchQuery('');
      setIsInlineLabelOpen(false);
    }

    const assigneeMatch = value.match(/@(\w*)$/);
    if (assigneeMatch && !isMenuOpen) {
      const query = assigneeMatch[1];
      setAssigneeSearchQuery(query);
      setIsInlineAssigneeOpen(true);
      isMenuOpen = true;
    } else {
      setAssigneeSearchQuery('');
      setIsInlineAssigneeOpen(false);
    }

    if (isMenuOpen && e.target) {
      setTimeout(() => {
        try {
          const target = e.target as HTMLTextAreaElement;
          const coords = getCaretCoordinates(target, target.selectionEnd || value.length);
          setCaretPosition(coords);
        } catch(e) {}
      }, 0);
    }
  };

  const handleInlineSelectLabel = (label: Label) => {
    setTitle(prev => prev.replace(/#\w*$/, `#${label.name} `));
    setSelectedLabels(prev => [...prev, label]);
    setIsInlineLabelOpen(false);
    setTagSearchQuery('');
  };

  const handleInlineCreateLabel = (label: Label) => {
    setTitle(prev => prev.replace(/#\w*$/, `#${label.name} `));
    setSelectedLabels(prev => [...prev, label]);
    setIsInlineLabelOpen(false);
    setTagSearchQuery('');
  };

  const handleInlineSelectAssignee = (user: Assignee) => {
    setTitle(prev => prev.replace(/@\w*$/, `@${user.name} `));
    
    // Only add if not already assigned, and not the AI system virtual user
    if (user._id !== 'ai-system') {
      setAssignees(prev => {
        if (prev.some(a => a.email === user.email)) return prev;
        return [...prev, { name: user.name, email: user.email, avatar: user.avatar }];
      });
    }
    
    setIsInlineAssigneeOpen(false);
    setAssigneeSearchQuery('');
  };

  const handleInlineSelectReference = (ref: TaskReference) => {
    setTitle(prev => prev.replace(/@[\w\s]*$/, `@${ref.title} `));
    setReferences(prev => {
      if (prev.some(r => r.refId === ref.refId && r.type === ref.type)) return prev;
      return [...prev, ref];
    });
    setIsInlineAssigneeOpen(false);
    setAssigneeSearchQuery('');
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

  // ── @ai task generation ──
  const handleAiGenerate = async (aiPrompt: string, workspaceMembers: any[] = []) => {
    if (isAiGenerating) return;
    setIsAiGenerating(true);

    try {
      const result = await todoApi.generateTaskWithAI(
        aiPrompt,
        workspaceMembers.map((m: any) => ({ name: m.name, email: m.email })),
        selectedLabels.map(l => l.name),
        assignees.map(a => ({ name: a.name, email: a.email }))
      );

      if (result.success && result.data) {
        const d = result.data;

        // Auto-fill title
        if (d.title) setTitle(d.title);

        // Auto-fill description
        if (d.description) setDescription(d.description);

        // Auto-fill priority
        if (d.priority && ['low', 'normal', 'high', 'urgent'].includes(d.priority)) {
          setPriority(d.priority as any);
        }

        // Auto-fill due date
        if (d.dueDate) {
          const parsed = new Date(d.dueDate);
          if (!isNaN(parsed.getTime())) {
            setConfirmedDueDate(parsed);
            setCurrentReminder(subMinutes(parsed, 10));
          }
        }

        // Auto-fill tags/labels
        if (d.tags && d.tags.length > 0) {
          const newLabels = d.tags.map((tag: string) => ({
            id: `ai-tag-${tag}`,
            name: tag,
            color: 'blue',
          }));
          setSelectedLabels(prev => {
            const merged = [...prev];
            for (const nl of newLabels) {
              if (!merged.some(l => l.name.toLowerCase() === nl.name.toLowerCase())) {
                merged.push(nl);
              }
            }
            return merged;
          });
        }

        // Auto-fill assignees
        if (d.assignees && d.assignees.length > 0 && workspaceMembers.length > 0) {
          const matchedAssignees = d.assignees
            .map((email: string) => workspaceMembers.find((m: any) => m.email.toLowerCase() === email.toLowerCase()))
            .filter(Boolean)
            .map((m: any) => ({ name: m.name, email: m.email, avatar: m.avatar }));
          
          setAssignees(prev => {
            const merged = [...prev];
            for (const ma of matchedAssignees) {
              if (!merged.some(a => a.email === ma.email)) {
                merged.push(ma);
              }
            }
            return merged;
          });
        }

        // Expand the task input so user can review
        onExpandChange(true);
        toast.success('✨ AI generated your task!');
      } else {
        toast.error(result.message || 'AI generation failed');
      }
    } catch (err: any) {
      console.error('[useTaskInput] AI generation error:', err);
      toast.error('Failed to generate task with AI');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSave = async () => {
    console.log('[TaskInput] handleSave called. isSaving:', isSaving, 'savingRef:', savingRef.current, 'demoMode:', demoMode);
    
    if (!title.trim() || isSaving || savingRef.current) {
      console.log('[TaskInput] Blocked - already saving or no title');
      return;
    }
    
    // In demo mode, just show a mock success without making API calls
    if (demoMode) {
      console.log('[TaskInput] Demo mode - skipping API call');
      toast.success('Task created! (Demo)');
      return;
    }
    
    savingRef.current = true;
    setIsSaving(true);
    
    const finalDueDate = confirmedDueDate || suggestedDate;

    let rawTitle = confirmedDueDate 
      ? title.trim() 
      : (parsedResult?.cleanText || title.trim());
    
    const taskTitle = rawTitle.replace(/#\w+\s?/g, '').trim();
    
    // Extract subtasks from HTML and remove them from description
    let finalDescription = description.trim();
    let extractedSubtasks: { id: string; text: string; isCompleted: boolean }[] = [];

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
                extractedSubtasks = [...extractedSubtasks, ...parsed];
                foundNewSubtasks = true;
              }
            } catch (e) {
              console.error("Failed to parse subtasks from HTML widget", e);
            }
          }
          // Remove from descriptions so it's not saved as raw HTML
          node.remove();
        });

        if (foundNewSubtasks || widgetNodes.length > 0) {
          finalDescription = doc.body.innerHTML;
          // Clean empty lines
          finalDescription = finalDescription.replace(/<p><\/p>/g, '').trim();
        }
      }
    } catch (e) {
      console.error("Failed to extract subtasks in useTaskInput", e);
    }
    
    // Combine HTML extracted subtasks with manual input array subtasks
    const manualSubtasks = subtasks
      .filter(t => t.trim().length > 0)
      .map(text => ({ id: nanoid(8), text: text.trim(), isCompleted: false }));
      
    const formattedSubtasks = [...extractedSubtasks, ...manualSubtasks];
    
    const recurrenceData = isRecurring 
      ? { 
          pattern: (recurringUnit === 'day' ? 'daily' : recurringUnit === 'week' ? 'weekly' : 'monthly') as 'daily' | 'weekly' | 'monthly', 
          interval: recurringInterval 
        }
      : undefined;
    
    const taskData: TaskData = {
      title: taskTitle,
      description: finalDescription || undefined,
      priority,
      status,
      dueDate: finalDueDate?.toISOString(),
      reminderDate: currentReminder?.toISOString(),
      subtasks: formattedSubtasks.length > 0 ? formattedSubtasks : undefined,
      tags: selectedLabels.length > 0 ? selectedLabels.map(l => l.name) : undefined,
      recurrence: recurrenceData,
      references: references.length > 0 ? references : (initialReferences && initialReferences.length > 0 ? initialReferences : undefined),
      workspace: workspaceId,
      spaceId: spaceId,
      visibility: visibility,
    };
    
    console.log('[TaskInput] Calling todoApi.createTodo...');
    
    try {
      const api = taskData.workspace ? workspaceTodoApi : todoApi;
      const result = await api.createTodo(taskData);
      
      if (result.success && result.data) {
        toast.success('Task created!');
        
        // If assignees were selected, assign after creation
        // NOTE: The createTodo API now accepts assignees directly in the payload.
        // The following block is kept for historical context or if a separate assignment step is still needed for some reason.
        // If the API handles assignment on creation, this block can be simplified or removed.
        if (assignees.length > 0 && result.data._id) {
          const emails = assignees.map(a => a.email);
          // Conditionally use workspaceTodoApi for assignment if task is in a workspace
          const assignApi = taskData.workspace ? workspaceTodoApi : todoApi;
          assignApi.assignTask(result.data._id, emails).then(assignResult => {
            if (assignResult.success) {
              toast.success(assignResult.message || `Assigned to ${emails.length} users`);
              // Update the task in store with assignee data
              if (assignResult.data) {
                onSave?.(assignResult.data);
              }
            }
          }).catch(() => {});
        } else {
          onSave?.(result.data);
        }
        
        setTitle('');
        setDescription('');
        setSubtasks([]);
        setSelectedLabels([]);
        setPriority('normal');
        setStatus('pending');
        setConfirmedDueDate(null);
        setCurrentReminder(null);
        setIsRecurring(false);
        setAssignees([]);
        setReferences(initialReferences || []);
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
    if (isInlineAssigneeOpen && inlineAssigneeRef.current?.handleKeyDown(e)) {
      return;
    }

    // Only handle Backspace label deletion if we are actively focused on the title input
    const isFocusedOnTitleInput = e.target === inputRef.current;
    
    if (e.key === 'Backspace' && isFocusedOnTitleInput && inputRef.current) {
      const cursorPos = inputRef.current.selectionStart || 0;
      const textBeforeCursor = title.slice(0, cursorPos);
      
      const labelMatch = textBeforeCursor.match(/#(\w+)\s?$/);
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

      // Handle assignee deletion with one backspace
      const assigneeMatch = textBeforeCursor.match(/@(\w+)\s?$/);
      if (assigneeMatch) {
        const assigneeName = assigneeMatch[1];
        const fullMatch = assigneeMatch[0];
        
        const isConfirmedAssignee = assignees.some(
          a => a.name.toLowerCase().startsWith(assigneeName.toLowerCase())
        );

        if (isConfirmedAssignee) {
            e.preventDefault();
            
            const newTitle = title.slice(0, cursorPos - fullMatch.length) + title.slice(cursorPos);
            setTitle(newTitle);
            
            setAssignees(prev => 
              prev.filter(a => !a.name.toLowerCase().startsWith(assigneeName.toLowerCase()))
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
    
    // Save on Enter only from the main input, or Ctrl/Cmd+Enter from anywhere
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    const isInputOrTextarea = targetTag === 'input' || targetTag === 'textarea';
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (e.key === 'Enter') {
      if (isCtrlOrCmd || (isInputOrTextarea && !e.shiftKey)) {
        // Prevent form submission if a dropdown is actively handling the enter key
        if (isInlineLabelOpen || isInlineAssigneeOpen) {
          e.preventDefault();
          return;
        }

        e.preventDefault();

        // Check if user is invoking @ai
        const aiMatch = title.match(/^@ai\s+(.+)/i);
        if (aiMatch) {
          handleAiGenerate(aiMatch[1].trim());
          return;
        }

        handleSave();
      }
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
    isInlineAssigneeOpen, setIsInlineAssigneeOpen,
    assigneeSearchQuery, setAssigneeSearchQuery,
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
    assignees, setAssignees,
    
    // Refs
    fileInputRef,
    descriptionEditorRef,
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
    handleInlineSelectReference,
    references, setReferences,
    acceptSuggestion,
    clearConfirmedDate,
    handleSave,
    handleKeyDown,
    isAiGenerating,
    setIsAiGenerating,
    handleAiGenerate,
    caretPosition,
  };
};