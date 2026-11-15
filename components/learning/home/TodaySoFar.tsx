'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Hammer, Pencil, Puzzle, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { RcIconButton, RcSheet } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { formatMinutes, SESSIONS_CHANGED_EVENT } from '@/lib/learning/sessionLog';
import type { DayString, SessionKind, SessionList, WorkSession } from '@/lib/learning/types';

const KIND_ICON: Record<SessionKind, typeof BookOpen> = { study: BookOpen, practice: Puzzle, build: Hammer, review: RotateCcw };
const OUTCOME: Record<string, string> = { alone: 'solved alone', hints: 'with hints', after_answer: 'after the answer' };

/** "50 min study · 2 h build" from minutes per kind. */
function kindsText(minutes: Record<SessionKind, number>): string {
  return (Object.entries(minutes) as [SessionKind, number][])
    .filter(([, m]) => m > 0)
    .map(([kind, m]) => `${formatMinutes(m)} ${kind}`)
    .join(' · ');
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "Today", "Yesterday", else "Thu 12 Nov". */
function dayLabel(day: DayString, today: DayString): string {
  if (day === today) return 'Today';
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (day === y.toISOString().slice(0, 10)) return 'Yesterday';
  return WEEKDAY.format(new Date(`${day}T00:00:00Z`)).replace(',', '');
}

const writer = (s: WorkSession) => (s.source === 'user' ? 'you' : s.source === 'hook' ? 'Claude Code' : s.agentName ?? 'an agent');

/**
 * The record on Home (SYNC_SPINE_SPEC 1.2): one quiet line under Today ("Today so far: 50 min study
 * · 2 h build", or the last session), opening the last 14 days. Hidden when nothing was logged.
 */
export function TodaySoFar({ today }: { today: DayString }) {
  const [list, setList] = useState<SessionList | null>(null);
  const [open, setOpen] = useState(false);

  // Loads now, again when the window gets focus, and when a session is logged or changed.
  useEffect(() => {
    let alive = true;
    const reload = () => {
      learningApi.listSessions(14).then(
        (l) => alive && setList(l),
        () => alive && setList(null),
      );
    };
    reload();
    window.addEventListener(SESSIONS_CHANGED_EVENT, reload);
    window.addEventListener('focus', reload);
    return () => {
      alive = false;
      window.removeEventListener(SESSIONS_CHANGED_EVENT, reload);
      window.removeEventListener('focus', reload);
    };
  }, []);
  const changed = () => window.dispatchEvent(new Event(SESSIONS_CHANGED_EVENT));

  if (!list || list.sessions.length === 0) return null;
  const todays = list.days.find((d) => d.day === today);
  const last = list.sessions[0]!;
  const line = todays
    ? `Today so far: ${kindsText(todays.minutes) || `${todays.count} ${todays.count === 1 ? 'session' : 'sessions'}`}`
    : `Last session: ${dayLabel(last.day, today)}${last.minutes ? ` · ${formatMinutes(last.minutes)} ${last.kind}` : ''}`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rc-row rc-hoverable mt-2 flex w-full items-center gap-2 rounded-[6px] px-2 py-[7px] text-left">
        <Timer className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
        <span className="text-[14px] font-medium text-[var(--rc-ink-1)]">{line}</span>
        <span className="rc-meta">last 14 days</span>
      </button>
      <SessionsSheet open={open} onOpenChange={setOpen} list={list} today={today} onChanged={changed} />
    </>
  );
}

function SessionsSheet({ open, onOpenChange, list, today, onChanged }: { open: boolean; onOpenChange: (o: boolean) => void; list: SessionList; today: DayString; onChanged: () => void }) {
  const byDay = useMemo(() => list.days.map((d) => ({ ...d, sessions: list.sessions.filter((s) => s.day === d.day) })), [list]);
  return (
    <RcSheet open={open} onOpenChange={onOpenChange} title="Sessions" description="The last 14 days, as your agents and hooks logged them. Fix or remove any entry.">
      <div className="flex flex-col gap-5">
        {byDay.map((d) => {
          const total = Object.values(d.minutes).reduce((a, b) => a + b, 0);
          return (
            <section key={d.day} aria-label={dayLabel(d.day, today)}>
              <h3 className="mb-1 flex items-baseline justify-between gap-3 text-[13px] font-semibold text-[var(--rc-ink-2)]">
                {dayLabel(d.day, today)}
                {total > 0 && <span className="rc-meta font-normal tabular-nums">{formatMinutes(total)}</span>}
              </h3>
              <ul className="flex flex-col">
                {d.sessions.map((s) => (
                  <SessionRow key={s._id} s={s} onChanged={onChanged} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </RcSheet>
  );
}

function SessionRow({ s, onChanged }: { s: WorkSession; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(s.title);
  const [minutes, setMinutes] = useState(s.minutes?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const Icon = KIND_ICON[s.kind];
  const meta = [
    s.minutes ? formatMinutes(s.minutes) : null,
    s.kind,
    s.topic?.title ?? s.subject?.name ?? s.project?.name ?? null,
    s.score ? `quiz ${s.score.done}/${s.score.total}` : null,
    s.outcome ? OUTCOME[s.outcome] : null,
    `by ${writer(s)}`,
  ].filter(Boolean);

  const save = async () => {
    const m = minutes.trim() === '' ? null : Number(minutes);
    if (!title.trim() || (m !== null && (!Number.isInteger(m) || m < 0 || m > 600))) {
      toast.error('Give it a title, and minutes from 0 to 600.');
      return;
    }
    setBusy(true);
    try {
      await learningApi.updateSession(s._id, { title: title.trim(), minutes: m });
      setEditing(false);
      onChanged();
    } catch {
      toast.error('That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Remove waits for the toast: the row hides at once, and Undo within the toast keeps the session.
  const [hidden, setHidden] = useState(false);
  const remove = () => {
    setHidden(true);
    let undone = false;
    const commit = async () => {
      if (undone) return;
      try {
        await learningApi.deleteSession(s._id);
        onChanged();
      } catch {
        setHidden(false);
        toast.error('That session was not removed. Try again.');
      }
    };
    toast('Session removed', {
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true;
          setHidden(false);
        },
      },
      onAutoClose: () => void commit(),
      onDismiss: () => void commit(),
    });
  };

  if (hidden) return null;

  if (editing) {
    return (
      <li className="-mx-2 flex items-center gap-2 px-2 py-[5px]">
        <Icon className="h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
        <input autoFocus className="rc-input min-w-0 flex-1" value={title} maxLength={200} aria-label="Session title" onChange={(e) => setTitle(e.target.value)} />
        <input className="rc-input w-[72px] tabular-nums" value={minutes} inputMode="numeric" aria-label="Minutes" placeholder="min" onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ''))} />
        <RcIconButton label="Save" size="sm" disabled={busy} onClick={() => void save()}>
          <Check />
        </RcIconButton>
        <RcIconButton label="Cancel" size="sm" onClick={() => setEditing(false)}>
          <X />
        </RcIconButton>
      </li>
    );
  }

  return (
    <li className="rc-row rc-hoverable group -mx-2 flex items-start gap-3 px-2 py-[7px]">
      <Icon className="mt-[3px] h-4 w-4 shrink-0 text-[var(--rc-icon)]" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="break-words text-[var(--rc-fs-body)] leading-[1.4] text-[var(--rc-ink-1)]">{s.title}</p>
        <p className="rc-meta mt-0.5 break-words">{meta.join(' · ')}</p>
      </div>
      <div className="rc-row-actions -my-1 flex items-center">
        <RcIconButton label={`Edit “${s.title}”`} size="sm" onClick={() => setEditing(true)}>
          <Pencil />
        </RcIconButton>
        <RcIconButton label={`Remove “${s.title}”`} size="sm" disabled={busy} onClick={() => void remove()}>
          <Trash2 />
        </RcIconButton>
      </div>
    </li>
  );
}

