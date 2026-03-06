/**
 * Notification API — Global Notification Inbox
 */
import axiosInstance from '@/lib/utils/axios';

export interface NotificationSender {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AppNotification {
  _id: string;
  recipient: string;
  sender?: NotificationSender;
  category: 'actionable' | 'informational' | 'promotional';
  type: string;
  title: string;
  message: string;
  icon?: string;
  metadata: Record<string, any>;
  status: 'pending' | 'accepted' | 'declined' | 'dismissed';
  isRead: boolean;
  scheduledFor?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export const notificationApi = {
  async getNotifications(
    page = 1,
    limit = 20,
    filter: 'all' | 'unread' | 'actionable' = 'all'
  ): Promise<{ success: boolean; data: AppNotification[]; pagination: NotificationPagination }> {
    const res = await axiosInstance.get('/api/notifications', {
      params: { page, limit, filter },
    });
    return res.data;
  },

  async getUnreadCount(): Promise<{ success: boolean; data: { count: number } }> {
    const res = await axiosInstance.get('/api/notifications/unread-count');
    return res.data;
  },

  async markAsRead(id: string): Promise<{ success: boolean; data: AppNotification }> {
    const res = await axiosInstance.patch(`/api/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    const res = await axiosInstance.patch('/api/notifications/read-all');
    return res.data;
  },

  async accept(id: string): Promise<{ success: boolean; data: AppNotification; message: string }> {
    const res = await axiosInstance.post(`/api/notifications/${id}/accept`);
    return res.data;
  },

  async decline(id: string): Promise<{ success: boolean; data: AppNotification; message: string }> {
    const res = await axiosInstance.post(`/api/notifications/${id}/decline`);
    return res.data;
  },

  async deleteNotification(id: string): Promise<{ success: boolean; message: string }> {
    const res = await axiosInstance.delete(`/api/notifications/${id}`);
    return res.data;
  },
};
