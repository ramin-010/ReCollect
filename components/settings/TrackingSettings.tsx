'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcMenu, RcSegmented, RcSkel, RcSwitch } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { formatMinutes, SESSIONS_CHANGED_EVENT } from '@/lib/learning/sessionLog';
import type { DayString, FolderTracking, NewFolders, ProjectKind, ProjectRow } from '@/lib/learning/types';
import { relativeDay } from '@/components/learning/home/format';
import './settings.css';

// STUDY_FLOW_PLAN §4.5: Personal is Learning and Building; a folder is one of Building, Learning, Work (the stored
// values stay personal, study, work).
const KINDS: Array<{ value: ProjectKind; label: string }> = [
  { value: 'personal', label: 'Building' },
  { value: 'study', label: 'Learning' },
  { value: 'work', label: 'Work' },
];
/** A folder's kind in a sentence: "is for building", "is for learning", "is work". */
const KIND_SAID: Record<ProjectKind, string> = { personal: 'for building', study: 'for learning', work: 'work' };

/** EASY_SETUP_PLAN: what is logged in a folder (its kind's default unless it has its own). */
const TRACKING: Array<{ value: FolderTracking; label: string; help: string }> = [
  { value: 'full', label: 'Everything', help: 'Time, your words for Kaaga, the work log' },
  { value: 'light', label: 'Time only', help: 'How long you worked; nothing you type is read' },
  { value: 'off', label: 'Nothing', help: 'Kaaga leaves this folder alone' },
];
const trackingLabel = (t: FolderTracking | undefined) => TRACKING.find((x) => x.value === t)?.label ?? 'Everything';

/** EASY_SETUP_PLAN §3.5: what a folder Kaaga has never seen is. */
const NEW_FOLDERS: Array<{ value: NewFolders; label: string }> = [
  { value: 'ask', label: 'Ask' },
  { value: 'personal', label: 'Building' },
  { value: 'study', label: 'Learning' },
  { value: 'work', label: 'Work' },
  { value: 'off', label: 'Ignore' },
];

/** STUDY_FLOW_PLAN §4.5: what counts as progress, three ticks. Learning always counts; Building and Work as they pick. */
type Counts = { building: boolean; work: boolean };
const COUNT_ROWS: Array<{ key: 'learning' | keyof Counts; label: string; help: string }> = [
  { key: 'learning', label: 'Learning', help: 'Study, practice, reviews, topics and goals. Always counts.' },
  { key: 'building', label: 'Building', help: 'Time on your own projects.' },
  { key: 'work', label: 'Work', help: 'Time in folders marked Work.' },
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
  const [newFolders, setNewFolders] = useState<NewFolders>('ask');
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [settings, list] = await Promise.all([learningApi.getSettings(), learningApi.listProjects()]);
      setCounts({ building: settings.progressIncludesBuilding !== false, work: settings.progressIncludesWork === true });
      setNewFolders(settings.newFolders ?? 'ask');
      setProjects(list);
      setState('ready');
    } catch {
      setState('failed');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pickCounts = async (key: keyof Counts, on: boolean) => {
    if (!counts || counts[key] === on) return;
    const was = counts;
    setCounts({ ...counts, [key]: on });
    setSaving('counts');
    try {
      await learningApi.updateSettings(key === 'work' ? { progressIncludesWork: on } : { progressIncludesBuilding: on });
      recount();
      toast.success(`${key === 'work' ? 'Work' : 'Building'} ${on ? 'counts as progress now' : 'no longer counts as progress'}`);
    } catch {
      setCounts(was);
      toast.error('That didn’t save. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const pickNewFolders = async (next: NewFolders) => {
    if (next === newFolders) return;
    const was = newFolders;
    setNewFolders(next);
    setSaving('new');
    try {
      await learningApi.updateSettings({ newFolders: next });
      toast.success(next === 'ask' ? 'A new folder asks you once what it is' : next === 'off' ? 'New folders are ignored until you pick them here' : `New folders start as ${KIND_SAID[next]}`);
    } catch {
      setNewFolders(was);
      toast.error('That didn’t save. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const pickTracking = async (p: ProjectRow, tracking: FolderTracking) => {
    const was = { tracking: p.tracking, trackingSet: p.trackingSet };
    // Its kind's own default again is no choice of its own (a later change of kind moves it with it).
    const own = tracking === ((p.kind ?? 'personal') === 'work' ? 'light' : 'full') ? null : tracking;
    setProjects((list) => list?.map((x) => (x._id === p._id ? { ...x, tracking, trackingSet: own !== null } : x)) ?? list);
    setSaving(p._id);
    try {
      const fresh = await learningApi.setProjectTracking(p._id, own);
      setProjects((list) => list?.map((x) => (x._id === p._id ? fresh : x)) ?? list);
      toast.success(tracking === 'off' ? `${p.name}: nothing is logged now` : tracking === 'light' ? `${p.name}: only the time is logged now` : `${p.name}: everything is logged now`);
    } catch {
      setProjects((list) => list?.map((x) => (x._id === p._id ? { ...x, ...was } : x)) ?? list);
      toast.error('That didn’t save. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const pickKind = async (p: ProjectRow, kind: ProjectKind) => {
    if ((p.kind ?? 'personal') === kind && p.kindSetBy !== null) return;
    const was = p.kind ?? 'personal';
    setProjects((list) => list?.map((x) => (x._id === p._id ? { ...x, kind } : x)) ?? list);
    setSaving(p._id);
    try {
      const fresh = await learningApi.setProjectKind(p._id, kind);
      setProjects((list) => list?.map((x) => (x._id === p._id ? fresh : x)) ?? list);
      recount();
      toast.success(`${p.name} is ${KIND_SAID[kind]} now, its past too`);
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
          What makes a day active, fills Home’s year and week, and what Kaaga and the coach judge your progress on. What
          doesn’t count is still kept: its own view on Where you stand, and your work log.
        </p>
        <ul className={cn('set-list mt-3', saving === 'counts' && 'pointer-events-none opacity-70')} aria-label="What counts as progress">
          {COUNT_ROWS.map((r) => {
            const on = r.key === 'learning' ? true : counts[r.key];
            return (
              <li key={r.key} className="set-row track-row">
                <span className="min-w-0">
                  <span className="block text-[15px] text-[var(--rc-ink-1)]">{r.label}</span>
                  <span className="rc-meta block text-[13px]">{r.help}</span>
                </span>
                <RcSwitch
                  checked={on}
                  disabled={r.key === 'learning'}
                  label={r.key === 'learning' ? 'Learning always counts as progress' : `${r.label} counts as progress`}
                  onChange={(v) => r.key !== 'learning' && void pickCounts(r.key, v)}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="track-folders" className="mt-10">
        <h2 id="track-folders" className="rc-field-label">
          Folders
        </h2>
        <p className="rc-field-help">
          Where Claude Code and your chats worked. Building: your own projects. Learning: a folder you learn in. Work: your job, tracked for time and your work log. A change moves the folder’s past with it.
        </p>
        {shown.length === 0 ? (
          <p className="rc-meta mt-4">No folders yet. A folder shows here once Claude Code works in it with Kaaga’s hooks, or a chat logs a session there.</p>
        ) : (
          <ul className="set-list mt-3" aria-label="Folders">
            {shown.map((p) => {
              const undecided = p.kindSetBy === null;
              const meta = [
                undecided ? 'not set yet: its next chat asks' : null,
                p.lastSession ? `last worked ${lastWorked(p.lastSession.day, today)}` : 'nothing logged yet',
                p.minutes28 ? `${formatMinutes(p.minutes28)} in 4 weeks` : null,
                p.isArchived ? 'archived' : null,
              ]
                .filter(Boolean)
                .join(' · ');
              const tracking = p.tracking ?? ((p.kind ?? 'personal') === 'work' ? 'light' : 'full');
              return (
                <li key={p._id} className="set-row track-row">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] text-[var(--rc-ink-1)]">{p.name}</span>
                    <span className="rc-meta rc-num block text-[13px]">{meta}</span>
                  </span>
                  <span className={cn('flex shrink-0 items-center gap-2', saving === p._id && 'pointer-events-none opacity-70')}>
                    {p.tracking !== undefined && (
                      <RcMenu
                        label={`What is logged in ${p.name}`}
                        align="end"
                        actions={TRACKING.map((t) => ({
                          label: t.label,
                          icon: t.value === tracking ? <Check className="h-4 w-4" strokeWidth={2} aria-label="current" /> : <span className="inline-block w-4" aria-hidden />,
                          onSelect: () => void pickTracking(p, t.value),
                        }))}
                      >
                        <button type="button" className="track-logged" title={TRACKING.find((t) => t.value === tracking)?.help}>
                          {trackingLabel(tracking)}
                          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        </button>
                      </RcMenu>
                    )}
                    <RcSegmented label={`What ${p.name} is`} options={KINDS} value={p.kind ?? 'personal'} onChange={(k) => void pickKind(p, k)} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="rc-meta mt-4 text-[13px]">
          What is logged: everything (the time, your words for Kaaga, the work log), the time only, or nothing. What you pick here holds on every computer and in every chat; a chat can still say it is learning, building or work (/study, /build, /work).
        </p>
      </section>

      <section aria-labelledby="track-new" className="mt-10">
        <h2 id="track-new" className="rc-field-label">
          New folders
        </h2>
        <p className="rc-field-help">
          {newFolders === 'ask'
            ? 'The first chat in a folder Kaaga hasn’t seen asks you once what it is. Until you answer, only its time is kept, on your computer.'
            : newFolders === 'off'
              ? 'A folder Kaaga hasn’t seen is ignored until you pick what it is here.'
              : `A folder Kaaga hasn’t seen starts as ${KIND_SAID[newFolders]}; change it here any time.`}
        </p>
        <RcSegmented className={cn('mt-3', saving === 'new' && 'pointer-events-none opacity-70')} label="New folders" options={NEW_FOLDERS} value={newFolders} onChange={(v) => void pickNewFolders(v)} />
      </section>
    </div>
  );
}
