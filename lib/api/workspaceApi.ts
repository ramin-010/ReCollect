/**
 * Workspace API — CRUD + member management
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

  async inviteMember(workspaceId: string, email: string): Promise<{ success: boolean; data: Workspace; message?: string }> {
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
};
