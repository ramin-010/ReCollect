'use client';

import { useMemo, useState } from 'react';
import { Battery, BrainCircuit, CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Clock, Loader2, Save, Smile, Target, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canSaveDebrief, computeDebriefStats, format12h, type SlotStatus } from '@/lib/learning/engine';
import { useLearningStore } from '@/lib/store/learningStore';
import type { DayString, Debrief, Slot } from '@/lib/learning/types';
import { LearningDialog } from './LearningDialog';
import { CONTEXT_TAGS, RatingScale, TagChip } from './RatingScale';
import { lx } from './styles';

interface DayDebriefDialogProps {
  isOpen: boolean;
  /** After a real save (the store refetches). */
  onSaved: () => void;
  /** Backdrop, Esc, X or Cancel: nothing saved (Action Required returns next visit). */
  onDismiss: () => void;
  date: DayString;
  slots: Slot[];
  existingDebrief: Debrief | null;
  title?: string;
  subtitle?: string;
}

const isResolved = (s: SlotStatus) => s === 'COMPLETED' || s === 'SKIPPED' || s === 'PARTIAL';

/** Revise DayDebriefModal ("Wrap Up Day", and "Action Required" for one missed day). */
export function DayDebriefDialog(props: DayDebriefDialogProps) {
  // The body mounts on every open, so its state starts from the props (no reset effect).
  if (!props.isOpen) return null;
  return <DayDebriefBody {...props} />;
}

function DayDebriefBody({
  isOpen,
  onSaved,
  onDismiss,
  date,
  slots,
  existingDebrief,
  title = 'Daily Debrief — AI Context',
  subtitle = 'Log your blocks and help your AI mentor understand the "why".',
}: DayDebriefDialogProps) {
  const saveDebrief = useLearningStore((s) => s.saveDebrief);
  const [isSaving, setIsSaving] = useState(false);
  const [showFreeWrite, setShowFreeWrite] = useState(() => !!existingDebrief?.freeWrite);
  const [logs, setLogs] = useState<Slot[]>(() => slots.map((s) => ({ ...s, remark: s.remark ?? '' })));
  const [energy, setEnergy] = useState<number | null>(existingDebrief?.energy ?? null);
  const [focus, setFocus] = useState<number | null>(existingDebrief?.focus ?? null);
  const [mood, setMood] = useState<number | null>(existingDebrief?.mood ?? null);
  const [tags, setTags] = useState<string[]>(existingDebrief?.tags ?? []);
  const [narrative, setNarrative] = useState(existingDebrief?.narrative ?? '');
  const [tomorrowIntent, setTomorrowIntent] = useState(existingDebrief?.tomorrowIntent ?? '');
  const [freeWrite, setFreeWrite] = useState(existingDebrief?.freeWrite ?? '');

  const stats = useMemo(() => computeDebriefStats(logs.map((s) => ({ ...s, id: s._id }))), [logs]);
  const canSave = canSaveDebrief({ energy, focus, mood });

  const setLog = (id: string, patch: Partial<Slot>) => setLogs((prev) => prev.map((s) => (s._id === id ? { ...s, ...patch } : s)));

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await saveDebrief(date, {
      form: { energy, focus, mood, tags, narrative, tomorrowIntent, freeWrite },
      slots: logs.map((s) => ({
        _id: s._id,
        status: s.status,
        remark: s.remark?.trim() ? s.remark.trim() : null,
        minutesDone: s.minutesDone,
        actualStartTime: s.actualStartTime,
        actualEndTime: s.actualEndTime,
      })),
    });
    setIsSaving(false);
    if (ok) onSaved();
  };

  const statusBtn = (active: boolean, activeCls: string) =>
    cn('p-1.5 rounded-md transition-colors', active ? activeCls : cn('text-[hsl(var(--foreground))]/30 hover:text-[hsl(var(--foreground))]/70', lx.hover));

  return (
    <LearningDialog
      isOpen={isOpen}
      onClose={onDismiss}
      busy={isSaving}
      width="max-w-3xl"
      headerTint="primary"
      icon={<BrainCircuit className={cn('w-5 h-5', lx.primaryText)} />}
      title={title}
      subtitle={subtitle}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className={cn('text-[11px] font-medium', lx.muted)}>This data trains your Weekly Mentor Report</span>
          <div className="flex gap-2">
            <button onClick={onDismiss} disabled={isSaving} className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className={cn('px-5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50', lx.primaryBg)}
              title={canSave ? '' : 'Rate Energy, Focus, and Mood to save'}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Debrief
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Layer 0: schedule review */}
        <section>
          <h3 className={cn('text-xs font-bold uppercase tracking-wider mb-3', lx.muted)}>Schedule Review</h3>
          {logs.length === 0 ? (
            <div className={cn('rounded-xl p-4 text-center', lx.inset)}>
              <p className={cn('text-sm', lx.muted)}>No blocks scheduled for today.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((slot) => (
                <div key={slot._id} className={cn('rounded-xl p-3 flex flex-col gap-3', lx.inset)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: slot.color }} />
                      <div className="flex-1 min-w-0">
                        <h4 className={cn('text-sm font-semibold truncate', lx.fg)}>{slot.title}</h4>
                        <div className={cn('flex items-center gap-1.5 text-xs mt-0.5', lx.muted)}>
                          <Clock className="w-3 h-3" />
                          <span>
                            {format12h(slot.startTime)} - {format12h(slot.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={cn('flex rounded-lg p-0.5 border shrink-0 bg-[var(--surface-elevated)]', lx.border)}>
                      <button onClick={() => setLog(slot._id, { status: 'UPCOMING' })} className={statusBtn(!isResolved(slot.status), 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]')} title="Unmarked">
                        <CircleDashed className="w-4 h-4" />
                      </button>
                      <button onClick={() => setLog(slot._id, { status: 'COMPLETED' })} className={statusBtn(slot.status === 'COMPLETED' || slot.status === 'PARTIAL', 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]')} title="Completed">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setLog(slot._id, { status: 'SKIPPED' })} className={statusBtn(slot.status === 'SKIPPED', 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]')} title="Skipped">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="pl-5">
                    <input
                      type="text"
                      placeholder="Add a note for this block..."
                      value={slot.remark ?? ''}
                      onChange={(e) => setLog(slot._id, { remark: e.target.value })}
                      className={cn(lx.input, 'rounded-lg bg-[var(--surface-elevated)]')}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Layer 1: auto-context */}
        <section>
          <h3 className={cn('text-xs font-bold uppercase tracking-wider mb-3', lx.muted)}>Today&apos;s Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              [`${stats.completed}/${stats.planned}`, 'Blocks Done'],
              [`${stats.focusedHrs}h`, 'Focused Time'],
              [String(stats.skipped), 'Skipped'],
            ].map(([v, l]) => (
              <div key={l} className={cn('rounded-xl p-3', lx.inset)}>
                <span className={cn('block text-xl font-bold', lx.fg)}>{v}</span>
                <span className={cn('text-[11px] font-medium mt-0.5', lx.muted)}>{l}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Layer 2: structured signals */}
        <section className="flex flex-col gap-6">
          <h3 className={cn('text-xs font-bold uppercase tracking-wider', lx.muted)}>Structured Signals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RatingScale label="Energy" icon={<Battery className="w-4 h-4 text-emerald-400" />} value={energy} onChange={setEnergy} />
            <RatingScale label="Focus" icon={<Target className="w-4 h-4 text-blue-400" />} value={focus} onChange={setFocus} />
            <RatingScale label="Mood" icon={<Smile className="w-4 h-4 text-purple-400" />} value={mood} onChange={setMood} />
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--foreground))]/80 mb-2 block">Context Tags</label>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_TAGS.map((tag) => (
                <TagChip key={tag} tag={tag} selected={tags.includes(tag)} onToggle={() => setTags((p) => (p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]))} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--foreground))]/80 mb-2 block">What&apos;s the story of today? (Causal reasoning)</label>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="e.g., 'Woke up groggy, hit flow state in TS around 3pm. Skipped gym because I didn't want to lose context.'"
              className={cn(lx.input, 'p-3 resize-none min-h-[80px]')}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--foreground))]/80 mb-2 block">What&apos;s the one thing you want to nail tomorrow? (Optional)</label>
            <input type="text" value={tomorrowIntent} onChange={(e) => setTomorrowIntent(e.target.value)} placeholder="e.g., 'Start with the gym before the brain kicks in'" className={lx.input} />
          </div>
        </section>

        {/* Layer 3: free write */}
        <section className={cn('pt-2 border-t', lx.border)}>
          <button onClick={() => setShowFreeWrite((v) => !v)} className={cn('flex items-center gap-2 text-xs font-medium transition-colors hover:text-[hsl(var(--foreground))]', lx.muted)}>
            {showFreeWrite ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Want to add more? (Unstructured Free-write)
          </button>
          {showFreeWrite && (
            <textarea
              value={freeWrite}
              onChange={(e) => setFreeWrite(e.target.value)}
              placeholder="Dump your messy thoughts here. No structure needed. Good for your brain, but the AI doesn't rely on it."
              className={cn(lx.input, 'p-3 resize-none min-h-[150px] mt-3')}
            />
          )}
        </section>
      </div>
    </LearningDialog>
  );
}
