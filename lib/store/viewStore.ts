// lib/store/viewStore.ts
import { create } from 'zustand';

export type ViewType = 'dashboard' | 'home' | 'settings' | 'drawing' | 'todo' | 'expenses' | 'docs' | 'slides' | 'meetings' | 'inbox' | 'presentations' | 'library' | 'collaboration' | 'email' | 'workspace';
export type TodoFilterType = 'inbox' | 'today' | 'upcoming' | 'completed' | 'docs' | 'notes' | 'assigned';

interface ViewState {
  currentView: ViewType;
  todoFilter: TodoFilterType;
  isSlideFullscreen: boolean;
  isTodoInputExpanded: boolean;
  setCurrentView: (view: ViewType) => void;
  setTodoFilter: (filter: TodoFilterType) => void;
  setSlideFullscreen: (value: boolean) => void;
  setTodoInputExpanded: (value: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'home',
  todoFilter: 'inbox',
  isSlideFullscreen: false,
  isTodoInputExpanded: false,
  setCurrentView: (view) => set({ currentView: view }), 
  setTodoFilter: (filter) => set({ todoFilter: filter, currentView: 'todo' }),
  setSlideFullscreen: (value) => set({ isSlideFullscreen: value }),
  setTodoInputExpanded: (value) => set({ isTodoInputExpanded: value }),
}));