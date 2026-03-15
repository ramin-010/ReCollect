import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set((state) => ({
    unreadCount: typeof count === 'function' ? count(state.unreadCount) : count
  }))
}));
