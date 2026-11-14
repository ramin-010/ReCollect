import { features } from '@/lib/features';
import type { TodoResponse } from '@/lib/api/todoApi';

export interface TaskReference {
  type: 'doc' | 'content' | 'slide';
  refId: string;
  title?: string;
}

export interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'review' | 'blocked' | 'complete';
  dueDate?: string;
  reminderDate?: string;
  subtasks?: { id: string; text: string; isCompleted: boolean }[];
  /** Tag names, as the backend expects them (see lib/utils/todoTags.ts). */
  tags?: string[];
  recurrence?: { pattern: 'daily' | 'weekly' | 'monthly'; interval?: number };
  references?: TaskReference[];
  workspace?: string;
  spaceId?: string;
  visibility?: 'private' | 'workspace' | 'public';
  /** Weekly / monthly goal (Ctrl+K Goal chip); omitted = a normal task. */
  goalType?: 'WEEKLY' | 'MONTHLY';
}

export interface TaskInputProps {
  /** Called with the created todo as the API returns it (not the TaskData that was sent). */
  onSave?: (task: TodoResponse) => void;
  isExpanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  isQuickAdd?: boolean;
  onClose?: () => void;
  initialReferences?: TaskReference[];
  initialTitle?: string;
  initialDescription?: string;
  demoMode?: boolean;
  workspaceId?: string;
  spaceId?: string;
  visibility?: 'private' | 'workspace' | 'public';
  workspaceMembers?: { _id: string; name: string; email: string; avatar?: string }[];
  /** Ctrl+K Goal chip: saves the task as a weekly / monthly goal (`goalType`). Default: none. */
  goalType?: 'NONE' | 'WEEKLY' | 'MONTHLY';
}

export const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { value: 'high', label: 'High', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'normal', label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'low', label: 'Low', color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
] as const;

// Wording for the "link this task to a doc/slide" pickers. While slides are hidden
// (lib/features.ts) only docs can be linked, so the copy drops "slide".
export const REFERENCE_PICKER_COPY = features.slides
  ? {
      button: 'Link Doc / Slide',
      tooltip: 'Link to a Doc or Slide',
      heading: 'Link to Doc or Slide',
      placeholder: 'Search docs & slides...',
      noResults: 'No docs or slides found',
      hint: 'Type to search docs & slides',
      hintYour: 'Type to search your docs & slides',
    }
  : {
      button: 'Link Doc',
      tooltip: 'Link to a Doc',
      heading: 'Link to Doc',
      placeholder: 'Search docs...',
      noResults: 'No docs found',
      hint: 'Type to search docs',
      hintYour: 'Type to search your docs',
    };