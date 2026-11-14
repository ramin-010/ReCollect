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

const data = <T>(r: { data: { data?: T } }) => r.data.data as T;

export const aiApi = {
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
