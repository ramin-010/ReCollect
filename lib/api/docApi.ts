/**
 * Doc API - Unified yjsState storage with image upload support
 */

import axiosInstance from '@/lib/utils/axios';

export interface ServerDoc {
  _id: string;
  yjsState?: string; 
  title: string;
  coverImage: string | null;
  isPinned: boolean;
  isArchived: boolean;
  trashedAt?: string | null;
  cloudImages?: { imageId: string; cloudUrl: string; cloudPublicId: string }[];
  collaborators?: Array<{
    user: string | { _id: string; name: string; email: string };
    role: 'editor' | 'viewer';
    addedAt: string;
  }>;
  role?: 'owner' | 'editor' | 'viewer';
  updatedAt: string;
  createdAt: string;
  /** DOC_PAGES_PLAN: the doc it is a page of, the docs above it the user can open (root first), the pages inside it. */
  parentId?: string | null;
  trail?: Array<{ _id: string; title: string }>;
  pages?: Array<{ _id: string; title: string; position: number; pages: number }>;
}

/** A doc found by GET /api/docs/search: titles and text on Postgres full-text, best match first. */
export interface DocSearchHit {
  _id: string;
  title: string;
  updatedAt: string;
  /** The doc's text around the first match ('' for an empty doc). */
  snippet: string;
  /** [start, end) of each matched word in `snippet`; none when only the title matched. */
  marks: Array<[number, number]>;
  /** DOC_PAGES_PLAN: the titles of the docs above it, root first (an older server sends none). */
  path?: string[];
}

/** GET /api/docs/:id/tree: the tree a doc is in, as this user sees it (root first, depth-first). */
export interface DocTreeNode {
  _id: string;
  parentId: string | null;
  title: string;
  position: number;
}

/** What trash and restore answer (DOC_PAGES_PLAN D8: the pages that went or came back with it). */
export interface TrashAnswer {
  _id: string;
  title?: string;
  trashedAt: string | null;
  pages?: number;
  detached?: boolean;
}

export const docApi = {

  /** A new doc; with `content` (a template's JSON) it starts with it, as blocks (the server converts it). */
  async createDoc(data: { title: string; content?: unknown; parentId?: string }): Promise<{ success: boolean; data?: ServerDoc }> {
    console.log('[docApi] Creating new doc:', data.title);
    const response = await axiosInstance.post('/api/docs', data);
    return {
      success: response.data.success,
      data: response.data.data,
    };
  },


  async fetchAllDocs(): Promise<ServerDoc[]> {
    console.log('[docApi] Fetching all docs');
    const response = await axiosInstance.get('/api/docs');
    return response.data.data || [];
  },

  /** The library's search: every word matches in some form (a stem, or a word's start). */
  async searchDocs(q: string, opts: { signal?: AbortSignal } = {}): Promise<DocSearchHit[]> {
    const response = await axiosInstance.get('/api/docs/search', { params: { q: q.slice(0, 200) }, signal: opts.signal });
    return response.data.data || [];
  },

  async fetchDoc(id: string): Promise<ServerDoc | null> {
    console.log('[docApi] Fetching doc:', id);
    try {
      const response = await axiosInstance.get(`/api/docs/${id}`);
      // The caller's role comes beside the doc (GET /api/docs/:id answers { data, role }).
      return response.data.data ? { ...response.data.data, role: response.data.role } : null;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async trashDoc(id: string): Promise<TrashAnswer> {
    const response = await axiosInstance.post(`/api/docs/${id}/trash`);
    return response.data.data;
  },

  async restoreDoc(id: string): Promise<TrashAnswer> {
    const response = await axiosInstance.post(`/api/docs/${id}/restore`);
    return response.data.data;
  },

  /** DOC_PAGES_PLAN §4.9: the tree a doc is in. */
  async fetchTree(id: string): Promise<{ rootId: string; nodes: DocTreeNode[] }> {
    const response = await axiosInstance.get(`/api/docs/${id}/tree`);
    return response.data.data;
  },

  /** Inside another doc (null: the top level), after one of its pages or at the 'start'; `after` alone reorders. */
  async moveDoc(id: string, to: { parentId?: string | null; after?: string }): Promise<ServerDoc> {
    const response = await axiosInstance.patch(`/api/docs/${id}`, to);
    return response.data.data;
  },

  /** Every doc in the trash, deleted for good. */
  async emptyTrash(): Promise<{ deleted: number }> {
    const response = await axiosInstance.post('/api/docs/trash/empty');
    return response.data.data;
  },

  async setPinned(id: string, isPinned: boolean): Promise<void> {
    await axiosInstance.patch(`/api/docs/${id}`, { isPinned });
  },

  async deleteDoc(id: string): Promise<{ success: boolean }> {
    console.log('[docApi] Deleting doc:', id);
    const response = await axiosInstance.delete(`/api/docs/${id}`);
    return { success: response.data.success };
  },

  /**
   * Generate AI content for docs editor
   * @param prompt - The user's writing request
   * @param context - Optional surrounding text for better context
   * @returns TipTap JSON content array
   */
  async generateAIContent(prompt: string, context?: string): Promise<{
    success: boolean;
    data?: { content: any[] };
    provider?: string;
    nodeCount?: number;
  }> {
    console.log('[docApi] Generating AI content:', prompt.slice(0, 80));
    const response = await axiosInstance.post('/api/docs/ai/generate', { prompt, context });
    return response.data;
  },
};

