'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, Download, Lock, MoreHorizontal, Pin, PinOff, Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useWebLook, type WebLook } from '@/lib/webLook';
import { cn } from '@/lib/utils';
import { RcButton, RcConfirm, RcIconButton, RcMenu, RcSegmented, RcSheet, RcSkel, RcSwitch, rcScope, type MenuAction } from '@/components/rc-ui';
import { SectionFailed } from '@/components/learning/home/parts';
import { ImportChats } from './ImportChats';
import { LockPins } from './LockPins';
import { BuddyReminders } from './BuddyReminders';
import { buddyApi, type BuddyUsage, type Memory, type MemoryKind, type MemoryPatch, type Routine, type WorkDay, type WorkKind, type WorkLineView, type YouData } from '@/lib/api/buddyApi';
import { OnMyMind } from './OnMyMind';
import { OnMyScreens } from './OnMyScreens';
import { NoAiNotice, useNoAi } from '@/components/ai/NoAiNotice';
import './you.css';

/**
 * "About you" (BUDDY_MEMORY_PLAN §3.2, §4.4): everything the buddy knows about the user, where each
 * thing came from, and his say over all of it: edit, pin, make private, mark wrong, forget; pause
 * the learning; export it all. Job: see what it knows and fix any of it in one place.
 */

type View = 'lasting' | 'now' | 'older';

const KIND_WORD: Record<MemoryKind, string> = {
  fact: 'About you',
  preference: 'Preference',
  value: 'Value',
  aim: 'Aim',
  idea: 'Idea',
  decision: 'Decision',
  pattern: 'Pattern',
  state: 'On your mind',
  thread: 'Open thread',
  win: 'Win',
};

/** The groups of each view, in order (a group with nothing in it is left out). */
const GROUPS: Record<Exclude<View, 'older'>, Array<{ title: string; kinds: MemoryKind[] }>> = {
  lasting: [
    { title: 'Facts and values', kinds: ['fact', 'value'] },
    { title: 'What you like', kinds: ['preference'] },
    { title: 'Aims and decisions', kinds: ['aim', 'decision'] },
    { title: 'Ideas', kinds: ['idea'] },
  ],
  now: [
    { title: 'On your mind', kinds: ['state'] },
    { title: 'Open threads', kinds: ['thread'] },
    { title: 'Patterns', kinds: ['pattern'] },
    { title: 'Wins', kinds: ['win'] },
    // A lasting kind kept only for now: an app's inference until you confirm it (MCP_MEMORY_PLAN §4.3), or one you moved here.
    { title: 'For now', kinds: ['fact', 'preference', 'value', 'aim', 'idea', 'decision'] },
  ],
};

const ADD_KINDS: MemoryKind[] = ['fact', 'preference', 'value', 'aim', 'idea', 'decision', 'pattern', 'state', 'thread', 'win'];

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayText = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`));
const SHORT_MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const frame = 'mx-auto w-full max-w-[1080px] px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8 pb-24';

/**
 * The page in parts (the owner, 11-22: "as it grows everything moves down, the settings sit at the very bottom"):
 * his pick, a list of the parts at the left (sticky; the settings' groups under Settings), one part at a time;
 * tabs under the title below 1024 px. `?tab=` keeps the part.
 */
type Tab = 'knows' | 'mind' | 'work' | 'settings';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'knows', label: 'What it knows' },
  { id: 'mind', label: 'On my mind' },
  { id: 'work', label: 'Your work' },
  { id: 'settings', label: 'Settings' },
];
const SETTING_GROUPS = [
  { id: 'learning', title: 'Learning' },
  { id: 'work', title: 'Work log' },
  { id: 'phone', title: 'Your phone' },
  { id: 'usage', title: 'Usage' },
  { id: 'data', title: 'Your data' },
  { id: 'look', title: 'Appearance' },
] as const;
type SettingGroup = (typeof SETTING_GROUPS)[number]['id'];

function readParam<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const v = new URLSearchParams(window.location.search).get(name);
  return allowed.includes(v as T) ? (v as T) : fallback;
}

function sourceWords(m: Memory): string {
  // An assistant's conclusion says whose it is (MCP_MEMORY_PLAN §4.4).
  if (m.inferred) return m.agentName ? `inferred by ${m.agentName}` : 'inferred by an agent';
  switch (m.source) {
    case 'app':
      return 'you wrote it';
    case 'tell':
      return 'you told it';
    case 'hook':
      return 'from your chats';
    case 'feedback':
      return 'from your thumbs';
    case 'buddy':
      return 'Kaaga’s own';
    default:
      return m.agentName ? `from ${m.agentName}` : 'from an agent';
  }
}

const viewOf = (m: Memory): View => (m.status !== 'active' ? 'older' : m.lasting ? 'lasting' : 'now');

/** Every word of the query in the memory's text (case aside). */
const matches = (m: Memory, words: string[]) => words.every((w) => m.text.toLowerCase().includes(w));

export function YouPage() {
  const [data, setData] = useState<YouData | null | 'failed'>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<View>('lasting');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [tab, setTabState] = useState<Tab>(() => readParam('tab', TABS.map((t) => t.id), 'knows'));
  const setTab = (t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState(window.history.state, '', url);
  };

  useEffect(() => {
    let alive = true;
    buddyApi.you().then(
      (d) => alive && setData(d),
      () => alive && setData('failed'),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const replace = useCallback((m: Memory) => {
    setData((cur) => (cur && cur !== 'failed' ? { ...cur, memories: cur.memories.map((x) => (x._id === m._id ? m : x)) } : cur));
  }, []);

  const change = useCallback(
    async (m: Memory, patch: MemoryPatch, done?: string) => {
      try {
        replace(await buddyApi.updateMemory(m._id, patch));
        if (done) toast.success(done);
      } catch {
        toast.error('That change didn’t save. Try again.');
        reload();
      }
    },
    [replace, reload],
  );

  const forget = useCallback(
    async (m: Memory) => {
      try {
        await buddyApi.forgetMemory(m._id);
        setData((cur) => (cur && cur !== 'failed' ? { ...cur, memories: cur.memories.filter((x) => x._id !== m._id) } : cur));
        toast.success('Forgotten, with the notes behind it');
      } catch {
        toast.error('It couldn’t be forgotten. Try again.');
        reload();
      }
    },
    [reload],
  );

  const memories = useMemo(() => (data && data !== 'failed' ? data.memories : []), [data]);
  const counts = useMemo(() => {
    const c = { lasting: 0, now: 0, older: 0 };
    for (const m of memories) c[viewOf(m)]++;
    return c;
  }, [memories]);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = memories.filter((m) => viewOf(m) === view && matches(m, words));
  const ready = data && data !== 'failed' ? data : null;
  const tabs = ready ? TABS.filter((t) => t.id !== 'mind' || ready.settings.loop) : TABS;
  const current: Tab = tabs.some((t) => t.id === tab) ? tab : 'knows';

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="rc-h1">About you</h1>
        <p className="rc-meta mt-1.5 max-w-[560px]">What Kaaga knows, from your chats and your own words. Only you see this, and you can change any of it.</p>
      </div>
      {ready && current === 'knows' && (
        <RcButton variant="main" icon={<Plus />} onClick={() => setAdding(true)}>
          Add a memory
        </RcButton>
      )}
    </div>
  );

  const pausedNotice = ready?.settings.paused && (
    <div role="status" className="rc-card mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-[15px] rc-ink-2">Paused: Kaaga keeps nothing new and doesn’t think until you turn learning back on.</p>
      <RcButton size="sm" onClick={() => void setPaused(false)}>
        Turn learning on
      </RcButton>
    </div>
  );

  const tabBar = (
    <div role="tablist" aria-label="About you" className="mt-6 flex flex-wrap gap-x-5 border-b border-[var(--rc-line)]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={current === t.id}
          onClick={() => setTab(t.id)}
          className={cn(
            '-mb-px shrink-0 border-b-2 pb-2 pt-1 text-[14px] font-medium transition-colors',
            current === t.id ? 'border-[var(--rc-ink-1)] text-[var(--rc-ink-1)]' : 'border-transparent text-[var(--rc-ink-3)] hover:text-[var(--rc-ink-1)]',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const toGroup = (id: SettingGroup) => document.getElementById(`you-set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const sideNav = (
    <nav aria-label="About you" className="hidden lg:block">
      <div className="sticky top-6 flex flex-col gap-0.5">
        {tabs.map((t) => (
          <div key={t.id}>
            <button
              type="button"
              aria-current={current === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
              className={cn(
                'rc-hoverable flex w-full rounded-[6px] px-2.5 py-[6px] text-left text-[14px] font-medium',
                current === t.id ? 'bg-[var(--rc-selected)] text-[var(--rc-ink-1)]' : 'text-[var(--rc-ink-2)]',
              )}
            >
              {t.label}
            </button>
            {t.id === 'settings' && current === 'settings' && (
              <div className="mb-1 mt-0.5 flex flex-col">
                {SETTING_GROUPS.map((g) => (
                  <button key={g.id} type="button" onClick={() => toGroup(g.id)} className="rc-hoverable rounded-[6px] py-[5px] pl-5 pr-2.5 text-left text-[13px] text-[var(--rc-ink-3)] hover:text-[var(--rc-ink-1)]">
                    {g.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );

  const memoriesPart = ready && (
          <>
            <div className="you-filters mt-8">
              <RcSegmented
                label="Memories"
                value={view}
                onChange={setView}
                options={[
                  { value: 'lasting', label: 'Lasting', count: counts.lasting },
                  { value: 'now', label: 'Right now', count: counts.now },
                  { value: 'older', label: 'Older', count: counts.older },
                ]}
              />
              <label className="you-search">
                <Search aria-hidden className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} />
                <input className="rc-input" type="search" value={query} placeholder="Search what it knows" aria-label="Search what Kaaga knows" onChange={(e) => setQuery(e.target.value)} />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-8">
              {memories.length === 0 ? (
                <EmptyAll onAdd={() => setAdding(true)} />
              ) : shown.length === 0 ? (
                <p className="rc-body rc-ink-2">{words.length ? 'Nothing here matches that.' : EMPTY_VIEW[view]}</p>
              ) : view === 'older' ? (
                <MemoryList memories={shown} onChange={change} onForget={forget} />
              ) : (
                GROUPS[view].map((g) => {
                  const list = shown.filter((m) => g.kinds.includes(m.kind));
                  if (!list.length) return null;
                  return (
                    <section key={g.title} aria-label={g.title}>
                      <h2 className="rc-h2 mb-1.5">{g.title}</h2>
                      <MemoryList memories={list} onChange={change} onForget={forget} />
                    </section>
                  );
                })
              )}
            </div>
          </>
  );

  // One part at a time (the options); the first part's own top margin goes, the tabs give the space.
  const part = ready && (
    <div className="mt-6 [&>section:first-child]:!mt-0">
      {current === 'knows' && (
        <>
          <Portrait portrait={ready.settings.portrait} />
          <Questions chapters={ready.chapters} onAnswered={reload} />
          {memoriesPart}
          <Chapters chapters={ready.chapters} />
        </>
      )}
      {current === 'mind' && <OnMyMind />}
      {current === 'work' && <WorkLog on={ready.settings.workLog} />}
      {current === 'settings' && <Learning data={ready} onPaused={setPaused} onChanged={reload} />}
    </div>
  );

  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
      <div className={frame}>
        {header}
        {data === null && <YouSkeleton />}
        {data === 'failed' && <SectionFailed className="mt-8" what="what Kaaga knows" onRetry={reload} />}
        {ready && (
          <>
            {pausedNotice}
            <div className="mt-8 lg:grid lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-12">
              {sideNav}
              <div className="min-w-0">
                <div className="lg:hidden">{tabBar}</div>
                <div className="lg:-mt-6">{part}</div>
              </div>
            </div>
          </>
        )}
      </div>
      <AddSheet
        open={adding}
        onOpenChange={setAdding}
        onAdded={(m) => {
          setData((cur) => (cur && cur !== 'failed' ? { ...cur, memories: [m, ...cur.memories.filter((x) => x._id !== m._id)] } : cur));
          setView(viewOf(m));
        }}
      />
    </div>
  );

  async function setPaused(paused: boolean) {
    try {
      const settings = await buddyApi.updateSettings({ paused });
      setData((cur) => (cur && cur !== 'failed' ? { ...cur, settings } : cur));
      toast.success(paused ? 'Paused: nothing new is kept' : 'Learning is on again');
    } catch {
      toast.error('That didn’t save. Try again.');
    }
  }
}

const EMPTY_VIEW: Record<View, string> = {
  lasting: 'Nothing lasting yet: facts, preferences, aims and ideas land here.',
  now: 'Nothing for right now: moods, open threads and habits land here.',
  older: 'Nothing older yet. What fades or stops being true moves here, never lost.',
};

function EmptyAll({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="you-empty">
      <p className="rc-body rc-ink-1">Kaaga doesn’t know anything yet.</p>
      <p className="rc-meta mt-1 max-w-[520px]">Your agents save what they learn about you here as you work with them. You can also tell it something yourself.</p>
      <RcButton className="mt-4" icon={<Plus />} onClick={onAdd}>
        Add a memory
      </RcButton>
    </div>
  );
}

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The audit's "Still true?" questions (B7): his yes makes the memory his, his no marks it wrong. */
function Questions({ chapters, onAnswered }: { chapters: YouData['chapters']; onAnswered: () => void }) {
  const questions = chapters.flatMap((c) => c.questions);
  if (!questions.length) return null;
  const answer = async (memoryId: string, a: 'yes' | 'no') => {
    try {
      await buddyApi.answer(memoryId, a);
      onAnswered();
    } catch {
      toast.error('That didn’t save. Try again.');
    }
  };
  return (
    <section aria-label="Still true?" className="rc-card mt-6 flex flex-col gap-2 px-4 py-3">
      {questions.map((q) => (
        <div key={q.memoryId} className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-[15px] text-[var(--rc-ink-1)]">{q.question}</p>
          <div className="flex gap-1.5">
            <RcButton size="sm" onClick={() => void answer(q.memoryId, 'yes')}>
              Yes
            </RcButton>
            <RcButton size="sm" variant="quiet" onClick={() => void answer(q.memoryId, 'no')}>
              Not any more
            </RcButton>
          </div>
        </div>
      ))}
    </section>
  );
}

/** The months as short chapters, newest first (B7). */
function Chapters({ chapters }: { chapters: YouData['chapters'] }) {
  if (!chapters.length) return null;
  return (
    <section aria-labelledby="you-chapters" className="mt-12">
      <h2 id="you-chapters" className="rc-h2 mb-2">
        Your months
      </h2>
      <div className="flex flex-col gap-4">
        {chapters.map((c) => (
          <div key={c._id}>
            {/* A month ("2026-11") or, from January, a whole year ("2026"). */}
            <p className="text-[14px] font-medium text-[var(--rc-ink-2)]">{/^\d{4}$/.test(c.period) ? `The year ${c.period}` : MONTH.format(new Date(`${c.period}-01T00:00:00Z`))}</p>
            <p className="rc-body mt-0.5 text-[var(--rc-ink-1)]">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const WORK_KIND: Record<WorkKind, string | null> = { did: null, decided: 'Decided', stuck: 'Open', next: 'Next' };
/** Its words already say its kind ("Decided to keep…"): no "Decided:" before them. */
function saysKind(kind: WorkKind, text: string): boolean {
  const t = text.trim();
  if (kind === 'stuck') return /^(open|stuck|still)\b/i.test(t);
  return kind === 'decided' ? /^decided\b/i.test(t) : kind === 'next' ? /^next\b/i.test(t) : false;
}

/** Stage 12: what came after a line on a later day: "fixed today", "changed yesterday", "done Tue 17 Nov". */
function laterText(later: NonNullable<WorkLineView['later']>): string {
  const when = workDay(later.day);
  return `${later.word} ${when === 'Today' || when === 'Yesterday' ? when.toLowerCase() : when}`;
}
const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "Today", "Yesterday", else "Sat 14 Nov" (his own clock decides which day is today). */
function workDay(day: string): string {
  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA');
  return day === today ? 'Today' : day === yesterday ? 'Yesterday' : WEEKDAY.format(new Date(`${day}T00:00:00Z`)).replace(',', '');
}

const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/**
 * His work log (B9): what he got done, by day and project, from his chats with agents; each line can
 * be removed (it is never written again). Shown only while the log is on.
 */
function WorkLog({ on }: { on: boolean }) {
  const [days, setDays] = useState<WorkDay[] | null | 'failed'>(null);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    const q = query.trim();
    const t = setTimeout(
      () =>
        buddyApi.work(q ? { q } : {}).then(
          (d) => alive && setDays(d),
          () => alive && setDays('failed'),
        ),
      q ? 250 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [on, query, attempt]);
  if (!on) return null;
  const remove = async (id: string) => {
    try {
      await buddyApi.hideWork(id);
      setDays((cur) =>
        Array.isArray(cur)
          ? cur
              .map((d) => ({ ...d, projects: d.projects.map((p) => ({ ...p, lines: p.lines.filter((l) => l._id !== id) })).filter((p) => p.lines.length) }))
              .filter((d) => d.projects.length)
          : cur,
      );
      toast.success('Removed from your log. It won’t be written again.');
    } catch {
      toast.error('That didn’t save. Try again.');
    }
  };
  return (
    <section aria-labelledby="you-work" className="mt-12">
      <div className="you-filters">
        <h2 id="you-work" className="rc-h2 mr-auto">
          Your work
        </h2>
        <label className="you-search">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} />
          <input className="rc-input" type="search" value={query} placeholder="Search your work" aria-label="Search your work log" onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      <p className="rc-meta mt-1.5 max-w-[560px]">What you got done, decided or left open, by day and project, from all your chats: each thing once, at its newest. Kept apart from what it knows about you, and never on your lock screen.</p>
      {days === null && (
        <div className="mt-4 flex flex-col gap-2" aria-busy aria-label="Loading your work log">
          <RcSkel className="h-5 w-[120px] rounded-[6px]" />
          <RcSkel className="h-[40px] w-full rounded-[6px]" />
          <RcSkel className="h-[40px] w-full rounded-[6px]" />
        </div>
      )}
      {days === 'failed' && <SectionFailed className="mt-4" what="your work log" onRetry={() => setAttempt((n) => n + 1)} />}
      {Array.isArray(days) && days.length === 0 && (
        <p className="rc-body rc-ink-2 mt-4">{query.trim() ? 'Nothing in your log matches that.' : 'Nothing logged in the last 7 days. What you build, fix and decide in your chats shows up here a few minutes later.'}</p>
      )}
      {Array.isArray(days) && days.length > 0 && (
        <div className="mt-5 flex flex-col gap-6">
          {days.map((d) => (
            <div key={d.day}>
              <h3 className="text-[14px] font-medium text-[var(--rc-ink-2)]">{workDay(d.day)}</h3>
              {d.projects.map((p) => (
                <div key={p.project} className="mt-2">
                  <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">
                    {p.project}
                    {(p.minutes > 0 || p.office) && <span className="rc-meta font-normal"> · {[p.minutes > 0 ? minutesText(p.minutes) : null, p.office ? 'work folder' : null].filter(Boolean).join(' · ')}</span>}
                  </p>
                  <ul className="mt-0.5 flex flex-col">
                    {p.lines.map((l) => (
                      <li key={l._id} className="rc-row rc-hoverable you-row">
                        <p className="you-text min-w-0 flex-1">
                          {l.at && <span className="you-work-at">{l.at}</span>}
                          {WORK_KIND[l.kind] && !saysKind(l.kind, l.text) && <span className="you-work-kind">{WORK_KIND[l.kind]}: </span>}
                          {l.text}
                          {(l.later || l.likely || l.app) && (
                            <span className="rc-meta">
                              {' · '}
                              {[l.later ? laterText(l.later) : l.likely ? 'likely done' : null, l.app ? `via ${l.app}` : null].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </p>
                        <RcIconButton size="sm" label="Remove from your log" onClick={() => void remove(l._id)}>
                          <X />
                        </RcIconButton>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Whether it follows what is going on and asks about it (ECOSYSTEM_V2_PLAN stage 3: threads and questions). */
const SOURCE_WORD: Record<string, string> = {
  hook: 'Claude Code',
  ask_ai: 'Ask Kaaga',
  doc_ask: 'Ask Kaaga in a doc',
  answer: 'Your answers to its questions',
  agent: 'Notes your agents saved',
  tell: 'Tell Kaaga',
  app: 'This page',
  pocket: 'Your pocket notes',
  import: 'Chats you brought in',
  connector: 'Your other AI apps',
};
const LAST = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** The ear meter (stage 5): where its words come from, when each was last heard, and the week's count. */
function EarMeter({ sources }: { sources: NonNullable<YouData['sources']> }) {
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">What it hears</p>
        <ul className="mt-1 grid gap-0.5">
          {sources.map((s) => (
            <li key={s.source} className="rc-meta">
              <span className="text-[var(--rc-ink-1)]">{SOURCE_WORD[s.source] ?? s.source}</span>
              {' · '}
              {s.silent ? 'nothing for a week or more' : `${s.seen7} ${s.seen7 === 1 ? 'message' : 'messages'} this week`}
              {s.dropped7 ? ` (${s.dropped7} not kept while paused)` : ''}
              {s.last ? ` · last ${LAST.format(new Date(s.last))}` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const VOICES = [
  { value: 'candid', label: 'Candid' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'bro', label: 'Bro' },
] as const;
const VOICE_WORDS: Record<(typeof VOICES)[number]['value'], string> = {
  candid: 'Plain and brief, with warmth: it tells you the truth.',
  gentle: 'Warm and soft: true things, said kindly, never pushing.',
  bro: 'Easy and joking, like close friends talk; it still says the true thing.',
};

/** Stage 5 (V3): how the buddy sounds, everywhere it speaks. */
function VoiceSetting({ tone, onChanged }: { tone: (typeof VOICES)[number]['value']; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (next: (typeof VOICES)[number]['value']) => {
    if (next === tone || busy) return;
    setBusy(true);
    try {
      await buddyApi.updateSettings({ tone: next });
      toast.success('Its voice is changed from the next thing it says');
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Its voice</p>
        <p className="rc-meta mt-0.5">{VOICE_WORDS[tone] ?? VOICE_WORDS.candid}</p>
      </div>
      <RcSegmented label="Its voice" value={tone} onChange={(v) => void pick(v)} options={VOICES.map((v) => ({ value: v.value, label: v.label }))} />
    </div>
  );
}

/** The theme and the look on this device (the owner, 11-22: Paper beside Slate, as on the phone); the sidebar's theme menu sets the same. */
function Appearance() {
  const { theme, setTheme } = useTheme();
  const [look, setLook] = useWebLook();
  const mode = theme === 'light' || theme === 'system' ? theme : 'dark';
  return (
    <>
      <div className="you-setting">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Theme</p>
          <p className="rc-meta mt-0.5">Light, dark, or as your system is. Kept on this device.</p>
        </div>
        <RcSegmented
          label="Theme"
          value={mode}
          onChange={(v) => setTheme(v)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </div>
      <div className="you-setting">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Look</p>
          <p className="rc-meta mt-0.5">{look === 'paper' ? 'Paper: cream pages and warm ink, as on the phone app.' : 'Slate: clean greys.'}</p>
        </div>
        <RcSegmented
          label="Look"
          value={look}
          onChange={(v) => setLook(v as WebLook)}
          options={[
            { value: 'slate', label: 'Slate' },
            { value: 'paper', label: 'Paper' },
          ]}
        />
      </div>
    </>
  );
}

/** Stage 5: whether the buddy may ask him questions at all. */
function AsksSwitch({ on, onChanged }: { on: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await buddyApi.updateSettings({ asksOn: next });
      toast.success(next ? 'It may ask you now and then again' : 'No more questions. It still listens and follows along.');
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Kaaga may ask me questions</p>
        <p className="rc-meta mt-0.5">Two a day at most, about plans and habits you came back to. Off: it still follows along, it just never asks.</p>
      </div>
      <RcSwitch checked={on} disabled={busy} onChange={(v) => void toggle(v)} label="Kaaga may ask me questions" />
    </div>
  );
}

function LoopSwitch({ on, onChanged }: { on: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await buddyApi.updateSettings({ loop: next });
      toast.success(next ? 'It follows what you have going on now' : 'Back to how it was. What it noted stays.');
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Follow what I have going on (new)</p>
        <p className="rc-meta mt-0.5">It notices plans and habits you mention, links your updates to them, and may ask about one now and then: two questions a day at most, never about something you mentioned only once. It reads your Ask Kaaga chats too.</p>
      </div>
      <RcSwitch checked={on} disabled={busy} onChange={(v) => void toggle(v)} label="Follow what I have going on" />
    </div>
  );
}

/** Stage 12: whether ChatGPT, Claude and Claude Code outside a work folder see what work folders logged. */
function ShareOfficeSwitch({ on, onChanged }: { on: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await buddyApi.updateSettings({ shareOfficeWork: next });
      toast.success(next ? 'Your connected chats see what your work folders logged' : 'Work folder lines stay in their folder and here');
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Share work folders with my connected chats</p>
        <p className="rc-meta mt-0.5">ChatGPT, Claude and Claude Code outside the folder see the one-line summaries your work folders logged, so the same work isn’t logged twice. Off: those lines stay in their folder and here.</p>
      </div>
      <RcSwitch checked={on} disabled={busy} onChange={(v) => void toggle(v)} label="Share work folders with my connected chats" />
    </div>
  );
}

/** Whether it keeps a log of his work (B9; stage 12: from every chat, no AI needed for the lines chats log). */
function WorkLogSwitch({ on, onChanged }: { on: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      await buddyApi.updateSettings({ workLog: next });
      toast.success(next ? 'It keeps a log of your work now' : 'It no longer logs your work. What’s there stays.');
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Keep a log of what I work on</p>
        <p className="rc-meta mt-0.5">What you finish, decide or leave open, by project and day, so you can ask what you did yesterday and what’s still open. ChatGPT and Claude log it as you talk (free); Claude Code logs it when you ask, or sums it up itself in your own folders (a few cents a day). Kept apart from what it knows about you.</p>
      </div>
      <RcSwitch checked={on} disabled={busy} onChange={(v) => void toggle(v)} label="Keep a log of what I work on" />
    </div>
  );
}

function Portrait({ portrait }: { portrait: YouData['settings']['portrait'] }) {
  const parts = [
    { title: 'Who you are', text: portrait.who },
    { title: 'Where you’re heading', text: portrait.heading },
    { title: 'Right now', text: portrait.now },
  ].filter((p): p is { title: string; text: string } => !!p.text);
  if (!parts.length) return null;
  return (
    <section aria-label="Kaaga’s portrait of you" className="rc-card mt-6 grid gap-4 px-5 py-4">
      {parts.map((p) => (
        <div key={p.title}>
          <h2 className="rc-h2">{p.title}</h2>
          <p className="rc-body mt-1 text-[var(--rc-ink-1)]">{p.text}</p>
        </div>
      ))}
    </section>
  );
}

function MemoryList({ memories, onChange, onForget }: { memories: Memory[]; onChange: (m: Memory, patch: MemoryPatch, done?: string) => Promise<void>; onForget: (m: Memory) => Promise<void> }) {
  return (
    <ul className="flex flex-col">
      {memories.map((m) => (
        <MemoryRow key={m._id} memory={m} onChange={onChange} onForget={onForget} />
      ))}
    </ul>
  );
}

function MemoryRow({ memory: m, onChange, onForget }: { memory: Memory; onChange: (m: Memory, patch: MemoryPatch, done?: string) => Promise<void>; onForget: (m: Memory) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.text);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const older = m.status !== 'active';

  useEffect(() => {
    if (!editing) return;
    const el = field.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const save = async () => {
    const text = draft.replace(/\s+/g, ' ').trim();
    setEditing(false);
    if (!text || text === m.text) return setDraft(m.text);
    await onChange(m, { text });
  };

  const actions: MenuAction[] = older
    ? [
        { label: 'Put it back', onSelect: () => void onChange(m, { status: 'active' }, 'Back in its place') },
        { label: 'Forget for good', danger: true, separatorBefore: true, onSelect: () => setConfirm(true) },
      ]
    : [
        { label: 'Edit', onSelect: () => (setDraft(m.text), setEditing(true)) },
        { label: m.sensitivity === 'private' ? 'Make it open' : 'Make it private', onSelect: () => void onChange(m, { private: m.sensitivity !== 'private' }) },
        { label: m.lasting ? 'Only for now' : 'Keep for good', onSelect: () => void onChange(m, { lasting: !m.lasting }, m.lasting ? 'Moved to Right now' : 'Moved to Lasting') },
        ...(m.checkSince ? [{ label: 'This one is right', onSelect: () => void onChange(m, { settle: true }, 'Settled') }] : []),
        { label: 'No longer true', separatorBefore: true, onSelect: () => void onChange(m, { status: 'closed' }, 'Moved to Older') },
        { label: 'This is wrong', onSelect: () => void onChange(m, { status: 'wrong' }, 'Marked wrong: it won’t be learned again') },
        { label: 'Forget for good', danger: true, separatorBefore: true, onSelect: () => setConfirm(true) },
      ];

  // When it was said, via which app, how often, and what it replaced (MCP_MEMORY_PLAN stage 1).
  const said = m.firstSeenDay === m.lastSeenDay ? `said ${dayText(m.firstSeenDay)}` : `said ${dayText(m.firstSeenDay)}, last ${dayText(m.lastSeenDay)}`;
  const meta = [
    m.pinned ? 'Pinned' : null,
    m.sensitivity === 'private' ? 'Private' : null,
    older ? olderWords(m) : KIND_WORD[m.kind],
    sourceWords(m),
    said,
    m.seenCount > 1 ? `seen ${m.seenCount} times` : null,
    m.replaces ? `replaced “${m.replaces.text}”` : null,
  ].filter(Boolean);

  return (
    <li className="rc-row rc-hoverable you-row">
      <div className="min-w-0 flex-1">
        {editing ? (
          <textarea
            ref={field}
            className="rc-textarea you-edit"
            value={draft}
            maxLength={300}
            rows={2}
            aria-label="Edit the memory"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void save();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft(m.text);
                setEditing(false);
              }
            }}
          />
        ) : (
          <p className={cn('you-text', older && 'you-text--older')} onDoubleClick={() => !older && (setDraft(m.text), setEditing(true))}>
            {m.text}
          </p>
        )}
        {/* One flowing line: the lock sits with the words, so a long line wraps under it, never leaves it alone. */}
        <p className="rc-meta mt-0.5">
          {m.sensitivity === 'private' && <Lock aria-hidden className="mr-1.5 inline-block h-3.5 w-3.5 align-[-2px] text-[var(--rc-icon)]" strokeWidth={1.75} />}
          {meta.join(' · ')}
        </p>
        {m.checkSince && !older && (
          <p className="you-check rc-meta mt-1">
            <CircleAlert aria-hidden className="you-check-icon" strokeWidth={1.75} />
            <span>Said two ways, and which one holds isn’t settled. This version stays until you settle it.</span>
            <button type="button" className="you-check-act" onClick={() => void onChange(m, { settle: true }, 'Settled')}>
              This one is right
            </button>
          </p>
        )}
      </div>
      <div className="rc-row-actions flex shrink-0 items-center gap-0.5">
        {!older && (
          <RcIconButton size="sm" label={m.pinned ? 'Unpin' : 'Pin: every chat starts with it'} onClick={() => void onChange(m, { pinned: !m.pinned })}>
            {m.pinned ? <PinOff /> : <Pin />}
          </RcIconButton>
        )}
        <RcMenu label="More" actions={actions}>
          <RcIconButton size="sm" label="More">
            <MoreHorizontal />
          </RcIconButton>
        </RcMenu>
      </div>
      <RcConfirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Forget this for good?"
        body={<>“{m.text}” and the notes behind it are deleted. Kaaga won’t have it any more, and this can’t be undone.</>}
        confirmLabel="Forget for good"
        danger
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          await onForget(m);
          setBusy(false);
          setConfirm(false);
        }}
      />
    </li>
  );
}

/** The catch-up's line (MCP_MEMORY_PLAN §4.7): while it reads what waited, and once it has. */
function CatchUpLine({ run }: { run: NonNullable<YouData['catchUp']> }) {
  const month = (d: string | null) => (d ? SHORT_MONTH.format(new Date(`${d}T00:00:00Z`)) : '');
  const span = run.firstDay && run.lastDay ? (month(run.firstDay) === month(run.lastDay) ? month(run.firstDay) : `${month(run.firstDay)} to ${month(run.lastDay)}`) : '';
  const words =
    run.state === 'running'
      ? `Catching up on ${run.notes} saved ${run.notes === 1 ? 'note' : 'notes'}${span ? `, ${span}` : ''}. It reads them with their own dates and asks about nothing that ended.`
      : `Caught up on ${run.notes} saved ${run.notes === 1 ? 'note' : 'notes'}${span ? `, ${span}` : ''}.`;
  return <p className="rc-meta you-catchup">{words}</p>;
}

function olderWords(m: Memory): string {
  if (m.status === 'wrong') return 'Marked wrong';
  if (m.status === 'faded') return 'Faded';
  return m.closeReason && !m.byUser ? `No longer true: ${m.closeReason}` : 'No longer true';
}

function AddSheet({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; onAdded: (m: Memory) => void }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<MemoryKind>('fact');
  const [isPrivate, setPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setText('');
    setKind('fact');
    setPrivate(false);
  };

  const submit = async () => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    setBusy(true);
    try {
      onAdded(await buddyApi.addMemory({ text: clean, kind, private: isPrivate }));
      toast.success('Remembered');
      reset();
      onOpenChange(false);
    } catch {
      toast.error('It wasn’t saved. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RcSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Add a memory"
      description="Something Kaaga should know about you. It’s yours: no agent can change it."
      initialFocusId="you-add-text"
      footer={
        <>
          <RcButton onClick={() => onOpenChange(false)}>Cancel</RcButton>
          <RcButton variant="main" busy={busy} disabled={!text.trim()} onClick={() => void submit()}>
            Remember this
          </RcButton>
        </>
      }
    >
      <label className="rc-field-label" htmlFor="you-add-text">
        What should it know?
      </label>
      <textarea
        id="you-add-text"
        className="rc-textarea mt-1.5"
        rows={3}
        maxLength={300}
        value={text}
        placeholder="e.g. I study best after 9 pm, never before work"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <p className="rc-field-label mt-5" id="you-add-kind">
        What kind of thing is it?
      </p>
      <div role="radiogroup" aria-labelledby="you-add-kind" className="mt-2 flex flex-wrap gap-1.5">
        {ADD_KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className="you-chip" onClick={() => setKind(k)}>
            {KIND_WORD[k]}
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] font-medium text-[var(--rc-ink-1)]">Private</p>
          <p className="rc-meta mt-0.5">Never on your lock screen or widget, and left out of your chats unless you pin it.</p>
        </div>
        <RcSwitch checked={isPrivate} onChange={setPrivate} label="Private" />
      </div>
    </RcSheet>
  );
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** This month in one line: what it spent of its cap, what it read and kept, what waits for the night. */
function MonthLine({ pending }: { pending: number }) {
  const [usage, setUsage] = useState<BuddyUsage | null>(null);
  useEffect(() => {
    let alive = true;
    buddyApi.usage().then(
      (u) => alive && setUsage(u),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
  if (!usage) return null;
  const month = usage.days.filter((d) => d.day.slice(0, 7) === usage.days[0]?.day.slice(0, 7));
  const seen = month.reduce((n, d) => n + d.seen, 0);
  const kept = month.reduce((n, d) => n + d.kept, 0);
  // Stage 5: rethinks on news are 4 a day at most; the ones past it are skipped (counted here).
  const skipped = month.reduce((n, d) => n + (d.pulsesSkipped ?? 0), 0);
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">This month</p>
        <p className="rc-meta mt-0.5">
          {[
            `${USD.format(usage.month.spentUsd)} of its ${USD.format(usage.month.capUsd)}`,
            seen ? `${seen} of your messages read, ${kept} kept` : null,
            pending ? `${pending} new ${pending === 1 ? 'note waits' : 'notes wait'} for tonight` : null,
            skipped ? `${skipped} ${skipped === 1 ? 'rethink' : 'rethinks'} on news skipped (4 a day at most)` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </div>
  );
}

/** Something it does by itself after his yes (B6): its switch. */
function RoutineRow({ routine, onChanged }: { routine: Routine; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      await buddyApi.setRoutine(routine._id, on);
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">{routine.title}, by itself</p>
        <p className="rc-meta mt-0.5">
          {routine.runs ? `Done ${routine.runs === 1 ? 'once' : `${routine.runs} times`}${routine.lastRunDay ? ` · last ${dayText(routine.lastRunDay)}` : ''}` : 'Not used yet'} · each one shows on Home with Undo
        </p>
      </div>
      <RcSwitch checked={routine.enabled} disabled={busy} onChange={(on) => void toggle(on)} label={routine.title} />
    </div>
  );
}

/** Whether it thinks each night (AI money), and "Think now". */
function Thinking({ enabled, onChanged }: { enabled: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState<'switch' | 'think' | null>(null);
  // Stage 10: without AI its thinking can't run: one quiet line instead of a switch and a button that would fail.
  const noAi = useNoAi();
  const toggle = async (on: boolean) => {
    setBusy('switch');
    try {
      await buddyApi.updateSettings({ enabled: on });
      toast.success(on ? 'It thinks about your day each night now' : 'It no longer thinks each night');
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(null);
    }
  };
  const think = async () => {
    setBusy('think');
    try {
      await buddyApi.thinkNow();
      toast.success('Done: your portrait and today’s lines are fresh');
      onChanged();
    } catch {
      toast.error('It couldn’t think just now. Try again in a minute.');
    } finally {
      setBusy(null);
    }
  };
  if (noAi) return <NoAiNotice what="Its thinking about your day" className="my-2" />;
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Think about my day each night</p>
        <p className="rc-meta mt-0.5">After 4 am it sorts what it learned, writes your portrait and the day’s lines. About 4 cents a night from your AI credit.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {enabled && (
          <RcButton size="sm" variant="quiet" busy={busy === 'think'} onClick={() => void think()}>
            Think now
          </RcButton>
        )}
        <RcSwitch checked={enabled} disabled={busy === 'switch'} onChange={(on) => void toggle(on)} label="Think about my day each night" />
      </div>
    </div>
  );
}

/** A group of settings in the Settings part (the owner's options, 11-22): a small label, then its rows. */
function SettingsGroup({ id, children }: { id: SettingGroup; children: React.ReactNode }) {
  const title = SETTING_GROUPS.find((g) => g.id === id)?.title;
  return (
    <section id={`you-set-${id}`} aria-labelledby={`you-set-${id}-h`} className="mt-10 scroll-mt-6 first:mt-0">
      <h2 id={`you-set-${id}-h`} className="border-b border-[var(--rc-line)] pb-2 text-[13px] font-medium text-[var(--rc-ink-2)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Learning({ data, onPaused, onChanged }: { data: YouData; onPaused: (paused: boolean) => Promise<void>; onChanged: () => void }) {
  const [exporting, setExporting] = useState(false);
  const noAi = useNoAi();
  const download = async () => {
    setExporting(true);
    try {
      const json = await buddyApi.exportAll();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaaga-memory-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('The export didn’t download. Try again.');
    } finally {
      setExporting(false);
    }
  };
  const total = data.counts.active + data.counts.faded + data.counts.closed + data.counts.wrong;
  const learn = (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Learn from my chats</p>
        <p className="rc-meta mt-0.5">Off: nothing new is kept and it stops thinking. What it knows stays here.</p>
      </div>
      <RcSwitch checked={!data.settings.paused} onChange={(on) => void onPaused(!on)} label="Learn from my chats" />
    </div>
  );
  const health = data.health.steps > 0 && (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">How well it knows you</p>
        <p className="rc-meta mt-0.5">
          {[
            `${data.counts.lasting} lasting, ${data.counts.working} for now`,
            `${data.health.confirmedShare}% confirmed by you`,
            `${data.health.thumbs.more} more like this, ${data.health.thumbs.less} not this`,
            data.health.dropped ? `${data.health.dropped} ${data.health.dropped === 1 ? 'thing' : 'things'} its checks threw out` : null,
          ]
            .filter(Boolean)
            .join(' · ')}{' '}
          · the last 30 days
        </p>
        {data.health.byAge && (
          <p className="rc-meta mt-0.5">
            By age: {data.health.byAge.month} from this month, {data.health.byAge.quarter} from the two before, {data.health.byAge.older} older
          </p>
        )}
        {(data.health.months ?? [])
          .filter((m) => m.more + m.less + m.dropped > 0 || m.costUsd > 0)
          .map((m) => (
            <p key={m.month} className="rc-meta mt-0.5">
              {MONTH.format(new Date(`${m.month}-01T00:00:00Z`))}: {m.more} more like this, {m.less} not this, {m.dropped} thrown out, ${m.costUsd.toFixed(2)}
            </p>
          ))}
      </div>
    </div>
  );
  const exportRow = (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Export everything</p>
        <p className="rc-meta mt-0.5">
          {total === 1 ? '1 memory' : `${total} memories`} and {data.counts.notes === 1 ? 'the 1 note' : `the ${data.counts.notes} notes`} behind them{data.settings.workLog ? ', and your work log' : ''}, as a JSON file.
        </p>
      </div>
      <RcButton size="sm" icon={<Download />} busy={exporting} onClick={() => void download()}>
        Export
      </RcButton>
    </div>
  );
  const loop = data.settings.loop;
  return (
    <div>
      <SettingsGroup id="learning">
        {learn}
        <Thinking enabled={data.settings.enabled} onChanged={onChanged} />
        {noAi === false && (
          <>
            <LoopSwitch on={loop} onChanged={onChanged} />
            {loop && <AsksSwitch on={data.settings.asksOn !== false} onChanged={onChanged} />}
            <VoiceSetting tone={data.settings.tone} onChanged={onChanged} />
          </>
        )}
        {data.routines.map((r) => (
          <RoutineRow key={r._id} routine={r} onChanged={onChanged} />
        ))}
      </SettingsGroup>
      <SettingsGroup id="work">
        <WorkLogSwitch on={data.settings.workLog} onChanged={onChanged} />
        {data.settings.workLog && <ShareOfficeSwitch on={data.settings.shareOfficeWork !== false} onChanged={onChanged} />}
      </SettingsGroup>
      <SettingsGroup id="phone">
        {loop && <LockPins />}
        <OnMyScreens rules={data.screenRules ?? []} loop={loop} goalOnScreens={data.settings.goalOnScreens === true} onChanged={onChanged} />
        {loop && <BuddyReminders />}
      </SettingsGroup>
      <SettingsGroup id="usage">
        <MonthLine pending={data.counts.pending} />
        {data.catchUp && <CatchUpLine run={data.catchUp} />}
        {!!data.sources?.length && <EarMeter sources={data.sources} />}
        {health}
      </SettingsGroup>
      <SettingsGroup id="data">
        {loop && <ImportChats />}
        {exportRow}
      </SettingsGroup>
      <SettingsGroup id="look">
        <Appearance />
      </SettingsGroup>
    </div>
  );
}

function YouSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-3" aria-busy aria-label="Loading what Kaaga knows">
      <RcSkel className="h-8 w-[340px] max-w-full rounded-[8px]" />
      <RcSkel className="mt-4 h-[52px] w-full rounded-[6px]" />
      <RcSkel className="h-[52px] w-full rounded-[6px]" />
      <RcSkel className="h-[52px] w-full rounded-[6px]" />
    </div>
  );
}
