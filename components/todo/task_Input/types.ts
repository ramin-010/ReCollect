export interface TaskReference {
  type: 'doc' | 'content' | 'slide';
  refId: string;
  title?: string;
}

export interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'complete';
  dueDate?: string;
  reminderDate?: string;
  subtasks?: { id: string; text: string; isCompleted: boolean }[];
  labels?: { id: string; name: string; color: string }[];
  tags?: string[];
  recurrence?: { pattern: 'daily' | 'weekly' | 'monthly'; interval?: number };
  references?: TaskReference[];
  workspace?: string;
  spaceId?: string;
  visibility?: 'private' | 'workspace' | 'public';
}

export interface TaskInputProps {
  onSave?: (task: TaskData) => void;
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
}

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'high', label: 'High', color: 'text-rose-400', bg: 'bg-rose-500/10' },
] as const;