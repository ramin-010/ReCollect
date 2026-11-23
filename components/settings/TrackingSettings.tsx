'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcSegmented, RcSkel } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { formatMinutes, SESSIONS_CHANGED_EVENT } from '@/lib/learning/sessionLog';
import type { DayString, ProjectKind, ProjectRow } from '@/lib/learning/types';
import { relativeDay } from '@/components/learning/home/format';
import './settings.css';

const KINDS: Array<{ value: ProjectKind; label: string }> = [
  { value: 'personal', label: 'Personal' },
  { value: 'study', label: 'Study' },
  { value: 'work', label: 'Work' },
];

type Counts = 'personal' | 'all';
const COUNTS: Array<{ value: Counts; label: string }> = [
  { value: 'personal', label: 'Personal only' },
  { value: 'all', label: 'Personal and work' },
];

/** The browser's today (the rows' "last worked" only; every number comes from the server). */
const localToday = (): DayString => new Intl.DateTimeFormat('en-CA').format(new Date()) as DayString;

/** 'today', 'yesterday', 'on Thu 19 Nov'. */
function lastWorked(day: DayString, today: DayString): string {
  const rel = relativeDay(day, today);
  return rel === 'Today' || rel === 'Yesterday' ? rel.toLowerCase() : `on ${rel}`;
}

/** Home's year, the sidebar's week and Where you stand read again (they listen for this). */
const recount = () => window.dispatchEvent(new Event(SESSIONS_CHANGED_EVENT));

/**
 * Settings › Tracking (PERSONAL_OFFICE_PLAN, 11-23): what counts as progress, and what each folder is. Claude Code's
 * hooks may run in personal and work folders alike; work is kept for time and the work log, and counts as progress
 * only when the person says so. The folder's kind is kept by the server: every PC and every chat follows it.
 */
export function TrackingSettings() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [settings, list] = await Promise.all([learningApi.getSettings(), learningApi.listProjects()]);
      setCounts(settings.progressIncludesWork ? 'all' : 'personal');
      setProjects(list);
      setState('ready');
    } catch {
      setState('failed');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pickCounts = async (next: Counts) => {
    if (next === counts) return;
    const was = counts;
    setCounts(next);
    setSaving('counts');
    try {
      await learningApi.updateSettings({ progressIncludesWork: next === 'all' });
      recount();
      toast.success(next === 'all' ? 'Work counts as progress now' : 'Only personal work counts as progress now');
    } catch {
      setCounts(was);
      toast.error('That didn’t save. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const pickKind = async (p: ProjectRow, kind: ProjectKind) => {
    if ((p.kind ?? 'personal') === kind) return;
    const was = p.kind ?? 'personal';
    setProjects((list) => list?.map((x) => (x._id === p._id ? { ...x, kind } : x)) ?? list);
    setSaving(p._id);
    try {
      const fresh = await learningApi.setProjectKind(p._id, kind);
      setProjects((list) => list?.map((x) => (x._id === p._id ? fresh : x)) ?? list);
      recount();
      toast.success(`${p.name} is ${kind === 'work' ? 'work' : kind === 'study' ? 'a study folder' : 'personal'} now, its past too`);
    } catch {
      setProjects((list) => list?.map((x) => (x._id === p._id ? { ...x, kind: was } : x)) ?? list);
      toast.error('That didn’t save. Try again.');
    } finally {
      setSaving(null);
    }
  };

  if (state === 'loading') {
    return (
      <div className={cn(rcScope, 'set-section')} aria-busy aria-label="Loading tracking">
        <RcSkel className="h-5 w-48" />
        <RcSkel className="mt-3 h-8 w-64" />
        <RcSkel className="mt-8 h-5 w-40" />
        <RcSkel className="mt-3 h-11 w-full" />
        <RcSkel className="mt-1 h-11 w-full" />
      </div>
    );
  }
  if (state === 'failed' || !projects || !counts) {
    return (
      <div className={cn(rcScope, 'set-section')}>
        <p className="rc-body">Tracking didn’t load. Check your connection and try again.</p>
        <RcButton className="mt-3" variant="outline" onClick={() => void load()}>
          Try again
        </RcButton>
      </div>
    );
  }

  const today = localToday();
  const shown = [...projects].sort((a, b) => Number(a.isArchived) - Number(b.isArchived));
  return (
    <div className={cn(rcScope, 'set-section')}>
      <section aria-labelledby="track-counts">
        <h2 id="track-counts" className="rc-field-label">
          What counts as progress
        </h2>
        <p className="rc-field-help">
          {counts === 'all'
            ? 'Personal and work: a day at work is an active day, its hours count, and your buddy treats it as progress.'
            : 'Your own projects, study and practice. Work is kept for your work log and the Work view of Where you stand; it doesn’t make a day active or count as progress.'}
        </p>
        <RcSegmented className="mt-3" label="What counts as progress" options={COUNTS} value={counts} onChange={(v) => void pickCounts(v)} />
      </section>

      <section aria-labelledby="track-folders" className="mt-10">
        <h2 id="track-folders" className="rc-field-label">
          Folders
        </h2>
        <p className="rc-field-help">
          Where Claude Code and your chats worked. Personal: your own projects. Study: a folder you learn in. Work: your job, tracked for time and your work log. A change moves the folder’s past with it.
        </p>
        {shown.length === 0 ? (
          <p className="rc-meta mt-4">No folders yet. A folder shows here once Claude Code works in it with Recollect’s hooks, or a chat logs a session there.</p>
        ) : (
          <ul className="set-list mt-3" aria-label="Folders">
            {shown.map((p) => {
              const meta = [
                p.lastSession ? `last worked ${lastWorked(p.lastSession.day, today)}` : 'nothing logged yet',
                p.minutes28 ? `${formatMinutes(p.minutes28)} in 4 weeks` : null,
                p.isArchived ? 'archived' : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={p._id} className="set-row max-sm:flex-col max-sm:items-start max-sm:py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-[var(--rc-ink-1)]">{p.name}</span>
                    <span className="rc-meta rc-num block text-[13px]">{meta}</span>
                  </span>
                  <RcSegmented
                    className={cn('shrink-0', saving === p._id && 'pointer-events-none opacity-70')}
                    label={`What ${p.name} is`}
                    options={KINDS}
                    value={p.kind ?? 'personal'}
                    onChange={(k) => void pickKind(p, k)}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <p className="rc-meta mt-4 text-[13px]">A new folder starts as your PC’s hook settings call it; what you pick here wins after that, on every PC and in every chat.</p>
      </section>
    </div>
  );
}
