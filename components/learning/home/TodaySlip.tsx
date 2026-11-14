'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, ChevronDown, CircleHelp, FileText, MoreHorizontal, Pencil, SlidersHorizontal, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import type { DayString, RevisionItem, TodayPlan } from '@/lib/learning/types';
import { estimateMinutes, nextReviewDay, REVISION_CYCLES } from '@/lib/learning/plan';
import { RcButton, RcCheck, RcConfirm, RcIconButton, RcMenu, RcStamp, type MenuAction } from '@/components/rc-ui';
import { NoteBody } from './NoteBody';
import { RecallSheet, type RecallTarget } from '@/components/learning/recall/RecallSheet';
import { openCapturePalette, SectionFailed } from './parts';
import { plural, shortDay, stampDay } from './format';

interface RowProps {
  rev: RevisionItem;
  done: boolean;
  today: DayString;
  nextDue: DayString | null | undefined;
  pressed: boolean;
  checkRef: (el: HTMLButtonElement | null) => void;
  onToggle: () => void;
  /** Recall mode for a due doc (PLAN §4: "Revise" means recall). */
  onRecall: () => void;
}

/** One slip line: check, title and meta, then the fixed stamp column (minutes, or the due stamp). */
function SlipRow({ rev, done, today, nextDue, pressed, checkRef, onToggle, onRecall }: RowProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const isNote = rev.kind === 'capture';
  const minutes = estimateMinutes(rev);
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
  // A due doc opens Recall mode (questions from the doc); a note expands; a finished one opens its doc.
  const open = () => (isNote ? setExpanded((x) => !x) : done ? void openDoc() : onRecall());

  const actions: MenuAction[] = [];
  if (!isNote && !done) actions.push({ label: 'Quiz me on it', icon: <CircleHelp />, onSelect: onRecall });
  actions.push(
    isNote
      ? { label: expanded ? 'Hide note' : 'Show note', icon: <StickyNote />, onSelect: () => setExpanded((x) => !x) }
      : { label: 'Open doc', icon: <FileText />, onSelect: () => void openDoc() },
  );
  if (isNote) {
    actions.push({
      label: 'Edit note',
      icon: <Pencil />,
      onSelect: () => useLearningStore.getState().openEditCapture({ captureId: rev.itemId, title: rev.title, content: rev.content ?? '' }),
    });
  }
  if (!done) {
    actions.push({
      label: 'Move to another day',
      icon: <CalendarClock />,
      onSelect: () => useLearningStore.getState().openReschedule({ kind: 'revision', id: rev._id, title: rev.title, scheduledFor: rev.scheduledFor }),
    });
  }

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
    <span className="rc-meta rc-num whitespace-nowrap">{minutes} min</span>
  );

  return (
    <li className="rc-row rc-hoverable group mx-1.5 grid grid-cols-[18px_minmax(0,1fr)_28px] sm:grid-cols-[18px_minmax(0,1fr)_104px_28px] items-start gap-x-3 px-2.5 py-[9px]">
      <div className="pt-[2px]">
        <RcCheck ref={checkRef} checked={done} onToggle={onToggle} label={done ? `Mark “${rev.title}” not done` : `Mark “${rev.title}” done`} />
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={open}
          aria-expanded={isNote ? expanded : undefined}
          className={cn(
            'block max-w-full text-left text-[var(--rc-fs-body)] leading-[1.3] font-medium cursor-pointer decoration-1 underline-offset-[3px] hover:underline',
            done ? 'text-[var(--rc-ink-3)] line-through decoration-[var(--rc-ink-3)]' : 'text-[var(--rc-ink-1)]',
          )}
        >
          {rev.title}
          {isNote && <ChevronDown aria-hidden className={cn('ml-1 inline w-4 h-4 align-[-2px] text-[var(--rc-ink-3)] transition-transform', expanded && 'rotate-180')} />}
        </button>
        <div className={cn('mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 rc-meta !leading-[1.35]', done && 'opacity-80')}>
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="rc-swatch" style={{ background: rev.subject?.color ?? 'var(--rc-ink-3)' }} aria-hidden />
            <span>{rev.subject?.name ?? 'General'}</span>
          </span>
          <span>
            Review {rev.cycleNumber} of {REVISION_CYCLES}
          </span>
          {isNote && (
            <span className="inline-flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" aria-hidden /> Note
            </span>
          )}
          {late && <span>Waiting since {shortDay(rev.scheduledFor, today)}</span>}
          <span className="sm:hidden">{right}</span>
        </div>
        {isNote && expanded && (rev.content || rev.url) && (
          <div className="mt-2 rounded-[8px] bg-[var(--rc-surface-2)] px-3 py-2">
            {rev.content && <NoteBody content={rev.content} />}
            {rev.url && (
              <a href={rev.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-[14px]">
                {rev.url}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:flex justify-end pt-[2px]">{right}</div>

      <div className="rc-row-actions">
        <RcMenu label={`Actions for “${rev.title}”`} actions={actions}>
          <RcIconButton label={`Actions for “${rev.title}”`} size="sm">
            <MoreHorizontal />
          </RcIconButton>
        </RcMenu>
      </div>
    </li>
  );
}

/**
 * Today's slip (LOOP_V2_SPEC §2), the page's hero: the budgeted plan as one paper card with no
 * heading (the page title and summary say what it is). A row ticked now keeps its place and takes
 * the due stamp; what was done earlier today folds away at the bottom; the waiting backlog and
 * Fresh start ("Spread them out") are the slip's footer.
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
  const [pressed, setPressed] = useState<Set<string>>(() => new Set());
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const [showDone, setShowDone] = useState(false);
  const [confirmFresh, setConfirmFresh] = useState(false);
  const [recall, setRecall] = useState<RecallTarget | null>(null);
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
    return {
      rows: all.filter((r) => !r.done || ticked.has(r.rev._id)).sort(byOrder),
      folded: all.filter((r) => r.done && !ticked.has(r.rev._id)).sort(byOrder),
    };
  }, [plan, ticked, order]);

  if (!plan) return <SectionFailed what="today’s revisions" onRetry={onRetry} />;

  const everything = [...rows, ...folded];
  const total = everything.reduce((s, r) => s + estimateMinutes(r.rev), 0);
  const doneCount = plan.doneToday.length;
  const room = Math.max(0, plan.budgetMin - total);

  const toggle = (rev: RevisionItem, done: boolean, index: number) => {
    const store = useLearningStore.getState();
    if (done) {
      setPressed((p) => {
        const n = new Set(p);
        n.delete(rev._id);
        return n;
      });
      void store.uncompleteRevision(rev._id);
      return;
    }
    setPressed((p) => new Set(p).add(rev._id));
    setTicked((t) => new Set(t).add(rev._id));
    void store.completeRevision(rev._id);
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
      checkRef={(el) => {
        checks.current.set(rev._id, el);
      }}
      onToggle={() => toggle(rev, done, i)}
      onRecall={() =>
        setRecall({ revisionId: rev._id, title: rev.title, docId: rev.docId ?? null, cycleNumber: rev.cycleNumber, subjectName: rev.subject?.name ?? null })
      }
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
    <section aria-label="Today’s revisions" className="rc-card overflow-hidden">
      {!nothing && (
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <RcButton
              variant="quiet"
              size="sm"
              className="-ml-2"
              onClick={onOpenSettings}
              aria-label={`Daily budget: ${plan.budgetMin} minutes. Change it`}
              title="Change the daily budget"
            >
              {plan.budgetMin}-minute budget
              <SlidersHorizontal aria-hidden />
            </RcButton>
            <span className="rc-meta rc-num">
              {doneCount} of {everything.length} done
            </span>
          </div>
          <div className="rc-budget" role="img" aria-label={`${total} of ${plan.budgetMin} minutes planned; ${doneCount} of ${everything.length} done`}>
            {everything.map(({ rev, done }) => (
              <span key={rev._id} data-done={done} style={{ flexGrow: estimateMinutes(rev), flexBasis: 0 }} title={`${rev.title}: ${estimateMinutes(rev)} min${done ? ', done' : ''}`} />
            ))}
            {room > 0 && <span data-kind="room" style={{ flexGrow: room, flexBasis: 0 }} title={`${room} min of room left in the budget`} />}
          </div>
        </div>
      )}

      {nothing ? (
        <div className="px-4 py-5 sm:px-5">
          <p className="rc-title">{firstRun ? 'Start your first revision.' : plan.waitingCount > 0 ? 'Today’s budget is used up.' : 'A free day.'}</p>
          <p className="mt-1 text-[15px] rc-ink-2">
            {plan.waitingCount > 0
              ? 'What is waiting comes in over the next days.'
              : firstRun
                ? 'Open a doc and choose Revise in its toolbar, or capture a note with “Revise this” turned on. It comes back tomorrow, then in 3, 7 and 21 days.'
                : 'Nothing is due. Capture something new to revise, or enjoy the quiet.'}
          </p>
          {plan.waitingCount === 0 && (
            <RcButton variant="outline" size="sm" className="mt-3" onClick={openCapturePalette}>
              Capture something to revise
            </RcButton>
          )}
        </div>
      ) : rows.length > 0 ? (
        <ul className="pb-1.5">{rows.map(renderRow)}</ul>
      ) : (
        <p className="px-4 pb-3.5 pt-1 text-[14px] rc-ink-2">All done for today. The next ones come in tomorrow.</p>
      )}

      {folded.length > 0 && (
        <div className="border-t border-[var(--rc-line)]">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((x) => !x)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] font-[500] rc-ink-2 cursor-pointer transition-colors hover:text-[var(--rc-ink-1)]"
          >
            <ChevronDown aria-hidden className={cn('w-4 h-4 text-[var(--rc-icon)] transition-transform', !showDone && '-rotate-90')} />
            Done today <span className="rc-num font-[400] rc-ink-3">{folded.length}</span>
          </button>
          {showDone && <ul className="pb-1.5">{folded.map((r, i) => renderRow(r, rows.length + i))}</ul>}
        </div>
      )}

      {plan.waitingCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--rc-line)] px-4 py-2.5">
          <p className="text-[14px] rc-ink-2 min-w-0">
            {plan.waitingCount} more {plan.waitingCount === 1 ? 'is' : 'are'} waiting. They come in as room frees up.
          </p>
          <RcButton variant="outline" size="sm" onClick={() => void openFresh()}>
            Spread them out
          </RcButton>
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
      <span className="sr-only" aria-live="polite">
        {doneCount > 0 ? `${plural(doneCount, 'revision')} done today` : ''}
      </span>
    </section>
  );
}
