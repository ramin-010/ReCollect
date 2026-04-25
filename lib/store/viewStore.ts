// lib/store/viewStore.ts
import { create } from 'zustand';

export type ViewType = 'dashboard' | 'home' | 'settings' | 'drawing' | 'todo' | 'expenses' | 'docs' | 'slides' | 'meetings' | 'inbox' | 'presentations' | 'library' | 'collaboration' | 'email' | 'workspace';
export type TodoFilterType = 'inbox' | 'today' | 'upcoming' | 'completed' | 'docs' | 'slides';

interface ViewState {
  currentView: ViewType;
  todoFilter: TodoFilterType;
  isSlideFullscreen: boolean;
  isTodoInputExpanded: boolean;
  isSidebarCollapsed: boolean;
  setCurrentView: (view: ViewType) => void;
  setTodoFilter: (filter: TodoFilterType) => void;
  setSlideFullscreen: (value: boolean) => void;
  setTodoInputExpanded: (value: boolean) => void;
  setSidebarCollapsed: (value: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'home',
  todoFilter: 'inbox',
  isSlideFullscreen: false,
  isTodoInputExpanded: false,
  isSidebarCollapsed: false,
  setCurrentView: (view) => set({ currentView: view }), 
  setTodoFilter: (filter) => set({ todoFilter: filter, currentView: 'todo' }),
  setSlideFullscreen: (value) => set({ isSlideFullscreen: value }),
  setTodoInputExpanded: (value) => set({ isTodoInputExpanded: value }),
  setSidebarCollapsed: (value) => set({ isSidebarCollapsed: value }),
}));