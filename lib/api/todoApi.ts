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
  type: 'doc' | 'content';
  refId: string;
  title?: string;
}

export interface CreateTodoPayload {
  title: string;
  description?: string; // HTML string with potential base64 images
  status?: 'pending' | 'complete';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  reminderDate?: string;
  subtasks?: { id: string; text: string; isCompleted: boolean }[];
  labels?: TodoLabel[];
  assignee?: string;
  recurrence?: { pattern: 'daily' | 'weekly' | 'monthly'; interval?: number };
  references?: TaskReference[];
}

export interface TodoResponse {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'complete';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  reminderDate?: string;
  completedAt?: string;
  subtasks?: { id: string; text: string; isCompleted: boolean }[];
  labels?: TodoLabel[];
  attachments?: string[];
  assignee?: string;
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
  imgElements.forEach((img, index) => {
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
    console.log('[todoApi] ========== START createTodo ==========');
    console.log('[todoApi] Title:', payload.title);
    console.log('[todoApi] Description length:', payload.description?.length || 0);
    console.log('[todoApi] Has description:', !!payload.description);

    const { processedHtml, images, imageNodeIds } = payload.description
      ? extractImagesFromHtml(payload.description)
      : { processedHtml: '', images: [], imageNodeIds: [] };

    console.log('[todoApi] Extracted images count:', images.length);
    console.log('[todoApi] Image node IDs:', imageNodeIds);
    console.log('[todoApi] Processed HTML length:', processedHtml?.length || 0);

    if (images.length > 0) {
      console.log('[todoApi] Building FormData with images...');
      
      const formData = new FormData();

      for (const { imageId, blob, mimeType } of images) {
        const ext = getExtension(mimeType);
        const fieldName = `image_${imageId}`;
        console.log('[todoApi] Appending image:', fieldName, 'size:', blob.size, 'type:', mimeType);
        formData.append(fieldName, blob, `image.${ext}`);
      }

      formData.append('title', payload.title);
      formData.append('description', processedHtml);
      formData.append('imageNodeIds', JSON.stringify(imageNodeIds));
      
      console.log('[todoApi] Description in FormData (first 100 chars):', processedHtml?.substring(0, 100));

      if (payload.status) formData.append('status', payload.status);
      if (payload.priority) formData.append('priority', payload.priority);
      if (payload.dueDate) formData.append('dueDate', payload.dueDate);
      if (payload.reminderDate) formData.append('reminderDate', payload.reminderDate);
      if (payload.subtasks) formData.append('subtasks', JSON.stringify(payload.subtasks));
      if (payload.labels) formData.append('labels', JSON.stringify(payload.labels));
      if (payload.assignee) formData.append('assignee', payload.assignee);
      if (payload.recurrence) formData.append('recurrence', JSON.stringify(payload.recurrence));
      if (payload.references) formData.append('references', JSON.stringify(payload.references));

      console.log('[todoApi] Sending FormData with', images.length, 'images to /api/todos');

      try {
        const response = await axiosInstance.post('/api/todos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        console.log('[todoApi] Response success:', response.data.success);
        console.log('[todoApi] ========== END createTodo ==========');

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
      console.log('[todoApi] No images - sending JSON request');

      try {
        const response = await axiosInstance.post('/api/todos', {
          title: payload.title,
          description: payload.description || null,
          status: payload.status || 'pending',
          priority: payload.priority || 'medium',
          dueDate: payload.dueDate,
          reminderDate: payload.reminderDate,
          subtasks: payload.subtasks,
          labels: payload.labels,
          assignee: payload.assignee,
          recurrence: payload.recurrence,
          references: payload.references,
        });

        console.log('[todoApi] Response success:', response.data.success);
        console.log('[todoApi] ========== END createTodo ==========');

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
    console.log('[todoApi] Fetching all todos');
    const response = await axiosInstance.get('/api/todos');
    return response.data.data || [];
  },

  /**
   * Update an existing todo
   */
  async updateTodo(id: string, updates: Partial<CreateTodoPayload>): Promise<{ success: boolean; data?: TodoResponse; message?: string }> {
    console.log('[todoApi] ========== START updateTodo ==========');
    console.log('[todoApi] ID:', id);
    console.log('[todoApi] Updates:', Object.keys(updates));

    const { processedHtml, images, imageNodeIds } = updates.description
      ? extractImagesFromHtml(updates.description)
      : { processedHtml: undefined, images: [], imageNodeIds: [] };

    try {
      if (images.length > 0) {
        console.log('[todoApi] Building FormData for update...');
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
    } finally {
      console.log('[todoApi] ========== END updateTodo ==========');
    }
  },

  /**
   * Delete a todo
   */
  async deleteTodo(id: string): Promise<{ success: boolean; message?: string }> {
    console.log('[todoApi] Deleting todo:', id);
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
   * Update a subtask within a todo
   */
  async updateSubtask(todoId: string, subtaskId: string, updates: { isCompleted?: boolean; text?: string }): Promise<{ success: boolean; message?: string }> {
    console.log('[todoApi] Updating subtask:', todoId, subtaskId, updates);
    try {
      // For now, this fetches the todo, updates the subtask, and saves - since we don't have a dedicated subtask endpoint
      const response = await axiosInstance.get(`/api/todos`);
      const todos = response.data.data || [];
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
};
