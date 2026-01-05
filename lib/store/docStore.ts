// lib/store/docStore.ts
import { create } from 'zustand';

export type DocType = 'notes' | 'meeting' | 'project' | 'personal';

export interface Doc {
  _id: string;
  title: string;
  yjsState?: string; // Base64 Yjs state - single source of truth
  docType: DocType;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  coverImage?: string | null;
  user?: string | {
    _id: string;
    name: string;
    email: string;
  };
  collaborators?: Array<{
    user: string | { _id: string, name: string, email: string };
    role: 'editor' | 'viewer';
    addedAt: string;
  }>;
  role?: 'owner' | 'editor' | 'viewer';
}

interface DocState {
  docs: Doc[];
  currentDoc: Doc | null;
  isLoading: boolean;
  isInitialized: boolean;
  setDocs: (docs: Doc[]) => void;
  addDoc: (doc: Doc) => void;
  updateDoc: (id: string, updates: Partial<Doc>) => void;
  removeDoc: (id: string) => void;
  setCurrentDoc: (doc: Doc | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useDocStore = create<DocState>((set) => ({
  docs: [],
  currentDoc: null,
  isLoading: false,
  isInitialized: false,
  
  setDocs: (docs) => set({ docs, isInitialized: true, isLoading: false }),
  
  addDoc: (doc) => set((state) => ({ 
    docs: [doc, ...state.docs] 
  })),
  
  updateDoc: (id, updates) => set((state) => ({
    docs: state.docs.map((d) => d._id === id ? { ...d, ...updates } : d),
    currentDoc: state.currentDoc?._id === id 
      ? { ...state.currentDoc, ...updates } 
      : state.currentDoc
  })),
  
  removeDoc: (id) => set((state) => ({
    docs: state.docs.filter((d) => d._id !== id),
    currentDoc: state.currentDoc?._id === id ? null : state.currentDoc
  })),
  
  setCurrentDoc: (doc) => set({ currentDoc: doc }),
  
  setLoading: (isLoading) => set({ isLoading }),
}));

