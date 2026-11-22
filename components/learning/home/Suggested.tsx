'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { formatMinutes } from '@/lib/learning/sessionLog';
import { WEEK_CHANGED_EVENT, type Suggestion, type WeekData, type WeekSummary } from '@/lib/learning/types';
import { RcButton, RcIconButton } from '@/components/rc-ui';
import { LabelLine } from './parts';
import { weekChanged } from './ThisWeek';

const ACCEPT_LABEL: Record<Suggestion['kind'], string> = {
  week_target: 'Add to week',
  focus_line: 'Add to today',
  profile_edit: 'Update profile',
  action: 'Do it',
  task: 'Add to tasks',
  note: 'Save to inbox',
  decision: 'Log decision',
  routine: 'Yes, by itself',
};

const ACCEPTED: Record<Suggestion['kind'], string> = {
  week_target: 'Added to the week',
  focus_line: 'Added to today’s focus',
  profile_edit: 'Profile updated',
  action: 'Done',
  task: 'Added to your tasks',
  note: 'Saved to your inbox',
  decision: 'Logged in your decisions',
  routine: 'It does this by itself now',
};

/** "3 of 4 targets · 6 h logged · 2 topics finished", leaving out what is zero; null for an empty week. */
function weekLine(w: WeekSummary): string | null {
  const minutes = Object.values(w.minutes).reduce((a, b) => a + b, 0);
  const parts = [
    w.targets.total ? `${w.targets.done} of ${w.targets.total} targets` : null,
    minutes ? `${formatMinutes(minutes)} logged` : null,
    w.topicsDone ? `${w.topicsDone} ${w.topicsDone === 1 ? 'topic' : 'topics'} finished` : null,
    w.revisionsDone ? `${w.revisionsDone} ${w.revisionsDone === 1 ? 'revision' : 'revisions'}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** How many proposals stand on the page before "Show all". */
const PREVIEW = 2;

const from = (s: Suggestion): string | null =>
  s.proposedBy === 'agent' ? `from ${s.agentName ?? 'your agent'}` : s.proposedBy === 'coach' ? 'from the coach' : s.proposedBy === 'buddy' ? 'from your buddy' : null;

/**
 * Suggested (LOOP_COMPLETE_SPEC 1.6, ECOSYSTEM_PLAN change 9): the one place for every proposal, from
 * the weekly review, the coach or an agent. Shown only when something waits, in the week's part of
 * Home: the first two on the page, the rest behind "Show all" (the owner, 11-21: the whole list
 * stood between today's reviews and today's tasks). When the weekly review is due the heading says
 * so ("Plan next week" on Sunday) with last week in a line. Nothing changes until the user accepts.
 */
export function Suggested({ embedded = false }: { embedded?: boolean } = {}) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [week, setWeek] = useState<WeekData | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const reload = () => {
      Promise.all([learningApi.listSuggestions(), learningApi.getWeek()]).then(
        ([s, w]) => {
          if (!alive) return;
          setItems(s);
          setWeek(w);
        },
        () => alive && setItems([]),
      );
    };
    reload();
    window.addEventListener(WEEK_CHANGED_EVENT, reload);
    window.addEventListener('focus', reload);
    return () => {
      alive = false;
      window.removeEventListener(WEEK_CHANGED_EVENT, reload);
      window.removeEventListener('focus', reload);
    };
  }, []);

  if (!items.length) return null;

  // The review's card stays open while any of its proposals waits (adding one doesn't fold the rest away).
  const reviewBatch = week ? `week:${week.review.weekStart}` : null;
  const isReview = !!reviewBatch && items.some((s) => s.batch === reviewBatch);
  const nextWeek = !!week && week.review.weekStart > week.weekStart;
  const last = isReview && week ? weekLine(week.lastWeek) : null;

  const settle = (ids: string[]) => setItems((cur) => cur.filter((s) => !ids.includes(s._id)));
  const afterAccept = (kinds: Suggestion['kind'][]) => {
    weekChanged();
    if (kinds.includes('focus_line')) void useLearningStore.getState().refresh();
  };

  const accept = async (s: Suggestion) => {
    setBusy(s._id);
    try {
      const done = await learningApi.acceptSuggestion(s._id);
      settle([s._id]);
      toast.success(done.result || ACCEPTED[s.kind]);
      afterAccept([s.kind]);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'That did not work. Try again.');
      weekChanged();
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async (s: Suggestion) => {
    settle([s._id]);
    try {
      await learningApi.dismissSuggestion(s._id);
    } catch {
      weekChanged();
    }
  };

  // The footer acts on the review's proposals when the review is open, else on everything shown.
  // An action (level 3) is done one tap at a time: never in "Add all" or "Dismiss all".
  const group = (isReview ? items.filter((s) => s.batch === reviewBatch) : items).filter((s) => s.kind !== 'action');
  const decideAll = async (acceptAll: boolean) => {
    const ids = group.map((s) => s._id);
    setBusy('all');
    try {
      const r = await learningApi.decideSuggestions(acceptAll ? { accept: ids } : { dismiss: ids });
      settle([...r.accepted, ...r.dismissed]);
      if (r.failed.length) toast.error(`${r.failed.length} could not be added: ${r.failed[0]!.message}`);
      else if (acceptAll) toast.success(`Added ${r.accepted.length}`);
      afterAccept(group.filter((s) => r.accepted.includes(s._id)).map((s) => s.kind));
    } catch {
      toast.error('That did not work. Try again.');
      weekChanged();
    } finally {
      setBusy(null);
    }
  };

  const title = isReview ? (nextWeek ? 'Plan next week' : 'Plan this week') : 'Suggested';
  const shown = open ? items : items.slice(0, PREVIEW);
  const hidden = items.length - shown.length;

  // Inside This week (the owner, 11-21: "This week and Plan this week merged"): the proposals are
  // rows of the same list, each with a bulb where a target has its check.
  const Wrap = embedded ? 'div' : 'section';
  return (
    <Wrap {...(embedded ? { 'aria-label': title } : { 'aria-labelledby': 'suggested-h' })}>
      {!embedded && <LabelLine id="suggested-h" title={title} meta={`${items.length} waiting`} />}
      {last && !embedded && <p className="rc-meta rc-num mt-2">Last week: {last}</p>}
      <ul>
        {shown.map((s) => (
          <li key={s._id} className={embedded ? 'rc-row flex items-start gap-3 py-[7px]' : 'rc-row flex items-start gap-3 py-2'}>
            {embedded && <Lightbulb className="mt-[2px] h-[18px] w-[18px] shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-label="Suggested" />}
            <div className="min-w-0 flex-1">
              <p className={cn('text-[var(--rc-fs-body)] leading-[1.4] break-words', 'text-[var(--rc-ink-1)]')}>{s.text}</p>
              {(s.reason || from(s)) && <p className="rc-meta mt-0.5 break-words">{[s.reason, from(s)].filter(Boolean).join(' · ')}</p>}
            </div>
            <div className="-my-0.5 -mr-1.5 flex shrink-0 items-center gap-0.5">
              <RcButton size="sm" variant="outline" busy={busy === s._id} disabled={!!busy} onClick={() => void accept(s)}>
                {ACCEPT_LABEL[s.kind]}
              </RcButton>
              <RcIconButton label={`Dismiss “${s.text}”`} size="sm" disabled={!!busy} onClick={() => void dismiss(s)}>
                <X />
              </RcIconButton>
            </div>
          </li>
        ))}
      </ul>
      {(items.length > PREVIEW || group.length > 1) && (
        <div className={cn('mt-1.5 flex flex-wrap items-center justify-between gap-2', embedded && 'pl-[30px]')}>
          {items.length > PREVIEW ? (
            <RcButton size="sm" variant="quiet" className="-ml-2" aria-expanded={open} onClick={() => setOpen((x) => !x)}>
              {open ? 'Show fewer' : `Show all ${items.length}`}
            </RcButton>
          ) : (
            <span />
          )}
          {(open || hidden === 0) && group.length > 1 && (
            <div className="-mr-1.5 flex items-center gap-2">
              <RcButton size="sm" variant="quiet" disabled={!!busy} onClick={() => void decideAll(false)}>
                {isReview ? 'Skip this week' : 'Dismiss all'}
              </RcButton>
              <RcButton size="sm" variant="outline" busy={busy === 'all'} disabled={!!busy} onClick={() => void decideAll(true)}>
                Add all
              </RcButton>
            </div>
          )}
        </div>
      )}
      {last && embedded && <p className="rc-meta rc-num mt-1 pl-[30px]">Last week: {last}</p>}
    </Wrap>
  );
}
