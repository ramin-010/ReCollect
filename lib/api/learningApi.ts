/**
 * Learning API (Revise's dashboard inside Recollect): one function per endpoint of
 * LEARNING_SPEC §2, plus `uploadLearningFile` and the task helpers the Home page uses.
 *
 * Wire conventions: `{ success: true, data }` on success, `{ message, code? }` on error,
 * `_id` ids, 'YYYY-MM-DD' days, ISO instants. Instants the UI computes with become `Date`s
 * here (see lib/learning/types.ts). Errors are thrown as `LearningApiError`.
 *
 * MOCK MODE: with NEXT_PUBLIC_LEARNING_MOCK=1 every call is served by an in-memory fixture
 * (lib/learning/mock) that simulates the mutations, so the Home page works without the
 * backend. The check is written inline (`process.env.NEXT_PUBLIC_LEARNING_MOCK === '1'`) so
 * the bundler folds it to `false` when the flag is off and drops the mock chunk entirely.
 */
import axiosInstance from '@/lib/utils/axios';
import { todoApi, type CreateTodoPayload } from '@/lib/api/todoApi';
import type {
  Attachment,
  Capture,
  CatchUpBody,
  ChainRevision,
  CreateCaptureBody,
  DayString,
  Debrief,
  DebriefFormBody,
  DebriefSlotBody,
  FocusCarryResult,
  FocusItem,
  Goal,
  GoalBody,
  GoalPatch,
  LearningSettings,
  LearningSettingsPatch,
  MilestoneBody,
  MilestonePatch,
  MilestoneResult,
  QuickNote,
  QuickNoteCategory,
  RawCapture,
  RawQuickNote,
  RawRevisionItem,
  RawTodayPayload,
  RevisionCard,
  RevisionItem,
  ScheduleSlotUpdate,
  Slot,
  StreakSummary,
  Subject,
  SubjectWithTopics,
  Task,
  TodayPayload,
  Topic,
  TopicByDoc,
  UpdateCaptureBody, TopicStatus,
  PathTopic,
  SubjectPath,
  TopicPathPatch,
  SessionKind,
  SessionList,
  MirrorData,
  StandData,
  StandTake,
  StandTakes,
  LeetcodeLink,
  ProjectKind,
  FolderTracking,
  ChatKind,
  ProjectRow,
  StandLens,
  StandWindow,
  RevisionCalendar,
  Suggestion,
  WeekData,
  WeekTarget,
  WorkSession,
} from '@/lib/learning/types';
import { derivePlan } from '@/lib/learning/plan';
import type { LearningMock } from '@/lib/learning/mock/learningMock';

// ─── Errors ─────────────────────────────────────────────────────────────────

export class LearningApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'LearningApiError';
    this.status = status;
    this.code = code;
  }
}

function toApiError(error: unknown): LearningApiError {
  if (error instanceof LearningApiError) return error;
  const e = error as { response?: { status?: number; data?: { message?: string; code?: string } }; message?: string };
  const status = e.response?.status ?? 0;
  const message = e.response?.data?.message || e.message || 'Request failed';
  return new LearningApiError(message, status, e.response?.data?.code);
}

/** Unwraps `{ success, data }`; throws a LearningApiError for HTTP errors. */
async function call<T>(request: () => Promise<{ data: { success?: boolean; data?: T; message?: string } }>): Promise<T> {
  try {
    const res = await request();
    if (res.data && res.data.success === false) throw new LearningApiError(res.data.message || 'Request failed', 400);
    return res.data.data as T;
  } catch (error) {
    throw toApiError(error);
  }
}

// ─── Mock switch ────────────────────────────────────────────────────────────

/** True when the build runs against the in-memory fixtures. */
export const isLearningMock = process.env.NEXT_PUBLIC_LEARNING_MOCK === '1';

async function mock(): Promise<LearningMock | null> {
  // Inline env check (not `isLearningMock`) so dead-code elimination drops the import.
  if (process.env.NEXT_PUBLIC_LEARNING_MOCK === '1') {
    const mod = await import('@/lib/learning/mock/learningMock');
    return mod.getLearningMock();
  }
  return null;
}

// ─── Date conversion at the edge ────────────────────────────────────────────

const toDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function parseRevisionItem(raw: RawRevisionItem): RevisionItem {
  return { ...raw, tags: raw.tags ?? [], completedAt: toDate(raw.completedAt) };
}

export function parseCapture(raw: RawCapture): Capture {
  return {
    ...raw,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    createdAt: toDate(raw.createdAt) ?? new Date(),
    updatedAt: toDate(raw.updatedAt) ?? new Date(),
  };
}

export function parseQuickNote(raw: RawQuickNote): QuickNote {
  return {
    ...raw,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    createdAt: toDate(raw.createdAt) ?? new Date(),
    updatedAt: toDate(raw.updatedAt) ?? new Date(),
  };
}

/**
 * Wire → client payload. Loop v2 sections are normalised so the UI can rely on them:
 *   - `plan` absent (a pre-v2 backend) → derived from `revisions`; `plan: null` = failed section;
 *   - `focus` / `goals` absent or null → null (that part of Home shows as failed, the rest works);
 *   - `schedule` / `triage` may be null while routineEnabled is false.
 */
export function parseToday(raw: RawTodayPayload): TodayPayload {
  const revisions = {
    totalDue: raw.revisions.totalDue,
    dueToday: raw.revisions.dueToday.map(parseRevisionItem),
    overdue: raw.revisions.overdue.map(parseRevisionItem),
    doneToday: raw.revisions.doneToday.map(parseRevisionItem),
  };
  const plan =
    raw.plan === undefined
      ? derivePlan(revisions)
      : raw.plan === null
        ? null
        : { ...raw.plan, planned: raw.plan.planned.map(parseRevisionItem), doneToday: raw.plan.doneToday.map(parseRevisionItem) };
  return {
    ...raw,
    revisions,
    plan,
    focus: raw.focus ?? null,
    goals: raw.goals ?? null,
    tasks: raw.tasks.map((t) => ({ ...t, goalType: t.goalType ?? 'NONE' })),
    inbox: { count: raw.inbox.count, items: raw.inbox.items.map(parseCapture) },
    quickNotes: raw.quickNotes.map(parseQuickNote),
  };
}

// ─── Response shapes of the mutations ───────────────────────────────────────

export interface CompleteResult {
  item: RevisionItem;
  chain: ChainRevision[];
  streak: StreakSummary;
  mastered: boolean;
}

export interface UncompleteResult {
  item: RevisionItem;
  chain: ChainRevision[];
  streak: StreakSummary;
}

export interface RescheduleResult {
  item: RevisionItem;
  chain: ChainRevision[];
}

interface RawItemResult {
  item: RawRevisionItem;
  chain: ChainRevision[];
  streak?: StreakSummary;
  mastered?: boolean;
}

/** A deleted subject, undoable until `undoUntil` (backend subjectDeletion.service.ts). */
export interface SubjectDeletionCounts {
  docs: number;
  topics: number;
  notes: number;
  revisions: number;
  tasks: number;
  sessions: number;
}
export interface SubjectDeletion {
  _id: string;
  subjectId: string;
  name: string;
  deletedAt: string;
  undoUntil: string;
  counts: SubjectDeletionCounts;
  /** Its docs waiting in the trash: they come back with it. */
  docIds: string[];
}

/** PATCH /api/todos/:id body (C2's todo input + goalType). */
export type TaskUpdate = Partial<CreateTodoPayload>;

// ─── API ────────────────────────────────────────────────────────────────────

export const learningApi = {
  // #1
  async getToday(): Promise<TodayPayload> {
    const m = await mock();
    if (m) return parseToday(await m.getToday());
    return parseToday(await call<RawTodayPayload>(() => axiosInstance.get('/api/today')));
  },

  // #2
  async ensureToday(): Promise<{ rolledOver: boolean; days: number }> {
    const m = await mock();
    if (m) return m.ensureToday();
    return call(() => axiosInstance.post('/api/learning/ensure-today'));
  },

  // #3 + loop v2 §1: GET returns every setting plus `timezone`
  async getSettings(): Promise<LearningSettings> {
    const m = await mock();
    if (m) return m.getSettings();
    return call(() => axiosInstance.get('/api/learning/settings'));
  },

  // #3 + loop v2 §1: PATCH accepts any subset (400 INVALID_INPUT / INVALID_TIMEZONE)
  async updateSettings(body: LearningSettingsPatch): Promise<LearningSettings> {
    const m = await mock();
    if (m) return m.updateSettings(body);
    return call(() => axiosInstance.patch('/api/learning/settings', body));
  },

  // ── Loop v2 §2: fresh start (asks first in the UI; no undo). dryRun = the same answer, no writes.
  async freshStart(opts: { dryRun?: boolean } = {}): Promise<{ moved: number; spreadDays: number }> {
    const m = await mock();
    if (m) return m.freshStart(opts);
    return call(() => axiosInstance.post('/api/revisions/fresh-start', opts.dryRun ? { dryRun: true } : {}));
  },

  // ── Loop v2 §3: focus lines (≤ 3 a day; a 4th → 409 FOCUS_LIMIT) ───────────
  async createFocus(text: string): Promise<FocusItem> {
    const m = await mock();
    if (m) return m.createFocus(text);
    return call(() => axiosInstance.post('/api/focus', { text }));
  },

  async updateFocus(id: string, body: { text?: string; done?: boolean }): Promise<FocusItem> {
    const m = await mock();
    if (m) return m.updateFocus(id, body);
    return call(() => axiosInstance.patch(`/api/focus/${id}`, body));
  },

  async deleteFocus(id: string): Promise<{ deleted: true }> {
    const m = await mock();
    if (m) return m.deleteFocus(id);
    return call(() => axiosInstance.delete(`/api/focus/${id}`));
  },

  /** Copies earlier unfinished lines to today (de-duped by text, within the limit). */
  async carryOverFocus(ids: string[]): Promise<FocusCarryResult> {
    const m = await mock();
    if (m) return m.carryOverFocus(ids);
    return call(() => axiosInstance.post('/api/focus/carry-over', { ids }));
  },

  // ── Loop v2 §4: goals and milestones (a 4th active goal → 409 GOAL_LIMIT) ──
  async getGoals(): Promise<Goal[]> {
    const m = await mock();
    if (m) return m.getGoals();
    return call(() => axiosInstance.get('/api/goals'));
  },

  async createGoal(body: GoalBody): Promise<Goal> {
    const m = await mock();
    if (m) return m.createGoal(body);
    return call(() => axiosInstance.post('/api/goals', body));
  },

  async updateGoal(id: string, body: GoalPatch): Promise<Goal> {
    const m = await mock();
    if (m) return m.updateGoal(id, body);
    return call(() => axiosInstance.patch(`/api/goals/${id}`, body));
  },

  async deleteGoal(id: string): Promise<{ deleted: true }> {
    const m = await mock();
    if (m) return m.deleteGoal(id);
    return call(() => axiosInstance.delete(`/api/goals/${id}`));
  },

  async createMilestone(goalId: string, body: MilestoneBody): Promise<MilestoneResult> {
    const m = await mock();
    if (m) return m.createMilestone(goalId, body);
    return call(() => axiosInstance.post(`/api/goals/${goalId}/milestones`, body));
  },

  async updateMilestone(id: string, body: MilestonePatch): Promise<MilestoneResult> {
    const m = await mock();
    if (m) return m.updateMilestone(id, body);
    return call(() => axiosInstance.patch(`/api/goal-milestones/${id}`, body));
  },

  async deleteMilestone(id: string): Promise<{ deleted: true; goal: Goal }> {
    const m = await mock();
    if (m) return m.deleteMilestone(id);
    return call(() => axiosInstance.delete(`/api/goal-milestones/${id}`));
  },

  // #4
  async startRevisions(target: { topicId: string } | { captureId: string }): Promise<{ chain: ChainRevision[] }> {
    const m = await mock();
    if (m) return m.startRevisions(target);
    return call(() => axiosInstance.post('/api/revisions/start', target));
  },

  // #5
  async completeRevision(id: string): Promise<CompleteResult> {
    const m = await mock();
    const raw: RawItemResult = m ? await m.completeRevision(id) : await call(() => axiosInstance.post(`/api/revisions/${id}/complete`));
    return { item: parseRevisionItem(raw.item), chain: raw.chain, streak: raw.streak ?? { current: 0, longest: 0 }, mastered: !!raw.mastered };
  },

  // #6
  async uncompleteRevision(id: string): Promise<UncompleteResult> {
    const m = await mock();
    const raw: RawItemResult = m ? await m.uncompleteRevision(id) : await call(() => axiosInstance.post(`/api/revisions/${id}/uncomplete`));
    return { item: parseRevisionItem(raw.item), chain: raw.chain, streak: raw.streak ?? { current: 0, longest: 0 } };
  },

  // #7
  async rescheduleRevision(id: string, day: DayString): Promise<RescheduleResult> {
    const m = await mock();
    const raw: RawItemResult = m
      ? await m.rescheduleRevision(id, day)
      : await call(() => axiosInstance.post(`/api/revisions/${id}/reschedule`, { day }));
    return { item: parseRevisionItem(raw.item), chain: raw.chain };
  },

  // #8
  async getSubjects(): Promise<SubjectWithTopics[]> {
    const m = await mock();
    if (m) return m.getSubjects();
    return call(() => axiosInstance.get('/api/subjects'));
  },

  // #9
  async createSubject(body: { name: string; description?: string; color?: string; icon?: string }): Promise<Subject> {
    const m = await mock();
    if (m) return m.createSubject(body);
    return call(() => axiosInstance.post('/api/subjects', body));
  },

  // #10
  async updateSubject(id: string, body: Partial<Pick<Subject, 'name' | 'description' | 'color' | 'icon'>>): Promise<Subject> {
    const m = await mock();
    if (m) return m.updateSubject(id, body);
    return call(() => axiosInstance.patch(`/api/subjects/${id}`, body));
  },

  // #11: the subject and everything in it, undoable for a week (the owner, 11-22).
  async deleteSubject(id: string): Promise<SubjectDeletion> {
    const m = await mock();
    if (m) return m.deleteSubject(id) as unknown as SubjectDeletion;
    return call(() => axiosInstance.delete(`/api/subjects/${id}`));
  },

  /** What deleting a subject would take, for the confirm. */
  async subjectDeletionPreview(id: string): Promise<{ name: string; counts: SubjectDeletionCounts; undoDays: number }> {
    return call(() => axiosInstance.get(`/api/subjects/${id}/deletion`));
  },

  /** Deleted subjects that can still be brought back. */
  async listSubjectDeletions(): Promise<SubjectDeletion[]> {
    return call(() => axiosInstance.get('/api/subject-deletions'));
  },

  async undoSubjectDeletion(id: string): Promise<{ subjectId: string; name: string }> {
    return call(() => axiosInstance.post(`/api/subject-deletions/${id}/undo`, {}));
  },

  // #12
  async getTopicByDoc(docId: string): Promise<TopicByDoc> {
    const m = await mock();
    if (m) return m.getTopicByDoc(docId);
    return call(() => axiosInstance.get(`/api/topics/by-doc/${docId}`));
  },

  /** The Docs library's status column: every live topic with its next revision (one call). */
  async getTopicStatuses(): Promise<TopicStatus[]> {
    return call(() => axiosInstance.get('/api/topics/statuses'));
  },

  // #13
  async createTopic(body: { docId: string; subjectId: string; tags?: string[]; startRevisions?: boolean }): Promise<{ topic: Topic; chain: ChainRevision[] }> {
    const m = await mock();
    if (m) return m.createTopic(body);
    return call(() => axiosInstance.post('/api/topics', body));
  },

  // #14
  async updateTopic(id: string, body: { subjectId?: string; tags?: string[]; isArchived?: boolean }): Promise<Topic> {
    const m = await mock();
    if (m) return m.updateTopic(id, body);
    return call(() => axiosInstance.patch(`/api/topics/${id}`, body));
  },

  // #15
  async deleteTopic(id: string): Promise<{ deleted: true }> {
    const m = await mock();
    if (m) return m.deleteTopic(id);
    return call(() => axiosInstance.delete(`/api/topics/${id}`));
  },

  /** A subject's topics in course order (planned, in progress, done, skipped) and what is next. */
  async getPath(subjectId: string): Promise<SubjectPath> {
    return call(() => axiosInstance.get(`/api/subjects/${subjectId}/path`));
  },

  /** Planned topics put on a path, after `after` (the end when left out; null puts them first). */
  async planTopics(subjectId: string, titles: string[], after?: string | null): Promise<{ created: string[]; path: SubjectPath }> {
    return call(() => axiosInstance.post(`/api/subjects/${subjectId}/path`, { titles, ...(after !== undefined ? { after } : {}) }));
  },

  /** The record: sessions of the last `days` days (today included), newest first, with day totals. */
  async listSessions(days = 14): Promise<SessionList> {
    return call(() => axiosInstance.get('/api/sessions', { params: { days } }));
  },

  /** A session logged by hand (Ctrl K: "log 40m graphs"). */
  async createSession(body: { title: string; minutes?: number | null; kind?: SessionKind; subjectId?: string | null; problem?: string | null }): Promise<WorkSession> {
    return call(() => axiosInstance.post('/api/sessions', body));
  },

  async updateSession(id: string, body: { title?: string; minutes?: number | null; kind?: SessionKind; chatKind?: ChatKind }): Promise<WorkSession> {
    return call(() => axiosInstance.patch(`/api/sessions/${id}`, body));
  },

  async deleteSession(id: string): Promise<{ deleted: true }> {
    return call(() => axiosInstance.delete(`/api/sessions/${id}`));
  },

  /** Where the user stands (LOOP_COMPLETE_SPEC 1.7): pace per path, hours per week, per-subject numbers. */
  /** Each day's pending reviews and open tasks against the budget (the Move calendar). */
  async revisionCalendar(from: DayString, days = 42): Promise<RevisionCalendar> {
    return call(() => axiosInstance.get('/api/revisions/calendar', { params: { from, days } }));
  },

  async getMirror(): Promise<MirrorData> {
    return call(() => axiosInstance.get('/api/mirror'));
  },

  /**
   * Where you stand: the last week, month and year against the span before (WHERE_YOU_STAND_PLAN §5.5). No lens: what
   * counts as progress for them (Home's year and week); a lens: Where you stand's Personal, Work or All.
   */
  async getStand(lens?: StandLens): Promise<StandData> {
    return call(() => axiosInstance.get('/api/mirror/stand', lens ? { params: { lens } } : undefined));
  },

  /** PERSONAL_OFFICE_PLAN: the folders they worked in, with each one's kind. */
  async listProjects(): Promise<ProjectRow[]> {
    return call(() => axiosInstance.get('/api/projects'));
  },

  /** A folder's kind (its past sessions move with it). */
  async setProjectKind(id: string, kind: ProjectKind): Promise<ProjectRow> {
    return call(() => axiosInstance.patch(`/api/projects/${encodeURIComponent(id)}`, { kind }));
  },

  /** EASY_SETUP_PLAN: what is logged in a folder (null: its kind's default). */
  async setProjectTracking(id: string, tracking: FolderTracking | null): Promise<ProjectRow> {
    return call(() => axiosInstance.patch(`/api/projects/${encodeURIComponent(id)}`, { tracking }));
  },

  /** LeetCode (11-22): the username whose accepted problems are logged as practice, when it last ran, how many it logged. */
  async getLeetcode(): Promise<LeetcodeLink> {
    return call(() => axiosInstance.get('/api/leetcode'));
  },

  /** Set (checked against LeetCode, then imported at once) or clear (null). */
  async setLeetcode(username: string | null): Promise<LeetcodeLink & { imported?: number }> {
    return call(() => axiosInstance.put('/api/leetcode', { username }));
  },

  async syncLeetcode(): Promise<LeetcodeLink & { imported: number }> {
    return call(() => axiosInstance.post('/api/leetcode/sync'));
  },

  /** Today's takes by the buddy on Where you stand, and whether it can be asked now (WHERE_YOU_STAND_PLAN §9). */
  async getStandTakes(): Promise<StandTakes> {
    return call(() => axiosInstance.get('/api/mirror/stand/takes'));
  },

  /** The buddy's take on a window: today's if it wrote one, else a new one (one model call). */
  async askStandTake(window: StandWindow): Promise<StandTake> {
    return call(() => axiosInstance.post('/api/mirror/stand/takes', { window }));
  },

  /** The week (LOOP_COMPLETE_SPEC 1.6): its targets with what is done, last week, the review. */
  async getWeek(start?: DayString): Promise<WeekData> {
    return call(() => axiosInstance.get('/api/week', { params: start ? { start } : {} }));
  },

  async addWeekTarget(body: { text: string; weekStart?: DayString }): Promise<WeekTarget> {
    return call(() => axiosInstance.post('/api/week/targets', body));
  },

  async updateWeekTarget(id: string, body: { text?: string; status?: WeekTarget['status'] }): Promise<WeekTarget> {
    return call(() => axiosInstance.patch(`/api/week/targets/${id}`, body));
  },

  /** Pending suggestions (the Sunday review's batch is written when it is due). */
  async listSuggestions(): Promise<Suggestion[]> {
    return call(() => axiosInstance.get('/api/suggestions'));
  },

  async acceptSuggestion(id: string): Promise<Suggestion> {
    return call(() => axiosInstance.post(`/api/suggestions/${id}/accept`));
  },

  async dismissSuggestion(id: string): Promise<Suggestion> {
    return call(() => axiosInstance.post(`/api/suggestions/${id}/dismiss`));
  },

  async decideSuggestions(body: { accept?: string[]; dismiss?: string[] }): Promise<{ accepted: string[]; dismissed: string[]; failed: { _id: string; message: string }[] }> {
    return call(() => axiosInstance.post('/api/suggestions/decide', body));
  },

  /** A topic moved along its path: status, next step, place, or a planned topic's title. */
  async updateTopicPath(topicId: string, patch: TopicPathPatch): Promise<{ topic: PathTopic; path: SubjectPath }> {
    return call(() => axiosInstance.patch(`/api/topics/${topicId}/path`, patch));
  },

  // #16
  async ensureTopicDoc(id: string): Promise<{ docId: string }> {
    const m = await mock();
    if (m) return m.ensureTopicDoc(id);
    return call(() => axiosInstance.post(`/api/topics/${id}/doc`));
  },

  // #17
  async getCaptureCategories(): Promise<string[]> {
    const m = await mock();
    if (m) return m.getCaptureCategories();
    return call(() => axiosInstance.get('/api/captures/categories'));
  },

  /**
   * Ctrl K → Find (`q`: every word, in the title, text or link; also captures being revised) and
   * All notes › Inbox (`inbox`: the ones not on a revision schedule). Pinned first, then newest.
   */
  async listCaptures(
    params: { q?: string; inbox?: boolean; limit?: number; topicId?: string; subjectId?: string; lessons?: boolean } = {},
    signal?: AbortSignal,
  ): Promise<Capture[]> {
    const m = await mock();
    const raw: RawCapture[] = m
      ? await m.listCaptures(params)
      : await call(() =>
          axiosInstance.get('/api/captures', {
            params: {
              q: params.q?.trim() || undefined,
              inbox: params.inbox ? 1 : undefined,
              limit: params.limit,
              // STUDY_FLOW_PLAN §4.3: a lesson's notes (the doc's sidebar), a subject's (its page).
              topicId: params.topicId,
              subjectId: params.subjectId,
              lessons: params.lessons ? 1 : undefined,
            },
            signal,
          }),
        );
    return raw.map(parseCapture);
  },

  /** STUDY_FLOW_PLAN §4.4: a doc's revision card to draw read-only, and its review; null when it has none. */
  async getRevisionCard(docId: string): Promise<RevisionCard | null> {
    try {
      return await call(() => axiosInstance.get(`/api/docs/${docId}/card`));
    } catch (err) {
      if (err instanceof LearningApiError && err.status === 404) return null;
      throw err;
    }
  },

  // #18
  async createCapture(body: CreateCaptureBody): Promise<{ capture: Capture; chain?: ChainRevision[] }> {
    const m = await mock();
    const raw: { capture: RawCapture; chain?: ChainRevision[] } = m
      ? await m.createCapture(body)
      : await call(() => axiosInstance.post('/api/captures', body));
    return { capture: parseCapture(raw.capture), chain: raw.chain };
  },

  // #19
  async updateCapture(id: string, body: UpdateCaptureBody): Promise<Capture> {
    const m = await mock();
    const raw: RawCapture = m ? await m.updateCapture(id, body) : await call(() => axiosInstance.patch(`/api/captures/${id}`, body));
    return parseCapture(raw);
  },

  // #20
  async deleteCapture(id: string): Promise<{ deleted: true }> {
    const m = await mock();
    if (m) return m.deleteCapture(id);
    return call(() => axiosInstance.delete(`/api/captures/${id}`));
  },

  // #21
  async uploadLearningFile(file: File): Promise<Attachment> {
    const m = await mock();
    if (m) return m.uploadFile(file);
    const form = new FormData();
    form.append('file', file);
    return call(() => axiosInstance.post('/api/learning/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },

  // #22 (id = client UUID; 201 when new)
  async putQuickNote(id: string, body: { content: string; category: QuickNoteCategory; attachments?: Attachment[] }): Promise<QuickNote> {
    const m = await mock();
    const raw: RawQuickNote = m ? await m.putQuickNote(id, body) : await call(() => axiosInstance.put(`/api/quick-notes/${id}`, body));
    return parseQuickNote(raw);
  },

  // #23
  async pinQuickNote(id: string, isPinned: boolean): Promise<QuickNote> {
    const m = await mock();
    const raw: RawQuickNote = m ? await m.pinQuickNote(id, isPinned) : await call(() => axiosInstance.patch(`/api/quick-notes/${id}`, { isPinned }));
    return parseQuickNote(raw);
  },

  // #24
  async deleteQuickNote(id: string): Promise<{ deleted: true }> {
    const m = await mock();
    if (m) return m.deleteQuickNote(id);
    return call(() => axiosInstance.delete(`/api/quick-notes/${id}`));
  },

  // #25
  async saveTodaySchedule(slots: ScheduleSlotUpdate[]): Promise<Slot[]> {
    const m = await mock();
    if (m) return m.saveTodaySchedule(slots);
    return call(() => axiosInstance.put('/api/schedule/today', { slots }));
  },

  // #26
  async saveDebrief(day: DayString, body: { form: DebriefFormBody; slots: DebriefSlotBody[] }): Promise<Debrief> {
    const m = await mock();
    if (m) return m.saveDebrief(day, body);
    return call(() => axiosInstance.put(`/api/debriefs/${day}`, body));
  },

  // #27
  async saveCatchUp(body: CatchUpBody): Promise<{ debriefs: Debrief[] }> {
    const m = await mock();
    if (m) return m.saveCatchUp(body);
    return call(() => axiosInstance.post('/api/schedule/catch-up', body));
  },

  // #28
  async shiftGoal(todoId: string, target: 'THIS_WEEK' | 'MONTHLY'): Promise<Task> {
    const m = await mock();
    if (m) return m.shiftGoal(todoId, target);
    return call(() => axiosInstance.post(`/api/learning/goals/${todoId}/shift`, { target }));
  },

  // #29
  async getMentorExport(from: DayString, to: DayString): Promise<{ prompt: string }> {
    const m = await mock();
    if (m) return m.getMentorExport(from, to);
    return call(() => axiosInstance.get('/api/learning/export/mentor', { params: { from, to } }));
  },

  // ── Tasks: the existing /api/todos (C2), mock-aware ─────────────────────────

  async updateTask(id: string, updates: TaskUpdate): Promise<Task | undefined> {
    const m = await mock();
    if (m) return m.updateTask(id, updates);
    const res = await todoApi.updateTodo(id, updates);
    if (!res.success) throw new LearningApiError(res.message || 'Failed to update task', 400);
    return res.data as Task | undefined;
  },

  async deleteTask(id: string): Promise<void> {
    const m = await mock();
    if (m) return m.deleteTask(id);
    const res = await todoApi.deleteTodo(id);
    if (!res.success) throw new LearningApiError(res.message || 'Failed to delete task', 400);
  },
};

export type LearningApi = typeof learningApi;
