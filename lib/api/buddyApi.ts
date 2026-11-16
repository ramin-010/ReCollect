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
  /** B9: it keeps a log of what he works on. */
  workLog: boolean;
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
  /** Notes from his chats the night step has not sorted into memories yet. */
  pending: number;
}

/** Something it does by itself after his standing yes (B6). */
export interface Routine {
  _id: string;
  kind: string;
  title: string;
  enabled: boolean;
  runs: number;
  lastRunDay: string | null;
}

export interface YouData {
  settings: BuddySettings;
  counts: MemoryCounts;
  memories: Memory[];
  routines: Routine[];
  /** The months, newest first, each with its "Still true?" questions still unanswered (B7). */
  chapters: Array<{ _id: string; period: string; text: string; questions: Array<{ memoryId: string; question: string }> }>;
  /** The last 30 days: how much of what it knows he confirmed, his thumbs, what the guards threw out. */
  health: {
    confirmedShare: number;
    thumbs: { more: number; less: number };
    dropped: number;
    steps: number;
    /** Active memories by their first day: this month, the two before, older. */
    byAge?: { month: number; quarter: number; older: number };
    /** The last three calendar months, newest first. */
    months?: Array<{ month: string; more: number; less: number; dropped: number; costUsd: number }>;
  };
}

export interface MemoryPatch {
  text?: string;
  kind?: MemoryKind;
  private?: boolean;
  pinned?: boolean;
  lasting?: boolean;
  status?: 'active' | 'wrong' | 'closed';
}

export interface BuddyUsage {
  month: { spentUsd: number; capUsd: number };
  days: Array<{ day: string; seen: number; kept: number; notes: number; items: number; costUsd: number }>;
}

/** GET /api/buddy/today: the line for now, the day's step (its three lines, note and follow-up). */
export interface BuddyToday {
  enabled: boolean;
  paused: boolean;
  name: string | null;
  slot: 'morning' | 'afternoon' | 'evening';
  line: { slot: string; text: string; form: string; lockOk: boolean; fallback?: boolean; dayId: string } | null;
  day: { _id: string; day: string; lines: unknown; note: string | null; followUp: string | null } | null;
}

/** GET /api/buddy/work: his work log, newest day first (B9). */
export type WorkKind = 'did' | 'decided' | 'stuck' | 'next';
export interface WorkDay {
  day: string;
  projects: Array<{ project: string; office: boolean; minutes: number; sessions: number; commits: string[]; lines: Array<{ _id: string; kind: WorkKind; text: string; at?: string | null; source?: 'summary' | 'agent' }> }>;
}

const unwrap = <T>(r: { data: { data?: T } }): T => r.data.data as T;

export const buddyApi = {
  you: async (): Promise<YouData> => unwrap(await axiosInstance.get('/api/buddy/you')),
  addMemory: async (input: { text: string; kind: MemoryKind; private?: boolean }): Promise<Memory> => unwrap(await axiosInstance.post('/api/buddy/memories', input)),
  updateMemory: async (id: string, patch: MemoryPatch): Promise<Memory> => unwrap(await axiosInstance.patch(`/api/buddy/memories/${encodeURIComponent(id)}`, patch)),
  forgetMemory: async (id: string): Promise<{ deleted: true; notes: number }> => unwrap(await axiosInstance.delete(`/api/buddy/memories/${encodeURIComponent(id)}`)),
  updateSettings: async (patch: Partial<Pick<BuddySettings, 'enabled' | 'paused' | 'name' | 'tone' | 'capUsd' | 'workLog'>>): Promise<BuddySettings> =>
    unwrap(await axiosInstance.patch('/api/buddy/settings', patch)),
  /** Think now (the night step again today); 409 when it is off, paused or at its cap. */
  thinkNow: async (): Promise<unknown> => unwrap(await axiosInstance.post('/api/buddy/think')),
  usage: async (): Promise<BuddyUsage> => unwrap(await axiosInstance.get('/api/buddy/usage')),
  today: async (): Promise<BuddyToday> => unwrap(await axiosInstance.get('/api/buddy/today')),
  tell: async (text: string): Promise<unknown> => unwrap(await axiosInstance.post('/api/buddy/tell', { text })),
  feedback: async (input: { buddyDayId: string; target: string; verdict: 'more' | 'less' }): Promise<unknown> => unwrap(await axiosInstance.post('/api/buddy/feedback', input)),
  setRoutine: async (id: string, enabled: boolean): Promise<Routine> => unwrap(await axiosInstance.patch(`/api/buddy/routines/${encodeURIComponent(id)}`, { enabled })),
  answer: async (memoryId: string, answer: 'yes' | 'no'): Promise<unknown> => unwrap(await axiosInstance.post('/api/buddy/questions', { memoryId, answer })),
  /** His work log (the last 7 days, or what matches `q`). */
  work: async (params: { q?: string; from?: string; to?: string; project?: string } = {}): Promise<WorkDay[]> => unwrap(await axiosInstance.get('/api/buddy/work', { params })),
  /** He removes a line: hidden for good (it is never written again). */
  hideWork: async (id: string): Promise<unknown> => unwrap(await axiosInstance.delete(`/api/buddy/work/${encodeURIComponent(id)}`)),
  /** Everything as JSON, for a file download. */
  exportAll: async (): Promise<unknown> => unwrap(await axiosInstance.get('/api/buddy/export')),
};
