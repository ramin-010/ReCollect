// lib/api/shareLink.ts
import axiosInstance from '../utils/axios';
import { ApiResponse, ShareLink } from '../utils/types';

export const shareLinkApi = {
  createContentLink: async (data: { type: 'content'; contentId: string }): Promise<ApiResponse<{ url: string }>> => {
    const response = await axiosInstance.post('/api/create-content-link', data);
    return response.data;
  },

  createDashLink: async (data: { type: 'dashboard'; dashId: string }): Promise<ApiResponse<{ url: string }>> => {
    const response = await axiosInstance.post('/api/create-dash-link', data);
    return response.data;
  },

  fetchContent: async (slug: string): Promise<ApiResponse<ShareLink>> => {
    const response = await axiosInstance.get(`/api/content/${slug}`);
    return response.data;
  },

  fetchDashboard: async (slug: string): Promise<ApiResponse<ShareLink>> => {
    const response = await axiosInstance.get(`/api/dashboard/${slug}`);
    return response.data;
  },
};