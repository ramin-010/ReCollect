// lib/store/viewStore.ts
import { create } from 'zustand';

export type ViewType = 'dashboard' | 'home' | 'settings' | 'drawing' | 'todo' | 'expenses' | 'docs' | 'slides' | 'meetings' | 'inbox' | 'presentations' | 'library' | 'collaboration' | 'email';
export type TodoFilterType = 'inbox' | 'today' | 'upcoming' | 'completed' | 'workspace' | 'docs' | 'notes' | 'assigned';

interface ViewState {
  currentView: ViewType;
  todoFilter: TodoFilterType;
  isSlideFullscreen: boolean;
  setCurrentView: (view: ViewType) => void;
  setTodoFilter: (filter: TodoFilterType) => void;
  setSlideFullscreen: (value: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'home',
  todoFilter: 'inbox',
  isSlideFullscreen: false,
  setCurrentView: (view) => set({ currentView: view }), 
  setTodoFilter: (filter) => set({ todoFilter: filter, currentView: 'todo' }),
  setSlideFullscreen: (value) => set({ isSlideFullscreen: value }),
}));