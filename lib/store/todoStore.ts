import { create } from 'zustand';

export interface Todo {
  _id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
  reminderDate?: string;
}

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setTodos: (todos: Todo[]) => void;
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  removeTodo: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
  isLoading: false,
  isInitialized: false,

  setTodos: (todos) => set({ todos, isInitialized: true, isLoading: false }),

  addTodo: (todo) => set((state) => ({
    todos: [todo, ...state.todos]
  })),

  updateTodo: (id, updates) => set((state) => ({
    todos: state.todos.map(t =>
      t._id === id ? { ...t, ...updates } : t
    )
  })),

  removeTodo: (id) => set((state) => ({
    todos: state.todos.filter(t => t._id !== id)
  })),

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => set({ todos: [], isInitialized: false, isLoading: false })
}));
