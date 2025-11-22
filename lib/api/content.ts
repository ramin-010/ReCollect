// lib/api/content.ts
import axiosInstance from '../utils/axios';
import { ApiResponse, Content, ContentInput } from '../utils/types';

export const contentApi = {
  create: async (data: ContentInput): Promise<ApiResponse<Content>> => {
    const response = await axiosInstance.post('/api/add-content', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ContentInput>): Promise<ApiResponse<Content>> => {
    const response = await axiosInstance.patch(`/api/update-content/${id}`, data);
    return response.data;
  },

  delete: async (id: string, DashId: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.delete(`/api/delete-content/${id}`, {
      data: { DashId }
    });
    return response.data;
  },
};