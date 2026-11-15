// lib/store/docStore.ts
import { create } from 'zustand';


export interface Doc {
  _id: string;
  title: string;
  yjsState?: string;
  previewState?: string;
  isPinned: boolean;
  isArchived: boolean;
  /** In the trash since then (the library's Trash view, the doc page's bar), or null. */
  trashedAt?: string | null;
  /** Published to the web since then (the library's Shared view), or null. */
  publishedAt?: string | null;
  /** Who owns it (GET /api/docs). */
  owner?: { _id: string; name: string; email: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
  coverImage?: string | null;
  user?: string | {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  collaborators?: Array<{
    user: string | { _id: string, name: string, email: string, avatar?: string };
    role: 'editor' | 'viewer';
    addedAt: string;
  }>;
  role?: 'owner' | 'editor' | 'viewer';
  hasUnsyncedChanges?: boolean;
  pendingLocalContent?: string; // JSON content to inject into collab editor after connect
  sourceDocId?: string; // For local copies: the original server doc ID this was copied from
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
  fetchDocs: () => Promise<void>;
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

  fetchDocs: async () => {
    try {
      set({ isLoading: true });
      const { default: axiosInstance } = await import('@/lib/utils/axios');
      const response = await axiosInstance.get('/api/docs');
      // Every doc is live on the server (one live editor for every doc): no offline copies to merge (D1).
      const mergedDocs = response.data.success ? response.data.data : [];

      set({ docs: mergedDocs, isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch docs:', error);
      set({ isLoading: false });
    }
  }
}));

