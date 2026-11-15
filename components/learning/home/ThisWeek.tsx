'use client';

import { useEffect, useRef, useState } from 'react';
import { ListPlus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { WEEK_CHANGED_EVENT, WEEK_TARGET_MAX_CHARS, WEEK_TARGETS_MAX, type WeekData, type WeekTarget } from '@/lib/learning/types';
import { formatMinutes } from '@/lib/learning/sessionLog';
import { RcButton, RcCheck, RcIconButton, RcSkel } from '@/components/rc-ui';
import { SectionFailed, SectionHead } from './parts';

export const weekChanged = () => window.dispatchEvent(new Event(WEEK_CHANGED_EVENT));

/** What a target points at or counts, in one line ("3 of 10 practice · DSA", "Topic: Message queues"). */
function targetMeta(t: WeekTarget): string | null {
  if (t.progress) {
    const what = t.measure === 'minutes' ? `${formatMinutes(t.progress.done)} of ${formatMinutes(t.progress.total)}` : `${t.progress.done} of ${t.progress.total} ${t.measure === 'topics' ? 'topics' : 'practice'}`;
    return [what, t.subject?.name ?? t.project?.name].filter(Boolean).join(' · ');
  }
  // What it points at: the kind, and its title unless the text already says it.
  const link = t.topic ? ['Topic', t.topic.title] : t.milestone ? ['Milestone', t.milestone.title] : t.task ? ['Task', t.task.title] : null;
  if (!link) return null;
  const [kind, title] = link as [string, string];
  return t.text.toLowerCase().includes(title.toLowerCase()) ? kind : `${kind}: ${title}`;
}

function TargetRow({ t, onChanged }: { t: WeekTarget; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.text);
  const [busy, setBusy] = useState(false);
  // Done because its topic, milestone or task is done (or its count is reached): not a tick to undo.
  const doneByLink = t.done && t.status !== 'done';
  const meta = targetMeta(t);

  const patch = async (body: { text?: string; status?: WeekTarget['status'] }, failMessage: string) => {
    setBusy(true);
    try {
      await learningApi.updateWeekTarget(t._id, body);
      onChanged();
    } catch {
      toast.error(failMessage);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setEditing(false);
    const value = draft.trim();
    if (value && value !== t.text) await patch({ text: value }, 'The target was not changed. Try again.');
    else setDraft(t.text);
  };

  const toToday = async () => {
    const ok = await useLearningStore.getState().addFocus(t.text);
    if (ok) toast.success('Added to today’s focus');
  };

  return (
    <li className="rc-row rc-hoverable group -mx-2 flex items-start gap-3 px-2 py-[7px]">
      <div className="pt-[2px]">
        <RcCheck
          checked={t.done}
          disabled={busy || doneByLink}
          onToggle={() => void patch({ status: t.status === 'done' ? 'open' : 'done' }, 'That did not save. Try again.')}
          label={doneByLink ? `“${t.text}” is done: what it points at is finished` : t.done ? `Mark “${t.text}” not done` : `Mark “${t.text}” done`}
        />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            className="rc-input -my-1 w-full"
            value={draft}
            maxLength={WEEK_TARGET_MAX_CHARS}
            aria-label="Edit the target"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void commit();
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setDraft(t.text);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(true)}
            title="Edit"
            className={cn(
              'block w-full text-left text-[var(--rc-fs-body)] leading-[1.4] break-words cursor-text',
              t.done ? 'text-[var(--rc-ink-3)] line-through decoration-[var(--rc-ink-3)]' : 'text-[var(--rc-ink-1)]',
            )}
          >
            {t.text}
          </button>
        )}
        {meta && !editing && <p className="rc-meta rc-num mt-0.5 break-words">{meta}</p>}
      </div>
      {!editing && (
        <div className="rc-row-actions -my-1 flex items-center gap-0.5">
          {!t.done && (
            <RcIconButton label={`Add “${t.text}” to today’s focus`} size="sm" disabled={busy} onClick={() => void toToday()}>
              <ListPlus />
            </RcIconButton>
          )}
          <RcIconButton label={`Drop “${t.text}” from this week`} size="sm" disabled={busy} onClick={() => void patch({ status: 'dropped' }, 'The target was not dropped. Try again.')}>
            <X />
          </RcIconButton>
        </div>
      )}
    </li>
  );
}

/**
 * This week (LOOP_COMPLETE_SPEC 1.6): up to five targets for Monday to Sunday, next to Focus. A
 * target ticks itself when what it points at is done or its count is reached; one action pulls it
 * into today's focus. Agents add targets in a chat; the Sunday review proposes them (Suggested).
 */
export function ThisWeek() {
  const [week, setWeek] = useState<WeekData | null | 'failed'>(null);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Loads now, again when the window gets focus, and whenever the week or a suggestion changes.
  useEffect(() => {
    let alive = true;
    const reload = () => {
      learningApi.getWeek().then(
        (w) => alive && setWeek(w),
        () => alive && setWeek('failed'),
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

  if (week === null) {
    return (
      <section aria-label="This week" aria-busy>
        <RcSkel className="h-5 w-24" />
        <RcSkel className="mt-4 h-4 w-3/5" />
        <RcSkel className="mt-3 h-4 w-2/5" />
      </section>
    );
  }
  if (week === 'failed') {
    return (
      <section aria-labelledby="week-h">
        <SectionHead id="week-h" title="This week" />
        <SectionFailed what="this week’s targets" onRetry={weekChanged} />
      </section>
    );
  }

  const done = week.targets.filter((t) => t.done).length;
  const room = WEEK_TARGETS_MAX - week.targets.length;

  const add = async () => {
    const value = text.trim();
    if (!value || adding) return;
    setAdding(true);
    setText('');
    try {
      await learningApi.addWeekTarget({ text: value });
      weekChanged();
    } catch {
      setText(value);
      toast.error('The target was not added. Try again.');
    } finally {
      setAdding(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <section aria-labelledby="week-h">
      <SectionHead id="week-h" title="This week">
        {week.targets.length > 0 && (
          <span className="rc-meta rc-num pr-1">
            {done} of {week.targets.length} done
          </span>
        )}
      </SectionHead>
      <ul>
        {week.targets.map((t) => (
          <TargetRow key={t._id} t={t} onChanged={weekChanged} />
        ))}
        {room > 0 && (
          <li className="rc-hoverable -mx-2 flex items-center gap-3 px-2">
            <Plus className="h-[18px] w-[18px] shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
            <input
              ref={inputRef}
              className="h-[34px] min-w-0 flex-1 border-0 bg-transparent text-[var(--rc-fs-body)] text-[var(--rc-ink-1)] placeholder:text-[var(--rc-ink-3)] focus-visible:!outline-none"
              placeholder={week.targets.length === 0 ? 'Add a target for this week' : 'Add a target'}
              aria-label="Add a target for this week"
              value={text}
              maxLength={WEEK_TARGET_MAX_CHARS}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void add();
                }
              }}
            />
            {text.trim() && (
              <RcButton size="sm" variant="quiet" busy={adding} onClick={() => void add()}>
                Add
              </RcButton>
            )}
          </li>
        )}
      </ul>
      {week.targets.length === 0 && <p className="rc-meta mt-2">Up to five. Targets your study chat ties to a topic or a milestone tick themselves.</p>}
    </section>
  );
}
