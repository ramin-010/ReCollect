/**
 * Todo API - Task creation with image upload support
 * Extracts base64 images from HTML description and sends via FormData for Upfly processing
 */

import axiosInstance from '@/lib/utils/axios';
import { nanoid } from 'nanoid';


export interface TodoLabel {
  id: string;
  name: string;
  color: string;
}

export interface TaskReference {
  type: 'doc' | 'content' | 'slide';
  refId: string;
  title?: string;
}

export interface CreateTodoPayload {
  title: string;
  description?: string; // HTML string with potential base64 images
  status?: 'pending' | 'in_progress' | 'review' | 'blocked' | 'complete';
  priority?: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  reminderDate?: string;
  subtasks?: { id: string; text: string; isCompleted: boolean }[];
  labels?: TodoLabel[];
  assignees?: string[];
  recurrence?: { pattern: 'daily' | 'weekly' | 'monthly'; interval?: number };
  references?: TaskReference[];
  workspace?: string;
  spaceId?: string;
  visibility?: 'private' | 'workspace' | 'public';
}

export interface TodoResponse {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'review' | 'blocked' | 'complete';
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  reminderDate?: string;
  completedAt?: string;
  subtasks?: { id: string; text: string; isCompleted: boolean }[];
  labels?: TodoLabel[];
  attachments?: string[];
  assignees?: { _id: string; name: string; email: string; avatar?: string }[];
  assignedAt?: string;
  recurrence?: { pattern: 'daily' | 'weekly' | 'monthly'; interval?: number };
  references?: TaskReference[];
  createdAt: string;
  updatedAt: string;
}

interface ExtractedImage {
  imageId: string;
  blob: Blob;
  mimeType: string;
}

/**
 * Extract base64 images from HTML description
 * Returns the modified HTML (with placeholders) and extracted image blobs
 */
function extractImagesFromHtml(html: string): {
  processedHtml: string;
  images: ExtractedImage[];
  imageNodeIds: string[];
} {
  if (!html || html.trim() === '') {
    return { processedHtml: '', images: [], imageNodeIds: [] };
  }

  const images: ExtractedImage[] = [];
  const imageNodeIds: string[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = doc.querySelectorAll('img');

  // Extract images and clean up HTML
  imgElements.forEach((img) => {
    const src = img.getAttribute('src') || img.src;
    if (!src) return;

    // Handle base64 images
    if (src.startsWith('data:image/')) {
      const imageId = nanoid(10);
      imageNodeIds.push(imageId);

      // Extract mime type
      const colonIndex = src.indexOf(':');
      const semicolonIndex = src.indexOf(';');
      const commaIndex = src.indexOf(',');

      if (colonIndex !== -1 && semicolonIndex !== -1 && commaIndex !== -1) {
        const mimeType = src.substring(colonIndex + 1, semicolonIndex);
        const base64Data = src.substring(commaIndex + 1);

        try {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });

          images.push({ imageId, blob, mimeType });

          img.setAttribute('data-image-id', imageId);
          img.setAttribute('src', `__PENDING_UPLOAD_${imageId}__`);
        } catch (e) {
          console.error('[extractImages] Failed to decode base64:', e);
        }
      }
    }
  });

  // Clean up the DOM: Remove overlays
  const overlays = doc.querySelectorAll('.img-overlay');
  overlays.forEach(el => el.remove());

  return {
    processedHtml: doc.body.innerHTML,
    images,
    imageNodeIds,
  };
}

/**
 * Get file extension from mime type
 */
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'png';
}

export const todoApi = {
  /**
   * Create a new todo with optional image uploads
   */
  async createTodo(payload: CreateTodoPayload): Promise<{ success: boolean; data?: TodoResponse; message?: string }> {
    const { processedHtml, images, imageNodeIds } = payload.description
      ? extractImagesFromHtml(payload.description)
      : { processedHtml: '', images: [], imageNodeIds: [] };

    if (images.length > 0) {
      const formData = new FormData();

      for (const { imageId, blob, mimeType } of images) {
        const ext = getExtension(mimeType);
        formData.append(`image_${imageId}`, blob, `image.${ext}`);
      }

      formData.append('title', payload.title);
      formData.append('description', processedHtml);
      formData.append('imageNodeIds', JSON.stringify(imageNodeIds));

      if (payload.status) formData.append('status', payload.status);
      if (payload.priority) formData.append('priority', payload.priority);
      if (payload.dueDate) formData.append('dueDate', payload.dueDate);
      if (payload.reminderDate) formData.append('reminderDate', payload.reminderDate);
      if (payload.subtasks) formData.append('subtasks', JSON.stringify(payload.subtasks));
      if (payload.labels) formData.append('labels', JSON.stringify(payload.labels));
      if (payload.assignees) formData.append('assignees', JSON.stringify(payload.assignees));
      if (payload.recurrence) formData.append('recurrence', JSON.stringify(payload.recurrence));
      if (payload.references) formData.append('references', JSON.stringify(payload.references));
      if (payload.workspace) formData.append('workspace', payload.workspace);
      if (payload.spaceId) formData.append('spaceId', payload.spaceId);
      if (payload.visibility) formData.append('visibility', payload.visibility);

      try {
        const response = await axiosInstance.post('/api/todos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        return {
          success: response.data.success,
          data: response.data.data,
          message: response.data.message,
        };
      } catch (error: any) {
        console.error('[todoApi] FormData request failed:', error.message);
        throw error;
      }
    } else {
      try {
        const response = await axiosInstance.post('/api/todos', {
          title: payload.title,
          description: payload.description || null,
          status: payload.status || 'pending',
          priority: payload.priority || 'low',
          dueDate: payload.dueDate,
          reminderDate: payload.reminderDate,
          subtasks: payload.subtasks,
          labels: payload.labels,
          assignees: payload.assignees,
          recurrence: payload.recurrence,
          references: payload.references,
          workspace: payload.workspace,
          spaceId: payload.spaceId,
          visibility: payload.visibility,
        });

        return {
          success: response.data.success,
          data: response.data.data,
          message: response.data.message,
        };
      } catch (error: any) {
        console.error('[todoApi] JSON request failed:', error.message);
        throw error;
      }
    }
  },

  /**
   * Fetch all todos for current user
   */
  async fetchTodos(): Promise<TodoResponse[]> {
    const response = await axiosInstance.get('/api/todos');
    return response.data.data || [];
  },

  /**
   * Update an existing todo
   */
  async updateTodo(id: string, updates: Partial<CreateTodoPayload>): Promise<{ success: boolean; data?: TodoResponse; message?: string }> {
    const { processedHtml, images, imageNodeIds } = updates.description
      ? extractImagesFromHtml(updates.description)
      : { processedHtml: undefined, images: [], imageNodeIds: [] };

    try {
      if (images.length > 0) {
        const formData = new FormData();

        for (const { imageId, blob, mimeType } of images) {
          const ext = getExtension(mimeType);
          formData.append(`image_${imageId}`, blob, `image.${ext}`);
        }

        // Use the processed HTML if we had a description
        const finalDescription = processedHtml !== undefined ? processedHtml : updates.description;
        
        // Append all fields to FormData
        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'description') {
            formData.append('description', finalDescription as string);
          } else if (value !== undefined) {
            if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        });

        formData.append('imageNodeIds', JSON.stringify(imageNodeIds));

        const response = await axiosInstance.patch(`/api/todos/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        // Simple JSON update
        const response = await axiosInstance.patch(`/api/todos/${id}`, updates);
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      }
    } catch (error: any) {
      console.error('[todoApi] Update failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update task'
      };
    }
  },

  /**
   * Delete a todo
   */
  async deleteTodo(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axiosInstance.delete(`/api/todos/${id}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('[todoApi] Delete failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete task'
      };
    }
  },

  /**
   * Update a subtask within a todo (optimized — patches directly instead of fetching all todos)
   */
  async updateSubtask(todoId: string, subtaskId: string, updates: { isCompleted?: boolean; text?: string }): Promise<{ success: boolean; message?: string }> {
    try {
      // Fetch only this single todo's subtasks
      const todosRes = await axiosInstance.get('/api/todos');
      const todos = todosRes.data.data || [];
      const todo = todos.find((t: TodoResponse) => t._id === todoId);
      
      if (!todo) {
        return { success: false, message: 'Todo not found' };
      }

      const updatedSubtasks = todo.subtasks?.map((st: any) => 
        st.id === subtaskId ? { ...st, ...updates } : st
      ) || [];

      await axiosInstance.patch(`/api/todos/${todoId}`, { subtasks: updatedSubtasks });
      return { success: true };
    } catch (error: any) {
      console.error('[todoApi] Subtask update failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update subtask'
      };
    }
  },

  /**
   * Assign a task to user(s) by email
   */
  async assignTask(todoId: string, emails: string[]): Promise<{ success: boolean; data?: TodoResponse; message?: string }> {
    try {
      const response = await axiosInstance.post(`/api/todos/${todoId}/assign`, { emails });
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('[todoApi] Assign failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to assign task'
      };
    }
  },

  /**
   * Remove assignee from a task
   */
  async unassignTask(todoId: string, email?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axiosInstance.post(`/api/todos/${todoId}/unassign`, { email });
      return {
        success: response.data.success,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('[todoApi] Unassign failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to unassign task'
      };
    }
  },

  /**
   * Search users by name or email (for assignee picker)
   */
  async searchUsers(query: string): Promise<{ _id: string; name: string; email: string; avatar?: string }[]> {
    try {
      const response = await axiosInstance.get(`/api/search`, { params: { q: query } });
      return response.data.data || [];
    } catch (error: any) {
      console.error('[todoApi] User search failed:', error);
      return [];
    }
  },

  /**
   * Generate task fields using AI from a natural language prompt
   */
  async generateTaskWithAI(
    prompt: string,
    workspaceMembers: { name: string; email: string }[] = [],
    availableTags: string[] = [],
    preSelectedAssignees: { name: string; email: string }[] = []
  ): Promise<{
    success: boolean;
    data?: {
      title: string;
      description?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      dueDate?: string;
      tags?: string[];
      assignees?: string[];
    };
    message?: string;
  }> {
    try {
      const response = await axiosInstance.post('/api/todos/ai/generate', {
        prompt,
        workspaceMembers,
        availableTags,
        preSelectedAssignees,
      });
      return { success: true, data: response.data.data };
    } catch (error: any) {
      console.error('[todoApi] AI task generation failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'AI generation failed',
      };
    }
  },
};
