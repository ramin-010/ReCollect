/**
 * Drawing API - Server communication for drawings
 * Supports image uploads via FormData (mirrors docs pattern)
 */

import axiosInstance from '@/lib/utils/axios';
import { drawingImageStorage } from '@/lib/storage/drawingImageStorage';

export interface ServerDrawing {
  _id: string;
  localId: string;
  name: string;
  yjsState?: string;
  thumbnail: string;
  collaborators?: Array<{
    user: string | { _id: string; name: string; email: string; avatar?: string };
    role: 'editor' | 'viewer';
    addedAt: string;
  }>;
  cloudImages?: Array<{
    imageId: string;
    cloudUrl: string;
    cloudPublicId: string;
  }>;
  role?: 'owner' | 'editor' | 'viewer';
  updatedAt: string;
  createdAt: string;
}

export interface ExcalidrawFile {
  mimeType: string;
  id: string;
  dataURL: string;
  created?: number;
  isCloudUploaded?: boolean;
}

export interface SaveDrawingResult {
  success: boolean;
  updatedAt: string;
  data?: ServerDrawing;
  imageUrlMap?: Record<string, { url: string; publicId: string }>;
}

export const drawingApi = {
  /**
   * Fetch all drawings for current user
   */
  async fetchAllDrawings(): Promise<ServerDrawing[]> {
    console.log('[drawingApi] Fetching all drawings');
    const response = await axiosInstance.get('/api/drawings');
    return response.data.data || [];
  },

  /**
   * Fetch single drawing from server
   */
  async fetchDrawing(id: string): Promise<ServerDrawing | null> {
    console.log('[drawingApi] Fetching drawing:', id);
    try {
      const response = await axiosInstance.get(`/api/drawings/${id}`);
      const data = response.data.data;
      
      // Log received size
      if (data?.yjsState) {
        const sizeKB = (new TextEncoder().encode(data.yjsState).length / 1024).toFixed(2);
        console.log(`[drawingApi] FETCH ${id} | Received yjsState: ${sizeKB} KB`);
      }
      
      return data || null;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Save drawing to server with image support
   * @param pendingFiles - Excalidraw files that need cloud upload (dataURL starts with 'data:' and not cloudUploaded)
   * @param allFileIds - All current file IDs in the drawing (for orphan cleanup)
   */
  async saveDrawing(
    id: string, 
    data: {
      yjsState: string;
      name: string;
      thumbnail?: string;
    },
    pendingFiles: ExcalidrawFile[] = [],
    allFileIds: string[] = []
  ): Promise<SaveDrawingResult> {
    // Log outgoing size
    const sizeKB = (new TextEncoder().encode(data.yjsState).length / 1024).toFixed(2);
    console.log(`[drawingApi] SAVE ${id} | yjsState: ${sizeKB} KB | pendingFiles: ${pendingFiles.length} | allFiles: ${allFileIds.length}`);

    // If there are pending files, use FormData
    if (pendingFiles.length > 0) {
      const formData = new FormData();
      const imageFileIds: string[] = [];

      for (const file of pendingFiles) {
        // Convert dataURL to Blob for upload
        const blob = drawingImageStorage.dataURLtoBlob(file.dataURL);
        if (blob) {
          formData.append(`image_${file.id}`, blob, `${file.id}.webp`);
          imageFileIds.push(file.id);
          console.log(`[drawingApi] Appending image ${file.id} (${(blob.size / 1024).toFixed(2)} KB)`);
        }
      }

      formData.append('yjsState', data.yjsState);
      formData.append('name', data.name);
      formData.append('thumbnail', data.thumbnail || '');
      formData.append('imageFileIds', JSON.stringify(imageFileIds));
      formData.append('allImageIds', JSON.stringify(allFileIds));

      console.log(`[drawingApi] SAVE ${id} | Sending FormData with ${imageFileIds.length} images`);

      const response = await axiosInstance.post(`/api/drawings/${id}/save`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log(`[drawingApi] SAVE ${id} | Success`);

      return {
        success: response.data.success,
        updatedAt: response.data.data?.updatedAt || new Date().toISOString(),
        data: response.data.data,
        imageUrlMap: response.data.imageUrlMap,
      };
    } else {
      // No pending files, simple JSON request
      const response = await axiosInstance.post(`/api/drawings/${id}/save`, {
        yjsState: data.yjsState,
        name: data.name,
        thumbnail: data.thumbnail || '',
        allImageIds: allFileIds,
      });

      console.log(`[drawingApi] SAVE ${id} | Success`);

      return {
        success: response.data.success,
        updatedAt: response.data.data?.updatedAt || new Date().toISOString(),
        data: response.data.data,
      };
    }
  },

  /**
   * Create a new drawing
   */
  async createDrawing(data: { name: string; localId: string }): Promise<{ success: boolean; data?: ServerDrawing }> {
    console.log('[drawingApi] Creating new drawing:', data.name);
    const response = await axiosInstance.post('/api/drawings', data);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  },

  /**
   * Delete drawing from server
   */
  async deleteDrawing(id: string): Promise<{ success: boolean }> {
    console.log('[drawingApi] Deleting drawing:', id);
    const response = await axiosInstance.delete(`/api/drawings/${id}`);
    return { success: response.data.success };
  },

  /**
   * Update drawing metadata (name, etc)
   */
  async updateDrawing(id: string, data: { name?: string }): Promise<{ success: boolean; data?: ServerDrawing }> {
    console.log('[drawingApi] Updating drawing:', id);
    const response = await axiosInstance.patch(`/api/drawings/${id}`, data);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  },
};
