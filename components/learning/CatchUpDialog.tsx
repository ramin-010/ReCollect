'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Battery, CheckCircle2, ChevronDown, Loader2, MessageSquare, Smile, Target, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canSaveCatchUp, format12h, type CatchUpDecision } from '@/lib/learning/engine';
import { formatDay } from '@/lib/learning/dates';
import { useLearningStore } from '@/lib/store/learningStore';
import type { CatchUpPrefill, DayString, Slot } from '@/lib/learning/types';
import { LearningDialog } from './LearningDialog';
import { CONTEXT_TAGS, RatingScale, TagChip } from './RatingScale';
import { lx } from './styles';

interface CatchUpDialogProps {
  isOpen: boolean;
  onSaved: () => void;
  /** Nothing saved; the blocks stay unresolved and the prompt returns next visit. */
  onDismiss: () => void;
  days: { date: DayString; slots: Slot[] }[];
  prefill: CatchUpPrefill | null;
}

/**
 * Revise MultiDayCatchUpModal ("Welcome Back", 2+ missed days): one shared narrative + ratings;
 * blocks left unresolved are saved as SKIPPED; the per-block list (collapsed) is for exceptions.
 */
export function CatchUpDialog(props: CatchUpDialogProps) {
  if (!props.isOpen) return null;
  return <CatchUpBody {...props} />;
}

function CatchUpBody({ isOpen, onSaved, onDismiss, days, prefill }: CatchUpDialogProps) {
  const saveCatchUp = useLearningStore((s) => s.saveCatchUp);
  // A block nobody marks stays UNRESOLVED (saved as SKIPPED); prefill = a context already saved.
  const [narrative, setNarrative] = useState(prefill?.narrative ?? '');
  const [energy, setEnergy] = useState<number | null>(prefill?.energy ?? null);
  const [focus, setFocus] = useState<number | null>(prefill?.focus ?? null);
  const [mood, setMood] = useState<number | null>(prefill?.mood ?? null);
  const [tags, setTags] = useState<string[]>(prefill?.tags ?? []);
  const [decisions, setDecisions] = useState<Record<string, { status: CatchUpDecision; remark: string }>>(() =>
    Object.fromEntries(days.flatMap((d) => d.slots.map((s) => [s._id, { status: 'UNRESOLVED' as CatchUpDecision, remark: '' }]))),
  );
  const [showRemark, setShowRemark] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const dates = useMemo(() => days.map((d) => d.date).sort(), [days]);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const rangeText = first && last ? `Catch up on ${formatDay(first, { month: 'short', day: 'numeric' })} – ${formatDay(last, { month: 'short', day: 'numeric' })}` : '';
  const canSave = canSaveCatchUp({ energy, focus, mood, tags, narrative });
  const total = Object.keys(decisions).length;
  const exceptions = Object.values(decisions).filter((d) => d.status !== 'UNRESOLVED').length;

  const toggleStatus = (id: string, status: 'COMPLETED' | 'SKIPPED') =>
    setDecisions((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, status: cur.status === status ? 'UNRESOLVED' : status } };
    });

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const ok = await saveCatchUp({
      dates,
      context: { energy, focus, mood, tags, narrative: narrative.trim() },
      decisions: Object.entries(decisions).map(([slotId, d]) => ({ slotId, status: d.status, ...(d.remark.trim() ? { remark: d.remark.trim() } : {}) })),
    });
    setIsSaving(false);
    if (ok) onSaved();
  };

  return (
    <LearningDialog
      isOpen={isOpen}
      onClose={onDismiss}
      busy={isSaving}
      width="max-w-3xl"
      icon={<AlertCircle className="w-6 h-6 text-purple-500" />}
      title={<span className="text-xl font-bold">Welcome Back</span>}
      subtitle={
        <>
          {rangeText && <span className="block ml-8">{rangeText}</span>}
          {prefill && <span className={cn('block text-xs mt-1.5 ml-8', lx.primaryText)}>Resumed from what you already saved — just finish the blocks below.</span>}
        </>
      }
      footer={
        <div className="flex items-center justify-between">
          <div>
            {isExpanded && exceptions > 0 && (
              <button
                onClick={() => setDecisions((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, status: 'SKIPPED' as const }])))}
                className={cn('text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:text-[hsl(var(--foreground))]', lx.muted, lx.hover)}
              >
                Reset all to skipped
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onDismiss} disabled={isSaving} className={cn('px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 hover:text-[hsl(var(--foreground))]', lx.muted)}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!canSave || isSaving} className={cn('flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed', lx.primaryBg)}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="space-y-6">
          <div>
            <label className={cn('block text-sm font-semibold mb-2', lx.fg)}>
              What happened during this time? <span className={lx.danger}>*</span>
            </label>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Briefly describe why you were away or what you were focusing on..."
              className={cn(lx.input, 'p-3 resize-none h-24')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RatingScale label="Energy" icon={<Battery className="w-4 h-4 text-emerald-500" />} value={energy} onChange={setEnergy} />
            <RatingScale label="Focus" icon={<Target className="w-4 h-4 text-blue-500" />} value={focus} onChange={setFocus} />
            <RatingScale label="Mood" icon={<Smile className="w-4 h-4 text-purple-500" />} value={mood} onChange={setMood} />
          </div>
          <div>
            <label className={cn('block text-sm font-semibold mb-2', lx.fg)}>Context Tags</label>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_TAGS.map((tag) => (
                <TagChip key={tag} tag={tag} rounded="full" selected={tags.includes(tag)} onToggle={() => setTags((p) => (p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]))} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button onClick={() => setIsExpanded((v) => !v)} className={cn('w-full flex items-center justify-between gap-3 border-b pb-2 text-left', lx.border)}>
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]/80">
                {total} block{total === 1 ? '' : 's'} across {dates.length} day{dates.length === 1 ? '' : 's'} will be marked skipped
              </h3>
              <p className={cn('text-xs mt-0.5', lx.muted)}>{exceptions > 0 ? `${exceptions} marked as an exception below.` : 'Actually did one of these? Mark it below.'}</p>
            </div>
            <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', lx.muted, isExpanded && 'rotate-180')} />
          </button>

          {isExpanded &&
            days.map((day) =>
              day.slots.length === 0 ? null : (
                <div key={day.date} className="space-y-3">
                  <h4 className={cn('text-sm font-semibold', lx.muted)}>{formatDay(day.date, { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
                  <div className="space-y-2">
                    {day.slots.map((block) => {
                      const d = decisions[block._id];
                      if (!d) return null;
                      const remarkOpen = showRemark[block._id] || !!d.remark;
                      return (
                        <div key={block._id} className={cn('rounded-xl overflow-hidden flex flex-col transition-colors', lx.inset)}>
                          <div className="flex items-center p-3">
                            <div className="w-1.5 h-10 rounded-full mr-3" style={{ backgroundColor: block.color || '#94a3b8' }} />
                            <div className="flex-1 min-w-0">
                              <div className={cn('text-sm font-medium truncate', lx.fg)}>{block.title}</div>
                              <div className={cn('text-xs mt-0.5', lx.muted)}>
                                {format12h(block.startTime, false)} - {format12h(block.endTime, false)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4">
                              <button
                                onClick={() => toggleStatus(block._id, 'COMPLETED')}
                                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', d.status === 'COMPLETED' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : cn(lx.muted, lx.hover))}
                              >
                                <CheckCircle2 className="w-4 h-4" /> <span>Done</span>
                              </button>
                              <button
                                onClick={() => toggleStatus(block._id, 'SKIPPED')}
                                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', d.status === 'SKIPPED' ? 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]' : cn(lx.muted, lx.hover))}
                              >
                                <XCircle className="w-4 h-4" /> <span>Skipped</span>
                              </button>
                              <button
                                onClick={() => setShowRemark((p) => ({ ...p, [block._id]: !p[block._id] }))}
                                className={cn('p-1.5 rounded-lg transition-colors ml-1', remarkOpen ? 'text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10' : cn(lx.muted, lx.hover))}
                                title="Add remark"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {remarkOpen && (
                            <div className={cn('px-3 pb-3 pt-1 border-t', lx.border)}>
                              <input
                                type="text"
                                placeholder="Add a remark about this slot..."
                                value={d.remark}
                                autoFocus={showRemark[block._id] && !d.remark}
                                onChange={(e) => setDecisions((prev) => ({ ...prev, [block._id]: { ...d, remark: e.target.value } }))}
                                className={cn('w-full text-sm bg-transparent border-none focus:outline-none', lx.fg, 'placeholder:text-[hsl(var(--muted-foreground))]/60')}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
        </div>
      </div>
    </LearningDialog>
  );
}
