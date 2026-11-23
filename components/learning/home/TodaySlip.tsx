'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CalendarClock, Check, ChevronDown, CircleHelp, Pause, Play, RotateCcw, SlidersHorizontal, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import type { DayString, RevisionItem, TodayPlan } from '@/lib/learning/types';
import { nextReviewDay, REVISION_CYCLES } from '@/lib/learning/plan';
import { RcButton, RcCheck, RcConfirm, RcIconButton, RcMenu, RcStamp, type MenuAction } from '@/components/rc-ui';
import { NoteBody } from './NoteBody';
import { RecallSheet, type RecallTarget } from '@/components/learning/recall/RecallSheet';
import { RevisionCardDialog } from '@/components/docs/page/RevisionCard';
import { LabelLine, openCapturePalette, SectionFailed } from './parts';
import { plural, shortDay, stampDay } from './format';

interface RowProps {
  rev: RevisionItem;
  done: boolean;
  today: DayString;
  nextDue: DayString | null | undefined;
  pressed: boolean;
  /** Ticked on this visit and already moved to the end of the list: it rests there faded. */
  settled: boolean;
  checkRef: (el: HTMLButtonElement | null) => void;
  onToggle: () => void;
  /** Recall mode for a due doc (PLAN §4: "Revise" means recall). */
  onRecall: () => void;
  /** STUDY_FLOW_PLAN §4.4: a doc with a revision card shows the card first. */
  onCard: () => void;
}

/**
 * One review: check, the title with its meta beside it (under it when the two don't fit one line),
 * then the due stamp once it is done (no minutes per review: the budget is for the whole list).
 */
function SlipRow({ rev, done, today, nextDue, pressed, settled, checkRef, onToggle, onRecall, onCard }: RowProps) {
  const still = useReducedMotion();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const isNote = rev.kind === 'capture';
  const late = !done && (rev.daysLate ?? 0) > 0;
  const next = nextDue === undefined ? nextReviewDay(today, rev.cycleNumber) : nextDue;

  const openDoc = async () => {
    let docId = rev.docId ?? null;
    if (!docId) {
      try {
        docId = (await learningApi.ensureTopicDoc(rev.itemId)).docId;
      } catch {
        toast.error('Couldn’t open this topic’s doc. Try again.');
        return;
      }
    }
    router.push(`/docs/${encodeURIComponent(docId)}`);
  };
  const moveDay = () => useLearningStore.getState().openReschedule({ kind: 'revision', id: rev._id, title: rev.title, scheduledFor: rev.scheduledFor });
  // The owner, 11-21: a click on a doc's row opens the doc, a click on a note's row unfolds it (a
  // double-click edits it in place); the calendar in the meta moves either; the check of an open doc
  // asks first: Complete, or Quiz me on it.
  const checkActions: MenuAction[] = [
    { label: 'Complete', icon: <Check />, onSelect: onToggle },
    { label: 'Quiz me on it', icon: <CircleHelp />, onSelect: onRecall },
  ];

  // A note edited in place: title and text, Ctrl Enter saves, Esc leaves it as it was.
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(rev.title);
  const [draftBody, setDraftBody] = useState(rev.content ?? '');
  const [saving, setSaving] = useState(false);
  const beginEdit = () => {
    setDraftTitle(rev.title);
    setDraftBody(rev.content ?? '');
    setExpanded(true);
    setEditing(true);
  };
  const saveEdit = async () => {
    const title = draftTitle.trim();
    if (!title) return;
    if (title === rev.title && draftBody === (rev.content ?? '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await useLearningStore.getState().updateCapture(rev.itemId, { title, content: draftBody });
    setSaving(false);
    if (ok) setEditing(false);
  };
  const editKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setEditing(false);
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void saveEdit();
    }
  };

  const right = done ? (
    next ? (
      <RcStamp press={pressed} label={`Next review ${shortDay(next, today)}`}>
        Next {stampDay(next, today)}
      </RcStamp>
    ) : (
      <RcStamp press={pressed} label="Mastered: all four reviews done">
        Mastered
      </RcStamp>
    )
  ) : (
    null
  );

  const titleSpan = (
    <span
      className={cn(
        'rc-strike relative max-w-full text-[var(--rc-fs-body)] leading-[1.4] font-medium decoration-1 underline-offset-[3px] group-hover:underline',
        done ? (pressed ? 'text-[var(--rc-ink-3)]' : 'text-[var(--rc-ink-3)] line-through decoration-[var(--rc-ink-3)]') : 'text-[var(--rc-ink-1)]',
      )}
    >
      {rev.title}
      {isNote && <ChevronDown aria-hidden className={cn('ml-1 inline w-4 h-4 align-[-2px] text-[var(--rc-ink-3)] transition-transform', expanded && 'rotate-180')} />}
    </span>
  );
  // How late, at a glance (the owner, 11-21): "24d late", the number in weight, and a short amber
  // fuse in front that grows with the wait (a day is a short stub, a month and more is full length).
  const daysLate = rev.daysLate ?? 0;
  const lateSpan = late ? (
    <span className="inline-flex items-center gap-1.5 text-[var(--rc-attn)]" title={`${daysLate} ${daysLate === 1 ? 'day' : 'days'} late · waiting since ${shortDay(rev.scheduledFor, today)}`}>
      <span aria-hidden className="h-[3px] rounded-full bg-[var(--rc-attn-mark)] opacity-80" style={{ width: `${Math.round(4 + Math.min(1, Math.log1p(daysLate) / Math.log1p(30)) * 16)}px` }} />
      <span className="rc-num whitespace-nowrap">
        <span className="font-[600]">{daysLate}d</span> late
      </span>
    </span>
  ) : null;

  return (
    <motion.li
      layout={still ? false : 'position'}
      transition={{ layout: { duration: 0.42, ease: [0.2, 0.9, 0.25, 1] } }}
      data-struck={(done && pressed) || undefined}
      data-settled={(done && settled) || undefined}
      className="rc-row rc-hoverable rc-rev-row group -mx-2 grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-3 px-2 py-[7px]"
    >
      <div className="pt-[2px]">
        {!isNote && !done ? (
          <RcMenu label={`Complete “${rev.title}” or quiz me on it`} actions={checkActions} align="start">
            <RcCheck ref={checkRef} checked={false} onToggle={() => undefined} label={`Complete “${rev.title}” or quiz me on it`} />
          </RcMenu>
        ) : (
          <RcCheck ref={checkRef} checked={done} onToggle={onToggle} label={done ? `Mark “${rev.title}” not done` : `Mark “${rev.title}” done`} />
        )}
      </div>

      <div className="min-w-0">
        {isNote && editing ? (
          <div className="flex flex-col gap-1.5" onKeyDown={editKeys}>
            <input
              autoFocus
              className="w-full bg-transparent text-[var(--rc-fs-body)] font-medium leading-[1.4] text-[var(--rc-ink-1)] outline-none"
              value={draftTitle}
              maxLength={200}
              aria-label="Note title"
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  (e.currentTarget.parentElement?.querySelector('textarea') as HTMLTextAreaElement | null)?.focus();
                }
              }}
            />
            <textarea
              className="min-h-[72px] w-full resize-y rounded-[8px] bg-[var(--rc-surface-2)] px-3 py-2 text-[15px] leading-[1.5] text-[var(--rc-ink-1)] outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--rc-line-strong)]"
              value={draftBody}
              aria-label="Note text"
              onChange={(e) => setDraftBody(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="rc-meta">Ctrl Enter to save · Esc to cancel</span>
              <div className="-mr-2 flex items-center gap-1">
                <RcButton size="sm" variant="quiet" onClick={() => setEditing(false)}>
                  Cancel
                </RcButton>
                <RcButton size="sm" variant="outline" busy={saving} disabled={!draftTitle.trim()} onClick={() => void saveEdit()}>
                  Save
                </RcButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <button
              type="button"
              aria-expanded={isNote ? expanded : undefined}
              title={isNote ? 'Click to open · double-click to edit' : `Open the doc · review ${rev.cycleNumber} of ${REVISION_CYCLES}`}
              onClick={() => (isNote ? setExpanded((x) => !x) : rev.hasCard && !done ? onCard() : void openDoc())}
              onDoubleClick={isNote ? beginEdit : undefined}
              className="min-w-0 cursor-pointer text-left outline-none"
            >
              {titleSpan}
              {/* "Title · DSA" (the owner, 11-21): the subject sits after the title, in the meta's ink. */}
              <span className="rc-meta whitespace-nowrap font-[400]"> · {rev.subject?.name ?? 'General'}</span>
            </button>
            <span className={cn('flex flex-wrap items-center gap-x-3 gap-y-0.5 rc-meta !leading-[1.35]', done && 'opacity-80')}>
              {/* The review's place in its cycle, "2/4", when it has one. */}
              {rev.cycleNumber > 0 && (
                <span className="rc-num" title={`Review ${rev.cycleNumber} of ${REVISION_CYCLES}`}>
                  {rev.cycleNumber}/{REVISION_CYCLES}
                </span>
              )}
              {isNote && (
                <span className="inline-flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5" aria-hidden /> Note
                </span>
              )}
              {!done && (
                <RcIconButton size="sm" label={`Move “${rev.title}” to another day`} className="-my-1 -mx-1" onClick={moveDay}>
                  <CalendarClock />
                </RcIconButton>
              )}
              {lateSpan}
              {right}
            </span>
          </div>
        )}
        {isNote && expanded && !editing && (rev.content || rev.url) && (
          <div className="mt-2 cursor-text rounded-[8px] bg-[var(--rc-surface-2)] px-3 py-2" onDoubleClick={beginEdit} title="Double-click to edit">
            {rev.content && <NoteBody content={rev.content} />}
            {rev.url && (
              <a href={rev.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-[14px]">
                {rev.url}
              </a>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}

/**
 * The day's revision session (the owner, 11-21): no share of the budget per review; Start sets the
 * clock running for the whole list, and the dashed line fills with the time. Kept per day in this
 * browser (a convenience: a lost start only means pressing Start again).
 */
type Session = {
  startedAt: number;
  endedAt?: number;
  /** Paused since then (the owner, 11-22: a pause on the timer); the clock stands still. */
  pausedAt?: number;
  /** Time spent paused before, not counted. */
  pausedMs?: number;
};

function sessionKey(today: DayString) {
  return `rc-revise-session:${today}`;
}

function useReviseSession(today: DayString) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(sessionKey(today));
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });
  const [now, setNow] = useState(() => Date.now());
  const running = !!session && !session.endedAt && !session.pausedAt;
  const paused = !!session && !session.endedAt && !!session.pausedAt;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  const save = (next: Session | null) => {
    setSession(next);
    setNow(Date.now());
    try {
      if (next) localStorage.setItem(sessionKey(today), JSON.stringify(next));
      else localStorage.removeItem(sessionKey(today));
    } catch {
      /* not kept; the session still runs on this page */
    }
  };
  const elapsedMs = session ? (session.endedAt ?? session.pausedAt ?? now) - session.startedAt - (session.pausedMs ?? 0) : 0;
  return {
    session,
    running,
    paused,
    elapsedMs,
    start: () => save({ startedAt: Date.now() }),
    pause: () => session && running && save({ ...session, pausedAt: Date.now() }),
    resume: () => session && session.pausedAt && save({ startedAt: session.startedAt, pausedMs: (session.pausedMs ?? 0) + (Date.now() - session.pausedAt) }),
    // Ending while paused stops the clock where the pause left it.
    end: () => session && save({ ...session, endedAt: session.pausedAt ?? Date.now(), pausedAt: undefined }),
  };
}

/** "45 s", "12 min", "1 h 5 min" */
function spent(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return `${Math.max(0, Math.floor(ms / 1000))} s`;
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
}

/**
 * Today's slip (LOOP_V2_SPEC §2): the budgeted plan as an open list on the page (the owner, 11-21:
 * no card around it), under one heading with the budget and its meter. A row ticked now keeps its
 * place and takes the due stamp; what was done earlier today folds away at the bottom; the waiting
 * backlog and Fresh start ("Spread them out") are the list's last line.
 */
export function TodaySlip({
  plan,
  today,
  firstRun,
  onRetry,
  onOpenSettings,
}: {
  plan: TodayPlan | null;
  today: DayString;
  /** Nothing has ever been revised: the empty slip invites the first one. */
  firstRun: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  const nextDue = useLearningStore((s) => s.nextDue);
  // Spreading only moves late reviews: offer it only when some of the waiting ones are late.
  const overdue = useLearningStore((s) => s.data?.revisions.overdue);
  const lateWaiting = plan && overdue ? overdue.filter((r) => !plan.planned.some((p) => p._id === r._id)).length : 0;
  const [pressed, setPressed] = useState<Set<string>>(() => new Set());
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const clock = useReviseSession(today);
  // The session ends by itself when the last review is ticked.
  const allDone = !!plan && plan.planned.length === 0 && plan.doneToday.length > 0;
  useEffect(() => {
    if ((clock.running || clock.paused) && allDone) clock.end();
  }, [clock, allDone]);
  // A row ticked now: the line is drawn through it (240 ms), then it moves to the end of the list and
  // rests there faded (the owner, 11-21); the value is when it moved, so the last ticked sits last.
  const [settledAt, setSettledAt] = useState<Map<string, number>>(() => new Map());
  const moveTimers = useRef(new Map<string, number>());
  useEffect(() => {
    const all = moveTimers.current;
    return () => all.forEach((t) => window.clearTimeout(t));
  }, []);
  const [showDone, setShowDone] = useState(false);
  const [confirmFresh, setConfirmFresh] = useState(false);
  const [recall, setRecall] = useState<RecallTarget | null>(null);
  // STUDY_FLOW_PLAN §4.4: the review whose revision card is open (its row's place, for the tick).
  const [card, setCard] = useState<{ rev: RevisionItem; index: number } | null>(null);
  const router = useRouter();
  const [freshBusy, setFreshBusy] = useState(false);
  const [preview, setPreview] = useState<{ moved: number; spreadDays: number } | null | 'loading'>(null);
  // Each row's place for this visit: first seen, first listed, so a tick never reorders the slip.
  const [order, setOrder] = useState<Map<string, number>>(() => new Map());
  const checks = useRef(new Map<string, HTMLButtonElement | null>());
  const unseen = plan ? [...plan.planned, ...plan.doneToday].filter((r) => !order.has(r._id)) : [];
  if (unseen.length > 0) {
    const next = new Map(order);
    for (const r of unseen) next.set(r._id, next.size);
    setOrder(next);
  }

  const { rows, folded } = useMemo(() => {
    if (!plan) return { rows: [], folded: [] };
    const all = [...plan.planned.map((r) => ({ rev: r, done: false })), ...plan.doneToday.map((r) => ({ rev: r, done: true }))];
    const at = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
    const byOrder = (a: { rev: RevisionItem }, b: { rev: RevisionItem }) => at(a.rev._id) - at(b.rev._id);
    const moved = (r: { rev: RevisionItem; done: boolean }) => (r.done ? settledAt.get(r.rev._id) : undefined);
    const byPlace = (a: { rev: RevisionItem; done: boolean }, b: { rev: RevisionItem; done: boolean }) => {
      const ma = moved(a);
      const mb = moved(b);
      if (ma === undefined && mb === undefined) return byOrder(a, b);
      if (ma === undefined) return -1;
      if (mb === undefined) return 1;
      return ma - mb;
    };
    return {
      rows: all.filter((r) => !r.done || ticked.has(r.rev._id)).sort(byPlace),
      folded: all.filter((r) => r.done && !ticked.has(r.rev._id)).sort(byOrder),
    };
  }, [plan, ticked, order, settledAt]);

  if (!plan) return <SectionFailed what="today’s revisions" onRetry={onRetry} />;

  const everything = [...rows, ...folded];
  const doneCount = plan.doneToday.length;
  const budgetMs = plan.budgetMin * 60_000;
  // The dashed line: one dash a review, filled by time across the whole line.
  const dashes = Math.max(4, Math.min(12, everything.length));
  const filled = clock.session ? Math.min(1, clock.elapsedMs / budgetMs) * dashes : 0;

  const toggle = (rev: RevisionItem, done: boolean, index: number) => {
    const store = useLearningStore.getState();
    if (done) {
      setPressed((p) => {
        const n = new Set(p);
        n.delete(rev._id);
        return n;
      });
      const t = moveTimers.current.get(rev._id);
      if (t) window.clearTimeout(t);
      moveTimers.current.delete(rev._id);
      setSettledAt((m) => {
        const n = new Map(m);
        n.delete(rev._id);
        return n;
      });
      void store.uncompleteRevision(rev._id);
      return;
    }
    setPressed((p) => new Set(p).add(rev._id));
    setTicked((t) => new Set(t).add(rev._id));
    void store.completeRevision(rev._id);
    moveTimers.current.set(
      rev._id,
      window.setTimeout(() => {
        moveTimers.current.delete(rev._id);
        setSettledAt((m) => new Map(m).set(rev._id, Date.now()));
      }, 300),
    );
    // The next thing to do is always ready: focus the next open row.
    const nextOpen = rows.slice(index + 1).find((r) => !r.done) ?? rows.find((r) => !r.done && r.rev._id !== rev._id);
    if (nextOpen) requestAnimationFrame(() => checks.current.get(nextOpen.rev._id)?.focus());
  };

  const openFresh = async () => {
    setConfirmFresh(true);
    setPreview('loading');
    setPreview(await useLearningStore.getState().previewFreshStart());
  };

  const runFreshStart = async () => {
    setFreshBusy(true);
    const ok = await useLearningStore.getState().freshStart();
    setFreshBusy(false);
    if (ok) setConfirmFresh(false);
  };

  const nothing = everything.length === 0;
  const renderRow = ({ rev, done }: { rev: RevisionItem; done: boolean }, i: number) => (
    <SlipRow
      key={rev._id}
      rev={rev}
      done={done}
      today={today}
      nextDue={nextDue[rev._id]}
      pressed={pressed.has(rev._id)}
      settled={settledAt.has(rev._id)}
      checkRef={(el) => {
        checks.current.set(rev._id, el);
      }}
      onToggle={() => toggle(rev, done, i)}
      onRecall={() =>
        setRecall({ revisionId: rev._id, title: rev.title, docId: rev.docId ?? null, cycleNumber: rev.cycleNumber, subjectName: rev.subject?.name ?? null })
      }
      onCard={() => setCard({ rev, index: i })}
    />
  );

  const freshBody =
    preview === 'loading' ? (
      <p>Working out how the late revisions would spread…</p>
    ) : preview && preview.moved === 0 ? (
      <p>Nothing is late right now, so there is nothing to spread.</p>
    ) : (
      <>
        <p>
          {preview
            ? `This moves ${plural(preview.moved, 'late revision')} over the next ${plural(preview.spreadDays, 'day')}, starting today: a budget’s worth each day, so nothing stays late.`
            : 'Every late revision moves to the coming days, starting today: a budget’s worth each day, so nothing stays late.'}
        </p>
        <p className="mt-2">You can’t undo this.</p>
      </>
    );

  return (
    <section aria-labelledby="revise-h">
      {!nothing && (
        <>
          <LabelLine
            id="revise-h"
            title="Revise"
            meta={
              <>
                {doneCount} of {everything.length} ·{' '}
                {!clock.session ? (
                  `${plan.budgetMin}-min budget`
                ) : clock.session.endedAt ? (
                  `done in ${spent(clock.elapsedMs)}`
                ) : clock.paused ? (
                  `paused · ${spent(clock.elapsedMs)} of ${plan.budgetMin} min`
                ) : clock.elapsedMs > budgetMs ? (
                  <span className="text-[var(--rc-attn)]">{spent(clock.elapsedMs - budgetMs)} over</span>
                ) : (
                  `${spent(clock.elapsedMs)} of ${plan.budgetMin} min`
                )}
              </>
            }
          >
            {/* The dashed line fills with the session's time, not per review (the owner, 11-21). */}
            <div
              className="rc-budget rc-time mr-2 hidden w-[140px] sm:flex"
              data-over={clock.elapsedMs > budgetMs || undefined}
              data-ended={clock.session?.endedAt ? true : undefined}
              role="img"
              aria-label={clock.session ? `${spent(clock.elapsedMs)} of a ${plan.budgetMin}-minute budget` : `A ${plan.budgetMin}-minute budget, not started`}
            >
              {Array.from({ length: dashes }, (_, i) => (
                <span key={i}>
                  <i style={{ width: `${Math.max(0, Math.min(1, filled - i)) * 100}%` }} />
                </span>
              ))}
            </div>
            {!clock.session && (
              <RcButton size="sm" variant="outline" icon={<Play />} onClick={clock.start}>
                Start
              </RcButton>
            )}
            {clock.running && (
              <RcIconButton size="sm" label="Pause the session" onClick={clock.pause}>
                <Pause />
              </RcIconButton>
            )}
            {clock.paused && (
              <RcButton size="sm" variant="outline" icon={<Play />} onClick={clock.resume} title="Go on with the session">
                Resume
              </RcButton>
            )}
            {(clock.running || clock.paused) && (
              <RcButton size="sm" variant="quiet" onClick={clock.end} title="End the session">
                End
              </RcButton>
            )}
            {clock.session?.endedAt && !allDone && (
              <RcButton size="sm" variant="quiet" icon={<RotateCcw />} onClick={clock.start} title="Start a new session">
                Again
              </RcButton>
            )}
            <RcIconButton size="sm" label={`Daily budget: ${plan.budgetMin} minutes. Change it`} onClick={onOpenSettings}>
              <SlidersHorizontal />
            </RcIconButton>
          </LabelLine>
        </>
      )}

      {nothing ? (
        <div>
          <h2 id="revise-h" className="rc-title">
            {firstRun ? 'Start your first revision.' : plan.waitingCount > 0 ? 'Today’s budget is used up.' : 'A free day.'}
          </h2>
          <p className="mt-1 text-[15px] rc-ink-2">
            {plan.waitingCount > 0
              ? 'What is waiting comes in over the next days.'
              : firstRun
                ? 'Open a doc and choose Revise in its toolbar, or capture a note with “Revise this” turned on. It comes back tomorrow, then in 3, 7 and 21 days.'
                : 'Nothing is due. Capture something new to revise, or enjoy the quiet.'}
          </p>
          {plan.waitingCount === 0 && (
            <RcButton variant="outline" size="sm" className="mt-3" onClick={() => openCapturePalette()}>
              Capture something to revise
            </RcButton>
          )}
        </div>
      ) : rows.length > 0 ? (
        <ul>{rows.map(renderRow)}</ul>
      ) : (
        <p className="py-1 text-[15px] rc-ink-2">All done for today. The next ones come in tomorrow.</p>
      )}

      {folded.length > 0 && (
        <div className="mt-1">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((x) => !x)}
            className="rc-hoverable -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 px-2 py-[7px] text-left text-[14px] font-[500] rc-ink-2 cursor-pointer"
          >
            <ChevronDown aria-hidden className={cn('w-[18px] h-[18px] text-[var(--rc-icon)] transition-transform', !showDone && '-rotate-90')} />
            Done today <span className="rc-num font-[400] rc-ink-3">{folded.length}</span>
          </button>
          {showDone && <ul>{folded.map((r, i) => renderRow(r, rows.length + i))}</ul>}
        </div>
      )}

      {plan.waitingCount > 0 && (
        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 pl-[30px]">
          <p className="rc-meta min-w-0">
            <span className="rc-num">{plan.waitingCount}</span> more waiting · they come in as room frees up
          </p>
          {lateWaiting > 0 && (
            <RcButton variant="quiet" size="sm" className="-mr-2" onClick={() => void openFresh()}>
              Spread them out
            </RcButton>
          )}
        </div>
      )}

      <RcConfirm
        open={confirmFresh}
        onOpenChange={setConfirmFresh}
        title="Spread out the late revisions?"
        body={freshBody}
        confirmLabel="Spread them out"
        cancelLabel="Keep waiting"
        busy={freshBusy || preview === 'loading' || (preview !== null && preview.moved === 0)}
        onConfirm={() => void runFreshStart()}
      />
      <RecallSheet target={recall} onOpenChange={(o) => !o && setRecall(null)} onFinished={() => void useLearningStore.getState().refresh()} />
      <RevisionCardDialog
        docId={card?.rev.docId ?? null}
        title={card?.rev.title}
        onClose={() => setCard(null)}
        onDone={() => {
          const docId = card?.rev.docId;
          setCard(null);
          if (docId) router.push(`/docs/${encodeURIComponent(docId)}`);
        }}
        onQuiz={() => {
          if (!card) return;
          const { rev } = card;
          setCard(null);
          setRecall({ revisionId: rev._id, title: rev.title, docId: rev.docId ?? null, cycleNumber: rev.cycleNumber, subjectName: rev.subject?.name ?? null });
        }}
        onRevised={() => {
          if (!card) return;
          const { rev, index } = card;
          setCard(null);
          toggle(rev, false, index);
        }}
      />
      <span className="sr-only" aria-live="polite">
        {doneCount > 0 ? `${plural(doneCount, 'revision')} done today` : ''}
      </span>
    </section>
  );
}
