import { create } from 'zustand';
import { assistantApi, type AssistantThread } from '@/lib/api/assistantApi';

/**
 * Ask AI's conversations, shared by the main sidebar's Chats list and the Ask AI page (a new chat
 * shows in the sidebar as it starts; one deleted from the sidebar leaves the page).
 */
interface AskThreadsState {
  threads: AssistantThread[] | null | 'failed';
  load: (force?: boolean) => Promise<void>;
  /** A conversation made or moved to the top (it was just used). */
  upsert: (t: Pick<AssistantThread, '_id' | 'title'> & Partial<AssistantThread>) => void;
  remove: (id: string) => void;
}

let inFlight: Promise<void> | null = null;

export const useAskThreads = create<AskThreadsState>((set, get) => ({
  threads: null,
  async load(force = false) {
    if (!force && Array.isArray(get().threads)) return;
    if (inFlight) return inFlight;
    inFlight = assistantApi
      .listThreads()
      .then((threads) => set({ threads }))
      .catch(() => {
        // Keep a list already shown; only an empty start shows the failure.
        if (!Array.isArray(get().threads)) set({ threads: 'failed' });
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  },
  upsert(t) {
    set((s) => {
      const list = Array.isArray(s.threads) ? s.threads : [];
      const old = list.find((x) => x._id === t._id);
      const now = new Date().toISOString();
      const next: AssistantThread = { ...(old ?? {}), ...t, createdAt: t.createdAt ?? old?.createdAt ?? now, updatedAt: t.updatedAt ?? now } as AssistantThread;
      return { threads: [next, ...list.filter((x) => x._id !== t._id)] };
    });
  },
  remove(id) {
    set((s) => ({ threads: Array.isArray(s.threads) ? s.threads.filter((x) => x._id !== id) : s.threads }));
  },
}));
