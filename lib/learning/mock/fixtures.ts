/**
 * MOCK MODE fixtures (NEXT_PUBLIC_LEARNING_MOCK=1): a realistic day of learning
 * dashboard, generated relative to the real "today" so the buckets are always meaningful.
 * Only imported by learningMock.ts, which learningApi loads behind the inline env check.
 */
import { addDays, DEFAULT_TIMEZONE, minutesOfDay, startOfDay, type DayString } from '@/lib/learning/engine';
import type { Attachment, GoalStatus, GoalType, QuickNoteCategory, RevisionStatus, Slot, SubjectRef, Task } from '@/lib/learning/types';

/** Scenario switches the mock reads from the page URL (see learningMock.ts). */
export interface MockScenario {
  triage: 'none' | 'debrief' | 'catch-up';
  forceWeeklyReview: boolean;
  empty: boolean;
  mode: 'normal' | 'busy' | 'comeback';
  allDone: boolean;
  goals: 0 | 1 | 3;
  long: boolean;
  routine: boolean;
}

export const MOCK_TZ = DEFAULT_TIMEZONE;
export const INTERVALS = [1, 3, 7, 21] as const;

export interface MockSubject extends SubjectRef {
  description: string | null;
  icon: string | null;
}

export interface MockItem {
  key: string;
  kind: 'topic' | 'capture';
  itemId: string;
  title: string;
  subjectId: string | null;
  tags: string[];
  docId: string | null;
  content: string | null;
  url: string | null;
  attachments: Attachment[];
}

export interface MockRevision {
  _id: string;
  itemKey: string;
  cycleNumber: number;
  intervalDays: number;
  scheduledFor: DayString;
  status: RevisionStatus;
  completedAt: string | null;
  /** Dates of the later cycles before the last completion, for an exact undo. */
  undo: { shifts: { id: string; from: DayString }[] } | null;
}

export interface MockCapture {
  _id: string;
  type: 'NOTE' | 'LINK';
  title: string | null;
  content: string | null;
  url: string | null;
  fileType: string | null;
  category: string | null;
  isPinned: boolean;
  subjectId: string | null;
  topicId: string | null;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface MockQuickNote {
  _id: string;
  content: string;
  isPinned: boolean;
  category: QuickNoteCategory;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

/** An instant on `day` at HH:mm in the mock zone. */
export function at(day: DayString, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(startOfDay(day, MOCK_TZ).getTime() + ((h ?? 0) * 60 + (m ?? 0)) * 60_000).toISOString();
}

const svg = (fill: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" rx="12" fill="${fill}"/><text x="50%" y="54%" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

export const SAMPLE_IMAGE: Attachment = {
  url: svg('#3b82f6', 'two-pointers.png'),
  publicId: 'mock/two-pointers',
  fileName: 'two-pointers.png',
  fileType: 'image/svg+xml',
};

export const SAMPLE_FILE: Attachment = {
  url: 'https://example.com/mock/segment-tree-cheatsheet.pdf',
  publicId: 'mock/segment-tree',
  fileName: 'segment-tree-cheatsheet.pdf',
  fileType: 'application/pdf',
};

/** Loop v2 mock rows (LOOP_V2_SPEC §1, §3, §4). */
export interface MockSettings {
  dailyBudgetMin: number;
  routineEnabled: boolean;
  busyUntil: DayString | null;
  nudgeEmailEnabled: boolean;
  nudgeTime: string;
  lastNudgeDay: DayString | null;
  lastSeenDay: DayString | null;
}

export interface MockFocus {
  _id: string;
  day: DayString;
  text: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
  /** The yesterday line this one was carried from (keeps carry-over from offering it twice). */
  carriedFrom?: string;
}

export interface MockMilestone {
  _id: string;
  goalId: string;
  title: string;
  dueDay: DayString | null;
  done: boolean;
  doneAt: string | null;
  sortOrder: number;
}

export interface MockGoal {
  _id: string;
  title: string;
  why: string | null;
  deadline: DayString;
  status: GoalStatus;
  subjectIds: string[];
  createdDay: DayString;
  createdAt: string;
  updatedAt: string;
}

export interface MockDb {
  today: DayString;
  subjects: MockSubject[];
  items: MockItem[];
  /** Topics that never started revisions (Progress → "Not started"). */
  idleTopics: { itemId: string; title: string; subjectId: string; docId: string }[];
  revisions: MockRevision[];
  slots: Slot[];
  tasks: Task[];
  captures: MockCapture[];
  quickNotes: MockQuickNote[];
  categories: string[];
  streak: { current: number; longest: number; lastCreditDay: DayString | null; beforeCredit: { current: number; longest: number; lastCreditDay: DayString | null } | null };
  debriefs: Record<DayString, import('@/lib/learning/types').Debrief>;
  triage: 'none' | 'debrief' | 'catch-up';
  forceWeeklyReview: boolean;
  settings: MockSettings;
  focus: MockFocus[];
  goals: MockGoal[];
  milestones: MockMilestone[];
  /** Days before today that count as active in the rhythm (1 = yesterday). */
  activeHistory: number[];
  seq: number;
}

function task(
  id: string,
  title: string,
  opts: { due?: string; status?: 'pending' | 'complete'; goalType?: GoalType; description?: string; tags?: string[]; priority?: Task['priority']; completedAt?: string },
  now: string,
): Task {
  return {
    _id: id,
    title,
    description: opts.description,
    status: opts.status ?? 'pending',
    priority: opts.priority ?? 'normal',
    dueDate: opts.due,
    completedAt: opts.completedAt,
    tags: (opts.tags ?? []).map((name) => ({ _id: `tag-${name}`, name })),
    subtasks: [],
    references: [],
    goalType: opts.goalType ?? 'NONE',
    createdAt: now,
    updatedAt: now,
  };
}

/** Builds the whole fixture world for `today`. */
export function buildFixtures(today: DayString, nowInstant: Date, scenario: MockScenario): MockDb {
  const subjects: MockSubject[] = [
    { _id: 'sub-arrays', name: 'Arrays & Hashing', color: '#3b82f6', description: 'Two pointers, sliding window, prefix sums', icon: null },
    { _id: 'sub-graphs', name: 'Trees & Graphs', color: '#10b981', description: 'DFS/BFS, topological sort, union-find', icon: null },
    { _id: 'sub-dp', name: 'Dynamic Programming', color: '#8b5cf6', description: '1D/2D DP, knapsack, intervals', icon: null },
    { _id: 'sub-sd', name: 'System Design', color: '#f59e0b', description: null, icon: null },
  ];

  const items: MockItem[] = [];
  const revisions: MockRevision[] = [];
  let revSeq = 0;

  /** A topic/capture chain started on `start`; the first `done` cycles are done on their day. */
  const addChain = (item: Omit<MockItem, 'key'>, start: DayString, done: number, doneTodayCycle?: number) => {
    const key = `${item.kind}:${item.itemId}`;
    items.push({ ...item, key });
    INTERVALS.forEach((interval, i) => {
      const cycle = i + 1;
      const scheduledFor = addDays(start, interval);
      const isDone = cycle <= done || cycle === doneTodayCycle;
      revisions.push({
        _id: `rev-${++revSeq}`,
        itemKey: key,
        cycleNumber: cycle,
        intervalDays: interval,
        scheduledFor,
        status: isDone ? 'done' : 'pending',
        completedAt: isDone ? (cycle === doneTodayCycle ? at(today, '07:40') : at(scheduledFor, '20:15')) : null,
        undo: null,
      });
    });
  };

  const topic = (id: string, title: string, subjectId: string, tags: string[] = []): Omit<MockItem, 'key'> => ({
    kind: 'topic',
    itemId: id,
    title,
    subjectId,
    tags,
    docId: `mock-doc-${id}`,
    content: null,
    url: null,
    attachments: [],
  });

  /** Chain whose cycle `done + 1` falls `late` days before today (0 = due today). */
  const due = (item: Omit<MockItem, 'key'>, done: number, late: number) => addChain(item, addDays(today, -late - INTERVALS[done]!), done);

  const longTitle = 'Segment trees with lazy propagation: range updates, range sums and the off-by-one traps in the push-down step';

  if (!scenario.empty) {
    // Due today
    due(topic('t-two-sum', 'Two Sum & hash-map patterns', 'sub-arrays', ['hashing']), 0, 0);
    due(topic('t-sliding', 'Sliding window: longest substring without repeats', 'sub-arrays', ['window']), 1, 0);
    due(topic('t-topo', 'Topological sort (Kahn + DFS)', 'sub-graphs', ['graphs']), 3, 0);
    due(topic('t-lis', scenario.long ? longTitle : 'Longest increasing subsequence', 'sub-dp'), 2, 0);
    due(
      {
        kind: 'capture',
        itemId: 'cap-rev-1',
        title: 'Monotonic stack template',
        subjectId: 'sub-arrays',
        tags: ['stack'],
        docId: null,
        content: 'Keep indices, pop while the current value breaks the order.\nwhile (st.length && a[st.at(-1)] < a[i]) ans[st.pop()] = i;',
        url: null,
        attachments: [SAMPLE_IMAGE],
      },
      0,
      0,
    );
    // The quiet backlog: about 15 items, some about 35 days late (LOOP_V2_SPEC §9)
    due(topic('t-union', 'Union-Find with path compression', 'sub-graphs', ['dsu']), 0, 4);
    due(topic('t-knap', '0/1 knapsack, space-optimised', 'sub-dp', ['knapsack']), 2, 3);
    due(
      { kind: 'capture', itemId: 'cap-rev-2', title: 'Consistent hashing notes', subjectId: null, tags: [], docId: null, content: 'Virtual nodes smooth the load; ring lookup is a binary search.', url: null, attachments: [SAMPLE_FILE] },
      0,
      1,
    );
    due(topic('t-dijkstra-edge', 'Dijkstra: negative edges and why it breaks', 'sub-graphs'), 0, 35);
    due(topic('t-trie', 'Trie insert and prefix search', 'sub-arrays'), 1, 37);
    due(topic('t-kadane', "Kadane's algorithm and its variants", 'sub-arrays'), 1, 27);
    due(topic('t-coin', 'Coin change (min coins, number of ways)', 'sub-dp'), 2, 18);
    due(topic('t-bits', 'Bit manipulation tricks', 'sub-arrays'), 0, 19);
    due(topic('t-lru', 'LRU cache design', 'sub-sd', ['design']), 1, 13);
    due(topic('t-merge', 'Merge intervals', 'sub-arrays'), 2, 7);
    due(topic('t-kafka', 'Kafka partitions and consumer groups', 'sub-sd'), 0, 11);
    due(topic('t-rightview', 'Binary tree right side view', 'sub-graphs'), 1, 6);
    due(topic('t-edit', 'Edit distance', 'sub-dp'), 0, 7);
    due(topic('t-cycle', 'Detect a cycle in a directed graph', 'sub-graphs'), 1, 3);
    due(topic('t-3sum', 'Two pointers: 3Sum', 'sub-arrays'), 2, 26);
    // In progress (future cycles) and mastered (all four done)
    addChain(topic('t-bfs', 'BFS shortest path on grids', 'sub-graphs'), addDays(today, -9), 2);
    addChain(topic('t-prefix', 'Prefix sums & difference arrays', 'sub-arrays'), addDays(today, -2), 1);
    addChain(topic('t-binsearch', 'Binary search on answer', 'sub-arrays'), addDays(today, -40), 4);
    addChain(topic('t-dijkstra', 'Dijkstra with a heap', 'sub-graphs'), addDays(today, -30), 4);
    addChain(topic('t-lcs', 'Longest common subsequence', 'sub-dp'), addDays(today, -2), 1);
    addChain(topic('t-rate', 'Rate limiter design', 'sub-sd', ['design']), addDays(today, -4), 2);
  }

  const idleTopics = scenario.empty
    ? []
    : [
        { itemId: 't-trie-adv', title: 'Tries & prefix search', subjectId: 'sub-arrays', docId: 'mock-doc-t-trie-adv' },
        { itemId: 't-segtree', title: 'Segment trees', subjectId: 'sub-graphs', docId: 'mock-doc-t-segtree' },
        { itemId: 't-cache', title: 'Designing a distributed cache', subjectId: 'sub-sd', docId: 'mock-doc-t-cache' },
      ];

  // ── Today's schedule (shown only while routineEnabled) ──
  const nowMin = minutesOfDay(nowInstant, MOCK_TZ);
  const blocks: Array<[string, string, string, string]> = [
    ['06:30', '07:30', 'DSA warm-up: arrays', '#3b82f6'],
    ['07:30', '08:00', 'Breakfast', '#6b7280'],
    ['09:00', '12:00', 'Deep work: system design', '#8b5cf6'],
    ['13:00', '14:00', 'Lunch & walk', '#6b7280'],
    ['14:00', '16:00', 'LeetCode practice', '#10b981'],
    ['16:30', '17:30', 'Revision block', '#f59e0b'],
    ['19:00', '20:00', 'Gym', '#ef4444'],
    ['21:00', '22:00', 'Read: DDIA ch. 5', '#14b8a6'],
  ];
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const slots: Slot[] = blocks.map(([start, end, title, color], i) => {
    const ended = toMin(end) <= nowMin;
    const status = ended ? (i === 1 ? 'SKIPPED' : 'COMPLETED') : 'UPCOMING';
    return {
      _id: `slot-${i + 1}`,
      sourceBlockId: `block-${i + 1}`,
      date: today,
      title,
      color,
      startTime: start,
      endTime: end,
      status,
      actualStartTime: null,
      actualEndTime: null,
      remark: null,
      minutesDone: null,
      sortOrder: i,
    };
  });

  // ── Tasks (personal todos; weekly / monthly ones show as "This week" / "This month") ──
  const nowIso = nowInstant.toISOString();
  const tasks: Task[] = scenario.empty
    ? []
    : [
        task('todo-1', 'Submit LeetCode weekly contest write-up', { due: at(addDays(today, -1), '18:00'), tags: ['leetcode'], priority: 'high' }, nowIso),
        task('todo-2', 'Review PR #482 (pg-migration)', { due: at(today, '18:00'), description: 'Check the todo serializer and the goalType default.' }, nowIso),
        task('todo-3', 'Book dentist appointment', { due: at(today, '11:00'), status: 'complete', completedAt: at(today, '10:05') }, nowIso),
        task('todo-4', 'Mock interview with Arjun', { due: at(addDays(today, 2), '19:30'), tags: ['interview'] }, nowIso),
        task('todo-5', 'Renew AWS cert voucher', { due: at(addDays(today, 5), '18:00') }, nowIso),
        task('todo-6', 'Plan next sprint of DP problems', { due: at(addDays(today, 9), '18:00') }, nowIso),
        task('goal-1', 'Finish 15 graph problems', { goalType: 'WEEKLY', due: at(addDays(today, 4), '18:00'), description: '8/15 done' }, nowIso),
        task('goal-2', 'Write the rate-limiter design doc', { goalType: 'WEEKLY', due: at(addDays(today, 4), '18:00') }, nowIso),
        task('goal-3', 'Complete Grokking DP course', { goalType: 'MONTHLY', due: at(addDays(today, 10), '18:00') }, nowIso),
        // Stale weekly items, surfaced by "Plan your week" on Mondays (?mockMonday=1)
        task('goal-old-1', 'Solve 10 sliding-window problems', { goalType: 'WEEKLY', due: at(addDays(today, -9), '18:00') }, nowIso),
        task('goal-old-2', 'Read the Raft paper', { goalType: 'WEEKLY', due: at(addDays(today, -8), '18:00') }, nowIso),
      ];

  // ── Inbox captures ──
  const captures: MockCapture[] = scenario.empty
    ? []
    : [
        { _id: 'cap-1', type: 'LINK', title: 'NeetCode 150 roadmap', content: null, url: 'https://neetcode.io/roadmap', fileType: null, category: 'resources', isPinned: true, subjectId: null, topicId: null, attachments: [], createdAt: at(addDays(today, -3), '09:12'), updatedAt: at(addDays(today, -3), '09:12') },
        { _id: 'cap-2', type: 'NOTE', title: 'Ask about the on-call rotation', content: 'Before Friday standup', url: null, fileType: null, category: 'work', isPinned: false, subjectId: null, topicId: null, attachments: [], createdAt: at(today, '08:40'), updatedAt: at(today, '08:40') },
        { _id: 'cap-3', type: 'LINK', title: 'Segment tree cheatsheet', content: null, url: SAMPLE_FILE.url, fileType: 'application/pdf', category: null, isPinned: false, subjectId: null, topicId: null, attachments: [SAMPLE_FILE], createdAt: at(addDays(today, -1), '22:10'), updatedAt: at(addDays(today, -1), '22:10') },
        { _id: 'cap-4', type: 'NOTE', title: 'Whiteboard photo from study group', content: null, url: null, fileType: null, category: 'study', isPinned: false, subjectId: null, topicId: null, attachments: [SAMPLE_IMAGE], createdAt: at(addDays(today, -2), '17:30'), updatedAt: at(addDays(today, -2), '17:30') },
      ];

  // ── Pocket (quick notes): pinned ssh/deploy command, a long note, a link note (§9) ──
  const qn = (id: string, day: DayString, time: string, content: string, extra: Partial<MockQuickNote> = {}): MockQuickNote => ({
    _id: id,
    content,
    isPinned: false,
    category: 'PRIMARY',
    attachments: [],
    createdAt: at(day, time),
    updatedAt: at(day, time),
    ...extra,
  });
  const longNote = [
    'System design interview checklist',
    '',
    '- Clarify the users, the scale and the one or two things that must never break before drawing anything.',
    '- Write the read and write paths separately; most designs fail on the write path under contention.',
    '- Estimate: requests per second at peak, storage per year, and the hot set that has to fit in memory.',
    '- Pick the data model last, after the access patterns are written down in plain words.',
    '- Name the trade-off you are making out loud: consistency or availability, latency or cost.',
    '- Add caching only where you can say what invalidates it.',
    '- Close with failure modes: what happens when the cache, the queue or one region is gone.',
    '',
    'Practice: rate limiter, URL shortener, chat fan-out, news feed ranking.',
  ].join('\n');
  const quickNotes: MockQuickNote[] = scenario.empty
    ? []
    : [
        qn('8f9c1a52-0001-4c1b-9a01-000000000010', addDays(today, -6), '09:02', 'Deploy staging\n```bash\nssh deploy@10.0.4.12 "cd /srv/recollect && git pull && npm ci && pm2 reload recollect-api"\n```', { isPinned: true }),
        qn('8f9c1a52-0001-4c1b-9a01-000000000011', addDays(today, -4), '18:44', 'kubectl logs -f deploy/recollect-api -n prod --since=10m', { isPinned: true }),
        qn('8f9c1a52-0001-4c1b-9a01-000000000001', today, '08:05', 'Strings Methods\n\ns.trim().split("\\\\s+");\nExplanation:\n- We write \\\\ because Java needs it to produce a single \\\n- \\s -> whitespace in regex', { isPinned: true }),
        qn('8f9c1a52-0001-4c1b-9a01-000000000002', today, '09:47', 'Interview tip: say the brute force out loud **first**, then optimise.'),
        qn('8f9c1a52-0001-4c1b-9a01-000000000003', today, '11:20', 'git fetch origin && git rebase origin/pg-migration', { category: 'TEMPORARY' }),
        qn('8f9c1a52-0001-4c1b-9a01-000000000012', addDays(today, -1), '22:31', scenario.long ? `${longNote}\n\n${longNote}` : longNote),
        qn('8f9c1a52-0001-4c1b-9a01-000000000004', addDays(today, -1), '21:02', 'Kadane in one line\nbest = max(best, cur = max(x, cur + x));'),
        qn('8f9c1a52-0001-4c1b-9a01-000000000005', addDays(today, -1), '18:30', 'Study group whiteboard', { attachments: [SAMPLE_IMAGE] }),
        qn('8f9c1a52-0001-4c1b-9a01-000000000006', addDays(today, -3), '07:15', 'Read later: https://www.hellointerview.com/learn/system-design/deep-dives/consistent-hashing'),
        qn('8f9c1a52-0001-4c1b-9a01-000000000007', addDays(today, -3), '07:16', 'Wifi password for the library: in Notes app', { category: 'TEMPORARY' }),
        qn('8f9c1a52-0001-4c1b-9a01-000000000008', addDays(today, -12), '20:00', 'Union-find:\n- find with path compression\n- union by rank\n- near O(1) amortised'),
      ];

  // ── Settings (§1) and modes (§2) ──
  const settings: MockSettings = {
    dailyBudgetMin: 25,
    routineEnabled: scenario.routine,
    busyUntil: scenario.mode === 'busy' ? addDays(today, 5) : null,
    nudgeEmailEnabled: true,
    nudgeTime: '08:30',
    lastNudgeDay: null,
    lastSeenDay: scenario.mode === 'comeback' ? addDays(today, -9) : addDays(today, -1),
  };

  // ── Focus lines (§3): two today, one unfinished from yesterday ──
  const created = (day: DayString, hhmm: string) => at(day, hhmm);
  const yesterday = addDays(today, -1);
  const focusText = scenario.long
    ? 'Finish the rate-limiter design doc: token bucket vs sliding log, the Redis Lua script, and the failure mode when Redis is down'
    : 'Finish the rate-limiter design doc';
  const focus: MockFocus[] =
    scenario.empty || scenario.mode === 'comeback'
      ? []
      : [
          { _id: 'focus-1', day: today, text: focusText, done: false, sortOrder: 0, createdAt: created(today, '08:12') },
          { _id: 'focus-2', day: today, text: '30 min of mock interview prep', done: true, sortOrder: 1, createdAt: created(today, '08:13') },
          { _id: 'focus-y1', day: yesterday, text: 'Email Arjun about the referral', done: false, sortOrder: 0, createdAt: created(yesterday, '09:00') },
          { _id: 'focus-y2', day: yesterday, text: 'Fix the flaky todo test', done: true, sortOrder: 1, createdAt: created(yesterday, '09:01') },
        ];

  // ── Goals (§4): the example goal, plus a behind one and a too-early one with ?mockGoals=3 ──
  const goals: MockGoal[] = [];
  const milestones: MockMilestone[] = [];
  let msSeq = 0;
  const addGoal = (g: Omit<MockGoal, 'createdAt' | 'updatedAt' | 'status'>, ms: Array<[string, DayString | null, number | null]>) => {
    goals.push({ ...g, status: 'active', createdAt: at(g.createdDay, '09:00'), updatedAt: at(g.createdDay, '09:00') });
    ms.forEach(([title, dueDay, doneDaysAgo], i) =>
      milestones.push({
        _id: `ms-${++msSeq}`,
        goalId: g._id,
        title,
        dueDay,
        done: doneDaysAgo !== null,
        doneAt: doneDaysAgo !== null ? at(addDays(today, -doneDaysAgo), '20:00') : null,
        sortOrder: i,
      }),
    );
  };
  if (!scenario.empty && scenario.goals > 0) {
    addGoal(
      {
        _id: 'goal-sde',
        title: scenario.long ? 'Product-company SDE role with a team that ships every week, real code review and room to grow into backend' : 'Product-company SDE role',
        why: 'Better problems, better pay, and a team that ships.',
        deadline: '2027-06-30',
        subjectIds: ['sub-arrays', 'sub-graphs', 'sub-dp'],
        createdDay: addDays(today, -89),
      },
      [
        ['Finish NeetCode 150: arrays and hashing', addDays(today, -70), 60],
        ['Finish NeetCode 150: trees and graphs', addDays(today, -25), 21],
        ['Finish NeetCode 150: dynamic programming', addDays(today, 36), null],
        ['Three system design mock interviews', '2027-02-15', null],
        ['Resume and portfolio reviewed by two seniors', '2027-03-31', null],
        ['Apply to 20 product companies', '2027-05-15', null],
      ],
    );
  }
  if (!scenario.empty && scenario.goals === 3) {
    addGoal(
      { _id: 'goal-ship', title: 'Ship Kaaga to 10 friends', why: null, deadline: addDays(today, 78), subjectIds: [], createdDay: addDays(today, -74) },
      [
        ['Daily loop works for me for 3 weeks', addDays(today, -40), 33],
        ['Fix every bug I hit in a week', addDays(today, -10), null],
        ['Onboarding without me in the room', addDays(today, 20), null],
        ['Invite the first 3 friends', addDays(today, 45), null],
        ['10 people use it twice a week', addDays(today, 78), null],
      ],
    );
    addGoal(
      { _id: 'goal-ddia', title: 'Finish Designing Data-Intensive Applications', why: null, deadline: addDays(today, 47), subjectIds: ['sub-sd'], createdDay: addDays(today, -4) },
      [
        ['Part 1: foundations', addDays(today, 10), null],
        ['Part 2: distributed data', addDays(today, 30), null],
        ['Part 3: derived data', addDays(today, 47), null],
      ],
    );
  }

  return {
    today,
    subjects,
    items,
    idleTopics,
    revisions,
    slots: scenario.empty ? [] : slots,
    tasks,
    captures,
    quickNotes,
    categories: ['resources', 'study', 'work', 'leetcode'],
    streak: { current: 12, longest: 30, lastCreditDay: addDays(today, -1), beforeCredit: null },
    debriefs: {},
    triage: scenario.triage,
    forceWeeklyReview: scenario.forceWeeklyReview,
    settings,
    focus,
    goals,
    milestones,
    activeHistory: scenario.empty || scenario.mode === 'comeback' ? [] : [1, 2, 4, 5],
    seq: 1000,
  };
}
