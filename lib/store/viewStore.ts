// lib/store/viewStore.ts
import { create } from 'zustand';

export type ViewType = 'dashboard' | 'settings' | 'drawing' | 'todo' | 'expenses' | 'docs';
export type TodoFilterType = 'inbox' | 'today' | 'upcoming' | 'completed';

interface ViewState {
  currentView: ViewType;
  todoFilter: TodoFilterType;
  setCurrentView: (view: ViewType) => void;
  setTodoFilter: (filter: TodoFilterType) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'dashboard',
  todoFilter: 'inbox',
  setCurrentView: (view) => set({ currentView: view }),
  setTodoFilter: (filter) => set({ todoFilter: filter, currentView: 'todo' }),
}));