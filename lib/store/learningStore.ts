/**
 * useLearningStore: the Home page's data (GET /api/today) plus its optimistic mutations
 * (LEARNING_SPEC §3 "Data flow"). `dashboardStore` is the legacy dashboards' store.
 *
 *   - load(): GET /api/today; if `needsEnsure`, POST ensure once and GET again.
 *   - refresh(): the same without the loading state (focus / midnight / after Ctrl+K saves).
 *   - complete / uncomplete / reschedule revisions, task toggle / reschedule / delete and
 *     quick-note upsert / pin / delete update the payload first, then revert + toast on failure.
 *   - capture edits, debriefs, catch-ups and goal shifts refetch after success.
 *   - quick notes are merged by id on every refetch, so optimistic notes are never clobbered.
 *
 * Dialog targets that several components open (edit capture, reschedule, attachment preview,
 * task detail) live here too, replacing Revise's window events.
 */
import { create } from 'zustand';
import { toast } from 'sonner';
import { learningApi, LearningApiError, type TaskUpdate } from '@/lib/api/learningApi';
import type {
  Attachment,
  CatchUpBody,
  DayString,
  DebriefFormBody,
  DebriefSlotBody,
  FocusItem,
  GoalMilestone,
  LearningSettings,
  LearningSettingsPatch,
  QuickNote,
  QuickNoteCategory,
  RevisionItem,
  ScheduleSlotUpdate,
  Task,
  TodayPayload,
  TodayStats,
  UpdateCaptureBody,
} from '@/lib/learning/types';
import { FOCUS_LIMIT } from '@/lib/learning/types';
import { dayOf, diffDays, resolveTimeZone } from '@/lib/learning/engine';
import { formatDayChip } from '@/lib/learning/dates';
import { estimateMinutes, nextReviewDay } from '@/lib/learning/plan';

export type RescheduleTarget =
  | { kind: 'revision'; id: string; title: string; scheduledFor: DayString }
  | { kind: 'task'; id: string; title: string; dueDate: string | null };

export interface EditCaptureTarget {
  captureId: string;
  title: string;
  content: string;
}

export interface PreviewTarget {
  url: string;
  title: string;
  fileType?: string | null;
}

interface LearningState {
  data: TodayPayload | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  lastLoadedAt: number;
  /** True while LearningHome is mounted (Ctrl+K refreshes it after a save). */
  isHomeMounted: boolean;

  rescheduleTarget: RescheduleTarget | null;
  editCapture: EditCaptureTarget | null;
  preview: PreviewTarget | null;
  taskDetail: Task | null;

  /** Loop v2 §1 (GET /api/learning/settings); loaded beside Today, failure stays isolated. */
  settings: LearningSettings | null;
  settingsStatus: 'idle' | 'loading' | 'ready' | 'error';
  /** Revision id → the day its next cycle landed on (the due stamp); null = last cycle. */
  nextDue: Record<string, DayString | null>;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  setHomeMounted: (mounted: boolean) => void;

  loadSettings: () => Promise<void>;
  updateSettings: (patch: LearningSettingsPatch) => Promise<boolean>;
  /** Fresh start's dry run (same answer, no writes) for the confirm sheet; null when it failed. */
  previewFreshStart: () => Promise<{ moved: number; spreadDays: number } | null>;
  freshStart: () => Promise<boolean>;

  addFocus: (text: string) => Promise<boolean>;
  toggleFocus: (id: string) => Promise<void>;
  editFocus: (id: string, text: string) => Promise<boolean>;
  removeFocus: (id: string) => Promise<void>;
  carryOverFocus: (ids: string[]) => Promise<void>;

  toggleMilestone: (goalId: string, milestone: GoalMilestone) => Promise<void>;

  completeRevision: (id: string) => Promise<void>;
  uncompleteRevision: (id: string) => Promise<void>;
  rescheduleRevision: (id: string, day: DayString) => Promise<void>;

  toggleTask: (id: string) => Promise<void>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<void>;
  /** State-only sync after the task detail modal saved on its own. */
  syncTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => Promise<void>;

  saveQuickNote: (note: { _id: string; content: string; category: QuickNoteCategory; attachments?: Attachment[] }) => Promise<boolean>;
  toggleQuickNotePin: (id: string) => Promise<void>;
  deleteQuickNote: (id: string) => Promise<void>;

  updateCapture: (id: string, body: UpdateCaptureBody) => Promise<boolean>;
  deleteCapture: (id: string) => Promise<void>;

  saveSchedule: (slots: ScheduleSlotUpdate[]) => Promise<boolean>;
  saveDebrief: (day: DayString, body: { form: DebriefFormBody; slots: DebriefSlotBody[] }) => Promise<boolean>;
  saveCatchUp: (body: CatchUpBody) => Promise<boolean>;
  shiftGoal: (todoId: string, target: 'THIS_WEEK' | 'MONTHLY') => Promise<boolean>;

  openReschedule: (target: RescheduleTarget | null) => void;
  openEditCapture: (target: EditCaptureTarget | null) => void;
  openPreview: (target: PreviewTarget | null) => void;
  openTaskDetail: (task: Task | null) => void;
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof LearningApiError || e instanceof Error ? e.message : fallback) || fallback;

/** Optimistic and server notes merged by id; local optimistic notes the server does not know yet are kept. */
function mergeQuickNotes(server: QuickNote[], local: QuickNote[] | undefined): QuickNote[] {
  if (!local) return server;
  const ids = new Set(server.map((n) => n._id));
  return [...server, ...local.filter((n) => n.isOptimistic && !ids.has(n._id))];
}

/** Inserts a revision back into "due today" after the last row of its subject (Revise's grouping). */
function insertBySubject(list: RevisionItem[], item: RevisionItem): RevisionItem[] {
  const key = item.subject?._id ?? 'general';
  let idx = -1;
  list.forEach((r, i) => {
    if ((r.subject?._id ?? 'general') === key) idx = i;
  });
  if (idx === -1) return [...list, item];
  return [...list.slice(0, idx + 1), item, ...list.slice(idx + 1)];
}

const withoutRevision = (list: RevisionItem[], id: string) => list.filter((r) => r._id !== id);

/** §5 today is active with ≥ 1 revision done or a focus line done; recomputed after local changes. */
function withTodayRhythm(d: TodayPayload): TodayStats {
  const rhythm = d.stats.rhythm;
  if (!rhythm) return d.stats;
  const active = (d.plan?.doneToday.length ?? d.revisions.doneToday.length) > 0 || (d.focus?.items.some((f) => f.done) ?? false);
  const last7 = rhythm.last7.map((x) => (x.day === d.today ? { ...x, active } : x));
  return { ...d.stats, rhythm: { last7, activeDays: last7.filter((x) => x.active).length } };
}

const tempId = () => `tmp-${Math.random().toString(36).slice(2, 10)}`;

export const useLearningStore = create<LearningState>((set, get) => {
  /** Applies `fn` to the payload (no-op before the first load). */
  const patch = (fn: (d: TodayPayload) => TodayPayload) => {
    const d = get().data;
    if (d) set({ data: fn(d) });
  };

  /**
   * The goal meter's steady-pace tick needs each goal's first day, which `/api/today` goals do not
   * carry; `/api/goals` has `createdAt`. Fetched in the background only when missing; a failure
   * just leaves the tick out.
   */
  const enrichGoalStarts = async () => {
    const d = get().data;
    if (!d?.goals?.some((g) => !g.createdDay)) return;
    try {
      const full = await learningApi.getGoals();
      const tz = resolveTimeZone(d.timezone);
      const starts = new Map(full.map((g) => [g._id, dayOf(new Date(g.createdAt), tz)]));
      patch((x) => (x.goals ? { ...x, goals: x.goals.map((g) => (g.createdDay || !starts.has(g._id) ? g : { ...g, createdDay: starts.get(g._id) })) } : x));
    } catch {
      /* no tick */
    }
  };

  const fetchToday = async (): Promise<TodayPayload> => {
    let payload = await learningApi.getToday();
    if (payload.needsEnsure) {
      await learningApi.ensureToday();
      payload = await learningApi.getToday();
    }
    return payload;
  };

  return {
    data: null,
    status: 'idle',
    error: null,
    lastLoadedAt: 0,
    isHomeMounted: false,
    rescheduleTarget: null,
    editCapture: null,
    preview: null,
    taskDetail: null,
    settings: null,
    settingsStatus: 'idle',
    nextDue: {},

    async load() {
      set({ status: get().data ? 'ready' : 'loading', error: null });
      // Settings load beside Today; a failure there only affects the settings sheet and the busy line.
      if (get().settingsStatus === 'idle' || get().settingsStatus === 'error') void get().loadSettings();
      try {
        const payload = await fetchToday();
        set({ data: { ...payload, quickNotes: mergeQuickNotes(payload.quickNotes, get().data?.quickNotes) }, status: 'ready', lastLoadedAt: Date.now() });
        void enrichGoalStarts();
      } catch (e) {
        set({ status: get().data ? 'ready' : 'error', error: errorMessage(e, 'Failed to load your day') });
      }
    },

    async refresh() {
      try {
        const payload = await fetchToday();
        const prevStarts = new Map((get().data?.goals ?? []).map((g) => [g._id, g.createdDay]));
        const goals = payload.goals ? payload.goals.map((g) => (g.createdDay ? g : { ...g, createdDay: prevStarts.get(g._id) })) : payload.goals;
        set({ data: { ...payload, goals, quickNotes: mergeQuickNotes(payload.quickNotes, get().data?.quickNotes) }, status: 'ready', error: null, lastLoadedAt: Date.now() });
        void enrichGoalStarts();
      } catch (e) {
        console.error('[learningStore] refresh failed', e);
      }
    },

    setHomeMounted(mounted) {
      set({ isHomeMounted: mounted });
    },

    // ── Revisions ──────────────────────────────────────────────────────────

    async completeRevision(id) {
      const before = get().data;
      if (!before) return;
      const row =
        before.plan?.planned.find((r) => r._id === id) ?? [...before.revisions.dueToday, ...before.revisions.overdue].find((r) => r._id === id);
      if (!row) return;
      const done: RevisionItem = { ...row, status: 'done', completedAt: new Date(), canUndo: true, daysLate: undefined };
      // The stamp shows the next date straight away; the server's chain confirms it below.
      set({ nextDue: { ...get().nextDue, [id]: nextReviewDay(before.today, row.cycleNumber) } });
      patch((d) => {
        const next: TodayPayload = {
          ...d,
          revisions: {
            totalDue: Math.max(0, d.revisions.totalDue - 1),
            dueToday: withoutRevision(d.revisions.dueToday, id),
            overdue: withoutRevision(d.revisions.overdue, id),
            doneToday: [done, ...withoutRevision(d.revisions.doneToday, id)],
          },
          plan: d.plan
            ? {
                ...d.plan,
                planned: withoutRevision(d.plan.planned, id),
                doneToday: [...withoutRevision(d.plan.doneToday, id), done],
                estMinutes: Math.max(0, d.plan.estMinutes - estimateMinutes(row)),
              }
            : d.plan,
        };
        return { ...next, stats: withTodayRhythm(next) };
      });
      try {
        const res = await learningApi.completeRevision(id);
        const nextCycle = res.chain.find((c) => c.cycleNumber === res.item.cycleNumber + 1);
        set({ nextDue: { ...get().nextDue, [id]: nextCycle ? nextCycle.scheduledFor : null } });
        const swapDone = (list: RevisionItem[]) => list.map((r) => (r._id === id ? { ...res.item, minutes: r.minutes } : r));
        patch((d) => ({
          ...d,
          revisions: { ...d.revisions, doneToday: swapDone(d.revisions.doneToday) },
          plan: d.plan ? { ...d.plan, doneToday: swapDone(d.plan.doneToday) } : d.plan,
          stats: {
            ...d.stats,
            streak: res.streak.current,
            longestStreak: Math.max(d.stats.longestStreak, res.streak.longest),
            ...(res.mastered && res.item.kind === 'topic'
              ? { mastered: d.stats.mastered + 1, inProgress: Math.max(0, d.stats.inProgress - 1) }
              : {}),
          },
        }));
      } catch (e) {
        set({ data: before });
        toast.error(errorMessage(e, 'Failed to complete revision'));
      }
    },

    async uncompleteRevision(id) {
      const before = get().data;
      if (!before) return;
      const row = before.plan?.doneToday.find((r) => r._id === id) ?? before.revisions.doneToday.find((r) => r._id === id);
      if (!row) return;
      const today = before.today;
      const back: RevisionItem = { ...row, status: 'pending', completedAt: null, canUndo: undefined };
      const isOverdue = row.scheduledFor < today;
      const backLate: RevisionItem = isOverdue ? { ...back, daysLate: Math.max(1, diffDays(today, row.scheduledFor)) } : back;
      const { [id]: _drop, ...restNextDue } = get().nextDue;
      void _drop;
      set({ nextDue: restNextDue });
      patch((d) => {
        const next: TodayPayload = {
          ...d,
          revisions: {
            totalDue: d.revisions.totalDue + 1,
            dueToday: isOverdue ? d.revisions.dueToday : insertBySubject(d.revisions.dueToday, back),
            overdue: isOverdue ? [...d.revisions.overdue, backLate] : d.revisions.overdue,
            doneToday: withoutRevision(d.revisions.doneToday, id),
          },
          plan: d.plan
            ? {
                ...d.plan,
                planned: [...withoutRevision(d.plan.planned, id), backLate],
                doneToday: withoutRevision(d.plan.doneToday, id),
                estMinutes: d.plan.estMinutes + estimateMinutes(row),
              }
            : d.plan,
        };
        return { ...next, stats: withTodayRhythm(next) };
      });
      try {
        const res = await learningApi.uncompleteRevision(id);
        const swap = (list: RevisionItem[]) => list.map((r) => (r._id === id ? { ...res.item, daysLate: r.daysLate, minutes: r.minutes } : r));
        patch((d) => ({
          ...d,
          revisions: { ...d.revisions, dueToday: swap(d.revisions.dueToday), overdue: swap(d.revisions.overdue) },
          plan: d.plan ? { ...d.plan, planned: swap(d.plan.planned) } : d.plan,
          stats: { ...d.stats, streak: res.streak.current },
        }));
      } catch (e) {
        set({ data: before });
        if (e instanceof LearningApiError && e.code === 'LATER_CYCLE_DONE') {
          toast.error(`Undo cycle ${row.cycleNumber + 1} first`);
        } else {
          toast.error(errorMessage(e, 'Failed to unmark revision'));
        }
      }
    },

    async rescheduleRevision(id, day) {
      const before = get().data;
      if (!before) return;
      const row = [...before.revisions.dueToday, ...before.revisions.overdue].find((r) => r._id === id);
      if (!row) return;
      const toToday = day === before.today;
      patch((d) => {
        const dueToday = withoutRevision(d.revisions.dueToday, id);
        const planRow = d.plan?.planned.find((r) => r._id === id);
        return {
          ...d,
          revisions: {
            ...d.revisions,
            totalDue: toToday ? d.revisions.totalDue : Math.max(0, d.revisions.totalDue - 1),
            dueToday: toToday ? insertBySubject(dueToday, { ...row, scheduledFor: day, daysLate: undefined }) : dueToday,
            overdue: withoutRevision(d.revisions.overdue, id),
          },
          // Moved to another day: it leaves today's plan (the next refetch may pull a waiting one in).
          plan:
            d.plan && planRow && !toToday
              ? { ...d.plan, planned: withoutRevision(d.plan.planned, id), estMinutes: Math.max(0, d.plan.estMinutes - estimateMinutes(planRow)) }
              : d.plan,
        };
      });
      try {
        const res = await learningApi.rescheduleRevision(id, day);
        if (toToday) {
          patch((d) => ({ ...d, revisions: { ...d.revisions, dueToday: d.revisions.dueToday.map((r) => (r._id === id ? res.item : r)) } }));
        }
        toast.success(toToday ? 'Moved to today' : `Moved to ${formatDayChip(day)}`);
      } catch (e) {
        set({ data: before });
        toast.error(errorMessage(e, 'Failed to reschedule'));
      }
    },

    // ── Tasks ──────────────────────────────────────────────────────────────

    async toggleTask(id) {
      const before = get().data;
      const task = before?.tasks.find((t) => t._id === id);
      if (!before || !task) return;
      const status = task.status === 'complete' ? 'pending' : 'complete';
      const completedAt = status === 'complete' ? new Date().toISOString() : undefined;
      patch((d) => ({ ...d, tasks: d.tasks.map((t) => (t._id === id ? { ...t, status, completedAt } : t)) }));
      try {
        await learningApi.updateTask(id, { status });
      } catch (e) {
        set({ data: before });
        toast.error(errorMessage(e, 'Failed to update task'));
      }
    },

    async updateTask(id, updates) {
      const before = get().data;
      if (!before) return;
      // Only fields whose shape is the same on read and write are applied locally.
      const local: Partial<Task> = {};
      if (updates.status) local.status = updates.status;
      if (updates.dueDate !== undefined) local.dueDate = updates.dueDate;
      if (updates.title !== undefined) local.title = updates.title;
      if (updates.goalType) local.goalType = updates.goalType;
      patch((d) => ({ ...d, tasks: d.tasks.map((t) => (t._id === id ? { ...t, ...local } : t)) }));
      try {
        const saved = await learningApi.updateTask(id, updates);
        if (saved) patch((d) => ({ ...d, tasks: d.tasks.map((t) => (t._id === id ? { ...t, ...saved, goalType: saved.goalType ?? t.goalType } : t)) }));
      } catch (e) {
        set({ data: before });
        toast.error(errorMessage(e, 'Failed to update task'));
      }
    },

    syncTask(id, updates) {
      patch((d) => ({ ...d, tasks: d.tasks.map((t) => (t._id === id ? { ...t, ...updates } : t)) }));
    },

    async deleteTask(id) {
      const before = get().data;
      if (!before) return;
      patch((d) => ({ ...d, tasks: d.tasks.filter((t) => t._id !== id) }));
      try {
        await learningApi.deleteTask(id);
        toast.success('Task deleted');
      } catch (e) {
        set({ data: before });
        toast.error(errorMessage(e, 'Failed to delete task'));
      }
    },

    // ── Quick notes (client UUID upsert) ───────────────────────────────────

    async saveQuickNote(note) {
      const existing = get().data?.quickNotes.find((n) => n._id === note._id);
      const optimistic: QuickNote = {
        _id: note._id,
        content: note.content,
        category: note.category,
        attachments: note.attachments ?? existing?.attachments ?? [],
        isPinned: existing?.isPinned ?? false,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
      };
      patch((d) => ({
        ...d,
        quickNotes: existing ? d.quickNotes.map((n) => (n._id === note._id ? optimistic : n)) : [optimistic, ...d.quickNotes],
      }));
      try {
        const saved = await learningApi.putQuickNote(note._id, { content: note.content, category: note.category, attachments: note.attachments });
        patch((d) => ({ ...d, quickNotes: d.quickNotes.map((n) => (n._id === note._id ? saved : n)) }));
        return true;
      } catch (e) {
        patch((d) => ({
          ...d,
          quickNotes: existing ? d.quickNotes.map((n) => (n._id === note._id ? existing : n)) : d.quickNotes.filter((n) => n._id !== note._id),
        }));
        toast.error(errorMessage(e, 'Failed to save note'));
        return false;
      }
    },

    async toggleQuickNotePin(id) {
      const note = get().data?.quickNotes.find((n) => n._id === id);
      if (!note) return;
      const flip = (isPinned: boolean) => patch((d) => ({ ...d, quickNotes: d.quickNotes.map((n) => (n._id === id ? { ...n, isPinned } : n)) }));
      flip(!note.isPinned);
      try {
        await learningApi.pinQuickNote(id, !note.isPinned);
      } catch (e) {
        flip(note.isPinned);
        toast.error(errorMessage(e, 'Failed to pin note'));
      }
    },

    async deleteQuickNote(id) {
      const note = get().data?.quickNotes.find((n) => n._id === id);
      if (!note) return;
      patch((d) => ({ ...d, quickNotes: d.quickNotes.filter((n) => n._id !== id) }));
      try {
        await learningApi.deleteQuickNote(id);
      } catch (e) {
        patch((d) => ({ ...d, quickNotes: [...d.quickNotes, note] }));
        toast.error(errorMessage(e, 'Failed to delete note'));
      }
    },

    // ── Captures, schedule, debriefs, goals: refetch after success ─────────

    async updateCapture(id, body) {
      try {
        await learningApi.updateCapture(id, body);
        toast.success('Updated successfully!');
        void get().refresh();
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Failed to update'));
        return false;
      }
    },

    async deleteCapture(id) {
      try {
        await learningApi.deleteCapture(id);
        toast.success('Capture deleted');
        void get().refresh();
      } catch (e) {
        toast.error(errorMessage(e, 'Failed to delete'));
      }
    },

    async saveSchedule(slots) {
      try {
        const saved = await learningApi.saveTodaySchedule(slots);
        patch((d) => ({ ...d, schedule: d.schedule ? { ...d.schedule, slots: saved } : { routineMode: 'MASTER', slots: saved } }));
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Failed to save the schedule'));
        return false;
      }
    },

    async saveDebrief(day, body) {
      try {
        const debrief = await learningApi.saveDebrief(day, body);
        if (day === get().data?.today) patch((d) => ({ ...d, todayDebrief: debrief }));
        toast.success('Day debrief saved');
        void get().refresh();
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Failed to save debrief'));
        return false;
      }
    },

    async saveCatchUp(body) {
      try {
        await learningApi.saveCatchUp(body);
        toast.success('Catch-up saved!');
        void get().refresh();
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Failed to save catch-up. Please try again.'));
        return false;
      }
    },

    async shiftGoal(todoId, target) {
      try {
        await learningApi.shiftGoal(todoId, target);
        toast.success(target === 'THIS_WEEK' ? 'Moved to this week' : 'Moved to this month');
        void get().refresh();
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Failed to shift goal'));
        return false;
      }
    },

    // ── Loop v2: settings, fresh start, focus lines, milestones ──────────────

    async loadSettings() {
      set({ settingsStatus: 'loading' });
      try {
        const settings = await learningApi.getSettings();
        set({ settings, settingsStatus: 'ready' });
      } catch (e) {
        console.error('[learningStore] settings failed', e);
        set({ settingsStatus: 'error' });
      }
    },

    async updateSettings(changes) {
      const before = get().settings;
      if (before) set({ settings: { ...before, ...changes } });
      try {
        const saved = await learningApi.updateSettings(changes);
        set({ settings: saved, settingsStatus: 'ready' });
        // Budget, busy week, routine and zone all change what Today shows.
        if ('dailyBudgetMin' in changes || 'busyUntil' in changes || 'routineEnabled' in changes || 'timezone' in changes) void get().refresh();
        return true;
      } catch (e) {
        if (before) set({ settings: before });
        toast.error(errorMessage(e, 'Couldn’t save that setting. Try again.'));
        return false;
      }
    },

    async previewFreshStart() {
      try {
        return await learningApi.freshStart({ dryRun: true });
      } catch (e) {
        console.error('[learningStore] fresh start preview failed', e);
        return null;
      }
    },

    async freshStart() {
      try {
        const res = await learningApi.freshStart();
        await get().refresh();
        toast.success(
          res.moved === 0
            ? 'Nothing was waiting'
            : `Spread ${res.moved} ${res.moved === 1 ? 'revision' : 'revisions'} over the next ${res.spreadDays} ${res.spreadDays === 1 ? 'day' : 'days'}`,
        );
        return true;
      } catch (e) {
        toast.error(errorMessage(e, 'Couldn’t spread the waiting revisions. Try again.'));
        return false;
      }
    },

    async addFocus(text) {
      const d = get().data;
      const value = text.trim();
      if (!d?.focus || !value) return false;
      if (d.focus.items.length >= FOCUS_LIMIT) {
        toast.error('Three focus lines is the limit. Finish or remove one first.');
        return false;
      }
      const temp: FocusItem = { _id: tempId(), day: d.today, text: value, done: false, sortOrder: d.focus.items.length, createdAt: new Date().toISOString() };
      patch((x) => (x.focus ? { ...x, focus: { ...x.focus, items: [...x.focus.items, temp] } } : x));
      try {
        const saved = await learningApi.createFocus(value);
        patch((x) => (x.focus ? { ...x, focus: { ...x.focus, items: x.focus.items.map((f) => (f._id === temp._id ? saved : f)) } } : x));
        return true;
      } catch (e) {
        patch((x) => (x.focus ? { ...x, focus: { ...x.focus, items: x.focus.items.filter((f) => f._id !== temp._id) } } : x));
        toast.error(
          e instanceof LearningApiError && e.code === 'FOCUS_LIMIT' ? 'Three focus lines is the limit. Finish or remove one first.' : errorMessage(e, 'Couldn’t add that line. Try again.'),
        );
        return false;
      }
    },

    async toggleFocus(id) {
      const item = get().data?.focus?.items.find((f) => f._id === id);
      if (!item || id.startsWith('tmp-')) return;
      const flip = (done: boolean) =>
        patch((x) => {
          if (!x.focus) return x;
          const next = { ...x, focus: { ...x.focus, items: x.focus.items.map((f) => (f._id === id ? { ...f, done } : f)) } };
          return { ...next, stats: withTodayRhythm(next) };
        });
      flip(!item.done);
      try {
        await learningApi.updateFocus(id, { done: !item.done });
      } catch (e) {
        flip(item.done);
        toast.error(errorMessage(e, 'Couldn’t update that line. Try again.'));
      }
    },

    async editFocus(id, text) {
      const item = get().data?.focus?.items.find((f) => f._id === id);
      const value = text.trim();
      if (!item || !value || value === item.text || id.startsWith('tmp-')) return !!item;
      const setText = (t: string) => patch((x) => (x.focus ? { ...x, focus: { ...x.focus, items: x.focus.items.map((f) => (f._id === id ? { ...f, text: t } : f)) } } : x));
      setText(value);
      try {
        await learningApi.updateFocus(id, { text: value });
        return true;
      } catch (e) {
        setText(item.text);
        toast.error(errorMessage(e, 'Couldn’t save that line. Try again.'));
        return false;
      }
    },

    async removeFocus(id) {
      const d = get().data;
      const item = d?.focus?.items.find((f) => f._id === id);
      if (!d || !item || id.startsWith('tmp-')) return;
      patch((x) => {
        if (!x.focus) return x;
        const next = { ...x, focus: { ...x.focus, items: x.focus.items.filter((f) => f._id !== id) } };
        return { ...next, stats: withTodayRhythm(next) };
      });
      try {
        await learningApi.deleteFocus(id);
        toast('Focus line removed', {
          action: { label: 'Undo', onClick: () => void get().addFocus(item.text) },
        });
      } catch (e) {
        patch((x) => (x.focus ? { ...x, focus: { ...x.focus, items: [...x.focus.items, item].sort((a, b) => a.sortOrder - b.sortOrder) } } : x));
        toast.error(errorMessage(e, 'Couldn’t remove that line. Try again.'));
      }
    },

    async carryOverFocus(ids) {
      const d = get().data;
      if (!d?.focus || ids.length === 0) return;
      try {
        const res = await learningApi.carryOverFocus(ids);
        const onToday = new Set(res.items.map((f) => f.text.trim().toLowerCase()));
        patch((x) => (x.focus ? { ...x, focus: { items: res.items, carryOver: x.focus.carryOver.filter((c) => !onToday.has(c.text.trim().toLowerCase())) } } : x));
        if (res.carried < ids.length) toast('Only what fits today was carried over (three lines a day).');
      } catch (e) {
        toast.error(
          e instanceof LearningApiError && e.code === 'FOCUS_LIMIT' ? 'Today already has three focus lines.' : errorMessage(e, 'Couldn’t carry those over. Try again.'),
        );
      }
    },

    async toggleMilestone(goalId, milestone) {
      const before = get().data;
      if (!before?.goals) return;
      const done = !milestone.done;
      patch((x) =>
        x.goals
          ? {
              ...x,
              goals: x.goals.map((g) =>
                g._id === goalId
                  ? {
                      ...g,
                      progress: { ...g.progress, done: Math.max(0, g.progress.done + (done ? 1 : -1)) },
                      nextMilestone: g.nextMilestone && g.nextMilestone._id === milestone._id ? { ...g.nextMilestone, done } : g.nextMilestone,
                    }
                  : g,
              ),
            }
          : x,
      );
      try {
        const { goal } = await learningApi.updateMilestone(milestone._id, { done });
        // The server sends the goal back with its new forecast and next milestone.
        patch((x) =>
          x.goals
            ? {
                ...x,
                goals: x.goals.map((g) =>
                  g._id === goalId
                    ? { ...g, title: goal.title, deadline: goal.deadline, daysLeft: goal.daysLeft, progress: goal.progress, forecast: goal.forecast, nextMilestone: goal.nextMilestone }
                    : g,
                ),
              }
            : x,
        );
      } catch (e) {
        set({ data: before });
        toast.error(errorMessage(e, 'Couldn’t update that milestone. Try again.'));
      }
    },

    openReschedule: (target) => set({ rescheduleTarget: target }),
    openEditCapture: (target) => set({ editCapture: target }),
    openPreview: (target) => set({ preview: target }),
    openTaskDetail: (task) => set({ taskDetail: task }),
  };
});
