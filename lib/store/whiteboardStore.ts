import { create } from 'zustand';

export interface Drawing {
  id: string;
  name: string;
  data: any;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  isCloudSynced?: boolean;
}

interface WhiteboardState {
  drawings: Drawing[];
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  setDrawings: (drawings: Drawing[]) => void;
  addDrawing: (drawing: Drawing) => void;
  updateDrawing: (id: string, updates: Partial<Drawing>) => void;
  deleteDrawing: (id: string) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
  reset: () => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set) => ({
  drawings: [],
  isLoading: false,
  isInitialized: false,

  setDrawings: (drawings) => set({ drawings, isInitialized: true, isLoading: false }),

  addDrawing: (drawing) => set((state) => ({
    drawings: [...state.drawings, drawing]
  })),

  updateDrawing: (id, updates) => set((state) => ({
    drawings: state.drawings.map(d => 
      d.id === id ? { ...d, ...updates } : d
    )
  })),

  deleteDrawing: (id) => set((state) => ({
    drawings: state.drawings.filter(d => d.id !== id)
  })),

  setLoading: (loading) => set({ isLoading: loading }),

  initialize: () => set({ isInitialized: true }),

  reset: () => set({ drawings: [], isInitialized: false, isLoading: false })
}));
