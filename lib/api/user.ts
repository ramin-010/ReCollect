// lib/api/user.ts
import axiosInstance from '../utils/axios';
import { ApiResponse, User, GetUserSettingsResponse } from '../utils/types';

interface UserProfileInput {
  name?: string;
  email?: string;
  avatar?: string;
}

export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.get('/api/user/profile');
    return response.data;
  },

  updateProfile: async (data: UserProfileInput): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.put('/api/user/profile', data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatar: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await axiosInstance.post('/api/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAccount: async (): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.delete('/api/user/account');
    return response.data;
  },

  getSettings: async (): Promise<ApiResponse<GetUserSettingsResponse>> => {
    const response = await axiosInstance.get('/api/user/settings');
    return response.data;
  },
};
