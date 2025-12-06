// lib/api/auth.ts
import axiosInstance from '../utils/axios';
import { ApiResponse, User, SignupInput, LoginInput, GetMeResponse } from '../utils/types';

export const authApi = {
  signup: async (data: SignupInput): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.post('/api/signup', data);
    return response.data;
  },

  login: async (data: LoginInput): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.post('/api/login', data);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<GetMeResponse>> => {
    const response = await axiosInstance.get('/api/get-me');
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post('/api/logout');
    return response.data;
  },
};