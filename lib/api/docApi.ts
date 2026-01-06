/**
 * Doc API - Unified yjsState storage with image upload support
 */

import axiosInstance from '@/lib/utils/axios';
import { imageStorage } from '@/lib/storage/imageStorage';

export interface ServerDoc {
  _id: string;
  yjsState?: string; 
  title: string;
  coverImage: string | null;
  isPinned: boolean;
  isArchived: boolean;
  cloudImages?: { imageId: string; cloudUrl: string; cloudPublicId: string }[];
  updatedAt: string;
  createdAt: string;
}

function extractAllImageIds(content: any): string[] {
  const allIds: string[] = [];
  
  function traverse(node: any) {
    if (node.type === 'resizableImage' || node.type === 'image') {
      if (node.attrs?.imageId) {
        allIds.push(node.attrs.imageId);
      }
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }
  
  traverse(content);
  return allIds;
}

/**
 * Extract pending image nodes that need uploading
 * Returns array of { imageId, path } for images with blob URLs
 */
function extractPendingImages(content: any): { imageId: string; path: number[] }[] {
  const pending: { imageId: string; path: number[] }[] = [];
  
  function traverse(node: any, path: number[] = []) {
    if (node.type === 'resizableImage' || node.type === 'image') {
      if (node.attrs?.imageId && node.attrs.src?.startsWith('blob:')) {
        pending.push({ imageId: node.attrs.imageId, path: [...path] });
      }
    }
    
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any, index: number) => {
        traverse(child, [...path, index]);
      });
    }
  }
  
  traverse(content);
  return pending;
}

export const docApi = {
  /**
   * Create a new doc (lets MongoDB generate valid ID)
   */
  async createDoc(data: { title: string }): Promise<{ success: boolean; data?: ServerDoc }> {
    console.log('[docApi] Creating new doc:', data.title);
    const response = await axiosInstance.post('/api/docs', data);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  },

  /**
   * Fetch all docs for current user
   */
  async fetchAllDocs(): Promise<ServerDoc[]> {
    console.log('[docApi] Fetching all docs');
    const response = await axiosInstance.get('/api/docs');
    return response.data.data || [];
  },

  /**
   * Fetch single document from server
   */
  async fetchDoc(id: string): Promise<ServerDoc | null> {
    console.log('[docApi] Fetching doc:', id);
    try {
      const response = await axiosInstance.get(`/api/docs/${id}`);
      return response.data.data || null;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Save document to server
   * Always sends JSON content - backend handles yjsState conversion
   */
  async saveDoc(id: string, data: {
    content: any;
    title: string;
    coverImage: string | null;
  }): Promise<{ success: boolean; updatedAt: string; data?: ServerDoc }> {
    console.log('[docApi] Saving doc:', id);
    
    
    const allImageIds = extractAllImageIds(data.content);
    
    
    const pendingImages = extractPendingImages(data.content);
    console.log('[docApi] All images:', allImageIds.length, '| Pending:', pendingImages.length);
    
    if (pendingImages.length > 0) {
      
      const formData = new FormData();
      const imageNodeIds: string[] = [];
      
      for (const { imageId } of pendingImages) {
        try {
          const blob = await imageStorage.getImage(imageId);
          if (blob) {
            formData.append(`image_${imageId}`, blob, 'image.png');
            imageNodeIds.push(imageId);
          }
        } catch (err) {
          console.error(`[docApi] Failed to get image ${imageId}:`, err);
        }
      }
      
      
      formData.append('content', JSON.stringify(data.content));
      formData.append('title', data.title);
      formData.append('coverImage', data.coverImage || '');
      formData.append('imageNodeIds', JSON.stringify(imageNodeIds));
      formData.append('allImageIds', JSON.stringify(allImageIds));
      
      console.log('[docApi] Sending FormData with', imageNodeIds.length, 'images');
      
      const response = await axiosInstance.post(`/api/docs/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      
      for (const imageId of imageNodeIds) {
        try {
          await imageStorage.deleteImage(imageId);
        } catch (err) {
          console.error(`[docApi] Failed to cleanup image ${imageId}:`, err);
        }
      }
      
      return {
        success: response.data.success,
        updatedAt: response.data.data?.updatedAt || new Date().toISOString(),
        data: response.data.data,
      };
    } else {
      
      const response = await axiosInstance.post(`/api/docs/${id}`, {
        content: data.content,
        title: data.title,
        coverImage: data.coverImage,
        allImageIds: allImageIds,
      });
      
      return {
        success: response.data.success,
        updatedAt: response.data.data?.updatedAt || new Date().toISOString(),
        data: response.data.data,
      };
    }
  },

  /**
   * Delete document from server
   */
  async deleteDoc(id: string): Promise<{ success: boolean }> {
    console.log('[docApi] Deleting doc:', id);
    const response = await axiosInstance.delete(`/api/docs/${id}`);
    return { success: response.data.success };
  },
};

