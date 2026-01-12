// lib/store/docStore.ts
import { create } from 'zustand';

export type DocType = 'notes' | 'meeting' | 'project' | 'personal';

export interface Doc {
  _id: string;
  title: string;
  yjsState?: string;
  previewState?: string;
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
      // Dynamic imports to manage dependencies
      const { default: axiosInstance } = await import('@/lib/utils/axios');
      const { offlineStorage } = await import('@/lib/utils/offlineStorage');
      const { mergeDocsWithOffline } = await import('@/lib/utils/docSyncHelpers');

      const response = await axiosInstance.get('/api/docs');
      const serverDocs = response.data.success ? response.data.data : [];
      
      const allOfflineDocs = await offlineStorage.getAllOfflineDocs();
      const mergedDocs = mergeDocsWithOffline(serverDocs, allOfflineDocs);

      set({ docs: mergedDocs, isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch docs:', error);
      set({ isLoading: false });
      // Even in error, we might have offline docs? For now just stop loading.
    }
  }
}));

