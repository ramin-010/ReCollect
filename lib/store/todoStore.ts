import { create } from 'zustand';

// Subtask type
export interface Subtask {
  id: string;
  text: string;
  isCompleted: boolean;
}

// Reference to doc or content
export interface TaskReference {
  type: 'doc' | 'content' | 'slide';
  refId: string;
  title?: string;
}

// Recurrence pattern
export interface TaskRecurrence {
  pattern: 'daily' | 'weekly' | 'monthly';
  interval?: number;
}

// Main Task interface (Rich Task System)
export interface Todo {
  _id: string;
  title: string;
  description?: string;
  
  // Status & Priority
  status: 'pending' | 'complete';
  priority: 'low' | 'medium' | 'high';
  
  // Dates
  dueDate?: string;
  reminderDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Subtasks
  subtasks?: Subtask[];
  
  // References (bi-directional)
  references?: TaskReference[];
  
  // New Fields
  labels?: { id: string; name: string; color: string }[];
  assignee?: string;

  // Recurrence
  recurrence?: TaskRecurrence;
  
  // Legacy compat
}

// Alias for cleaner naming
export type Task = Todo;

interface TaskState {
  todos: Task[];
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setTodos: (todos: Task[]) => void;
  addTodo: (todo: Task) => void;
  updateTodo: (id: string, updates: Partial<Task>) => void;
  removeTodo: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  
  // New actions
  fetchTasksByRef: (refId: string) => Promise<Task[]>;
  addSubtask: (taskId: string, subtask: Subtask) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
}

export const useTodoStore = create<TaskState>((set, get) => ({
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

  reset: () => set({ todos: [], isInitialized: false, isLoading: false }),
  
  // Fetch tasks by reference ID (for doc sidebar)
  fetchTasksByRef: async (refId: string) => {
    // This will be called by the sidebar component
    // Returns tasks directly, doesn't modify global state
    return get().todos.filter(t => 
      t.references?.some(ref => ref.refId === refId)
    );
  },
  
  // Subtask management
  addSubtask: (taskId, subtask) => set((state) => ({
    todos: state.todos.map(t =>
      t._id === taskId 
        ? { ...t, subtasks: [...(t.subtasks || []), subtask] } 
        : t
    )
  })),
  
  updateSubtask: (taskId, subtaskId, updates) => set((state) => ({
    todos: state.todos.map(t =>
      t._id === taskId 
        ? { 
            ...t, 
            subtasks: t.subtasks?.map(st => 
              st.id === subtaskId ? { ...st, ...updates } : st
            ) 
          } 
        : t
    )
  })),
  
  removeSubtask: (taskId, subtaskId) => set((state) => ({
    todos: state.todos.map(t =>
      t._id === taskId 
        ? { ...t, subtasks: t.subtasks?.filter(st => st.id !== subtaskId) } 
        : t
    )
  }))
}));

// Alias export for cleaner naming
export const useTaskStore = useTodoStore;

