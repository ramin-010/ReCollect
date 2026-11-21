'use client';

// /you › "On my mind" (ECOSYSTEM_V2_PLAN §4.9, stage 5): what the buddy keeps an eye on, each with when it
// was first said, its last update and its stage; its history on a click; his controls (ask me less,
// don't ask, keep off my screens, drop it, forget it); and one he adds himself.
import { useCallback, useEffect, useState } from 'react';
import { BellOff, ChevronDown, ChevronRight, EyeOff, Lock, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton, RcConfirm, RcIconButton, RcMenu, RcSkel, type MenuAction } from '@/components/rc-ui';
import { buddyApi, type BuddyThread, type BuddyThreadDetail, type ThreadPatch } from '@/lib/api/buddyApi';

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayText = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`));

const STAGE_WORD: Record<string, string> = {
  noticed: 'Mentioned once',
  active: 'Following',
  committed: 'You asked it to keep an eye on this',
  paused: 'Paused',
  done: 'Done',
  dropped: 'Dropped',
};

const KIND_WORD: Record<string, string> = {
  said: 'said',
  progress: 'did some',
  done: 'did it',
  skipped: 'skipped',
  finished: 'finished',
  changed: 'changed the plan',
  paused: 'paused',
  resumed: 'picked up again',
  dropped: 'let it go',
  answered: 'answered',
  steer: 'set',
};

export function OnMyMind() {
  const [threads, setThreads] = useState<BuddyThread[] | null | 'failed'>(null);
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    buddyApi.threads().then(setThreads, () => setThreads('failed'));
  }, []);
  useEffect(load, [load]);

  const replace = (t: BuddyThread) => setThreads((cur) => (Array.isArray(cur) ? cur.map((x) => (x._id === t._id ? t : x)) : cur));

  const add = async () => {
    const title = adding.replace(/\s+/g, ' ').trim();
    if (title.length < 2) return;
    setBusy(true);
    try {
      const t = await buddyApi.addThread(title);
      setThreads((cur) => (Array.isArray(cur) ? [t, ...cur.filter((x) => x._id !== t._id)] : [t]));
      setAdding('');
      toast.success('It will keep an eye on that');
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="you-mind" className="mt-12">
      <h2 id="you-mind" className="rc-h2">
        On my mind
      </h2>
      <p className="rc-meta mt-1.5 max-w-[560px]">Plans and habits your buddy noticed in what you said. It may ask about one now and then; you decide how much.</p>
      <form
        className="mt-3 flex max-w-[560px] items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input className="rc-input flex-1" value={adding} maxLength={120} placeholder="Something to keep an eye on" aria-label="Something for your buddy to keep an eye on" onChange={(e) => setAdding(e.target.value)} />
        <RcButton type="submit" variant="outline" size="sm" disabled={busy || adding.trim().length < 2}>
          <Plus aria-hidden className="h-4 w-4" /> Add
        </RcButton>
      </form>
      {threads === null ? (
        <div className="mt-4 grid gap-2">
          <RcSkel className="h-11" />
          <RcSkel className="h-11" />
        </div>
      ) : threads === 'failed' ? (
        <p className="rc-body rc-ink-2 mt-4">It couldn’t load. Reload the page to try again.</p>
      ) : threads.length === 0 ? (
        <p className="rc-body rc-ink-2 mt-4">Nothing yet. When you mention a plan or a habit you’re building, it shows up here.</p>
      ) : (
        <ul className="mt-3">
          {threads.map((t) => (
            <ThreadRow key={t._id} thread={t} onChanged={replace} onForgotten={() => setThreads((cur) => (Array.isArray(cur) ? cur.filter((x) => x._id !== t._id) : cur))} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ThreadRow({ thread: t, onChanged, onForgotten }: { thread: BuddyThread; onChanged: (t: BuddyThread) => void; onForgotten: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<BuddyThreadDetail | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const quiet = !!t.quietUntil && new Date(t.quietUntil).getTime() > openedAt;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      try {
        setDetail(await buddyApi.thread(t._id));
      } catch {
        toast.error('Its history couldn’t load.');
      }
    }
  };

  const change = async (patch: ThreadPatch, done: string) => {
    try {
      const d = await buddyApi.updateThread(t._id, patch);
      setDetail(d);
      onChanged(d);
      toast.success(done);
    } catch {
      toast.error('That change didn’t save. Try again.');
    }
  };

  const actions: MenuAction[] = [
    { label: 'Ask me less', onSelect: () => void change({ askLess: true }, 'Quiet about it for two weeks') },
    t.noAsk ? { label: 'Ask about it again', onSelect: () => void change({ noAsk: false }, 'It may ask about it again') } : { label: 'Don’t ask about this', onSelect: () => void change({ noAsk: true }, 'It won’t bring this up') },
    t.onScreens ? { label: 'Keep it off my screens', onSelect: () => void change({ onScreens: false }, 'Never on your lock or home screen') } : { label: 'May show on my screens', onSelect: () => void change({ onScreens: true }, 'It may show on your screens') },
    { label: 'Drop it', separatorBefore: true, onSelect: () => void change({ stage: 'dropped' }, 'Dropped. A new word about it picks it up again.') },
    { label: 'Forget for good', danger: true, separatorBefore: true, onSelect: () => setConfirm(true) },
  ];

  const last = t.last[0];
  const meta = [
    STAGE_WORD[t.stage] ?? t.stage,
    `since ${dayText(t.firstDay)}`,
    last ? `${dayText(last.day)}: ${KIND_WORD[last.kind] ?? last.kind}` : null,
    quiet ? `quiet until ${dayText(t.quietUntil!.slice(0, 10))}` : null,
  ].filter(Boolean);

  return (
    <li className="rc-row rc-hoverable you-row flex-col items-stretch">
      <div className="flex w-full min-w-0 items-start gap-2">
        <RcIconButton size="sm" label={open ? 'Hide its history' : 'Show its history'} onClick={() => void toggle()}>
          {open ? <ChevronDown /> : <ChevronRight />}
        </RcIconButton>
        <div className="min-w-0 flex-1">
          <p className="you-text">{t.title}</p>
          <p className="rc-meta mt-0.5 flex flex-wrap items-center gap-x-1.5">
            {t.sensitive && <Lock aria-label="Private" className="h-3.5 w-3.5 text-[var(--rc-icon)]" strokeWidth={1.75} />}
            {t.noAsk && <BellOff aria-label="It won’t ask about this" className="h-3.5 w-3.5 text-[var(--rc-icon)]" strokeWidth={1.75} />}
            {!t.onScreens && <EyeOff aria-label="Off your screens" className="h-3.5 w-3.5 text-[var(--rc-icon)]" strokeWidth={1.75} />}
            {meta.join(' · ')}
          </p>
        </div>
        <div className="rc-row-actions flex shrink-0 items-center">
          <RcMenu label="More" actions={actions}>
            <RcIconButton size="sm" label="More">
              <MoreHorizontal />
            </RcIconButton>
          </RcMenu>
        </div>
      </div>
      {open && (
        <ol className={cn('mt-2 ml-6 grid gap-1 border-l border-[var(--rc-line)] pl-3')} aria-label={`What you said about ${t.title}`}>
          {!detail ? (
            <li className="rc-meta">Loading…</li>
          ) : detail.history.length === 0 ? (
            <li className="rc-meta">Nothing said about it yet.</li>
          ) : (
            detail.history.map((h, i) => (
              <li key={i} className="rc-body text-[14px] text-[var(--rc-ink-1)]">
                <span className="rc-meta mr-1.5">{dayText(h.day)}</span>
                {h.text}
                {!h.direct && <span className="rc-meta"> · from an agent</span>}
              </li>
            ))
          )}
        </ol>
      )}
      <RcConfirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Forget this for good?"
        body={<>“{t.title}” and everything said about it are deleted, its questions too. This can’t be undone.</>}
        confirmLabel="Forget for good"
        danger
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await buddyApi.forgetThread(t._id);
            onForgotten();
            toast.success('Forgotten');
          } catch {
            toast.error('It couldn’t be forgotten. Try again.');
          }
          setBusy(false);
          setConfirm(false);
        }}
      />
    </li>
  );
}
