// lib/store/viewStore.ts
import { create } from 'zustand';

export type ViewType = 'dashboard' | 'settings' | 'drawing' | 'todo' | 'expenses' | 'docs';

interface ViewState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
}));
