import axiosInstance from '@/lib/utils/axios';

/**
 * The buddy (context/specs/BUDDY_MEMORY_PLAN.md): what Recollect knows about the user, from his chats
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
  /** MCP_MEMORY_PLAN §4.3: an assistant's conclusion, not the user's words. */
  inferred?: boolean;
  /** §4.3: two versions said on one day in an unknown order, or (§12.4 B2) newer words that may replace it (null: settled). */
  checkSince?: string | null;
  /** Its place in a chain of corrections: what replaced it, what it replaced. */
  replacedBy?: { _id: string; text: string } | null;
  replaces?: { _id: string; text: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuddySettings {
  enabled: boolean;
  paused: boolean;
  name: string | null;
  tone: 'candid' | 'gentle' | 'bro';
  capUsd: number;
  /** B9: it keeps a log of what he works on. */
  workLog: boolean;
  /** Stage 12: connected chats see what work folders logged (older servers: absent). */
  shareOfficeWork?: boolean;
  /** Stage 16: their goal on the phone's pictures (off by default). */
  goalOnScreens?: boolean;
  /** Stage 3: threads, questions and the check when words show (ECOSYSTEM_V2_PLAN §4). */
  loop: boolean;
  /** Stage 5: the buddy may ask him questions. */
  asksOn?: boolean;
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

/** Stage 5b: one thing it learned about his screens ("Questions not before 19:00", "Off the lock screen: …"). */
export interface ScreenRule {
  _id: string;
  kind: 'asks_from' | 'asks_days' | 'topic';
  what: string;
  threadId: string | null;
  thread: string | null;
  /** His words, or the line a thumb was on. */
  text: string;
  /** said | thumb */
  source: string;
  createdAt: string;
}

/** Stage 5b: why a "not this". */
export type ThumbReason = 'private' | 'time' | 'useless' | 'wrong';
export const THUMB_REASONS: Array<{ reason: ThumbReason; label: string }> = [
  { reason: 'private', label: 'Too private' },
  { reason: 'time', label: 'Wrong time' },
  { reason: 'useless', label: 'Not useful' },
  { reason: 'wrong', label: 'Not true' },
];

export interface YouData {
  settings: BuddySettings;
  counts: MemoryCounts;
  memories: Memory[];
  routines: Routine[];
  /** The ear meter (stage 5): each source it heard lately, when it was last heard, the last 7 days' messages. */
  sources?: Array<{ source: string; last: string | null; seen7: number; dropped7: number; silent: boolean }>;
  /** MCP_MEMORY_PLAN §4.7: the latest catch-up (what was saved while its AI could not read), if any. */
  catchUp?: { state: string; notes: number; things: number; firstDay: string | null; lastDay: string | null; finishedAt: string | null } | null;
  /** Stage 5b: what it learned about his screens (his words, or a "too private" thumb), each removable. */
  screenRules?: ScreenRule[];
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
  /** "This one is right" on a memory marked check. */
  settle?: true;
}

/** Stage 7 (§4.7): one of the buddy's own silent reminders. */
export interface BuddyReminderItem {
  _id: string;
  text: string;
  at: string;
  thread: string | null;
}

/** Stage 7 (V1): his own words on the lock screen for a window. */
export interface LockPin {
  _id: string;
  text: string;
  from: string;
  to: string;
  days: number[];
  until: string | null;
  setBy: 'you' | 'agent' | 'ask_ai';
  now: boolean;
}

/** Stage 8 (E5): a chat export brought in: its estimate, then how far the reading got. */
export interface BuddyImport {
  _id: string;
  source: string;
  fileName: string | null;
  chats: number;
  messages: number;
  known: number;
  pieces: number;
  estimateUsd: number;
  limitUsd: number | null;
  state: 'estimated' | 'queued' | 'cancelled';
  queued: number;
  waiting: number;
  oldest: string | null;
  newest: string | null;
  createdAt: string;
}

export interface BuddyUsage {
  month: { spentUsd: number; capUsd: number };
  days: Array<{ day: string; seen: number; kept: number; notes: number; items: number; costUsd: number; eventPulses?: number; pulsesSkipped?: number }>;
}

/** GET /api/buddy/today: the line for now, the day's step (its three lines, note and follow-up). */
export interface BuddyToday {
  enabled: boolean;
  paused: boolean;
  name: string | null;
  /** Stage 5: the loop is on (Home's "Tell" then opens the buddy's chat with his words). */
  loop?: boolean;
  slot: 'morning' | 'afternoon' | 'evening';
  /** `key`: what a thumb on it names (stage 7: a timed line's start, else its part of the day); `from`: a timed line's start (HH:mm); `until`: when it ends. */
  line: { slot: string; key?: string; from?: string; until?: string; text: string; form: string; lockOk: boolean; fallback?: boolean; dayId: string } | null;
  day: { _id: string; day: string; lines: unknown; note: string | null; followUp: string | null } | null;
  /** Stage 3: the buddy's open questions (still true now), with their quick answers. */
  asks?: BuddyAskItem[];
}

/** One of the buddy's questions (ECOSYSTEM_V2_PLAN §4.4): answered by a tap, by his words, or a thumb down. */
export interface BuddyAskItem {
  _id: string;
  text: string;
  answers: Array<{ label: string; meaning: string }>;
  threadId: string | null;
  until: string;
}

/** GET /api/buddy/work: their work as one picture, newest day first (B9; stage 12: each thing once at its newest). */
export type WorkKind = 'did' | 'decided' | 'stuck' | 'next';
export interface WorkLineView {
  _id: string;
  kind: WorkKind;
  text: string;
  at?: string | null;
  source?: 'summary' | 'agent';
  /** Stage 12: the app that wrote it. */
  app?: string | null;
  /** Stage 12: what came after it on a later day (an open problem fixed, a decision changed). */
  later?: { kind: WorkKind; day: string; text: string; word: 'fixed' | 'done' | 'changed' | 'reopened' | 'updated' } | null;
  /** Stage 12: an open line a later done line likely closed, not linked yet. */
  likely?: { _id: string; text: string; day: string; app: string | null } | null;
}
export interface WorkDay {
  day: string;
  projects: Array<{ project: string; office: boolean; minutes: number; sessions: number; commits: string[]; lines: WorkLineView[] }>;
}

/** A thread: one thing going on in his life that the buddy keeps an eye on (ECOSYSTEM_V2_PLAN §4.1, stage 5). */
export type ThreadStage = 'noticed' | 'active' | 'committed' | 'paused' | 'done' | 'dropped';
export interface BuddyThread {
  _id: string;
  title: string;
  stage: ThreadStage;
  sensitive: boolean;
  rhythm: 'none' | 'daily' | 'weekly';
  firstDay: string;
  lastSaidAt: string;
  lookAgainOn: string | null;
  last: Array<{ day: string; kind: string; text: string }>;
  noAsk: boolean;
  onScreens: boolean;
  quietUntil: string | null;
}
export interface BuddyThreadDetail extends BuddyThread {
  steer: string | null;
  history: Array<{ day: string; kind: string; text: string; direct: boolean; via: string }>;
}
export interface ThreadPatch {
  askLess?: true;
  noAsk?: boolean;
  onScreens?: boolean;
  stage?: 'dropped' | 'paused' | 'active';
}

const unwrap = <T>(r: { data: { data?: T } }): T => r.data.data as T;

export const buddyApi = {
  you: async (): Promise<YouData> => unwrap(await axiosInstance.get('/api/buddy/you')),
  addMemory: async (input: { text: string; kind: MemoryKind; private?: boolean }): Promise<Memory> => unwrap(await axiosInstance.post('/api/buddy/memories', input)),
  updateMemory: async (id: string, patch: MemoryPatch): Promise<Memory> => unwrap(await axiosInstance.patch(`/api/buddy/memories/${encodeURIComponent(id)}`, patch)),
  forgetMemory: async (id: string): Promise<{ deleted: true; notes: number }> => unwrap(await axiosInstance.delete(`/api/buddy/memories/${encodeURIComponent(id)}`)),
  updateSettings: async (patch: Partial<Pick<BuddySettings, 'enabled' | 'paused' | 'name' | 'tone' | 'capUsd' | 'workLog' | 'shareOfficeWork' | 'goalOnScreens' | 'loop' | 'asksOn'>>): Promise<BuddySettings> =>
    unwrap(await axiosInstance.patch('/api/buddy/settings', patch)),
  /** Think now (the night step again today); 409 when it is off, paused or at its cap. */
  thinkNow: async (): Promise<unknown> => unwrap(await axiosInstance.post('/api/buddy/think')),
  usage: async (): Promise<BuddyUsage> => unwrap(await axiosInstance.get('/api/buddy/usage')),
  // Stage 7 (§4.7): the buddy's own reminders, and his take-back.
  buddyReminders: async (): Promise<BuddyReminderItem[]> => unwrap(await axiosInstance.get('/api/buddy/reminders')),
  cancelBuddyReminder: async (id: string): Promise<{ cancelled: boolean }> => unwrap(await axiosInstance.delete(`/api/buddy/reminders/${encodeURIComponent(id)}`)),
  // Stage 7 (V1): his words on the lock screen.
  lockPins: async (): Promise<LockPin[]> => unwrap(await axiosInstance.get('/api/lock-pins')),
  setLockPin: async (body: { text: string; to?: string; from?: string }): Promise<LockPin> => unwrap(await axiosInstance.post('/api/lock-pins', body)),
  clearLockPin: async (id: string): Promise<{ cleared: number }> => unwrap(await axiosInstance.post('/api/lock-pins/clear', { id })),
  // Stage 8 (E5): bring in other chats.
  imports: async (): Promise<BuddyImport[]> => unwrap(await axiosInstance.get('/api/buddy/imports')),
  importChats: async (data: unknown, fileName: string): Promise<BuddyImport> => unwrap(await axiosInstance.post('/api/buddy/import', { export: data, fileName })),
  approveImport: async (id: string, limitUsd: number): Promise<BuddyImport> => unwrap(await axiosInstance.post(`/api/buddy/imports/${encodeURIComponent(id)}/approve`, { limitUsd })),
  cancelImport: async (id: string): Promise<BuddyImport> => unwrap(await axiosInstance.post(`/api/buddy/imports/${encodeURIComponent(id)}/cancel`, {})),
  today: async (): Promise<BuddyToday> => unwrap(await axiosInstance.get('/api/buddy/today')),
  tell: async (text: string): Promise<unknown> => unwrap(await axiosInstance.post('/api/buddy/tell', { text })),
  feedback: async (input: { buddyDayId: string; target: string; verdict: 'more' | 'less'; reason?: ThumbReason; words?: string }): Promise<{ saved: true; offScreens?: 'threads' | 'topic' }> => unwrap(await axiosInstance.post('/api/buddy/feedback', input)),
  /** Stage 5b: Remove on /you › On my screens. */
  endScreenRule: async (id: string): Promise<unknown> => unwrap(await axiosInstance.delete(`/api/buddy/screens/${encodeURIComponent(id)}`)),
  /** His answer to a question: a quick answer's index, his own words, or a thumb down. Safe to send twice. */
  answerAsk: async (id: string, body: { choice?: number; text?: string; thumb?: 'less'; reason?: ThumbReason }): Promise<{ state: string }> =>
    unwrap(await axiosInstance.post(`/api/buddy/asks/${encodeURIComponent(id)}/answer`, body)),
  setRoutine: async (id: string, enabled: boolean): Promise<Routine> => unwrap(await axiosInstance.patch(`/api/buddy/routines/${encodeURIComponent(id)}`, { enabled })),
  answer: async (memoryId: string, answer: 'yes' | 'no'): Promise<unknown> => unwrap(await axiosInstance.post('/api/buddy/questions', { memoryId, answer })),
  /** His work log (the last 7 days, or what matches `q`). */
  work: async (params: { q?: string; from?: string; to?: string; project?: string; view?: 'all' | 'done' | 'decided' | 'open' } = {}): Promise<WorkDay[]> => unwrap(await axiosInstance.get('/api/buddy/work', { params })),
  /** He removes a line: hidden for good (it is never written again). */
  hideWork: async (id: string): Promise<unknown> => unwrap(await axiosInstance.delete(`/api/buddy/work/${encodeURIComponent(id)}`)),
  /** What is on his mind (the open threads, newest word first). */
  threads: async (): Promise<BuddyThread[]> => unwrap(await axiosInstance.get('/api/buddy/threads', { params: { limit: 50 } })),
  thread: async (id: string): Promise<BuddyThreadDetail> => unwrap(await axiosInstance.get(`/api/buddy/threads/${encodeURIComponent(id)}`)),
  updateThread: async (id: string, patch: ThreadPatch): Promise<BuddyThreadDetail> => unwrap(await axiosInstance.patch(`/api/buddy/threads/${encodeURIComponent(id)}`, patch)),
  addThread: async (title: string): Promise<BuddyThreadDetail> => unwrap(await axiosInstance.post('/api/buddy/threads', { title })),
  forgetThread: async (id: string): Promise<unknown> => unwrap(await axiosInstance.delete(`/api/buddy/threads/${encodeURIComponent(id)}`)),
  /** Everything as JSON, for a file download. */
  exportAll: async (): Promise<unknown> => unwrap(await axiosInstance.get('/api/buddy/export')),
};
