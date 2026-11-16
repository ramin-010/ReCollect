import axiosInstance from '@/lib/utils/axios';

/**
 * Recall mode (PLAN §4): questions from the doc, answers graded against it, the result moves the
 * revision schedule. This is the contract the backend implements (routes under /api/recall and
 * /api/ai); keep both sides in step.
 */

export type RecallKind = 'recall' | 'apply' | 'explain' | 'pattern' | 'complexity' | 'edge';
export type RecallGrade = 'strong' | 'partial' | 'weak';

export interface RecallQuestion {
  id: string;
  kind: RecallKind;
  prompt: string;
}

export interface RecallAttempt {
  questionId: string;
  grade: RecallGrade;
  /** One or two sentences: what was missing or wrong. Empty for a self-mark. */
  feedback: string;
  /** The doc's own passage that answers it, quoted. */
  quote: string | null;
  selfMarked: boolean;
}

export interface RecallSet {
  id: string;
  revisionId: string;
  docId: string;
  docTitle: string;
  cycleNumber: number;
  questions: RecallQuestion[];
  attempts: RecallAttempt[];
  finishedAt: string | null;
}

export interface RecallOutcome {
  /** strong: the next cycle · partial: the same review again soon · weak: back tomorrow */
  result: RecallGrade;
  effect: { kind: 'advanced' | 'repeat' | 'tomorrow' | 'mastered'; nextDay: string | null };
  counts: Record<RecallGrade, number>;
}

export interface AiUsage {
  month: string;
  spentUsd: number;
  capUsd: number;
  calls: number;
  byFeature: Record<string, number>;
  model: string;
  /** The database's awake hours this month: only on a server whose database sleeps when idle, for its owner. */
  awake?: { month: string; hours: number; allowanceHours: number; percent: number; projectedHours: number };
}

/** Why recall can't run: no API key on the server, the monthly cap, an empty doc, a finished review, or a failure. */
export type RecallUnavailable = 'not-configured' | 'cap-reached' | 'no-content' | 'already-done' | 'failed';

export function recallErrorKind(err: unknown): RecallUnavailable {
  const res = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
  const status = res?.status;
  const code = res?.data?.code;
  if (code === 'AI_CAP_REACHED' || status === 402) return 'cap-reached';
  if (code === 'AI_NOT_CONFIGURED' || status === 503) return 'not-configured';
  if (code === 'NO_CONTENT' || status === 422) return 'no-content';
  if (code === 'NOT_PENDING' || status === 409) return 'already-done';
  // 404 without a code is a missing route (an old API); with one it is a missing revision.
  if (status === 404 && !code) return 'not-configured';
  return 'failed';
}

const data = <T>(r: { data: { data?: T } }) => r.data.data as T;

export const recallApi = {
  /** Gets the ready question set for a due revision, writing it now if the nightly batch has not. */
  async start(revisionId: string): Promise<RecallSet> {
    return data(await axiosInstance.post('/api/recall/start', { revisionId }));
  },
  async answer(setId: string, body: { questionId: string; answer?: string; selfMark?: 'knew' | 'didnt' }): Promise<RecallAttempt> {
    return data(await axiosInstance.post(`/api/recall/sets/${setId}/answer`, body));
  },
  async finish(setId: string): Promise<RecallOutcome> {
    return data(await axiosInstance.post(`/api/recall/sets/${setId}/finish`));
  },
  async usage(): Promise<AiUsage> {
    return data(await axiosInstance.get('/api/ai/usage'));
  },
  async setCap(capUsd: number): Promise<AiUsage> {
    return data(await axiosInstance.patch('/api/ai/settings', { capUsd }));
  },
};
