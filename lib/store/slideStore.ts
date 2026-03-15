import { create } from 'zustand';
import { slideApi } from '@/lib/api/slideApi';
import { SlideDeck } from '@/components/slides/editor/useSlidePersistence';

interface SlideState {
  decks: SlideDeck[];
  activeDeck: SlideDeck | null;
  isLoading: boolean;
  isInitialized: boolean;
  setDecks: (decks: SlideDeck[] | ((prev: SlideDeck[]) => SlideDeck[])) => void;
  updateDeck: (id: string, updates: Partial<SlideDeck>) => void;
  addDeck: (deck: SlideDeck) => void;
  removeDeck: (id: string) => void;
  setActiveDeck: (deck: SlideDeck | null | ((prev: SlideDeck | null) => SlideDeck | null)) => void;
  setLoading: (loading: boolean) => void;
  fetchDecks: () => Promise<void>;
}

export const useSlideStore = create<SlideState>((set, get) => ({
  decks: [],
  activeDeck: null,
  isLoading: false,
  isInitialized: false,

  setDecks: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ decks: updater(state.decks) }));
    } else {
      set({ decks: updater });
    }
  },

  updateDeck: (id, updates) => set((state) => ({
    decks: state.decks.map((d) => d.id === id ? { ...d, ...updates } : d),
    activeDeck: state.activeDeck?.id === id
      ? { ...state.activeDeck, ...updates }
      : state.activeDeck,
  })),

  addDeck: (deck) => set((state) => ({
    decks: [deck, ...state.decks],
  })),

  removeDeck: (id) => set((state) => ({
    decks: state.decks.filter((d) => d.id !== id),
    activeDeck: state.activeDeck?.id === id ? null : state.activeDeck,
  })),

  setActiveDeck: (updater) => {
    if (typeof updater === 'function') {
      set((state) => ({ activeDeck: updater(state.activeDeck) }));
    } else {
      set({ activeDeck: updater });
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Server-first fetch (matches docs pattern):
   * 1. Fetch from server (GET /api/slides — returns previewContent, no full content)
   * 2. Load all from IDB
   * 3. Merge via slideSyncHelpers
   * 4. Set state
   * On server failure → fall back to IDB only
   */
  fetchDecks: async () => {
    try {
      set({ isLoading: true });

      // Dynamic imports (matches docs pattern)
      const { slideOfflineStorage } = await import('@/lib/storage/slideOfflineStorage');
      const { mergeSlideDecksWithOffline } = await import('@/lib/utils/slideSyncHelpers');

      const serverDecks = await slideApi.fetchAllDecks();
      const allOfflineDecks = await slideOfflineStorage.getAllDecks();
      const mergedDecks = mergeSlideDecksWithOffline(serverDecks, allOfflineDecks);

      set({ decks: mergedDecks, isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('[SlideStore] fetchDecks failed:', error);
      // Fallback: try IDB-only
      try {
        const { slideOfflineStorage } = await import('@/lib/storage/slideOfflineStorage');
        const { offlineToLocal } = await import('@/components/slides/editor/useSlidePersistence');
        const offlineDecks = await slideOfflineStorage.getAllDecks();
        const localDecks = offlineDecks.map(offlineToLocal);
        set({ decks: localDecks, isInitialized: true, isLoading: false });
      } catch {
        set({ isInitialized: true, isLoading: false });
      }
    }
  }
}));
