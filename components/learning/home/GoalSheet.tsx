'use client';

import { useEffect, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { toast } from 'sonner';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RotateCw, X } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { learningApi, LearningApiError } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import { addDays, type DayString } from '@/lib/learning/engine';
import type { Goal, GoalMilestone, SubjectWithTopics } from '@/lib/learning/types';
import { RcButton, RcCheck, RcConfirm, RcIconButton, RcSheet, RcSkel, rcScope } from '@/components/rc-ui';
import { shortDay } from './format';

const pad = (n: number) => String(n).padStart(2, '0');

/** A month grid of days (custom, never the browser's date input). */
function DayPicker({
  value,
  onChange,
  today,
  label,
  min,
  placeholder = 'Pick a day',
  compact,
}: {
  value: DayString | null;
  onChange: (d: DayString | null) => void;
  today: DayString;
  label: string;
  min?: DayString;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const start = value ?? addDays(today, 30);
  const [month, setMonth] = useState(start.slice(0, 7));
  useEffect(() => {
    if (open) setMonth((value ?? addDays(today, 30)).slice(0, 7));
  }, [open, value, today]);
  const [y, m] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  const title = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn('rc-input inline-flex w-auto items-center gap-2 cursor-pointer', compact && '!h-[28px] !px-2 !text-[13.5px]')}
          aria-label={`${label}: ${value ? shortDay(value, today) : 'none'}`}
        >
          <CalendarDays className="w-4 h-4 rc-ink-3" aria-hidden />
          <span className={cn(!value && 'rc-ink-3')}>{value ? (compact ? `Due ${shortDay(value, today)}` : shortDay(value, today)) : placeholder}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content align="start" sideOffset={6} collisionPadding={12} className={cn(rcScope, 'rc-float rc-pop w-[284px] p-3')}>
          <div className="flex items-center justify-between mb-2">
            <RcIconButton label="Previous month" size="sm" onClick={() => shift(-1)}>
              <ChevronLeft />
            </RcIconButton>
            <span className="text-[15px] font-[600]">{title}</span>
            <RcIconButton label="Next month" size="sm" onClick={() => shift(1)}>
              <ChevronRight />
            </RcIconButton>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center" role="grid" aria-label={title}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className="rc-meta py-1 text-[12.5px]" aria-hidden>
                {d}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = `${month}-${pad(i + 1)}` as DayString;
              const disabled = !!min && day < min;
              const selected = day === value;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={shortDay(day, today)}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                  className={cn(
                    'rc-num h-9 rounded-[8px] text-[14px] cursor-pointer transition-colors',
                    selected ? 'bg-[var(--rc-main)] text-[var(--rc-on-main)] font-[650]' : 'hover:bg-[var(--rc-surface-2)]',
                    day === today && !selected && 'font-[700] text-[var(--rc-accent)]',
                    disabled && 'opacity-35 cursor-not-allowed hover:bg-transparent',
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          {value && (
            <div className="mt-2 flex justify-end">
              <RcButton
                size="sm"
                variant="quiet"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear
              </RcButton>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

interface DraftMilestone {
  key: string;
  _id?: string;
  title: string;
  dueDay: DayString | null;
  done: boolean;
}

const toDraft = (m: GoalMilestone): DraftMilestone => ({ key: m._id, _id: m._id, title: m.title, dueDay: m.dueDay, done: m.done });

/**
 * Create or edit a goal (LOOP_V2_SPEC §4): a title, a deadline, an optional why, a few
 * milestones, and the subjects whose revisions should come first in Today.
 */
export function GoalSheet({ open, onOpenChange, goalId, today }: { open: boolean; onOpenChange: (o: boolean) => void; goalId: string | null; today: DayString }) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [deadline, setDeadline] = useState<DayString | null>(null);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<DraftMilestone[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectWithTopics[]>([]);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [goals, subs] = await Promise.all([goalId ? learningApi.getGoals() : Promise.resolve([] as Goal[]), learningApi.getSubjects().catch(() => [] as SubjectWithTopics[])]);
      setSubjects(subs);
      const g = goalId ? goals.find((x) => x._id === goalId) ?? null : null;
      if (goalId && !g) throw new Error('missing');
      setGoal(g);
      setTitle(g?.title ?? '');
      setWhy(g?.why ?? '');
      setDeadline(g?.deadline ?? null);
      setSubjectIds(g?.subjects.map((x) => x._id) ?? []);
      setMilestones(g ? g.milestones.map(toDraft) : [{ key: 'new-0', title: '', dueDay: null, done: false }]);
      setRemoved([]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setTried(false);
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open / target change
  }, [open, goalId]);

  const titleError = tried && !title.trim() ? 'Give the goal a title.' : null;
  const deadlineError = tried && !deadline ? 'Pick a deadline. A goal without one is a wish.' : null;

  const save = async () => {
    setTried(true);
    if (!title.trim() || !deadline) return;
    setSaving(true);
    try {
      let saved: Goal;
      if (goal) {
        saved = await learningApi.updateGoal(goal._id, { title: title.trim(), why: why.trim() || null, deadline, subjectIds });
      } else {
        // A new goal takes its milestones in the same call; ticked ones are marked after.
        saved = await learningApi.createGoal({
          title: title.trim(),
          why: why.trim() || null,
          deadline,
          subjectIds,
          milestones: milestones.filter((m) => m.title.trim()).map((m) => ({ title: m.title.trim(), dueDay: m.dueDay })),
        });
        const ticked = milestones.filter((m) => m.title.trim()).map((m, i) => (m.done ? saved.milestones[i]?._id : null)).filter((x): x is string => !!x);
        for (const id of ticked) await learningApi.updateMilestone(id, { done: true });
        toast.success('Goal set');
        onOpenChange(false);
        void useLearningStore.getState().refresh();
        return;
      }
      // Milestones: deletes, then edits, then new ones in order.
      for (const id of removed) await learningApi.deleteMilestone(id);
      const before = new Map((goal?.milestones ?? []).map((m) => [m._id, m]));
      for (const [i, m] of milestones.entries()) {
        if (!m.title.trim()) continue;
        if (m._id) {
          const prev = before.get(m._id);
          if (prev && (prev.title !== m.title.trim() || prev.dueDay !== m.dueDay || prev.done !== m.done || prev.sortOrder !== i)) {
            await learningApi.updateMilestone(m._id, { title: m.title.trim(), dueDay: m.dueDay, done: m.done, sortOrder: i });
          }
        } else {
          const created = await learningApi.createMilestone(saved._id, { title: m.title.trim(), dueDay: m.dueDay });
          if (m.done) await learningApi.updateMilestone(created.milestone._id, { done: true });
        }
      }
      toast.success('Goal saved');
      onOpenChange(false);
      void useLearningStore.getState().refresh();
    } catch (e) {
      toast.error(
        e instanceof LearningApiError && e.code === 'GOAL_LIMIT'
          ? 'Three active goals is the limit. Mark one reached or archive it first.'
          : e instanceof Error
            ? `Couldn’t save the goal: ${e.message}`
            : 'Couldn’t save the goal. Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: 'done' | 'archived') => {
    if (!goal) return;
    setSaving(true);
    try {
      await learningApi.updateGoal(goal._id, { status });
      toast.success(status === 'done' ? 'Goal reached' : 'Goal archived');
      onOpenChange(false);
      void useLearningStore.getState().refresh();
    } catch (e) {
      toast.error(e instanceof Error ? `Couldn’t update the goal: ${e.message}` : 'Couldn’t update the goal.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!goal) return;
    setSaving(true);
    try {
      await learningApi.deleteGoal(goal._id);
      toast.success('Goal deleted');
      setConfirm(null);
      onOpenChange(false);
      void useLearningStore.getState().refresh();
    } catch (e) {
      toast.error(e instanceof Error ? `Couldn’t delete the goal: ${e.message}` : 'Couldn’t delete the goal.');
    } finally {
      setSaving(false);
    }
  };

  const patchMs = (key: string, p: Partial<DraftMilestone>) => setMilestones((list) => list.map((m) => (m.key === key ? { ...m, ...p } : m)));

  return (
    <RcSheet
      open={open}
      onOpenChange={(o) => !saving && onOpenChange(o)}
      title={goalId ? 'Edit goal' : 'New goal'}
      description={goalId ? undefined : 'A title, a date, and a few milestones.'}
      footer={
        !loading && !loadError ? (
          <>
            <RcButton variant="main" busy={saving} onClick={() => void save()}>
              {goalId ? 'Save goal' : 'Set goal'}
            </RcButton>
            <RcButton variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </RcButton>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex flex-col gap-4 py-2" aria-busy>
          <RcSkel className="h-4 w-24" />
          <RcSkel className="h-9 w-full" />
          <RcSkel className="h-4 w-24" />
          <RcSkel className="h-9 w-40" />
          <RcSkel className="h-24 w-full" />
        </div>
      ) : loadError ? (
        <div className="py-2">
          <p className="text-[15px] rc-ink-2">Couldn’t load this goal.</p>
          <RcButton variant="outline" size="sm" className="mt-3" icon={<RotateCw />} onClick={() => void load()}>
            Try again
          </RcButton>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pt-1">
          <div>
            <label className="rc-field-label" htmlFor="goal-title">
              Goal
            </label>
            <TextareaAutosize
              id="goal-title"
              className="rc-textarea"
              placeholder="e.g. Product-company SDE role"
              maxLength={120}
              minRows={1}
              value={title}
              aria-invalid={!!titleError}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
            />
            {titleError && <p className="rc-field-error">{titleError}</p>}
          </div>

          <div>
            <span className="rc-field-label">Deadline</span>
            <DayPicker label="Deadline" value={deadline} onChange={setDeadline} today={today} min={today} />
            {deadlineError ? <p className="rc-field-error">{deadlineError}</p> : <p className="rc-field-help">The date goes on the goal; the days stay flexible.</p>}
          </div>

          <div>
            <label className="rc-field-label" htmlFor="goal-why">
              Why it matters <span className="font-normal rc-ink-3">(optional)</span>
            </label>
            <TextareaAutosize id="goal-why" className="rc-textarea" minRows={2} maxRows={6} maxLength={500} value={why} onChange={(e) => setWhy(e.target.value)} />
          </div>

          <fieldset>
            <legend className="rc-field-label">Milestones</legend>
            <ul className="flex flex-col gap-2">
              {milestones.map((m, i) => (
                <li key={m.key} className="flex items-start gap-2">
                  <div className="pt-[7px]">
                    <RcCheck checked={m.done} onToggle={() => patchMs(m.key, { done: !m.done })} label={m.done ? 'Mark milestone not done' : 'Mark milestone done'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <TextareaAutosize
                      className="rc-textarea"
                      placeholder={i === 0 ? 'e.g. Finish NeetCode 150: graphs' : 'Next milestone'}
                      maxLength={140}
                      minRows={1}
                      value={m.title}
                      aria-label={`Milestone ${i + 1}`}
                      onChange={(e) => patchMs(m.key, { title: e.target.value.replace(/\n/g, ' ') })}
                    />
                    <div className="mt-1.5">
                      <DayPicker label={`Milestone ${i + 1} due`} value={m.dueDay} onChange={(d) => patchMs(m.key, { dueDay: d })} today={today} placeholder="No due date" compact />
                    </div>
                  </div>
                  <RcIconButton
                    label={`Remove milestone ${i + 1}`}
                    size="sm"
                    onClick={() => {
                      if (m._id) setRemoved((r) => [...r, m._id!]);
                      setMilestones((list) => list.filter((x) => x.key !== m.key));
                    }}
                  >
                    <X />
                  </RcIconButton>
                </li>
              ))}
            </ul>
            <RcButton
              variant="quiet"
              size="sm"
              className="mt-2 -ml-2"
              icon={<Plus />}
              onClick={() => setMilestones((list) => [...list, { key: `new-${Date.now()}`, title: '', dueDay: null, done: false }])}
            >
              Add milestone
            </RcButton>
            <p className="rc-field-help">The forecast counts milestones done per week since the goal began.</p>
          </fieldset>

          {subjects.length > 0 && (
            <fieldset>
              <legend className="rc-field-label">Subjects that serve this goal</legend>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((s) => {
                  const on = subjectIds.includes(s._id);
                  return (
                    <button
                      key={s._id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSubjectIds((ids) => (on ? ids.filter((x) => x !== s._id) : [...ids, s._id]))}
                      className={cn(
                        'inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border px-2.5 text-[13.5px] font-[600] cursor-pointer transition-colors',
                        on ? 'border-[var(--rc-accent)] bg-[var(--rc-accent-tint)] text-[var(--rc-accent)]' : 'border-[var(--rc-line-strong)] text-[var(--rc-ink-2)] hover:text-[var(--rc-ink-1)]',
                      )}
                    >
                      <span className="rc-swatch" style={{ background: s.color ?? 'var(--rc-ink-3)' }} aria-hidden />
                      {s.name}
                    </button>
                  );
                })}
              </div>
              <p className="rc-field-help">Their revisions come first in Today.</p>
            </fieldset>
          )}

          {goal && (
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--rc-line)] pt-4">
              <RcButton size="sm" variant="outline" disabled={saving} onClick={() => void setStatus('done')}>
                Mark as reached
              </RcButton>
              <RcButton size="sm" variant="outline" disabled={saving} onClick={() => void setStatus('archived')}>
                Archive
              </RcButton>
              <span className="flex-1" />
              <RcButton size="sm" variant="danger" disabled={saving} onClick={() => setConfirm('delete')}>
                Delete goal
              </RcButton>
            </div>
          )}
        </div>
      )}
      <RcConfirm
        open={confirm === 'delete'}
        onOpenChange={(o) => setConfirm(o ? 'delete' : null)}
        title="Delete this goal?"
        body={<p>“{goal?.title}” and its milestones will be gone for good. To keep the history, archive it instead.</p>}
        confirmLabel="Delete goal"
        danger
        busy={saving}
        onConfirm={() => void remove()}
      />
    </RcSheet>
  );
}
