'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Lightbulb, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { formatMinutes } from '@/lib/learning/sessionLog';
import { WEEK_CHANGED_EVENT, type Suggestion, type WeekData, type WeekSummary } from '@/lib/learning/types';
import { RcButton, RcIconButton } from '@/components/rc-ui';
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

const from = (s: Suggestion): string | null =>
  s.proposedBy === 'agent' ? `from ${s.agentName ?? 'your agent'}` : s.proposedBy === 'coach' ? 'from the coach' : s.proposedBy === 'buddy' ? 'from your buddy' : null;

/**
 * Suggested (LOOP_COMPLETE_SPEC 1.6, ECOSYSTEM_PLAN change 9): the one place for every proposal, from
 * the weekly review, the coach or an agent. Shown only when something waits. When the weekly review
 * is due it opens as a card ("Plan next week" on Sunday): last week in a line, the proposals, Add all
 * or Skip. Otherwise it is one quiet line that opens. Nothing changes until the user accepts.
 */
export function Suggested() {
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
  const expanded = isReview || open;
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

  if (!expanded) {
    const names = [...new Set(items.map(from).filter(Boolean))];
    return (
      <button type="button" onClick={() => setOpen(true)} className="rc-row rc-hoverable mt-0.5 flex w-full items-center gap-2 rounded-[6px] px-2 py-[7px] text-left" aria-expanded={false}>
        <Lightbulb className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
        <span className="text-[14px] font-medium text-[var(--rc-ink-1)]">
          {items.length} {items.length === 1 ? 'suggestion' : 'suggestions'}
        </span>
        {names.length > 0 && <span className="rc-meta">{names.join(', ')}</span>}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
      </button>
    );
  }

  return (
    <section aria-labelledby="suggested-h" className="rc-card mt-6 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="min-w-0">
          <h2 id="suggested-h" className="rc-h2">
            {title}
          </h2>
          {last && <p className="rc-meta rc-num mt-0.5">Last week: {last}</p>}
        </div>
        {!isReview && (
          <RcButton size="sm" variant="quiet" onClick={() => setOpen(false)}>
            Hide
          </RcButton>
        )}
      </div>
      <ul className="mt-2">
        {items.map((s) => (
          <li key={s._id} className="rc-row flex items-start gap-3 border-t border-[var(--rc-line)] px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[var(--rc-fs-body)] leading-[1.4] text-[var(--rc-ink-1)] break-words">{s.text}</p>
              {(s.reason || from(s)) && <p className="rc-meta mt-0.5 break-words">{[s.reason, from(s)].filter(Boolean).join(' · ')}</p>}
            </div>
            <div className="-my-0.5 flex shrink-0 items-center gap-0.5">
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
      {group.length > 1 && (
        <div className={cn('flex items-center justify-end gap-2 border-t border-[var(--rc-line)] px-4 py-2.5')}>
          <RcButton size="sm" variant="quiet" disabled={!!busy} onClick={() => void decideAll(false)}>
            {isReview ? 'Skip this week' : 'Dismiss all'}
          </RcButton>
          <RcButton size="sm" variant="main" busy={busy === 'all'} disabled={!!busy} onClick={() => void decideAll(true)}>
            Add all
          </RcButton>
        </div>
      )}
    </section>
  );
}
