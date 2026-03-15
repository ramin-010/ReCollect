/**
 * Slide API - Server communication for slide decks
 * Supports image uploads via FormData (mirrors drawingApi pattern)
 */

import axiosInstance from '@/lib/utils/axios';
import { slideImageStorage } from '@/lib/storage/slideImageStorage';

export interface ServerSlideDeck {
  _id: string;
  name: string;
  content: string;
  previewContent?: string;
  cloudImages?: Array<{
    imageId: string;
    cloudUrl: string;
    cloudPublicId: string;
  }>;
  role?: string;
  isPinned?: boolean;
  deckType?: string;
  updatedAt: string;
  createdAt: string;
}

export interface SaveDeckResult {
  success: boolean;
  data?: ServerSlideDeck;
  imageUrlMap?: Record<string, { url: string; publicId: string }>;
}

export const slideApi = {

  async fetchAllDecks(): Promise<ServerSlideDeck[]> {
    const response = await axiosInstance.get('/api/slides');
    return response.data.data || [];
  },

  async fetchDeck(id: string): Promise<ServerSlideDeck | null> {
    try {
      const response = await axiosInstance.get(`/api/slides/${id}`);
      return response.data.data || null;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  async patchDeck(id: string, updates: Partial<ServerSlideDeck>): Promise<{ success: boolean; data?: ServerSlideDeck }> {
    const response = await axiosInstance.patch(`/api/slides/${id}`, updates);
    return { success: response.data.success, data: response.data.data };
  },

  async createDeck(name: string): Promise<{ success: boolean; data?: ServerSlideDeck }> {
    const response = await axiosInstance.post('/api/slides', { name });
    return { success: response.data.success, data: response.data.data };
  },

  /**
   * Save deck content to server with image support.
   * - pendingImageIds: imageIds of blocks that have NOT been uploaded to cloud yet
   * - allImageIds: ALL image block imageIds currently in the deck (for orphan cleanup)
   */
  async saveDeck(
    id: string,
    data: { content: string; name: string },
    pendingImageIds: string[] = [],
    allImageIds: string[] = [],
  ): Promise<SaveDeckResult> {
    console.log(`[slideApi] SAVE ${id} | pending: ${pendingImageIds.length}, all: ${allImageIds.length}`);

    if (pendingImageIds.length > 0) {
      const formData = new FormData();
      const actualImageFileIds: string[] = [];

      for (const imageId of pendingImageIds) {
        try {
          const blob = await slideImageStorage.getImage(imageId);
          if (blob) {
            formData.append(`image_${imageId}`, blob, `${imageId}.webp`);
            actualImageFileIds.push(imageId);
            console.log(`[slideApi] Appending image ${imageId} (${(blob.size / 1024).toFixed(2)} KB)`);
          }
        } catch (err) {
          console.error(`[slideApi] Failed to get image ${imageId} from IndexedDB:`, err);
        }
      }

      formData.append('content', data.content);
      formData.append('name', data.name);
      formData.append('imageFileIds', JSON.stringify(actualImageFileIds));
      formData.append('allImageIds', JSON.stringify(allImageIds));

      const response = await axiosInstance.post(`/api/slides/${id}/save`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log(`[slideApi] SAVE ${id} | Success`);

      return {
        success: response.data.success,
        data: response.data.data,
        imageUrlMap: response.data.imageUrlMap,
      };
    } else {
      const response = await axiosInstance.post(`/api/slides/${id}/save`, {
        content: data.content,
        name: data.name,
        allImageIds,
      });

      console.log(`[slideApi] SAVE ${id} | Success (no images)`);

      return {
        success: response.data.success,
        data: response.data.data,
      };
    }
  },

  async deleteDeck(id: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(`/api/slides/${id}`);
    return { success: response.data.success };
  },

  async updateDeck(id: string, data: { name?: string }): Promise<{ success: boolean; data?: ServerSlideDeck }> {
    const response = await axiosInstance.patch(`/api/slides/${id}`, data);
    return { success: response.data.success, data: response.data.data };
  },

  /**
   * Generate slides using AI (OpenRouter).
   * Returns the raw SlideCanvasData JSON from the AI model.
   */
  async generateWithAi(prompt: string, model?: string): Promise<{
    success: boolean;
    data?: any;
    model?: string;
    slideCount?: number;
    blockCount?: number;
    message?: string;
  }> {
    const response = await axiosInstance.post('/api/slides/ai/generate', {
      prompt,
      model,
    });
    return response.data;
  },
};
