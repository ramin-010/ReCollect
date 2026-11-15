'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Lock, MoreHorizontal, Pin, PinOff, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcConfirm, RcIconButton, RcMenu, RcSegmented, RcSheet, RcSkel, RcSwitch, rcScope, type MenuAction } from '@/components/rc-ui';
import { SectionFailed } from '@/components/learning/home/parts';
import { buddyApi, type BuddyUsage, type Memory, type MemoryKind, type MemoryPatch, type YouData } from '@/lib/api/buddyApi';
import './you.css';

/**
 * "About you" (BUDDY_MEMORY_PLAN §3.2, §4.4): everything the buddy knows about Ramin, where each
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
    { title: 'Who you are', kinds: ['fact', 'value'] },
    { title: 'What you like', kinds: ['preference'] },
    { title: 'Where you’re heading', kinds: ['aim', 'decision'] },
    { title: 'Ideas', kinds: ['idea'] },
  ],
  now: [
    { title: 'On your mind', kinds: ['state'] },
    { title: 'Open threads', kinds: ['thread'] },
    { title: 'Patterns', kinds: ['pattern'] },
    { title: 'Wins', kinds: ['win'] },
  ],
};

const ADD_KINDS: MemoryKind[] = ['fact', 'preference', 'value', 'aim', 'idea', 'decision', 'pattern', 'state', 'thread', 'win'];

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayText = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`));
const frame = 'mx-auto w-full max-w-[880px] px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8 pb-24';

function sourceWords(m: Memory): string {
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
      return 'your buddy’s own';
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

  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')}>
      <div className={frame}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="rc-h1">About you</h1>
            <p className="rc-meta mt-1.5 max-w-[560px]">What your buddy knows, from your chats and your own words. Only you see this, and you can change any of it.</p>
          </div>
          {data && data !== 'failed' && (
            <RcButton variant="main" icon={<Plus />} onClick={() => setAdding(true)}>
              Add a memory
            </RcButton>
          )}
        </div>

        {data === null && <YouSkeleton />}
        {data === 'failed' && <SectionFailed className="mt-8" what="what your buddy knows" onRetry={reload} />}
        {data && data !== 'failed' && (
          <>
            {data.settings.paused && (
              <div role="status" className="rc-card mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <p className="text-[15px] rc-ink-2">Paused: your buddy keeps nothing new and doesn’t think until you turn learning back on.</p>
                <RcButton size="sm" onClick={() => void setPaused(false)}>
                  Turn learning on
                </RcButton>
              </div>
            )}
            <Portrait portrait={data.settings.portrait} />

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
                <input className="rc-input" type="search" value={query} placeholder="Search what it knows" aria-label="Search what your buddy knows" onChange={(e) => setQuery(e.target.value)} />
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

            <Learning data={data} onPaused={setPaused} />
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
      <p className="rc-body rc-ink-1">Your buddy doesn’t know anything yet.</p>
      <p className="rc-meta mt-1 max-w-[520px]">Your agents save what they learn about you here as you work with them. You can also tell it something yourself.</p>
      <RcButton className="mt-4" icon={<Plus />} onClick={onAdd}>
        Add a memory
      </RcButton>
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
    <section aria-label="Your buddy’s portrait of you" className="rc-card mt-6 grid gap-4 px-5 py-4">
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
        { label: 'No longer true', separatorBefore: true, onSelect: () => void onChange(m, { status: 'closed' }, 'Moved to Older') },
        { label: 'This is wrong', onSelect: () => void onChange(m, { status: 'wrong' }, 'Marked wrong: it won’t be learned again') },
        { label: 'Forget for good', danger: true, separatorBefore: true, onSelect: () => setConfirm(true) },
      ];

  const meta = [
    m.pinned ? 'Pinned' : null,
    m.sensitivity === 'private' ? 'Private' : null,
    older ? olderWords(m) : KIND_WORD[m.kind],
    sourceWords(m),
    m.seenCount > 1 ? `seen ${m.seenCount} times` : null,
    `last ${dayText(m.lastSeenDay)}`,
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
        <p className="rc-meta mt-0.5 flex flex-wrap items-center gap-x-1.5">
          {m.sensitivity === 'private' && <Lock aria-hidden className="h-3.5 w-3.5 text-[var(--rc-icon)]" strokeWidth={1.75} />}
          {meta.join(' · ')}
        </p>
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
        body={<>“{m.text}” and the notes behind it are deleted. Your buddy won’t have it any more, and this can’t be undone.</>}
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

function olderWords(m: Memory): string {
  if (m.status === 'wrong') return 'Marked wrong';
  if (m.status === 'faded') return 'Faded';
  return m.closeReason && !/Ramin\)?$/.test(m.closeReason) ? `No longer true: ${m.closeReason}` : 'No longer true';
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
      description="Something your buddy should know about you. It’s yours: no agent can change it."
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
  return (
    <div className="you-setting">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">This month</p>
        <p className="rc-meta mt-0.5">
          {[
            `${USD.format(usage.month.spentUsd)} of its ${USD.format(usage.month.capUsd)}`,
            seen ? `${seen} of your messages read, ${kept} kept` : null,
            pending ? `${pending} new ${pending === 1 ? 'note waits' : 'notes wait'} for tonight` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </div>
  );
}

function Learning({ data, onPaused }: { data: YouData; onPaused: (paused: boolean) => Promise<void> }) {
  const [exporting, setExporting] = useState(false);
  const download = async () => {
    setExporting(true);
    try {
      const json = await buddyApi.exportAll();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recollect-buddy-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('The export didn’t download. Try again.');
    } finally {
      setExporting(false);
    }
  };
  const total = data.counts.active + data.counts.faded + data.counts.closed + data.counts.wrong;
  return (
    <section aria-labelledby="you-learning" className="you-learning">
      <h2 id="you-learning" className="rc-h2">
        How your buddy learns
      </h2>
      <div className="you-setting">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Learn from my chats</p>
          <p className="rc-meta mt-0.5">Off: nothing new is kept and it stops thinking. What it knows stays here.</p>
        </div>
        <RcSwitch checked={!data.settings.paused} onChange={(on) => void onPaused(!on)} label="Learn from my chats" />
      </div>
      <MonthLine pending={data.counts.pending} />
      <div className="you-setting">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Export everything</p>
          <p className="rc-meta mt-0.5">
            {total === 1 ? '1 memory' : `${total} memories`} and {data.counts.notes === 1 ? 'the 1 note' : `the ${data.counts.notes} notes`} behind them, as a JSON file.
          </p>
        </div>
        <RcButton size="sm" icon={<Download />} busy={exporting} onClick={() => void download()}>
          Export
        </RcButton>
      </div>
    </section>
  );
}

function YouSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-3" aria-busy aria-label="Loading what your buddy knows">
      <RcSkel className="h-8 w-[340px] max-w-full rounded-[8px]" />
      <RcSkel className="mt-4 h-[52px] w-full rounded-[6px]" />
      <RcSkel className="h-[52px] w-full rounded-[6px]" />
      <RcSkel className="h-[52px] w-full rounded-[6px]" />
    </div>
  );
}
