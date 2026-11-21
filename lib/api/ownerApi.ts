import axiosInstance from '@/lib/utils/axios';

/** Stage 11 (ECOSYSTEM_V2_PLAN): the People page (the owner only), invites, feedback and the phone's diagnostics. */

export type AllowanceReason = 'empty' | 'day' | 'ceiling';

export interface Allowance {
  grantedUsd: number;
  usedUsd: number;
  leftUsd: number;
  todayUsd: number;
  dailyCapUsd: number;
  since: string;
  reason: AllowanceReason | null;
}

export type PersonAi = 'own_key' | 'allowance' | 'list' | 'none';

export interface Person {
  id: string;
  name: string;
  email: string;
  joined: string;
  lastActive: string | null;
  isOwner: boolean;
  endedAt: string | null;
  ai: PersonAi;
  allowance: Allowance | null;
  byFeature: Array<{ label: string; usd: number }>;
  last7Usd: number;
  appsConnected: number;
  phone: { at: string; details: Record<string, unknown> } | null;
}

export interface Invite {
  id: string;
  email: string;
  name: string;
  allowanceUsd: number;
  link: string;
  state: 'open' | 'used' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
}

export interface FeedbackItem {
  id: string;
  personId: string;
  name: string;
  text: string;
  source: string;
  page: string | null;
  at: string;
}

export interface People {
  people: Person[];
  invites: Invite[];
  friends: { ceilingUsd: number; month: string; spentUsd: number };
  feedback: FeedbackItem[];
  inviteAllowanceUsd: number;
}

export type AddPersonResult = { kind: 'invite'; invite: Invite } | { kind: 'granted'; personId: string; name: string };

export interface InviteView {
  email: string;
  name: string;
  from: string;
  allowanceUsd: number;
  state: Invite['state'];
}

const data = <T>(r: { data: { data?: T } }) => r.data.data as T;

let ownerCheck: Promise<boolean> | null = null;

export const ownerApi = {
  /** Whether this account runs the server (asked once a session; the sidebar's People link). */
  isOwner(): Promise<boolean> {
    ownerCheck ??= axiosInstance.get('/api/owner/check').then(
      (r) => Boolean(data<{ owner: boolean }>(r)?.owner),
      () => {
        ownerCheck = null;
        return false;
      },
    );
    return ownerCheck;
  },
  async people(): Promise<People> {
    return data(await axiosInstance.get('/api/owner/people'));
  },
  async addPerson(body: { email: string; name: string; allowanceUsd: number }): Promise<AddPersonResult> {
    return data(await axiosInstance.post('/api/owner/people', body));
  },
  async topUp(id: string, amountUsd: number): Promise<void> {
    await axiosInstance.post(`/api/owner/people/${id}/top-up`, { amountUsd });
  },
  async setDailyCap(id: string, dailyCapUsd: number | null): Promise<void> {
    await axiosInstance.patch(`/api/owner/people/${id}`, { dailyCapUsd });
  },
  async endAccess(id: string): Promise<void> {
    await axiosInstance.post(`/api/owner/people/${id}/end-access`);
  },
  async restoreAccess(id: string): Promise<void> {
    await axiosInstance.post(`/api/owner/people/${id}/restore-access`);
  },
  async revokeInvite(id: string): Promise<void> {
    await axiosInstance.delete(`/api/owner/invites/${id}`);
  },
  async setCeiling(ceilingUsd: number): Promise<number> {
    return data<{ ceilingUsd: number }>(await axiosInstance.patch('/api/owner/friends', { ceilingUsd })).ceilingUsd;
  },
  /** The signup page: what an invite link says (no login). Null for a link the server doesn't know. */
  async invite(code: string): Promise<InviteView | null> {
    try {
      return data(await axiosInstance.get(`/api/invites/${encodeURIComponent(code)}`));
    } catch (err) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
      throw err;
    }
  },
  /** "Send feedback": their words to the owner. */
  async sendFeedback(text: string, page?: string): Promise<void> {
    await axiosInstance.post('/api/feedback', { text, ...(page ? { page } : {}) });
  },
};
