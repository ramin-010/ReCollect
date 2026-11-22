'use client';

import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import { FOCUS_LIMIT, FOCUS_MAX_CHARS, type FocusItem, type TodayFocus } from '@/lib/learning/types';
import { RcButton, RcCheck, RcIconButton } from '@/components/rc-ui';
import { LabelLine, SectionFailed } from './parts';

function FocusRow({ item }: { item: FocusItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const pending = item._id.startsWith('tmp-');

  const commit = async () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== item.text) {
      const ok = await useLearningStore.getState().editFocus(item._id, draft);
      if (!ok) setDraft(item.text);
    } else {
      setDraft(item.text);
    }
  };

  return (
    <li className="rc-row rc-hoverable group -mx-2 flex items-center gap-3 px-2 py-[7px]">
      <div className="flex self-start pt-[2px]">
        <RcCheck
          checked={item.done}
          disabled={pending}
          onToggle={() => void useLearningStore.getState().toggleFocus(item._id)}
          label={item.done ? `Mark “${item.text}” not done` : `Mark “${item.text}” done`}
        />
      </div>
      {editing ? (
        <input
          autoFocus
          className="rc-input -my-1 flex-1"
          value={draft}
          maxLength={FOCUS_MAX_CHARS}
          aria-label="Edit focus line"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              setDraft(item.text);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          title="Edit"
          className={cn(
            'min-w-0 flex-1 text-left text-[var(--rc-fs-body)] leading-[1.4] break-words cursor-text',
            item.done ? 'text-[var(--rc-ink-3)] line-through decoration-[var(--rc-ink-3)]' : 'text-[var(--rc-ink-1)]',
          )}
        >
          {item.text}
        </button>
      )}
      {!editing && (
        <div className="rc-row-actions -my-1 flex items-center">
          <RcIconButton label={`Remove “${item.text}”`} size="sm" disabled={pending} onClick={() => void useLearningStore.getState().removeFocus(item._id)}>
            <X />
          </RcIconButton>
        </div>
      )}
    </li>
  );
}

/**
 * Today's focus lines as rows (LOOP_V2_SPEC §3), placed under the tasks in Home's "Today's focus"
 * (the owner, 11-21): up to three lines of the day's own, never tasks; the last row adds one.
 * Click a line to edit it; yesterday's unfinished lines can be carried over while there is room.
 */
export function FocusItems({ focus, onRetry }: { focus: TodayFocus | null; onRetry: () => void }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!focus) return <SectionFailed what="your focus lines" onRetry={onRetry} className="mt-2" />;

  const room = FOCUS_LIMIT - focus.items.length;
  const carry = room > 0 ? focus.carryOver : [];
  const left = FOCUS_MAX_CHARS - text.length;

  const add = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    const ok = await useLearningStore.getState().addFocus(value);
    if (!ok) setText(value);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <>
      <ul aria-label="Focus lines">
        {focus.items.map((item) => (
          <FocusRow key={item._id} item={item} />
        ))}
        {room > 0 && (
          <li className="rc-hoverable -mx-2 flex items-center gap-3 px-2">
            <Plus className="w-[18px] h-[18px] shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
            <input
              ref={inputRef}
              className="h-[34px] flex-1 min-w-0 bg-transparent border-0 text-[var(--rc-fs-body)] text-[var(--rc-ink-1)] placeholder:text-[var(--rc-ink-3)] focus-visible:!outline-none"
              placeholder="Add a focus"
              aria-label="Add a focus for today"
              title="A line for today only, not a task"
              value={text}
              maxLength={FOCUS_MAX_CHARS}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void add();
                }
              }}
            />
            {text.length > FOCUS_MAX_CHARS - 30 && <span className="rc-meta rc-num shrink-0">{left} left</span>}
            {text.trim() && (
              <RcButton size="sm" variant="quiet" onClick={() => void add()}>
                Add
              </RcButton>
            )}
          </li>
        )}
      </ul>
      {carry.length > 0 && (
        <ul className="mt-1" aria-label="Unfinished yesterday">
          {carry.map((c) => (
            <li key={c._id} className="flex items-center justify-between gap-3 py-1 pl-[30px]">
              <span className="min-w-0 break-words text-[14px] rc-ink-2">
                <span className="rc-ink-3">From yesterday:</span> {c.text}
              </span>
              <RcButton size="sm" variant="quiet" className="-mr-2 shrink-0" onClick={() => void useLearningStore.getState().carryOverFocus([c._id])}>
                Carry over
              </RcButton>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Focus on its own (no longer on Home; kept for any other screen). */
export function FocusLines({ focus, onRetry }: { focus: TodayFocus | null; onRetry: () => void }) {
  return (
    <section aria-labelledby="focus-h">
      <LabelLine id="focus-h" title="Focus" meta={focus ? `${focus.items.length} of ${FOCUS_LIMIT}` : undefined} />
      <FocusItems focus={focus} onRetry={onRetry} />
    </section>
  );
}
