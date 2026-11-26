// Sharing (MANAGER_AND_DOCS_PLAN §2): publish a doc (a read-only link, stable until switched off) and
// add people by email (can view / can edit). The backend: backend/src/services/docs/docSharing.service.ts.
import axiosInstance from '@/lib/utils/axios';

export type ShareRole = 'viewer' | 'editor';

export interface ShareUser {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface DocPerson extends ShareUser {
  role: ShareRole;
  addedAt: string;
}

export interface DocRequest {
  _id: string;
  user: ShareUser;
  role: ShareRole;
  requestedAt: string;
}

export interface Published {
  url: string;
  slug: string;
  since: string;
}

/** The Share popover's state. `requests` is the owner's only (empty for everyone else). */
export interface DocPeople {
  docId: string;
  title: string;
  owner: ShareUser;
  you: 'owner' | ShareRole;
  people: DocPerson[];
  requests: DocRequest[];
  published: Published | null;
  /** DOC_PAGES_PLAN D6: how many pages are inside it (the owner's: "also the N pages inside"). */
  pages?: number;
}

/** What a reader of a published doc may do besides reading. */
export type PublicAccess = 'anonymous' | 'none' | 'requested' | 'owner' | 'editor' | 'viewer';

export interface PublicDoc {
  title: string;
  coverImage: string | null;
  updatedAt: string;
  publishedAt: string;
  owner: { name: string };
  /** The page's Y.Doc (the blocks and their boards), base64. */
  state: string;
  access: PublicAccess;
  /** Only when the reader has the doc in the app. */
  docId: string | null;
  /** DOC_PAGES_PLAN §7: the published pages inside it (not placed in the text) and its parent, when published. */
  pages?: Array<{ title: string; slug: string }>;
  parent?: { title: string; slug: string } | null;
}

/** The message the server gave, else a fallback in the same voice. */
export function shareError(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' && message ? message : fallback;
}

export const sharingApi = {
  async people(docId: string): Promise<DocPeople> {
    return (await axiosInstance.get(`/api/docs/${docId}/people`)).data.data;
  },
  // DOC_PAGES_PLAN D6: `withPages` does the same to every page inside.
  async publish(docId: string, on: boolean, withPages = false): Promise<Published | null> {
    return (await axiosInstance.put(`/api/docs/${docId}/publish`, { on, ...(withPages ? { withPages } : {}) })).data.data.published;
  },
  async add(docId: string, email: string, role: ShareRole, withPages = false): Promise<{ people: DocPeople; already: boolean; name: string }> {
    const body = (await axiosInstance.post(`/api/docs/${docId}/people`, { email, role, ...(withPages ? { withPages } : {}) })).data;
    return { people: body.data, already: !!body.already, name: String(body.name ?? '') };
  },
  async setRole(docId: string, userId: string, role: ShareRole, withPages = false): Promise<DocPeople> {
    return (await axiosInstance.patch(`/api/docs/${docId}/people/${userId}`, { role, ...(withPages ? { withPages } : {}) })).data.data;
  },
  /** The owner removes someone (the new state), or someone leaves (null). */
  async remove(docId: string, userId: string, withPages = false): Promise<DocPeople | null> {
    const body = (await axiosInstance.delete(`/api/docs/${docId}/people/${userId}${withPages ? '?withPages=1' : ''}`)).data;
    return body.left ? null : body.data;
  },
  async answer(docId: string, requestId: string, answer: 'approve' | 'decline'): Promise<DocPeople> {
    return (await axiosInstance.post(`/api/docs/${docId}/requests/${requestId}/${answer}`)).data.data;
  },
};

export const publicDocApi = {
  async read(slug: string): Promise<PublicDoc> {
    return (await axiosInstance.get(`/api/public/docs/${encodeURIComponent(slug)}`)).data.data;
  },
  async askToEdit(slug: string): Promise<{ already: boolean }> {
    const body = (await axiosInstance.post(`/api/public/docs/${encodeURIComponent(slug)}/request`)).data;
    return { already: !!body.already };
  },
};
