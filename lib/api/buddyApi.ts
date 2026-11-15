import axiosInstance from '@/lib/utils/axios';

/**
 * The buddy (context/specs/BUDDY_MEMORY_PLAN.md): what Recollect knows about Ramin, from his chats
 * and his own words, and its settings. The page /you draws it; only he can change his memories.
 */

export type MemoryKind = 'fact' | 'preference' | 'value' | 'aim' | 'idea' | 'decision' | 'pattern' | 'state' | 'thread' | 'win';
export type MemoryStatus = 'active' | 'faded' | 'closed' | 'wrong';
export type BuddySource = 'hook' | 'agent' | 'app' | 'tell' | 'feedback' | 'buddy';

export interface Memory {
  _id: string;
  text: string;
  kind: MemoryKind;
  sensitivity: 'open' | 'private';
  status: MemoryStatus;
  lasting: boolean;
  pinned: boolean;
  byUser: boolean;
  tags: string[];
  source: BuddySource;
  agentName: string | null;
  seenCount: number;
  firstSeenDay: string;
  lastSeenDay: string;
  closedDay: string | null;
  closeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuddySettings {
  enabled: boolean;
  paused: boolean;
  name: string | null;
  tone: 'candid' | 'gentle';
  capUsd: number;
  portrait: { who: string | null; heading: string | null; now: string | null };
  lastNightDay: string | null;
  lastStepAt: string | null;
}

export interface MemoryCounts {
  active: number;
  lasting: number;
  working: number;
  faded: number;
  closed: number;
  wrong: number;
  notes: number;
}

export interface YouData {
  settings: BuddySettings;
  counts: MemoryCounts;
  memories: Memory[];
}

export interface MemoryPatch {
  text?: string;
  kind?: MemoryKind;
  private?: boolean;
  pinned?: boolean;
  lasting?: boolean;
  status?: 'active' | 'wrong' | 'closed';
}

const unwrap = <T>(r: { data: { data?: T } }): T => r.data.data as T;

export const buddyApi = {
  you: async (): Promise<YouData> => unwrap(await axiosInstance.get('/api/buddy/you')),
  addMemory: async (input: { text: string; kind: MemoryKind; private?: boolean }): Promise<Memory> => unwrap(await axiosInstance.post('/api/buddy/memories', input)),
  updateMemory: async (id: string, patch: MemoryPatch): Promise<Memory> => unwrap(await axiosInstance.patch(`/api/buddy/memories/${encodeURIComponent(id)}`, patch)),
  forgetMemory: async (id: string): Promise<{ deleted: true; notes: number }> => unwrap(await axiosInstance.delete(`/api/buddy/memories/${encodeURIComponent(id)}`)),
  updateSettings: async (patch: Partial<Pick<BuddySettings, 'enabled' | 'paused' | 'name' | 'tone' | 'capUsd'>>): Promise<BuddySettings> =>
    unwrap(await axiosInstance.patch('/api/buddy/settings', patch)),
  /** Everything as JSON, for a file download. */
  exportAll: async (): Promise<unknown> => unwrap(await axiosInstance.get('/api/buddy/export')),
};
