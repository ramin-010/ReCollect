/**
 * Settings › Your data (TRUST_PLAN T3, T4): what Kaaga keeps for this account, who can see it, and what the app showed
 * the owner of it. Cookie only; read live.
 */
import axiosInstance from '@/lib/utils/axios';

/** The kinds of things an account keeps, counted. */
export type KeepKind = 'docs' | 'notes' | 'pocket' | 'tasks' | 'reminders' | 'goals' | 'subjects' | 'memories' | 'conversations' | 'sessions' | 'files';

export interface AccountSummary {
  keeps: Array<{ kind: KeepKind; count: number }>;
  /** Docs shared with someone or published (newest first, at most 10), with the totals. */
  shares: { docs: Array<{ id: string; title: string; people: number; published: boolean }>; shared: number; people: number; published: number };
  /** The agents and apps that can read or change this account's data (live tokens). */
  agents: Array<{ id: string; name: string; lastUsedAt: string | null; createdAt: string }>;
  /** This account runs the server (its own People page; no log about itself). */
  isOwner: boolean;
}

export type OwnerAccessKind = 'viewed' | 'topped_up' | 'limit_set' | 'access_ended' | 'access_restored';

export interface OwnerAccessRow {
  kind: OwnerAccessKind;
  at: string;
  details: { usd?: number; limitUsd?: number | null; shown?: string[] } | null;
}

export const accountApi = {
  async summary(): Promise<AccountSummary> {
    return (await axiosInstance.get('/api/account/summary')).data.data as AccountSummary;
  },
  async ownerAccess(): Promise<{ isOwner: boolean; rows: OwnerAccessRow[] }> {
    return (await axiosInstance.get('/api/account/owner-access')).data.data as { isOwner: boolean; rows: OwnerAccessRow[] };
  },
};
