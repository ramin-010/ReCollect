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
}

/** `PATCH /api/learning/settings` accepts any subset. */
export type LearningSettingsPatch = Partial<
  Pick<LearningSettings, 'dailyBudgetMin' | 'routineEnabled' | 'busyUntil' | 'nudgeEmailEnabled' | 'nudgeTime' | 'timezone' | 'routineMode'>
>;

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
