'use client';

/**
 * DOC_PAGES_PLAN §4.4: the tree the open doc is in (GET /api/docs/:id/tree), shared by the sidebar's Pages tab,
 * previous/next at the foot of a page and the doc page itself. The doc page loads it; typing a title renames the row at
 * once; making, moving and trashing a page refresh it.
 */
import { create } from 'zustand';
import { docApi, type DocTreeNode } from '@/lib/api/docApi';

interface DocTreeState {
  /** The doc it was loaded for (the open page). */
  docId: string | null;
  rootId: string | null;
  nodes: DocTreeNode[];
  /** The open page's owner may add, move and trash pages (D7: a tree has one owner). */
  canManage: boolean;
  load: (docId: string, canManage: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  rename: (id: string, title: string) => void;
}

let ticket = 0;

export const useDocTreeStore = create<DocTreeState>((set, get) => ({
  docId: null,
  rootId: null,
  nodes: [],
  canManage: false,

  load: async (docId, canManage) => {
    const known = get().nodes.some((n) => n._id === docId);
    // Within the same tree the rows stay while the fresh copy comes (no flicker from page to page).
    set(known ? { docId, canManage } : { docId, canManage, rootId: null, nodes: [] });
    const mine = ++ticket;
    try {
      const tree = await docApi.fetchTree(docId);
      if (mine === ticket) set({ rootId: tree.rootId, nodes: tree.nodes });
    } catch {
      if (mine === ticket && !known) set({ rootId: null, nodes: [] });
    }
  },

  refresh: async () => {
    const { docId, canManage } = get();
    if (docId) await get().load(docId, canManage);
  },

  rename: (id, title) => set((s) => (s.nodes.some((n) => n._id === id) ? { nodes: s.nodes.map((n) => (n._id === id ? { ...n, title } : n)) } : s)),
}));
