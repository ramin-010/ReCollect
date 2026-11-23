/**
 * DTOs of the learning REST contract (LEARNING_SPEC §2), as the frontend uses them.
 *
 * Conventions:
 *   - ids are `_id` in both directions;
 *   - a calendar day is a `DayString` ('YYYY-MM-DD' in the user's time zone) and stays a string
 *     (compare days as strings; never `new Date('YYYY-MM-DD')`);
 *   - instants arrive as ISO strings. `learningApi` turns the ones the UI computes with
 *     (completedAt, quick-note / capture createdAt + updatedAt) into `Date`s; the `Raw*` types
 *     are the wire shapes.
 */
import type { TodoResponse } from '@/lib/api/todoApi';
import type { DayString, RoutineMode, SlotStatus } from '@/lib/learning/engine';

export type { DayString, RoutineMode, SlotStatus };

export type GoalType = 'NONE' | 'WEEKLY' | 'MONTHLY';
export type RevisionStatus = 'pending' | 'done' | 'missed';
export type CaptureType = 'NOTE' | 'LINK';
export type QuickNoteCategory = 'PRIMARY' | 'TEMPORARY';

/** [{ url, publicId, fileName, fileType }] (Json column on Capture and QuickNote). */
export interface Attachment {
  url: string;
  publicId: string;
  fileName: string;
  fileType: string;
}

/** Short subject reference; `null` on a revision means "General". */
export interface SubjectRef {
  _id: string;
  name: string;
  color: string | null;
}

// ─── Revisions ──────────────────────────────────────────────────────────────

export interface RawRevisionItem {
  _id: string;
  kind: 'topic' | 'capture';
  /** topicId or captureId */
  itemId: string;
  title: string;
  subject: SubjectRef | null;
  cycleNumber: number;
  intervalDays: number;
  scheduledFor: DayString;
  status: RevisionStatus;
  completedAt: string | null;
  /** overdue bucket only */
  daysLate?: number;
  tags: string[];
  /** topic only */
  docId?: string | null;
  /** capture only */
  content?: string | null;
  url?: string | null;
  attachments?: Attachment[];
  /** done-today bucket only: uncomplete is allowed (no later cycle done) */
  canUndo?: boolean;
  /**
   * Loop v2 plan items (`plan.planned` / `plan.doneToday`): the engine's minutes for this item
   * (cycle 1 = 8, else 5). The client falls back to the same constants (estimateMinutes).
   */
  minutes?: number;
}

export interface RevisionItem extends Omit<RawRevisionItem, 'completedAt'> {
  completedAt: Date | null;
}

export interface RevisionBuckets<T = RevisionItem> {
  totalDue: number;
  dueToday: T[];
  overdue: T[];
  doneToday: T[];
}

/** One cycle of an item's chain, as #4–7 and #12/#13 return it. */
export interface ChainRevision {
  _id: string;
  cycleNumber: number;
  intervalDays: number;
  scheduledFor: DayString;
  status: RevisionStatus;
  completedAt: string | null;
}

/** Global streak after a complete / uncomplete. */
export interface StreakSummary {
  current: number;
  longest: number;
}

// ─── Schedule ───────────────────────────────────────────────────────────────

export interface Slot {
  _id: string;
  sourceBlockId: string | null;
  date: DayString;
  title: string;
  color: string;
  /** 'HH:mm' */
  startTime: string;
  endTime: string;
  status: SlotStatus;
  actualStartTime: string | null;
  actualEndTime: string | null;
  remark: string | null;
  minutesDone: number | null;
  sortOrder: number;
}

export interface Debrief {
  _id: string;
  date: DayString;
  blocksPlanned: number;
  blocksCompleted: number;
  blocksSkipped: number;
  totalFocusedMin: number;
  energy: number | null;
  focus: number | null;
  mood: number | null;
  tags: string[];
  narrative: string | null;
  tomorrowIntent: string | null;
  freeWrite: string | null;
}

export interface CatchUpPrefill {
  energy: number | null;
  focus: number | null;
  mood: number | null;
  tags: string[];
  narrative: string;
}

export type Triage =
  | { kind: 'none' }
  | { kind: 'debrief'; date: DayString; slots: Slot[]; existingDebrief: Debrief | null }
  | { kind: 'catch-up'; days: { date: DayString; slots: Slot[] }[]; prefill: CatchUpPrefill | null };

// ─── Tasks, captures, quick notes ───────────────────────────────────────────

/** serializeTodo(row) + goalType. */
export interface Task extends TodoResponse {
  goalType: GoalType;
}

export interface RawCapture {
  _id: string;
  type: CaptureType;
  title: string | null;
  content: string | null;
  url: string | null;
  fileType: string | null;
  category: string | null;
  isPinned: boolean;
  subject: SubjectRef | null;
  topicId: string | null;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Capture extends Omit<RawCapture, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

export interface RawQuickNote {
  _id: string;
  content: string;
  isPinned: boolean;
  category: QuickNoteCategory;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface QuickNote extends Omit<RawQuickNote, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
  /** Client-only: saved locally, not yet confirmed by the server. */
  isOptimistic?: boolean;
}

// ─── Loop v2 (LOOP_V2_SPEC) ─────────────────────────────────────────────────

/** §2 `plan.mode`: busy = busyUntil ≥ today; comeback = away 3+ days; normal otherwise. */
export type PlanMode = 'normal' | 'busy' | 'comeback';

/** §2 Today = a budgeted plan + a quiet backlog (`GET /api/today` → `plan`). */
export interface TodayPlan<R = RevisionItem> {
  mode: PlanMode;
  budgetMin: number;
  /** Minutes of the planned (pending) items. */
  estMinutes: number;
  planned: R[];
  /** Due items that did not fit today's budget. */
  waitingCount: number;
  doneToday: R[];
}

/** §3 A focus line (up to 3 per day, no times). */
export interface FocusItem {
  _id: string;
  day: DayString;
  /** ≤ 140 characters */
  text: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TodayFocus {
  items: FocusItem[];
  /** Yesterday's unfinished lines (POST /api/focus/carry-over copies them). */
  carryOver: FocusItem[];
}

export const FOCUS_LIMIT = 3;
export const FOCUS_MAX_CHARS = 140;
export const GOAL_LIMIT = 3;

export type GoalStatus = 'active' | 'done' | 'archived';
export type ForecastStatus = 'on_track' | 'ahead' | 'behind' | 'no_data' | 'overdue' | 'done';

/** §4 GoalMilestone */
export interface GoalMilestone {
  _id: string;
  goalId: string;
  /** ≤ 140 characters */
  title: string;
  dueDay: DayString | null;
  done: boolean;
  doneAt: string | null;
  sortOrder: number;
}

/** §4 engine `goalForecast` */
export interface GoalForecast {
  daysLeft: number;
  progress: { done: number; total: number };
  /** Milestones done per week since the goal was created (minimum 1 week). */
  pacePerWeek: number;
  /** today + remaining ÷ pace; null with no pace. */
  projectedDay: DayString | null;
  status: ForecastStatus;
  /** 0 unless behind or overdue (days past the deadline); null when behind with no pace yet. */
  behindDays: number | null;
  /** null once the deadline has passed. */
  requiredPerWeek: number | null;
  /** Plain text, e.g. "1 more milestone a week keeps you on track". Never scolds. */
  suggestion: string;
}

/** §4 an active goal as `GET /api/today` → `goals` carries it. */
export interface TodayGoal {
  _id: string;
  title: string;
  deadline: DayString;
  daysLeft: number;
  progress: { done: number; total: number };
  forecast: GoalForecast;
  nextMilestone: GoalMilestone | null;
  /**
   * The goal's first day (its createdAt as a user day). Not in LOOP_V2_SPEC yet; with it the
   * goal meter draws an "expected by today" tick, without it the tick is left out.
   */
  createdDay?: DayString;
}

/** §4 a goal as `GET/POST/PATCH /api/goals` return it (the edit sheet's shape). */
export interface Goal {
  _id: string;
  title: string;
  /** ≤ 500 characters */
  why: string | null;
  deadline: DayString;
  status: GoalStatus;
  /** Linked subjects (many-to-many): their revisions come first in Today. */
  subjects: SubjectRef[];
  milestones: GoalMilestone[];
  daysLeft: number;
  progress: { done: number; total: number };
  forecast: GoalForecast;
  nextMilestone: GoalMilestone | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalBody {
  title: string;
  why?: string | null;
  /** ≥ today (400 INVALID_DAY) */
  deadline: DayString;
  subjectIds?: string[];
  milestones?: { title: string; dueDay?: DayString | null }[];
}

/** POST /api/focus/carry-over → today's lines after the copy, and how many were carried. */
export interface FocusCarryResult {
  items: FocusItem[];
  carried: number;
}

/** Milestone writes return the milestone and its goal (with the new forecast). */
export interface MilestoneResult {
  milestone: GoalMilestone;
  goal: Goal;
}

export interface GoalPatch {
  title?: string;
  why?: string | null;
  deadline?: DayString;
  status?: GoalStatus;
  subjectIds?: string[];
}

export interface MilestoneBody {
  title: string;
  dueDay?: DayString | null;
}

export interface MilestonePatch {
  title?: string;
  dueDay?: DayString | null;
  done?: boolean;
  sortOrder?: number;
}

/** §5 Rhythm (replaces the streak in the UI). */
export interface Rhythm {
  last7: { day: DayString; active: boolean }[];
  activeDays: number;
}

/** §1 Settings (`GET /api/learning/settings`). */
export interface LearningSettings {
  /** 5–120, default 25 */
  dailyBudgetMin: number;
  routineEnabled: boolean;
  /** Busy mode is on while today ≤ busyUntil. */
  busyUntil: DayString | null;
  nudgeEmailEnabled: boolean;
  /** 'HH:mm' in the user's zone */
  nudgeTime: string;
  lastNudgeDay?: DayString | null;
  lastSeenDay?: DayString | null;
  timezone: string;
  routineMode?: RoutineMode;
  /** About you, for your agents (the brief starts with it). */
  agentProfile?: string | null;
  /** PERSONAL_OFFICE_PLAN: work counts as progress too (absent from an older server: personal only). */
  progressIncludesWork?: boolean;
}

/** `PATCH /api/learning/settings` accepts any subset. */
export type LearningSettingsPatch = Partial<
  Pick<LearningSettings, 'dailyBudgetMin' | 'routineEnabled' | 'busyUntil' | 'nudgeEmailEnabled' | 'nudgeTime' | 'timezone' | 'routineMode' | 'agentProfile' | 'progressIncludesWork'>
>;

/** PERSONAL_OFFICE_PLAN: what a folder is. Personal and study count as progress; work only if they say so. */
export type ProjectKind = 'personal' | 'study' | 'work';
/** Which sessions Where you stand is read through: what counts as progress is `personal` or `all`. */
export type StandLens = 'personal' | 'work' | 'all';

/** `GET /api/projects`: a folder Claude Code or a chat worked in. */
export interface ProjectRow {
  _id: string;
  key: string;
  name: string;
  /** Absent from an older server (personal). */
  kind?: ProjectKind;
  goal: { _id: string; title: string } | null;
  nextStep: string | null;
  isArchived: boolean;
  lastSession: { day: DayString; minutes: number | null; title: string } | null;
  sessions: number;
  /** Minutes in the last 28 days (absent from an older server). */
  minutes28?: number;
}

export const BUDGET_MIN = 5;
export const BUDGET_MAX = 120;

// ─── GET /api/today ─────────────────────────────────────────────────────────

export interface TodayStats {
  streak: number;
  longestStreak: number;
  /** % of scheduled blocks completed (or partial) over the last 7 full days; null = no blocks. */
  adherence: number | null;
  /** Points vs the 7 days before; null when there is nothing to compare with. */
  adherenceDelta: number | null;
  adherenceDone: number;
  adherenceTotal: number;
  totalTopics: number;
  mastered: number;
  inProgress: number;
  notStarted: number;
  /** Loop v2 §5; the UI shows this instead of the streak. */
  rhythm?: Rhythm;
}

export interface WeeklyReview {
  isReviewDay: boolean;
  goals: Task[];
}

interface TodayPayloadBase<R, C, Q> {
  today: DayString;
  timezone: string;
  needsEnsure: boolean;
  user: { _id: string; name: string };
  stats: TodayStats;
  /** Kept for back-compat (LOOP_V2_SPEC §2); the v2 UI reads `plan`. */
  revisions: RevisionBuckets<R>;
  /** null while routineEnabled is false (LOOP_V2_SPEC §6). */
  schedule: { routineMode: RoutineMode; slots: Slot[] } | null;
  /** null while routineEnabled is false. */
  triage: Triage | null;
  todayDebrief: Debrief | null;
  tasks: Task[];
  inbox: { count: number; items: C[] };
  quickNotes: Q[];
  weeklyReview: WeeklyReview;
  /**
   * Loop v2 sections. `null` = that section could not be loaded: the client shows it as failed
   * (with a retry) and the rest of Home keeps working. A pre-v2 payload has no `plan`; the
   * client then derives one from `revisions` (lib/api/learningApi `parseToday`).
   */
  plan?: TodayPlan<R> | null;
  focus?: TodayFocus | null;
  goals?: TodayGoal[] | null;
  /** Each path's next topic, at most 3, goal-linked first (SYNC_SPINE_SPEC 1.1). */
  next?: NextUp[];
  /** The next day with something to revise after today, and how much (null: nothing scheduled). */
  nextDue?: { day: DayString; count: number } | null;
}

// ─── Paths (BUDDY_PLAN B1, SYNC_SPINE_SPEC 1.1) ─────────────────────────────

export type PathStatus = 'planned' | 'in_progress' | 'done' | 'skipped';

/** A topic on its subject's path (GET /api/subjects/:id/path). */
export interface PathTopic {
  _id: string;
  title: string;
  status: PathStatus;
  /** 1-based place on the path. */
  position: number;
  docId: string | null;
  nextStep: string | null;
  startedAt: string | null;
  doneAt: string | null;
  /** The topic's open weak spots (GET only). */
  weakSpots?: { _id: string; text: string }[];
}

export interface SubjectPath {
  subject: { _id: string; name: string };
  topics: PathTopic[];
  /** The first topic in progress, else the first planned one. */
  next: PathTopic | null;
  done: number;
  total: number;
}

/** One path's next topic, for Home. */
export interface NextUp {
  subject: { _id: string; name: string; color?: string | null };
  topic: { _id: string; title: string; position: number; status: PathStatus };
  done: number;
  total: number;
  nextStep: string | null;
}

// ─── The record: sessions (SYNC_SPINE_SPEC 1.2) ─────────────────────────────

export type SessionKind = 'study' | 'practice' | 'build' | 'review';

export interface WorkSession {
  _id: string;
  key: string | null;
  kind: SessionKind;
  day: DayString;
  startedAt: string;
  endedAt: string | null;
  minutes: number | null;
  subject: { _id: string; name: string; color: string | null } | null;
  topic: { _id: string; title: string } | null;
  project: { _id: string; key: string; name: string } | null;
  title: string;
  score: { done: number; total: number } | null;
  outcome: 'alone' | 'hints' | 'after_answer' | null;
  problem: string | null;
  url: string | null;
  nextStep: string | null;
  source: 'agent' | 'hook' | 'user';
  agentName: string | null;
  /** PERSONAL_OFFICE_PLAN: personal or work (absent from an older server: personal). */
  area?: 'personal' | 'work';
}

export interface SessionList {
  sessions: WorkSession[];
  /** One per day with sessions, newest first. */
  days: { day: DayString; minutes: Record<SessionKind, number>; count: number }[];
  /** PERSONAL_OFFICE_PLAN: what counts as progress for them (absent from an older server: everything). */
  progressLens?: 'personal' | 'all';
}

// ─── The week and suggestions (LOOP_COMPLETE_SPEC 1.6) ──────────────────────

export const WEEK_TARGETS_MAX = 5;
export const WEEK_TARGET_MAX_CHARS = 140;

export interface WeekTarget {
  _id: string;
  weekStart: DayString;
  text: string;
  status: 'open' | 'done' | 'dropped';
  /** Ticked, or what it points at is done, or its count is reached. */
  done: boolean;
  progress: { done: number; total: number } | null;
  topic: { _id: string; title: string; status: PathStatus } | null;
  milestone: { _id: string; title: string; done: boolean } | null;
  task: { _id: string; title: string; status: string } | null;
  measure: 'practice' | 'minutes' | 'topics' | null;
  amount: number | null;
  subject: { _id: string; name: string } | null;
  project: { _id: string; key: string; name: string } | null;
  createdBy: 'user' | 'agent';
  agentName: string | null;
}

export interface WeekSummary {
  weekStart: DayString;
  targets: { done: number; total: number };
  minutes: Record<SessionKind, number>;
  topicsDone: number;
  revisionsDone: number;
}

export interface WeekData {
  weekStart: DayString;
  weekEnd: DayString;
  targets: WeekTarget[];
  lastWeek: WeekSummary;
  review: { due: boolean; weekStart: DayString };
}

/** task, note, decision: the buddy's items from his chats; routine: "do this by itself" (BUDDY_MEMORY_PLAN). */
export type SuggestionKind = 'week_target' | 'focus_line' | 'profile_edit' | 'action' | 'task' | 'note' | 'decision' | 'routine';

export interface Suggestion {
  _id: string;
  kind: SuggestionKind;
  text: string;
  reason: string | null;
  payload: Record<string, unknown>;
  proposedBy: 'app' | 'coach' | 'agent' | 'ask_ai' | 'buddy';
  agentName: string | null;
  batch: string | null;
  status: 'pending' | 'accepted' | 'dismissed';
  /** After accepting an action: what it did, in words. */
  result?: string;
}

// ─── The mirror (LOOP_COMPLETE_SPEC 1.7): numbers worked out by the app ──────

export interface PathPace {
  done: number;
  total: number;
  remaining: number;
  perWeek: number;
  requiredPerWeek: number | null;
  landsOn: DayString | null;
  status: 'done' | 'overdue' | 'no_data' | 'behind' | 'ahead' | 'on_track';
  fix: { extraPerWeek: number; orLandsOn: DayString | null } | null;
}

export type KindMinutes = Record<SessionKind, number>;

export interface MirrorData {
  today: DayString;
  goals: Array<{
    _id: string;
    title: string;
    deadline: DayString;
    daysLeft: number;
    milestones: { done: number; total: number };
    forecast: { status: string; behindDays: number | null };
    paths: Array<PathPace & { subject: { _id: string; name: string; color: string | null } }>;
    hoursPerWeek: Array<{ weekStart: DayString; minutes: KindMinutes }>;
  }>;
  subjects: Array<{
    _id: string;
    name: string;
    color: string | null;
    path: PathPace | null;
    quiz: Array<{ day: DayString; done: number; total: number }>;
    weakSpots: { open: number; clearedIn30: number };
    practice: { alone: number; hints: number; after_answer: number };
    minutesPerTopic: number | null;
  }>;
  weeks: Array<{ weekStart: DayString; minutes: KindMinutes; targets: { done: number; total: number } }>;
}

// ─── Where you stand (WHERE_YOU_STAND_PLAN §5): the record against the span before ───

export type StandWindow = 'week' | 'month' | 'year';

export interface StandSpan {
  from: DayString;
  to: DayString;
}

export interface StandMeasures {
  /** The span's days the record covers. */
  days: number;
  activeDays: number;
  /** Days with 30 minutes or more logged. */
  daysWithSitting: number;
  minutes: KindMinutes;
  totalMinutes: number;
  /** PERSONAL_OFFICE_PLAN: the same minutes by area (absent from an older server). */
  minutesByArea?: { personal: number; work: number };
  sessions: number;
  reviews: { due: number; onDay: number; late: number; open: number; catchUps: number };
  focus: { set: number; done: number };
  targets: { set: number; done: number; dropped: number };
  topicsDone: number;
  topicsBySubject: Array<{ subjectId: string; name: string; done: number }>;
  milestonesDone: number;
  weakSpots: { found: number; cleared: number };
  recall: { sets: number; strong: number; partial: number; weak: number };
  practice: { total: number; alone: number; hints: number; afterAnswer: number };
  notes: { written: number; workedOn: number };
}

export interface StandPeriod {
  window: StandWindow;
  span: StandSpan;
  /** The record starts inside the span. */
  partial: boolean;
  /** The span before, only when the record covers all of it. */
  before: StandSpan | null;
  current: StandMeasures;
  previous: StandMeasures | null;
  /** 0-3 sentences written by the server from these numbers. */
  verdict: string[];
}

export interface StandDay {
  day: DayString;
  active: boolean;
  minutes: number;
  byKind: KindMinutes;
  /** PERSONAL_OFFICE_PLAN: the minutes by area, and where the time went (most first, at most 3). */
  byArea?: { personal: number; work: number };
  places?: Array<{ name: string; minutes: number; area: 'personal' | 'work' }>;
  reviews: number;
  focus: number;
  sessions: number;
}

/** Something finished on a day of the last 364: a path's topic (of: its subject) or a goal's milestone (of: the goal). */
export interface StandMoment {
  day: DayString;
  kind: 'topic' | 'milestone';
  title: string;
  of: string | null;
}

export interface StandData {
  today: DayString;
  recordStart: DayString;
  periods: Record<StandWindow, StandPeriod>;
  /** The last 364 days, oldest first. */
  days: StandDay[];
  /** Reviews still waiting from before today. */
  openNow: number;
  weakOpenNow: number;
  /** What was finished in the last 364 days, oldest first (absent from an older server). */
  moments?: StandMoment[];
  /** PERSONAL_OFFICE_PLAN (absent from an older server): the lens this was read through, what counts as progress,
   * whether they have work tracked (the page offers the lenses), and their folders marked Work. */
  lens?: StandLens;
  progressLens?: 'personal' | 'all';
  hasWork?: boolean;
  workFolders?: string[];
}

/** LeetCode (11-22): their public username; their accepted problems are logged as practice once a day. */
export interface LeetcodeLink {
  username: string | null;
  syncedAt: string | null;
  /** Practice sessions the import has logged in all. */
  logged: number;
}

/** The buddy's take on a window (WHERE_YOU_STAND_PLAN §9): written when asked, kept for that day. */
export interface StandTake {
  window: StandWindow;
  text: string;
  at: string;
}

/** Why the buddy can't be asked now ('ok' when it can): the buddy's own gate. */
export type StandAskGate = 'ok' | 'off' | 'paused' | 'no_ai' | 'not_allowed' | 'ai_paused' | 'allowance' | 'buddy_cap' | 'account_cap';

export interface StandTakes {
  takes: Partial<Record<StandWindow, StandTake>>;
  ask: StandAskGate;
  name: string | null;
}

/** Fired when the week, its targets or a suggestion changed (Home's sections reload). */
export const WEEK_CHANGED_EVENT = 'recollect:week-changed';

export interface TopicPathPatch {
  title?: string;
  status?: PathStatus;
  /** null clears it. */
  nextStep?: string | null;
  /** A topic id to go after; null puts it first. */
  after?: string | null;
}

export type RawTodayPayload = TodayPayloadBase<RawRevisionItem, RawCapture, RawQuickNote>;
/** After `parseToday`: `plan`, `focus` and `goals` are always present (a failed section is null). */
export type TodayPayload = Omit<TodayPayloadBase<RevisionItem, Capture, QuickNote>, 'plan' | 'focus' | 'goals'> & {
  plan: TodayPlan<RevisionItem> | null;
  focus: TodayFocus | null;
  goals: TodayGoal[] | null;
};

// ─── Subjects, topics ───────────────────────────────────────────────────────

export interface Subject {
  _id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
}

export interface SubjectWithTopics extends Subject {
  topics: { _id: string; title: string; docId: string | null }[];
}

export interface Topic {
  _id: string;
  subjectId: string;
  docId: string | null;
  title: string;
  tags: string[];
  isArchived: boolean;
}

/** engine `nextRevisionAction`, as #12 returns it. */
export type NextRevisionAction =
  | { kind: 'start' }
  | { kind: 'completed' }
  | { kind: 'wait'; next: ChainRevision; inDays: number }
  | { kind: 'early'; next: ChainRevision }
  | { kind: 'due'; next: ChainRevision };

/** GET /api/topics/statuses: one row per live topic, for the Docs library. */
export interface TopicStatus {
  topicId: string;
  docId: string | null;
  subjectId: string;
  title: string;
  state: NextRevisionAction['kind'];
  /** Days until the next review (0 = due today), null when not scheduled or mastered. */
  inDays: number | null;
  next: ChainRevision | null;
  done: number;
  total: number;
}

/** GET /api/revisions/calendar: each day's load, for picking where a review goes. */
export interface RevisionCalendarDay {
  day: DayString;
  minutes: number;
  revisions: Array<{ _id: string; title: string; cycleNumber: number; minutes: number; subject: { name: string; color: string | null } | null }>;
  tasks: Array<{ _id: string; title: string }>;
}

export interface RevisionCalendar {
  today: DayString;
  budgetMin: number;
  days: RevisionCalendarDay[];
}

export interface TopicByDoc {
  topic: Topic | null;
  chain: ChainRevision[];
  nextAction: NextRevisionAction;
}

// ─── Request bodies ─────────────────────────────────────────────────────────

export interface CreateCaptureBody {
  type?: CaptureType;
  title?: string;
  content?: string;
  url?: string;
  category?: string;
  subjectId?: string;
  topicId?: string;
  isPinned?: boolean;
  attachments?: Attachment[];
  /** Start the +1/+3/+7/+21 cycles in the same transaction. */
  revise?: boolean;
}

export interface UpdateCaptureBody {
  title?: string;
  content?: string;
  url?: string;
  category?: string;
  isPinned?: boolean;
  subjectId?: string | null;
}

export interface ScheduleSlotUpdate {
  /** 'new-…' = create */
  _id: string;
  title: string;
  color: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  sortOrder: number;
  remark: string | null;
  minutesDone?: number | null;
}

export interface DebriefFormBody {
  energy: number | null;
  focus: number | null;
  mood: number | null;
  tags: string[];
  narrative: string;
  tomorrowIntent: string;
  freeWrite: string;
}

export interface DebriefSlotBody {
  _id: string;
  status: SlotStatus;
  remark: string | null;
  minutesDone: number | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
}

export interface CatchUpBody {
  dates: DayString[];
  context: { energy: number | null; focus: number | null; mood: number | null; tags: string[]; narrative: string };
  decisions: { slotId: string; status: 'COMPLETED' | 'SKIPPED' | 'UNRESOLVED'; remark?: string }[];
}
