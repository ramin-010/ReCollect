// lib/api/tags.ts
import axiosInstance from '../utils/axios';
import { ApiResponse, Tag } from '../utils/types';

export const tagsApi = {
  // Get all tags
  getAll: async (): Promise<ApiResponse<Tag[]>> => {
    const response = await axiosInstance.get('/api/tags');
    return response.data;
  },

  // Search tags by query
  search: async (query: string): Promise<ApiResponse<Tag[]>> => {
    const response = await axiosInstance.get('/api/tags', {
      params: { q: query }
    });
    return response.data;
  },
};