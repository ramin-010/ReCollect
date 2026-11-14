import axiosInstance from '@/lib/utils/axios';

/** Personal access tokens (Settings → Agents) and agent edits ("From your agent" on Home). */

export interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface AgentEdit {
  id: string;
  kind: string;
  agentName: string;
  summary: string;
  docId: string | null;
  entityId: string | null;
  createdAt: string;
  undoneAt: string | null;
  seenAt: string | null;
  /** False when it can no longer be undone (e.g. the revision it scheduled is already done). */
  canUndo: boolean;
}

type Raw = Record<string, unknown>;
const unwrap = <T>(r: { data: { data?: T } & Raw }): T => (r.data.data ?? (r.data as unknown as T)) as T;
const idOf = (x: Raw) => String(x.id ?? x._id ?? '');

const toToken = (t: Raw): ApiToken => ({
  id: idOf(t),
  name: String(t.name ?? ''),
  prefix: String(t.prefix ?? ''),
  scopes: Array.isArray(t.scopes) ? (t.scopes as string[]) : [],
  lastUsedAt: (t.lastUsedAt as string | null) ?? null,
  createdAt: String(t.createdAt ?? ''),
  revokedAt: (t.revokedAt as string | null) ?? null,
});

const toEdit = (e: Raw): AgentEdit => ({
  id: idOf(e),
  kind: String(e.kind ?? ''),
  agentName: String(e.agentName ?? 'Your agent'),
  summary: String(e.summary ?? ''),
  docId: (e.docId as string | null) ?? null,
  entityId: (e.entityId as string | null) ?? null,
  createdAt: String(e.createdAt ?? ''),
  undoneAt: (e.undoneAt as string | null) ?? null,
  seenAt: (e.seenAt as string | null) ?? null,
  canUndo: e.canUndo !== false,
});

const list = (x: unknown): Raw[] => (Array.isArray(x) ? (x as Raw[]) : Array.isArray((x as Raw)?.tokens) ? ((x as Raw).tokens as Raw[]) : Array.isArray((x as Raw)?.edits) ? ((x as Raw).edits as Raw[]) : []);

export const agentApi = {
  async listTokens(): Promise<ApiToken[]> {
    return list(unwrap(await axiosInstance.get('/api/tokens'))).map(toToken);
  },
  async createToken(body: { name: string; scopes: string[] }): Promise<{ token: string; meta: ApiToken }> {
    const d = unwrap<Raw>(await axiosInstance.post('/api/tokens', body));
    const meta = (d.token && typeof d.token === 'object' ? (d.token as Raw) : d) as Raw;
    const plain = String((typeof d.token === 'string' ? d.token : null) ?? d.plainToken ?? d.secret ?? meta.token ?? '');
    return { token: plain, meta: toToken(meta) };
  },
  async revokeToken(id: string): Promise<void> {
    await axiosInstance.delete(`/api/tokens/${id}`);
  },
  async listEdits(params: { unseen?: boolean; since?: string } = {}): Promise<AgentEdit[]> {
    return list(unwrap(await axiosInstance.get('/api/agent/edits', { params }))).map(toEdit);
  },
  async undoEdit(id: string): Promise<void> {
    await axiosInstance.post(`/api/agent/edits/${id}/undo`);
  },
  /** The doc as Markdown (the same text an agent reads). */
  async docMarkdown(docId: string): Promise<string> {
    const d = unwrap<Raw>(await axiosInstance.get(`/api/agent/docs/${docId}`));
    return String(d.markdown ?? '');
  },
  /** Markdown → the doc's blocks (the server's dialect), for pasting Markdown into the editor. */
  async markdownToBlocks(markdown: string): Promise<Record<string, unknown>[]> {
    const d = unwrap<Raw>(await axiosInstance.post('/api/agent/markdown', { markdown }));
    return Array.isArray(d.content) ? (d.content as Record<string, unknown>[]) : [];
  },
  async markSeen(ids: string[]): Promise<void> {
    if (ids.length) await axiosInstance.post('/api/agent/edits/seen', { ids });
  },
};
