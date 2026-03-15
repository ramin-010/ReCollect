export interface ActivityLogEntry {
  _id: string;
  workspace: string;
  actor: { _id: string; name: string; email: string; avatar?: string };
  action: 'task_created' | 'task_completed' | 'task_assigned' | 'task_status_changed' | 'member_joined' | 'member_removed' | 'workspace_created';
  targetTask?: string;
  targetUser?: { _id: string; name: string; email: string; avatar?: string };
  metadata?: string;
  createdAt: string;
}

export interface WorkspaceStats {
  totalMembers: number;
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}
