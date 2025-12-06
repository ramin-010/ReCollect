// lib/api/dashboard.ts
import axiosInstance from '../utils/axios';
import { ApiResponse, Dashboard, DashboardInput, GetDashboardContentsResponse } from '../utils/types';

export const dashboardApi = {
  create: async (data: DashboardInput): Promise<ApiResponse<Dashboard>> => {
    const response = await axiosInstance.post('/api/create-dash', data);
    return response.data;
  },

  update: async (id: string, data: Partial<DashboardInput>): Promise<ApiResponse<Dashboard>> => {
    const response = await axiosInstance.patch(`/api/update-dash/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.delete(`/api/delete-dash/${id}`);
    return response.data;
  },

  getContents: async (id: string): Promise<ApiResponse<GetDashboardContentsResponse>> => {
    const response = await axiosInstance.get(`/api/dashboard/${id}/contents`);
    return response.data;
  },
};