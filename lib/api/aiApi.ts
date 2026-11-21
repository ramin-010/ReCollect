import axiosInstance from '@/lib/utils/axios';

/** D2 and D3 (PLAN §4): the practice note writer and the weekly coach. Errors share Recall's codes. */

export interface PracticeNoteBody {
  problem: string;
  solution: string;
  language?: string;
  struggles?: string;
  subjectId?: string;
  revise?: boolean;
}

export interface PracticeNoteResult {
  docId: string;
  title: string;
  topicId: string | null;
  nextRevision: string | null;
}

export interface CoachNote {
  id: string;
  weekStart: string;
  weekEnd: string;
  lines: { strong: string; slipping: string; fix: string; deadline: string };
  focus: string[];
  createdAt: string;
}

/** The account's AI now (ECOSYSTEM_V2_PLAN stage 2): whose key pays, and whether it works. */
export interface AiAccess {
  source: 'none' | 'own_key' | 'house';
  /** `allowance` (stage 11): a friend's free AI waits; `allowance.reason` says why. */
  state: 'ok' | 'no_credit' | 'bad_key' | 'cap' | 'off' | 'allowance';
  since: string | null;
  /** Stage 11: free AI the owner gave this account (absent for anyone else). */
  allowance?: {
    grantedUsd: number;
    usedUsd: number;
    leftUsd: number;
    todayUsd: number;
    dailyCapUsd: number;
    since: string;
    reason: 'empty' | 'day' | 'ceiling' | null;
  };
}

const data = <T>(r: { data: { data?: T } }) => r.data.data as T;

export const aiApi = {
  /** Whether the account's AI works now (it answers whatever the AI's state). */
  async access(): Promise<AiAccess> {
    return data(await axiosInstance.get('/api/ai/access'));
  },
  /** "Try again": asks a paused key at once, then answers the state. */
  async retryAccess(): Promise<AiAccess> {
    return data(await axiosInstance.post('/api/ai/access/retry', {}, { timeout: 30_000 }));
  },
  /** Writes a DSA note from a solved problem and returns the new doc. */
  async practiceNote(body: PracticeNoteBody): Promise<PracticeNoteResult> {
    return data(await axiosInstance.post('/api/ai/practice-note', body, { timeout: 120_000 }));
  },
  async coach(): Promise<CoachNote | null> {
    return data(await axiosInstance.get('/api/ai/coach'));
  },
  async generateCoach(fresh = false): Promise<CoachNote> {
    return data(await axiosInstance.post(`/api/ai/coach${fresh ? '?fresh=1' : ''}`, undefined, { timeout: 120_000 }));
  },
};
