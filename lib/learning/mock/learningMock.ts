/**
 * MOCK MODE backend (NEXT_PUBLIC_LEARNING_MOCK=1): serves every learningApi call from the
 * in-memory fixtures and simulates the mutations closely enough to exercise every screen.
 * It is not the engine: completions shift later cycles by interval spacing, the streak
 * credits once per day when nothing is left due, and undo restores the saved dates.
 *
 * Scenario switches (read once, from the page URL when the mock first loads; combine freely):
 *   ?mockMode=busy|comeback → loop v2 plan modes (busy week; back after 9 days away)
 *   ?mockDone=1             → today's plan already done
 *   ?mockGoals=0|1|3        → no goal / the example goal (default) / three goals (ahead, behind, too early)
 *   ?mockLong=1             → long titles and notes
 *   ?mockFail=a,b           → failed calls: today | plan | focus | goals | settings
 *   ?mockLatency=ms         → slower calls (to see skeletons)
 *   ?mockMonday=1           → today is the Monday review day ("Plan your week")
 *   ?mockRoutine=1          → routineEnabled (timeline, Day Manager, Wrap up day come back)
 *   ?mockTriage=debrief     → with routine on: one past day with unresolved blocks
 *   ?mockTriage=catch-up    → with routine on: three missed days
 *   ?mockWeekly=1           → same as mockMonday (old name)
 *   ?mockEmpty=1            → a brand-new account (every empty state)
 *
 * Loop v2 (LOOP_V2_SPEC) is simulated: settings, the budgeted plan with its modes, fresh start,
 * focus lines with carry-over, goals with milestones and the forecast, and the rhythm.
 *
 * Never imported directly: learningApi loads it with a dynamic import behind the env check.
 */
import {
  addDays,
  computeDebriefStats,
  dayOf,
  diffDays,
  stampActualTimes,
  startOfWeek,
  today as engineToday,
  weekday,
  weekdayName,
  type DayString,
} from '@/lib/learning/engine';
import { LearningApiError, type TaskUpdate } from '@/lib/api/learningApi';
import type {
  Attachment,
  CatchUpBody,
  ChainRevision,
  CreateCaptureBody,
  Debrief,
  DebriefFormBody,
  DebriefSlotBody,
  FocusItem,
  Goal,
  GoalBody,
  GoalForecast,
  GoalMilestone,
  GoalPatch,
  LearningSettings,
  LearningSettingsPatch,
  MilestoneBody,
  MilestonePatch,
  NextRevisionAction,
  PlanMode,
  QuickNoteCategory,
  RawCapture,
  RawQuickNote,
  RawRevisionItem,
  RawTodayPayload,
  Rhythm,
  RoutineMode,
  ScheduleSlotUpdate,
  Slot,
  Subject,
  SubjectWithTopics,
  Task,
  TodayGoal,
  TodayPlan,
  Topic,
  TopicByDoc,
  Triage,
  UpdateCaptureBody,
} from '@/lib/learning/types';
import { BUDGET_MAX, BUDGET_MIN, FOCUS_LIMIT, FOCUS_MAX_CHARS, GOAL_LIMIT } from '@/lib/learning/types';
import { MINUTES_FIRST_CYCLE, MINUTES_LATER_CYCLE } from '@/lib/learning/plan';
import {
  at,
  buildFixtures,
  INTERVALS,
  MOCK_TZ,
  type MockCapture,
  type MockDb,
  type MockGoal,
  type MockItem,
  type MockMilestone,
  type MockRevision,
  type MockScenario,
} from './fixtures';

const DEFAULT_LATENCY_MS = 220;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const notFound = () => new LearningApiError('Not found', 404);
/** engine goals.ts isWeeklyReviewDay: Monday in the user's zone. */
const isWeeklyReviewDay = (day: DayString) => weekday(day) === 0;

type FailPart = 'today' | 'plan' | 'focus' | 'goals' | 'settings';

function readScenario(): MockScenario & { fail: Set<FailPart>; latency: number } {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const triage = params.get('mockTriage');
  const mode = params.get('mockMode');
  const goals = params.get('mockGoals');
  const latency = Number(params.get('mockLatency'));
  return {
    triage: (triage === 'debrief' || triage === 'catch-up' ? triage : 'none') as MockDb['triage'],
    forceWeeklyReview: params.get('mockWeekly') === '1' || params.get('mockMonday') === '1',
    empty: params.get('mockEmpty') === '1',
    mode: mode === 'busy' || mode === 'comeback' ? mode : 'normal',
    allDone: params.get('mockDone') === '1',
    goals: goals === '0' ? 0 : goals === '3' ? 3 : 1,
    long: params.get('mockLong') === '1',
    routine: params.get('mockRoutine') === '1' || triage === 'debrief' || triage === 'catch-up',
    fail: new Set(
      (params.get('mockFail') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is FailPart => ['today', 'plan', 'focus', 'goals', 'settings'].includes(s)),
    ),
    latency: Number.isFinite(latency) && latency > 0 ? latency : DEFAULT_LATENCY_MS,
  };
}

/** A valid IANA zone name (what the server's isValidTimeZone checks). */
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function createMock() {
  const scenario = readScenario();
  const sleep = () => new Promise((r) => setTimeout(r, scenario.latency));
  const today = engineToday(MOCK_TZ);
  const db = buildFixtures(today, new Date(), scenario);
  let routineMode: RoutineMode = 'MASTER';
  let timezone = MOCK_TZ;

  // ── helpers ──
  const nextId = (prefix: string) => `${prefix}-${++db.seq}`;
  const itemByKey = (key: string) => db.items.find((i) => i.key === key);
  const chainOf = (key: string) => db.revisions.filter((r) => r.itemKey === key).sort((a, b) => a.cycleNumber - b.cycleNumber);
  const subjectRef = (id: string | null) => {
    const s = id ? db.subjects.find((x) => x._id === id) : null;
    return s ? { _id: s._id, name: s.name, color: s.color } : null;
  };
  const completedDay = (r: MockRevision) => (r.completedAt ? dayOf(new Date(r.completedAt), MOCK_TZ) : null);
  const toChain = (key: string): ChainRevision[] =>
    chainOf(key).map((r) => ({ _id: r._id, cycleNumber: r.cycleNumber, intervalDays: r.intervalDays, scheduledFor: r.scheduledFor, status: r.status, completedAt: r.completedAt }));

  const toItem = (r: MockRevision, extra: Partial<RawRevisionItem> = {}): RawRevisionItem => {
    const item = itemByKey(r.itemKey);
    if (!item) throw notFound();
    const later = chainOf(r.itemKey).filter((x) => x.cycleNumber > r.cycleNumber);
    return {
      _id: r._id,
      kind: item.kind,
      itemId: item.itemId,
      title: item.title,
      subject: subjectRef(item.subjectId),
      cycleNumber: r.cycleNumber,
      intervalDays: r.intervalDays,
      scheduledFor: r.scheduledFor,
      status: r.status,
      completedAt: r.completedAt,
      tags: item.tags,
      ...(item.kind === 'topic' ? { docId: item.docId } : { content: item.content, url: item.url, attachments: item.attachments }),
      ...(r.status === 'done' ? { canUndo: !later.some((x) => x.status === 'done') } : {}),
      ...extra,
    };
  };

  /** engine buildRevisionBuckets, simplified. */
  const buckets = () => {
    const visible = db.revisions
      .filter((r) => (r.status === 'pending' && r.scheduledFor <= today) || (r.status === 'done' && completedDay(r) === today))
      .sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : a.scheduledFor > b.scheduledFor ? 1 : 0));
    const seen = new Set<string>();
    const shown = visible.filter((r) => {
      if (r.status === 'done') return true;
      if (seen.has(r.itemKey)) return false;
      seen.add(r.itemKey);
      return true;
    });
    const due = shown.filter((r) => r.status === 'pending' && r.scheduledFor >= today);
    // Keep Revise's grouping by subject (groups in order of first appearance).
    const order: string[] = [];
    for (const r of due) {
      const s = itemByKey(r.itemKey)?.subjectId ?? 'general';
      if (!order.includes(s)) order.push(s);
    }
    const dueToday = order.flatMap((s) => due.filter((r) => (itemByKey(r.itemKey)?.subjectId ?? 'general') === s)).map((r) => toItem(r));
    const overdue = shown
      .filter((r) => r.status === 'pending' && r.scheduledFor < today)
      .map((r) => toItem(r, { daysLate: Math.max(1, diffDays(today, r.scheduledFor)) }));
    const doneToday = shown
      .filter((r) => r.status === 'done')
      .sort((a, b) => (a.scheduledFor < b.scheduledFor ? 1 : a.scheduledFor > b.scheduledFor ? -1 : 0))
      .map((r) => toItem(r));
    return { totalDue: dueToday.length + overdue.length, dueToday, overdue, doneToday };
  };

  const pendingDueCount = () => {
    const keys = new Set(db.revisions.filter((r) => r.status === 'pending' && r.scheduledFor <= today).map((r) => r.itemKey));
    return keys.size;
  };

  const toCapture = (c: MockCapture): RawCapture => ({ ...c, subject: subjectRef(c.subjectId) });
  const isInbox = (c: MockCapture) =>
    !c.subjectId && !c.topicId && !db.revisions.some((r) => r.itemKey === `capture:${c._id}` && r.status === 'pending');

  const progress = () => {
    const topicKeys = db.items.filter((i) => i.kind === 'topic').map((i) => i.key);
    const mastered = topicKeys.filter((k) => chainOf(k).some((r) => r.cycleNumber === 4 && r.status === 'done')).length;
    const totalTopics = topicKeys.length + db.idleTopics.length;
    return { totalTopics, mastered, inProgress: Math.max(0, topicKeys.length - mastered), notStarted: db.idleTopics.length };
  };

  const pastSlots = (day: DayString, prefix: string): Slot[] =>
    [
      ['07:00', '08:00', 'DSA warm-up: arrays', '#3b82f6'],
      ['10:00', '12:00', 'Deep work: system design', '#8b5cf6'],
      ['19:00', '20:00', 'Gym', '#ef4444'],
    ].map(([s, e, title, color], i) => ({
      _id: `${prefix}-${day}-${i}`,
      sourceBlockId: `block-past-${i}`,
      date: day,
      title: title!,
      color: color!,
      startTime: s!,
      endTime: e!,
      status: 'UPCOMING' as const,
      actualStartTime: null,
      actualEndTime: null,
      remark: null,
      minutesDone: null,
      sortOrder: i,
    }));

  const triage = (): Triage => {
    if (db.triage === 'debrief') {
      const date = addDays(today, -1);
      return { kind: 'debrief', date, slots: pastSlots(date, 'tri'), existingDebrief: db.debriefs[date] ?? null };
    }
    if (db.triage === 'catch-up') {
      const days = [-3, -2, -1].map((n) => addDays(today, n));
      return { kind: 'catch-up', days: days.map((date) => ({ date, slots: pastSlots(date, 'cu') })), prefill: null };
    }
    return { kind: 'none' };
  };

  const taskDueDay = (t: Task) => (t.dueDate ? dayOf(new Date(t.dueDate), MOCK_TZ) : null);
  const homeTasks = () =>
    db.tasks.filter((t) => {
      if (t.status === 'complete') return !!t.completedAt && dayOf(new Date(t.completedAt), MOCK_TZ) === today;
      return !!t.dueDate || t.goalType !== 'NONE';
    });

  const weeklyGoals = () =>
    db.tasks.filter((t) => {
      const due = taskDueDay(t);
      return t.goalType === 'WEEKLY' && t.status !== 'complete' && due !== null && due < startOfWeek(today);
    });

  const nextAction = (chain: MockRevision[]): NextRevisionAction => {
    if (chain.length === 0) return { kind: 'start' };
    const next = chain.filter((r) => r.status === 'pending').sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1))[0];
    if (!next) return { kind: 'completed' };
    const c: ChainRevision = { _id: next._id, cycleNumber: next.cycleNumber, intervalDays: next.intervalDays, scheduledFor: next.scheduledFor, status: next.status, completedAt: next.completedAt };
    const inDays = diffDays(next.scheduledFor, today);
    if (inDays >= 2) return { kind: 'wait', next: c, inDays };
    if (inDays === 1) return { kind: 'early', next: c };
    return { kind: 'due', next: c };
  };

  const startChain = (key: string) => {
    if (chainOf(key).length > 0) throw new LearningApiError('Revisions already started', 409, 'ALREADY_STARTED');
    INTERVALS.forEach((interval, i) =>
      db.revisions.push({ _id: nextId('rev'), itemKey: key, cycleNumber: i + 1, intervalDays: interval, scheduledFor: addDays(today, interval), status: 'pending', completedAt: null, undo: null }),
    );
    return toChain(key);
  };

  const debriefFrom = (date: DayString, form: DebriefFormBody, slots: Slot[]): Debrief => {
    const stats = computeDebriefStats(slots.map((s) => ({ ...s, id: s._id })));
    return {
      _id: db.debriefs[date]?._id ?? nextId('debrief'),
      date,
      blocksPlanned: stats.planned,
      blocksCompleted: stats.completed,
      blocksSkipped: stats.skipped,
      totalFocusedMin: stats.focusedMin,
      energy: form.energy,
      focus: form.focus,
      mood: form.mood,
      tags: [...form.tags],
      narrative: form.narrative.trim() || null,
      tomorrowIntent: form.tomorrowIntent.trim() || null,
      freeWrite: form.freeWrite.trim() || null,
    };
  };

  const quickNoteRaw = (n: MockDb['quickNotes'][number]): RawQuickNote => ({ ...n });

  // ── Loop v2: settings, the budgeted plan, focus, goals, rhythm ──────────────

  const settingsOut = (): LearningSettings => ({ ...db.settings, timezone, routineMode });

  /** §2 modes: busy while today ≤ busyUntil; comeback when last seen 3+ days ago. */
  const planMode = (): PlanMode => {
    const s = db.settings;
    if (s.busyUntil && today <= s.busyUntil) return 'busy';
    if (s.lastSeenDay && diffDays(today, s.lastSeenDay) >= 3) return 'comeback';
    return 'normal';
  };

  const minutesOf = (r: MockRevision) => (r.cycleNumber === 1 ? MINUTES_FIRST_CYCLE : MINUTES_LATER_CYCLE);
  const subjectOf = (r: MockRevision) => itemByKey(r.itemKey)?.subjectId ?? null;
  const activeGoalSubjects = () => new Set(db.goals.filter((g) => g.status === 'active').flatMap((g) => g.subjectIds));

  /**
   * §2 engine planToday, as the mock reads it. Two choices the spec leaves open (flagged for the
   * backend): minutes already done today come off the budget, and "at least 3" counts the items
   * already done today, so finishing never refills Today.
   */
  const planToday = (): TodayPlan<RawRevisionItem> => {
    const mode = planMode();
    const doneToday = db.revisions
      .filter((r) => r.status === 'done' && completedDay(r) === today)
      .sort((a, b) => ((a.completedAt ?? '') < (b.completedAt ?? '') ? -1 : 1));
    const firstPending = new Map<string, MockRevision>();
    for (const r of db.revisions) {
      if (r.status !== 'pending' || r.scheduledFor > today) continue;
      const cur = firstPending.get(r.itemKey);
      if (!cur || r.cycleNumber < cur.cycleNumber) firstPending.set(r.itemKey, r);
    }
    const goalSubjects = activeGoalSubjects();
    const late = (r: MockRevision) => Math.min(14, Math.max(0, diffDays(today, r.scheduledFor)));
    const candidates = [...firstPending.values()].sort((a, b) => {
      const ga = goalSubjects.has(subjectOf(a) ?? '') ? 0 : 1;
      const gb = goalSubjects.has(subjectOf(b) ?? '') ? 0 : 1;
      if (ga !== gb) return ga - gb;
      if (a.cycleNumber !== b.cycleNumber) return a.cycleNumber - b.cycleNumber;
      if (late(a) !== late(b)) return late(b) - late(a);
      if (a.scheduledFor !== b.scheduledFor) return a.scheduledFor < b.scheduledFor ? -1 : 1;
      return a._id < b._id ? -1 : 1;
    });
    const budgetMin = mode === 'busy' ? Math.min(db.settings.dailyBudgetMin, 10) : db.settings.dailyBudgetMin;
    const maxItems = mode === 'busy' ? 3 : mode === 'comeback' ? 5 : Infinity;
    const doneMinutes = doneToday.reduce((s, r) => s + minutesOf(r), 0);
    const minItems = Math.max(0, 3 - doneToday.length);
    const room = Math.max(0, maxItems - doneToday.length);
    const planned: MockRevision[] = [];
    let est = 0;
    for (const r of candidates) {
      if (planned.length >= room) break;
      const m = minutesOf(r);
      const fits = mode === 'comeback' || doneMinutes + est + m <= budgetMin;
      if (!fits && planned.length >= minItems) break;
      planned.push(r);
      est += m;
    }
    return {
      mode,
      budgetMin,
      estMinutes: est,
      planned: planned.map((r) => toItem(r, { minutes: minutesOf(r), ...(r.scheduledFor < today ? { daysLate: diffDays(today, r.scheduledFor) } : {}) })),
      waitingCount: candidates.length - planned.length,
      doneToday: doneToday.map((r) => toItem(r, { minutes: minutesOf(r) })),
    };
  };

  const focusOut = (f: MockDb['focus'][number]): FocusItem => ({ _id: f._id, day: f.day, text: f.text, done: f.done, sortOrder: f.sortOrder, createdAt: f.createdAt });
  const focusToday = () => db.focus.filter((f) => f.day === today).sort((a, b) => a.sortOrder - b.sortOrder);
  const sameText = (t: string) => t.trim().toLowerCase();
  /** GET /api/today: yesterday's unfinished lines that are not on today's list yet (same text). */
  const carryOverList = () => {
    const onToday = new Set(focusToday().map((f) => sameText(f.text)));
    return db.focus.filter((f) => f.day === addDays(today, -1) && !f.done && !onToday.has(sameText(f.text))).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  /** §5 a day is active with ≥ 1 revision completed or a focus line done. */
  const rhythm = (): Rhythm => {
    const activeToday =
      db.revisions.some((r) => r.status === 'done' && completedDay(r) === today) || focusToday().some((f) => f.done);
    const last7 = [6, 5, 4, 3, 2, 1, 0].map((n) => ({ day: addDays(today, -n), active: n === 0 ? activeToday : db.activeHistory.includes(n) }));
    return { last7, activeDays: last7.filter((d) => d.active).length };
  };

  const milestonesOf = (goalId: string): MockMilestone[] => db.milestones.filter((m) => m.goalId === goalId).sort((a, b) => a.sortOrder - b.sortOrder);
  const milestoneOut = (m: MockMilestone): GoalMilestone => ({ ...m });
  const dayLabel = (d: DayString) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

  /** §4 engine goalForecast, as the mock reads it. Plain words; never scolds. */
  const goalForecast = (g: MockGoal): GoalForecast => {
    const ms = milestonesOf(g._id);
    const total = ms.length;
    const done = ms.filter((m) => m.done).length;
    const remaining = total - done;
    const daysLeft = diffDays(g.deadline, today);
    const sinceDays = Math.max(0, diffDays(today, g.createdDay));
    const weeksSince = Math.max(1, sinceDays / 7);
    const pacePerWeek = done / weeksSince;
    const weeksLeft = Math.max(1 / 7, daysLeft / 7);
    const requiredPerWeek = remaining / weeksLeft;
    const projectedDay = pacePerWeek > 0 ? addDays(today, Math.ceil((remaining / pacePerWeek) * 7)) : null;
    const per = (n: number) => {
      if (n <= 0) return 'Keep going';
      if (n >= 1) return `${Math.round(n)} milestone${Math.round(n) === 1 ? '' : 's'} a week`;
      const every = Math.max(2, Math.round(1 / n));
      return `1 milestone every ${every} weeks`;
    };
    let status: GoalForecast['status'];
    let behindDays: number | null = 0;
    let suggestion: string;
    if (g.status === 'done' || (total > 0 && remaining === 0)) {
      status = 'done';
      suggestion = 'Reached. Archive it, or set the next goal.';
    } else if (daysLeft < 0) {
      status = 'overdue';
      behindDays = -daysLeft;
      suggestion = 'Pick a new date, or mark it reached.';
    } else if (done === 0 && sinceDays < 7) {
      status = 'no_data';
      suggestion = 'Tick off a first milestone to see a forecast.';
    } else if (!projectedDay || projectedDay > g.deadline) {
      status = 'behind';
      behindDays = projectedDay ? diffDays(projectedDay, g.deadline) : null;
      suggestion = `${per(requiredPerWeek)} from now gets you there by ${dayLabel(g.deadline)}.`;
    } else if (diffDays(g.deadline, projectedDay) >= 21) {
      status = 'ahead';
      suggestion = `${per(requiredPerWeek)} keeps you on track. You have room to spare.`;
    } else {
      status = 'on_track';
      suggestion = `${per(requiredPerWeek)} keeps you on track.`;
    }
    return {
      daysLeft,
      progress: { done, total },
      pacePerWeek: Math.round(pacePerWeek * 100) / 100,
      projectedDay,
      status,
      behindDays,
      requiredPerWeek: status === 'overdue' ? null : Math.round(requiredPerWeek * 100) / 100,
      suggestion,
    };
  };

  const todayGoal = (g: MockGoal): TodayGoal => {
    const f = goalForecast(g);
    const next = milestonesOf(g._id).find((m) => !m.done) ?? null;
    return { _id: g._id, title: g.title, deadline: g.deadline, daysLeft: f.daysLeft, progress: f.progress, forecast: f, nextMilestone: next ? milestoneOut(next) : null, createdDay: g.createdDay };
  };

  /** The real goal JSON (backend serializeGoal): subjects, milestones, forecast, next milestone. */
  const goalOut = (g: MockGoal): Goal => {
    const forecast = goalForecast(g);
    const next = milestonesOf(g._id).find((m) => !m.done) ?? null;
    return {
      _id: g._id,
      title: g.title,
      why: g.why,
      deadline: g.deadline,
      status: g.status,
      subjects: g.subjectIds.map((id) => subjectRef(id)).filter((x): x is NonNullable<typeof x> => !!x),
      milestones: milestonesOf(g._id).map(milestoneOut),
      daysLeft: forecast.daysLeft,
      progress: forecast.progress,
      forecast,
      nextMilestone: next ? milestoneOut(next) : null,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  };

  /** Shared by completeRevision and the ?mockDone=1 set-up. */
  const completeInternal = (r: MockRevision) => {
    const later = chainOf(r.itemKey).filter((x) => x.cycleNumber > r.cycleNumber && x.status === 'pending');
    r.undo = { shifts: later.map((x) => ({ id: x._id, from: x.scheduledFor })) };
    for (const x of later) x.scheduledFor = addDays(today, x.intervalDays - r.intervalDays);
    r.status = 'done';
    r.completedAt = new Date().toISOString();
    if (pendingDueCount() === 0 && db.streak.lastCreditDay !== today) {
      db.streak.beforeCredit = { current: db.streak.current, longest: db.streak.longest, lastCreditDay: db.streak.lastCreditDay };
      db.streak.current += 1;
      db.streak.longest = Math.max(db.streak.longest, db.streak.current);
      db.streak.lastCreditDay = today;
    }
  };

  if (scenario.allDone) {
    for (const item of planToday().planned) {
      const r = db.revisions.find((x) => x._id === item._id);
      if (r) completeInternal(r);
    }
  }

  const failIf = (part: FailPart) => {
    if (scenario.fail.has(part)) throw new LearningApiError(`Mock failure: ${part} (?mockFail)`, 503);
  };

  return {
    async getToday(): Promise<RawTodayPayload> {
      await sleep();
      failIf('today');
      const p = progress();
      const inbox = db.captures.filter(isInbox).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (a.createdAt < b.createdAt ? 1 : -1));
      const isReviewDay = db.forceWeeklyReview || isWeeklyReviewDay(today);
      const routineOn = db.settings.routineEnabled;
      return clone({
        today,
        timezone,
        needsEnsure: false,
        user: { _id: 'mock-user', name: 'Alex' },
        stats: {
          streak: db.streak.current,
          longestStreak: db.streak.longest,
          adherence: routineOn && db.slots.length ? 64 : null,
          adherenceDelta: routineOn && db.slots.length ? 14 : null,
          adherenceDone: 9,
          adherenceTotal: 14,
          ...p,
          rhythm: rhythm(),
        },
        revisions: buckets(),
        // §6: routine off → no schedule, no triage, no debrief
        schedule: routineOn ? { routineMode, slots: [...db.slots].sort((a, b) => a.sortOrder - b.sortOrder) } : null,
        triage: routineOn ? triage() : null,
        todayDebrief: routineOn ? db.debriefs[today] ?? null : null,
        tasks: homeTasks(),
        inbox: { count: inbox.length, items: inbox.slice(0, 10).map(toCapture) },
        quickNotes: db.quickNotes.map(quickNoteRaw),
        weeklyReview: { isReviewDay, goals: isReviewDay ? weeklyGoals() : [] },
        plan: scenario.fail.has('plan') ? null : planToday(),
        focus: scenario.fail.has('focus') ? null : { items: focusToday().map(focusOut), carryOver: carryOverList().map(focusOut) },
        goals: scenario.fail.has('goals') ? null : db.goals.filter((g) => g.status === 'active').map(todayGoal),
      });
    },

    async ensureToday() {
      await sleep();
      // §1: ensure-today records the visit (the comeback mode reads lastSeenDay before this).
      return { rolledOver: false, days: 0 };
    },

    async getSettings(): Promise<LearningSettings> {
      await sleep();
      failIf('settings');
      return clone(settingsOut());
    },

    async updateSettings(body: LearningSettingsPatch): Promise<LearningSettings> {
      await sleep();
      if (body.dailyBudgetMin !== undefined && (!Number.isInteger(body.dailyBudgetMin) || body.dailyBudgetMin < BUDGET_MIN || body.dailyBudgetMin > BUDGET_MAX)) {
        throw new LearningApiError(`Daily budget must be ${BUDGET_MIN}–${BUDGET_MAX} minutes`, 400, 'INVALID_INPUT');
      }
      if (body.nudgeTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.nudgeTime)) {
        throw new LearningApiError('Use a time like 08:30', 400, 'INVALID_INPUT');
      }
      if (body.timezone !== undefined && !isValidTimeZone(body.timezone)) {
        throw new LearningApiError('Unknown time zone', 400, 'INVALID_TIMEZONE');
      }
      const { timezone: tz, routineMode: rm, ...rest } = body;
      if (tz) timezone = tz;
      if (rm) routineMode = rm;
      Object.assign(db.settings, rest);
      return clone(settingsOut());
    },

    // §2 POST /api/revisions/fresh-start {dryRun?}: late chains spread from today on, a budget a day
    async freshStart(opts: { dryRun?: boolean } = {}) {
      await sleep();
      const firsts = new Map<string, MockRevision>();
      for (const r of db.revisions) {
        if (r.status !== 'pending') continue;
        const cur = firsts.get(r.itemKey);
        if (!cur || r.cycleNumber < cur.cycleNumber) firsts.set(r.itemKey, r);
      }
      const overdue = [...firsts.values()]
        .filter((r) => r.scheduledFor < today)
        .sort((a, b) => a.cycleNumber - b.cycleNumber || (a.scheduledFor < b.scheduledFor ? -1 : 1));
      if (overdue.length === 0) return { moved: 0, spreadDays: 0 };
      const load = new Map<DayString, number>();
      const add = (d: DayString, m: number) => load.set(d, (load.get(d) ?? 0) + m);
      for (const r of firsts.values()) if (r.scheduledFor >= today) add(r.scheduledFor, minutesOf(r));
      for (const r of db.revisions) if (r.status === 'done' && completedDay(r) === today) add(today, minutesOf(r));
      let day = today;
      let onDay = 0;
      const moves: Array<[MockRevision, DayString]> = [];
      for (const r of overdue) {
        const m = minutesOf(r);
        while (onDay > 0 && (load.get(day) ?? 0) + m > db.settings.dailyBudgetMin) {
          day = addDays(day, 1);
          onDay = 0;
        }
        moves.push([r, day]);
        add(day, m);
        onDay += 1;
      }
      if (!opts.dryRun) {
        for (const [r, d] of moves) {
          const delta = diffDays(d, r.scheduledFor);
          for (const x of chainOf(r.itemKey)) if (x.status === 'pending' && x.cycleNumber >= r.cycleNumber) x.scheduledFor = addDays(x.scheduledFor, delta);
        }
      }
      return { moved: overdue.length, spreadDays: diffDays(day, today) + 1 };
    },

    // §3 focus lines
    async createFocus(text: string): Promise<FocusItem> {
      await sleep();
      const t = text.trim();
      if (!t || t.length > FOCUS_MAX_CHARS) throw new LearningApiError(`A focus line needs 1–${FOCUS_MAX_CHARS} characters`, 400, 'INVALID_INPUT');
      const mine = focusToday();
      if (mine.length >= FOCUS_LIMIT) throw new LearningApiError('Three focus lines is the limit for a day', 409, 'FOCUS_LIMIT');
      const f = { _id: nextId('focus'), day: today, text: t, done: false, sortOrder: (mine.at(-1)?.sortOrder ?? -1) + 1, createdAt: new Date().toISOString() };
      db.focus.push(f);
      return clone(focusOut(f));
    },

    async updateFocus(id: string, body: { text?: string; done?: boolean }): Promise<FocusItem> {
      await sleep();
      const f = db.focus.find((x) => x._id === id);
      if (!f) throw notFound();
      if (body.text !== undefined) {
        const t = body.text.trim();
        if (!t || t.length > FOCUS_MAX_CHARS) throw new LearningApiError(`A focus line needs 1–${FOCUS_MAX_CHARS} characters`, 400, 'INVALID_INPUT');
        f.text = t;
      }
      if (body.done !== undefined) f.done = body.done;
      return clone(focusOut(f));
    },

    async deleteFocus(id: string) {
      await sleep();
      if (!db.focus.some((f) => f._id === id)) throw notFound();
      db.focus = db.focus.filter((f) => f._id !== id);
      return { deleted: true as const };
    },

    async carryOverFocus(ids: string[]) {
      await sleep();
      const rows = db.focus.filter((f) => ids.includes(f._id));
      if (rows.length !== new Set(ids).size) throw notFound();
      const seen = new Set(focusToday().map((f) => sameText(f.text)));
      const eligible = rows
        .filter((r) => !r.done && r.day < today)
        .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.sortOrder - b.sortOrder))
        .filter((r) => {
          if (seen.has(sameText(r.text))) return false;
          seen.add(sameText(r.text));
          return true;
        });
      const room = FOCUS_LIMIT - focusToday().length;
      if (eligible.length > 0 && room <= 0) throw new LearningApiError('Three focus lines is the limit for a day', 409, 'FOCUS_LIMIT');
      const copies = eligible.slice(0, Math.max(0, room));
      let order = (focusToday().at(-1)?.sortOrder ?? -1) + 1;
      for (const p of copies) {
        db.focus.push({ _id: nextId('focus'), day: today, text: p.text, done: false, sortOrder: order++, createdAt: new Date().toISOString(), carriedFrom: p._id });
      }
      return clone({ items: focusToday().map(focusOut), carried: copies.length });
    },

    // §4 goals and milestones
    async getGoals(): Promise<Goal[]> {
      await sleep();
      failIf('goals');
      return clone(db.goals.map(goalOut));
    },

    async createGoal(body: GoalBody): Promise<Goal> {
      await sleep();
      if (!body.title?.trim() || body.title.trim().length > 120) throw new LearningApiError('Give the goal a title (up to 120 characters)', 400, 'INVALID_INPUT');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.deadline ?? '')) throw new LearningApiError('Pick a deadline', 400, 'INVALID_INPUT');
      if (body.deadline < today) throw new LearningApiError('The deadline must be today or later', 400, 'INVALID_DAY');
      if (db.goals.filter((g) => g.status === 'active').length >= GOAL_LIMIT) throw new LearningApiError('Three active goals is the limit', 409, 'GOAL_LIMIT');
      const now = new Date().toISOString();
      const g: MockGoal = { _id: nextId('goal'), title: body.title.trim(), why: body.why?.trim() || null, deadline: body.deadline, status: 'active', subjectIds: body.subjectIds ?? [], createdDay: today, createdAt: now, updatedAt: now };
      db.goals.push(g);
      (body.milestones ?? []).forEach((m, i) =>
        db.milestones.push({ _id: nextId('ms'), goalId: g._id, title: m.title.trim(), dueDay: m.dueDay ?? null, done: false, doneAt: null, sortOrder: i }),
      );
      return clone(goalOut(g));
    },

    async updateGoal(id: string, body: GoalPatch): Promise<Goal> {
      await sleep();
      const g = db.goals.find((x) => x._id === id);
      if (!g) throw notFound();
      if (body.status === 'active' && g.status !== 'active' && db.goals.filter((x) => x.status === 'active').length >= GOAL_LIMIT) {
        throw new LearningApiError('Three active goals is the limit', 409, 'GOAL_LIMIT');
      }
      if (body.title !== undefined) {
        if (!body.title.trim() || body.title.trim().length > 120) throw new LearningApiError('Give the goal a title (up to 120 characters)', 400, 'INVALID_INPUT');
        g.title = body.title.trim();
      }
      if (body.why !== undefined) g.why = body.why?.trim() || null;
      if (body.deadline !== undefined) {
        if (body.deadline < today) throw new LearningApiError('The deadline must be today or later', 400, 'INVALID_DAY');
        g.deadline = body.deadline;
      }
      if (body.status !== undefined) g.status = body.status;
      if (body.subjectIds !== undefined) g.subjectIds = [...body.subjectIds];
      g.updatedAt = new Date().toISOString();
      return clone(goalOut(g));
    },

    async deleteGoal(id: string) {
      await sleep();
      if (!db.goals.some((g) => g._id === id)) throw notFound();
      db.goals = db.goals.filter((g) => g._id !== id);
      db.milestones = db.milestones.filter((m) => m.goalId !== id);
      return { deleted: true as const };
    },

    async createMilestone(goalId: string, body: MilestoneBody) {
      await sleep();
      const goal = db.goals.find((g) => g._id === goalId);
      if (!goal) throw notFound();
      if (!body.title?.trim() || body.title.trim().length > 140) throw new LearningApiError('A milestone needs a title (up to 140 characters)', 400, 'INVALID_INPUT');
      const m: MockMilestone = { _id: nextId('ms'), goalId, title: body.title.trim(), dueDay: body.dueDay ?? null, done: false, doneAt: null, sortOrder: (milestonesOf(goalId).at(-1)?.sortOrder ?? -1) + 1 };
      db.milestones.push(m);
      return clone({ milestone: milestoneOut(m), goal: goalOut(goal) });
    },

    async updateMilestone(id: string, body: MilestonePatch) {
      await sleep();
      const m = db.milestones.find((x) => x._id === id);
      if (!m) throw notFound();
      if (body.title !== undefined) {
        if (!body.title.trim() || body.title.trim().length > 140) throw new LearningApiError('A milestone needs a title (up to 140 characters)', 400, 'INVALID_INPUT');
        m.title = body.title.trim();
      }
      if (body.dueDay !== undefined) m.dueDay = body.dueDay;
      if (body.sortOrder !== undefined) m.sortOrder = body.sortOrder;
      if (body.done !== undefined) {
        m.done = body.done;
        m.doneAt = body.done ? new Date().toISOString() : null;
      }
      const goal = db.goals.find((g) => g._id === m.goalId);
      if (!goal) throw notFound();
      return clone({ milestone: milestoneOut(m), goal: goalOut(goal) });
    },

    async deleteMilestone(id: string) {
      await sleep();
      const m = db.milestones.find((x) => x._id === id);
      const goal = m ? db.goals.find((g) => g._id === m.goalId) : undefined;
      if (!m || !goal) throw notFound();
      db.milestones = db.milestones.filter((x) => x._id !== id);
      return clone({ deleted: true as const, goal: goalOut(goal) });
    },

    async startRevisions(target: { topicId: string } | { captureId: string }) {
      await sleep();
      const key = 'topicId' in target ? `topic:${target.topicId}` : `capture:${target.captureId}`;
      if (!itemByKey(key)) throw notFound();
      return { chain: startChain(key) };
    },

    async completeRevision(id: string) {
      await sleep();
      const r = db.revisions.find((x) => x._id === id);
      if (!r) throw notFound();
      if (r.status !== 'pending') throw new LearningApiError('Revision is not pending', 409, 'NOT_PENDING');
      completeInternal(r);
      return clone({ item: toItem(r), chain: toChain(r.itemKey), streak: { current: db.streak.current, longest: db.streak.longest }, mastered: r.cycleNumber === 4 });
    },

    async uncompleteRevision(id: string) {
      await sleep();
      const r = db.revisions.find((x) => x._id === id);
      if (!r) throw notFound();
      if (r.status !== 'done') throw new LearningApiError('Revision is not done', 409, 'NOT_DONE');
      const laterDone = chainOf(r.itemKey).find((x) => x.cycleNumber > r.cycleNumber && x.status === 'done');
      if (laterDone) throw new LearningApiError(`Undo cycle ${laterDone.cycleNumber} first`, 409, 'LATER_CYCLE_DONE');
      for (const s of r.undo?.shifts ?? []) {
        const x = db.revisions.find((y) => y._id === s.id);
        if (x) x.scheduledFor = s.from;
      }
      r.status = 'pending';
      r.completedAt = null;
      r.undo = null;
      if (db.streak.lastCreditDay === today && db.streak.beforeCredit && pendingDueCount() > 0) {
        db.streak = { ...db.streak, ...db.streak.beforeCredit, beforeCredit: null };
      }
      return clone({ item: toItem(r), chain: toChain(r.itemKey), streak: { current: db.streak.current, longest: db.streak.longest } });
    },

    async rescheduleRevision(id: string, day: DayString) {
      await sleep();
      const r = db.revisions.find((x) => x._id === id);
      if (!r) throw notFound();
      if (r.status !== 'pending') throw new LearningApiError('Revision is not pending', 409, 'NOT_PENDING');
      if (day < today) throw new LearningApiError('Pick today or a later day', 400, 'INVALID_DAY');
      const delta = diffDays(day, r.scheduledFor);
      for (const x of chainOf(r.itemKey)) {
        if (x.cycleNumber > r.cycleNumber && x.status === 'pending') x.scheduledFor = addDays(x.scheduledFor, delta);
      }
      r.scheduledFor = day;
      return clone({ item: toItem(r), chain: toChain(r.itemKey) });
    },

    async getSubjects(): Promise<SubjectWithTopics[]> {
      await sleep();
      return clone(
        db.subjects.map((s) => ({
          _id: s._id,
          name: s.name,
          color: s.color,
          icon: s.icon,
          description: s.description,
          topics: [
            ...db.items.filter((i) => i.kind === 'topic' && i.subjectId === s._id).map((i) => ({ _id: i.itemId, title: i.title, docId: i.docId })),
            ...db.idleTopics.filter((t) => t.subjectId === s._id).map((t) => ({ _id: t.itemId, title: t.title, docId: t.docId })),
          ],
        })),
      );
    },

    async createSubject(body: { name: string; description?: string; color?: string; icon?: string }): Promise<Subject> {
      await sleep();
      if (!body.name?.trim()) throw new LearningApiError('Subject name is required', 400);
      const s = { _id: nextId('sub'), name: body.name.trim(), description: body.description ?? null, color: body.color ?? '#007acc', icon: body.icon ?? null };
      db.subjects.push(s);
      return clone(s);
    },

    async updateSubject(id: string, body: Partial<Pick<Subject, 'name' | 'description' | 'color' | 'icon'>>): Promise<Subject> {
      await sleep();
      const s = db.subjects.find((x) => x._id === id);
      if (!s) throw notFound();
      Object.assign(s, body);
      return clone(s);
    },

    async deleteSubject(id: string) {
      await sleep();
      if (!db.subjects.some((s) => s._id === id)) throw notFound();
      db.subjects = db.subjects.filter((s) => s._id !== id);
      const keys = new Set(db.items.filter((i) => i.kind === 'topic' && i.subjectId === id).map((i) => i.key));
      db.items = db.items.filter((i) => !keys.has(i.key));
      db.revisions = db.revisions.filter((r) => !keys.has(r.itemKey));
      db.captures.forEach((c) => {
        if (c.subjectId === id) c.subjectId = null;
      });
      return { deleted: true as const };
    },

    async getTopicByDoc(docId: string): Promise<TopicByDoc> {
      await sleep();
      const item = db.items.find((i) => i.kind === 'topic' && i.docId === docId);
      const idle = db.idleTopics.find((t) => t.docId === docId);
      if (!item && !idle) return { topic: null, chain: [], nextAction: { kind: 'start' } };
      const topic: Topic = item
        ? { _id: item.itemId, subjectId: item.subjectId ?? '', docId, title: item.title, tags: item.tags, isArchived: false }
        : { _id: idle!.itemId, subjectId: idle!.subjectId, docId, title: idle!.title, tags: [], isArchived: false };
      const chain = item ? chainOf(item.key) : [];
      return clone({ topic, chain: item ? toChain(item.key) : [], nextAction: nextAction(chain) });
    },

    async createTopic(body: { docId: string; subjectId: string; tags?: string[]; startRevisions?: boolean }) {
      await sleep();
      if (db.items.some((i) => i.kind === 'topic' && i.docId === body.docId)) throw new LearningApiError('Topic already exists', 409);
      const idle = db.idleTopics.find((t) => t.docId === body.docId);
      db.idleTopics = db.idleTopics.filter((t) => t.docId !== body.docId);
      const itemId = idle?.itemId ?? nextId('topic');
      const item: MockItem = { key: `topic:${itemId}`, kind: 'topic', itemId, title: idle?.title ?? 'Untitled doc', subjectId: body.subjectId, tags: body.tags ?? [], docId: body.docId, content: null, url: null, attachments: [] };
      db.items.push(item);
      const chain = body.startRevisions === false ? [] : startChain(item.key);
      const topic: Topic = { _id: itemId, subjectId: body.subjectId, docId: body.docId, title: item.title, tags: item.tags, isArchived: false };
      return clone({ topic, chain });
    },

    async updateTopic(id: string, body: { subjectId?: string; tags?: string[]; isArchived?: boolean }): Promise<Topic> {
      await sleep();
      const item = db.items.find((i) => i.kind === 'topic' && i.itemId === id);
      if (!item) throw notFound();
      if (body.subjectId) item.subjectId = body.subjectId;
      if (body.tags) item.tags = body.tags;
      return clone({ _id: id, subjectId: item.subjectId ?? '', docId: item.docId, title: item.title, tags: item.tags, isArchived: !!body.isArchived });
    },

    async deleteTopic(id: string) {
      await sleep();
      const key = `topic:${id}`;
      if (!itemByKey(key)) throw notFound();
      db.items = db.items.filter((i) => i.key !== key);
      db.revisions = db.revisions.filter((r) => r.itemKey !== key);
      return { deleted: true as const };
    },

    async ensureTopicDoc(id: string) {
      await sleep();
      const item = itemByKey(`topic:${id}`);
      if (!item) throw notFound();
      item.docId = item.docId ?? `mock-doc-${id}`;
      return { docId: item.docId };
    },

    async getCaptureCategories() {
      await sleep();
      return [...db.categories];
    },

    async listCaptures(params: { q?: string; inbox?: boolean; limit?: number }) {
      await sleep();
      const terms = (params.q ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      const hits = db.captures
        .filter((c) => !params.inbox || isInbox(c))
        .filter((c) => terms.every((t) => [c.title, c.content, c.url].some((x) => x?.toLowerCase().includes(t))))
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (a.createdAt < b.createdAt ? 1 : -1));
      return clone(hits.slice(0, params.limit ?? 20).map(toCapture));
    },

    async createCapture(body: CreateCaptureBody) {
      await sleep();
      if (!body.title?.trim() && !body.content?.trim() && !body.url?.trim() && !(body.attachments ?? []).length) {
        throw new LearningApiError('A capture needs a title, content, a link or a file', 400);
      }
      const now = new Date().toISOString();
      const c: MockCapture = {
        _id: nextId('cap'),
        type: body.type ?? (body.url ? 'LINK' : 'NOTE'),
        title: body.title?.trim() || null,
        content: body.content?.trim() || null,
        url: body.url?.trim() || null,
        fileType: body.attachments?.[0]?.fileType ?? null,
        category: body.category || null,
        isPinned: !!body.isPinned,
        subjectId: body.subjectId ?? null,
        topicId: body.topicId ?? null,
        attachments: body.attachments ?? [],
        createdAt: now,
        updatedAt: now,
      };
      db.captures.unshift(c);
      if (c.category && !db.categories.includes(c.category)) db.categories.push(c.category);
      let chain: ChainRevision[] | undefined;
      if (body.revise) {
        db.items.push({ key: `capture:${c._id}`, kind: 'capture', itemId: c._id, title: c.title || (c.content ?? '').slice(0, 50) || 'Capture', subjectId: c.subjectId, tags: c.category ? [c.category] : [], docId: null, content: c.content, url: c.url, attachments: c.attachments });
        chain = startChain(`capture:${c._id}`);
      }
      return clone({ capture: toCapture(c), chain });
    },

    async updateCapture(id: string, body: UpdateCaptureBody) {
      await sleep();
      const c = db.captures.find((x) => x._id === id);
      const item = itemByKey(`capture:${id}`);
      if (!c && !item) throw notFound();
      if (c) {
        Object.assign(c, { ...body, updatedAt: new Date().toISOString() });
      }
      if (item) {
        if (body.title !== undefined) item.title = body.title || item.title;
        if (body.content !== undefined) item.content = body.content;
      }
      const fallback: MockCapture = { _id: id, type: 'NOTE', title: item?.title ?? null, content: item?.content ?? null, url: item?.url ?? null, fileType: null, category: null, isPinned: false, subjectId: item?.subjectId ?? null, topicId: null, attachments: item?.attachments ?? [], createdAt: at(today, '08:00'), updatedAt: new Date().toISOString() };
      return clone(toCapture(c ?? fallback));
    },

    async deleteCapture(id: string) {
      await sleep();
      if (!db.captures.some((c) => c._id === id) && !itemByKey(`capture:${id}`)) throw notFound();
      db.captures = db.captures.filter((c) => c._id !== id);
      db.items = db.items.filter((i) => i.key !== `capture:${id}`);
      db.revisions = db.revisions.filter((r) => r.itemKey !== `capture:${id}`);
      return { deleted: true as const };
    },

    async uploadFile(file: File): Promise<Attachment> {
      await sleep();
      return { url: URL.createObjectURL(file), publicId: `mock/${file.name}`, fileName: file.name, fileType: file.type || 'application/octet-stream' };
    },

    async putQuickNote(id: string, body: { content: string; category: QuickNoteCategory; attachments?: Attachment[] }) {
      await sleep();
      if (!body.content.trim() && !(body.attachments ?? []).length) throw new LearningApiError('Empty note', 400);
      const now = new Date().toISOString();
      const existing = db.quickNotes.find((n) => n._id === id);
      if (existing) {
        Object.assign(existing, { content: body.content, category: body.category, ...(body.attachments ? { attachments: body.attachments } : {}), updatedAt: now });
        return clone(existing);
      }
      const note = { _id: id, content: body.content, category: body.category, isPinned: false, attachments: body.attachments ?? [], createdAt: now, updatedAt: now };
      db.quickNotes.push(note);
      return clone(note);
    },

    async pinQuickNote(id: string, isPinned: boolean) {
      await sleep();
      const n = db.quickNotes.find((x) => x._id === id);
      if (!n) throw notFound();
      n.isPinned = isPinned;
      return clone(n);
    },

    async deleteQuickNote(id: string) {
      await sleep();
      if (!db.quickNotes.some((n) => n._id === id)) throw notFound();
      db.quickNotes = db.quickNotes.filter((n) => n._id !== id);
      return { deleted: true as const };
    },

    async saveTodaySchedule(updates: ScheduleSlotUpdate[]): Promise<Slot[]> {
      await sleep();
      const byId = new Map(db.slots.map((s) => [s._id, s]));
      const hhmm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: MOCK_TZ }).format(new Date());
      db.slots = updates.map((u, i) => {
        const prev = u._id.startsWith('new-') ? undefined : byId.get(u._id);
        const status = u._id.startsWith('new-') ? 'UPCOMING' : u.status;
        // Same stamping as the server (engine stampActualTimes); new blocks start with none.
        const times = prev ? stampActualTimes(prev, { status }, hhmm) : { actualStartTime: null, actualEndTime: null };
        return {
          _id: prev?._id ?? nextId('slot'),
          sourceBlockId: prev?.sourceBlockId ?? null,
          date: today,
          title: u.title,
          color: u.color,
          startTime: u.startTime,
          endTime: u.endTime,
          status,
          ...times,
          remark: u.remark,
          minutesDone: u.minutesDone !== undefined ? u.minutesDone : prev?.minutesDone ?? null,
          sortOrder: u.sortOrder ?? i,
        };
      });
      return clone(db.slots);
    },

    async saveDebrief(day: DayString, body: { form: DebriefFormBody; slots: DebriefSlotBody[] }) {
      await sleep();
      if (day > today) throw new LearningApiError('A debrief can only be saved for today or earlier', 400, 'INVALID_DAY');
      const { energy, focus, mood } = body.form;
      if (![energy, focus, mood].every((v) => typeof v === 'number' && v >= 1 && v <= 5)) {
        throw new LearningApiError('Rate energy, focus and mood (1-5) to save the debrief', 400, 'DEBRIEF_INVALID');
      }
      const daySlots = day === today ? db.slots : triage().kind === 'debrief' ? pastSlots(day, 'tri') : [];
      const merged = daySlots.map((s) => {
        const edit = body.slots.find((e) => e._id === s._id);
        return edit ? { ...s, ...edit } : s;
      });
      if (day === today) db.slots = merged;
      const debrief = debriefFrom(day, body.form, merged);
      db.debriefs[day] = debrief;
      if (day !== today && db.triage === 'debrief') db.triage = 'none';
      return clone(debrief);
    },

    async saveCatchUp(body: CatchUpBody) {
      await sleep();
      const c = body.context;
      if (![c.energy, c.focus, c.mood].every((v) => typeof v === 'number' && v >= 1 && v <= 5) || !c.narrative.trim()) {
        throw new LearningApiError('A catch-up needs energy, focus and mood (1-5) and a narrative', 400, 'CATCH_UP_INVALID');
      }
      const debriefs = body.dates.map((date) => {
        const slots = pastSlots(date, 'cu').map((s) => {
          const d = body.decisions.find((x) => x.slotId === s._id);
          return { ...s, status: (d && d.status !== 'UNRESOLVED' ? d.status : 'SKIPPED') as Slot['status'], remark: d?.remark ?? null };
        });
        const debrief = debriefFrom(date, { energy: c.energy, focus: c.focus, mood: c.mood, tags: c.tags, narrative: c.narrative, tomorrowIntent: '', freeWrite: '' }, slots);
        db.debriefs[date] = debrief;
        return debrief;
      });
      db.triage = 'none';
      return clone({ debriefs });
    },

    async shiftGoal(todoId: string, target: 'THIS_WEEK' | 'MONTHLY'): Promise<Task> {
      await sleep();
      const t = db.tasks.find((x) => x._id === todoId);
      if (!t) throw notFound();
      // engine shiftWeeklyGoal: this week's Sunday, or the last day of the month
      const sunday = addDays(startOfWeek(today), 6);
      const monthEnd = (() => {
        const [y, m] = today.split('-').map(Number);
        const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
        return `${today.slice(0, 7)}-${String(last).padStart(2, '0')}`;
      })();
      t.goalType = target === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY';
      t.dueDate = at(target === 'MONTHLY' ? monthEnd : sunday, '18:00');
      t.updatedAt = new Date().toISOString();
      return clone(t);
    },

    async getMentorExport(from: DayString, to: DayString) {
      await sleep();
      if (from > to) throw new LearningApiError('From must be on or before To', 400, 'INVALID_RANGE');
      const days: string[] = [];
      for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
      const lines = days.map((d) => {
        const db_ = db.debriefs[d];
        return `- ${d} (${weekdayName(d)}): ${db_ ? `${db_.blocksCompleted}/${db_.blocksPlanned} blocks, energy ${db_.energy}, focus ${db_.focus}, mood ${db_.mood}. ${db_.narrative ?? ''}` : 'no debrief'}`;
      });
      const prompt = [
        'You are my learning mentor. Below is my log for the period. (MOCK DATA)',
        '',
        `## Period: ${from} to ${to}`,
        `Revision streak: ${db.streak.current} days (longest ${db.streak.longest}).`,
        `Topics: ${progress().totalTopics} total, ${progress().mastered} mastered.`,
        '',
        '## Daily debriefs',
        ...lines,
        '',
        'Find patterns in my energy, focus and skipped blocks, and suggest one change for next week.',
      ].join('\n');
      return { prompt };
    },

    async updateTask(id: string, updates: TaskUpdate): Promise<Task> {
      await sleep();
      const t = db.tasks.find((x) => x._id === id);
      if (!t) throw notFound();
      const { tags, ...rest } = updates;
      Object.assign(t, rest, { updatedAt: new Date().toISOString() });
      if (tags?.length) t.tags = tags.map((name) => ({ _id: `tag-${name}`, name }));
      if (updates.status === 'complete') t.completedAt = new Date().toISOString();
      if (updates.status && updates.status !== 'complete') t.completedAt = undefined;
      return clone(t);
    },

    async deleteTask(id: string): Promise<void> {
      await sleep();
      if (!db.tasks.some((t) => t._id === id)) throw notFound();
      db.tasks = db.tasks.filter((t) => t._id !== id);
    },
  };
}

export type LearningMock = ReturnType<typeof createMock>;

let instance: LearningMock | null = null;

/** The singleton mock backend (state lives until a full page reload). */
export function getLearningMock(): LearningMock {
  if (!instance) instance = createMock();
  return instance;
}
