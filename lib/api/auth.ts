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

  preSignup: async (data: SignupInput): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post('/api/pre-signup', data);
    return response.data;
  },

  verifySignup: async (data: { email: string; otp: string }): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.post('/api/verify-signup', data);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post('/api/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data: { email: string; otp: string; newPassword: string }): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.post('/api/reset-password', data);
    return response.data;
  },
};