/**
 * Workspace API — CRUD + member management + tasks/stats/activity
 */
import axiosInstance from '@/lib/utils/axios';

export interface WorkspaceMember {
  user: { _id: string; name: string; email: string; avatar?: string };
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  owner: { _id: string; name: string; email: string; avatar?: string };
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceStats {
  totalMembers: number;
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

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

export const workspaceApi = {
  async getWorkspaces(): Promise<{ success: boolean; data: Workspace[] }> {
    const res = await axiosInstance.get('/api/workspaces');
    return res.data;
  },

  async getWorkspace(id: string): Promise<{ success: boolean; data: Workspace }> {
    const res = await axiosInstance.get(`/api/workspaces/${id}`);
    return res.data;
  },

  async createWorkspace(name: string): Promise<{ success: boolean; data: Workspace }> {
    const res = await axiosInstance.post('/api/workspaces', { name });
    return res.data;
  },

  async inviteMember(workspaceId: string, email: string): Promise<{ success: boolean; message?: string }> {
    const res = await axiosInstance.post(`/api/workspaces/${workspaceId}/members`, { email });
    return res.data;
  },

  async removeMember(workspaceId: string, userId: string): Promise<{ success: boolean; data: Workspace; message?: string }> {
    const res = await axiosInstance.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
    return res.data;
  },

  async deleteWorkspace(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await axiosInstance.delete(`/api/workspaces/${id}`);
    return res.data;
  },

  // Workspace-scoped data
  async getWorkspaceTasks(workspaceId: string): Promise<{ success: boolean; data: any[]; count: number }> {
    const res = await axiosInstance.get(`/api/workspaces/${workspaceId}/tasks`);
    return res.data;
  },

  async getWorkspaceStats(workspaceId: string): Promise<{ success: boolean; data: WorkspaceStats }> {
    const res = await axiosInstance.get(`/api/workspaces/${workspaceId}/stats`);
    return res.data;
  },

  async getWorkspaceActivity(workspaceId: string): Promise<{ success: boolean; data: ActivityLogEntry[] }> {
    const res = await axiosInstance.get(`/api/workspaces/${workspaceId}/activity`);
    return res.data;
  },
};
