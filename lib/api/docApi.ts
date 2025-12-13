/**
 * Doc API - Real backend integration with image upload support
 */

import axiosInstance from '@/lib/utils/axios';

export interface ServerDoc {
  _id: string;
  content: any;
  title: string;
  coverImage: string | null;
  isPinned: boolean;
  isArchived: boolean;
  cloudImages?: { nodeId: string; cloudUrl: string; cloudPublicId: string }[];
  updatedAt: string;
  createdAt: string;
}

/**
 * Extract images from TipTap JSON content and prepare for upload
 * Converts data URLs to blobs and replaces with PENDING_UPLOAD placeholders
 */
export const extractImagesFromContent = async (content: any): Promise<{
  formData: FormData;
  imageNodeIds: string[];
  contentWithPlaceholders: any;
}> => {
  const formData = new FormData();
  const imageNodeIds: string[] = [];
  
  // Deep clone content to avoid mutating original
  const modifiedContent = JSON.parse(JSON.stringify(content));
  
  // Recursive function to find and process image nodes
  const processNode = async (node: any): Promise<void> => {
    if (node.type === 'image' && node.attrs?.src) {
      // Only process data URLs (already-uploaded cloud URLs should remain unchanged)
      if (node.attrs.src.startsWith('data:')) {
        try {
          // Convert data URL to blob
          const response = await fetch(node.attrs.src);
          const blob = await response.blob();
          
          // Generate unique node ID
          const nodeId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Append blob to FormData with the wildcard pattern
          formData.append(`image_${nodeId}`, blob, 'image.png');
          imageNodeIds.push(nodeId);
          
          // Replace data URL with placeholder
          node.attrs.src = `PENDING_UPLOAD:${nodeId}`;
          
          console.log(`[docApi] Extracted image: ${nodeId}`);
        } catch (err) {
          console.error('[docApi] Failed to extract image:', err);
        }
      }
    }
    
    // Recursively process child nodes
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        await processNode(child);
      }
    }
  };
  
  await processNode(modifiedContent);
  
  return { formData, imageNodeIds, contentWithPlaceholders: modifiedContent };
};

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
   * Save document to server with image upload support
   */
  async saveDoc(id: string, data: {
    content: any;
    title: string;
    coverImage: string | null;
  }): Promise<{ success: boolean; updatedAt: string; data?: ServerDoc }> {
    console.log('[docApi] Saving doc:', id);
    
    // Extract images from content
    const { formData, imageNodeIds, contentWithPlaceholders } = await extractImagesFromContent(data.content);
    
    // Add other fields to FormData
    formData.append('content', JSON.stringify(contentWithPlaceholders));
    formData.append('title', data.title);
    if (data.coverImage !== null) {
      formData.append('coverImage', data.coverImage);
    }
    formData.append('imageNodeIds', JSON.stringify(imageNodeIds));
    
    console.log(`[docApi] Uploading ${imageNodeIds.length} images`);
    
    const response = await axiosInstance.post(`/api/docs/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return {
      success: response.data.success,
      updatedAt: response.data.data?.updatedAt || new Date().toISOString(),
      data: response.data.data,
    };
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
