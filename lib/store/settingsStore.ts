import { create } from 'zustand';

interface SettingsState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  activeTab: 'profile',
  setActiveTab: (activeTab) => set({ activeTab }),
}));
