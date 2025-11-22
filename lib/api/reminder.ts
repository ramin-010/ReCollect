// lib/api/reminder.ts
import axiosInstance from '../utils/axios';
import { ApiResponse } from '../utils/types';

interface ReminderInput {
  contentId: string;
  dashboardId: string;
  reminderDate: string;
  message?: string;
}

interface Reminder {
  _id: string;
  contentId: string;
  dashboardId: string;
  reminderDate: string;
  message?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const reminderApi = {
  create: async (data: ReminderInput): Promise<ApiResponse<Reminder>> => {
    const response = await axiosInstance.post('/api/reminder/create', data);
    return response.data;
  },

  getUserReminders: async (): Promise<ApiResponse<Reminder[]>> => {
    const response = await axiosInstance.get('/api/reminder/user');
    return response.data;
  },

  getContentReminder: async (contentId: string): Promise<ApiResponse<Reminder>> => {
    const response = await axiosInstance.get(`/api/reminder/content/${contentId}`);
    return response.data;
  },

  update: async (reminderId: string, data: Partial<ReminderInput>): Promise<ApiResponse<Reminder>> => {
    const response = await axiosInstance.put(`/api/reminder/${reminderId}`, data);
    return response.data;
  },

  cancel: async (reminderId: string): Promise<ApiResponse<null>> => {
    const response = await axiosInstance.delete(`/api/reminder/${reminderId}`);
    return response.data;
  },
};
