'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcSkel } from '@/components/rc-ui';
import { recallApi, recallErrorKind, type AiUsage } from '@/lib/api/recallApi';
import './settings.css';

const FEATURE_LABEL: Record<string, string> = {
  recall_questions: 'Recall questions',
  recall_grade: 'Grading answers',
  practice_note: 'Practice notes',
  weekly_coach: 'Weekly coach',
  assistant: 'Ask AI',
  doc_ask: 'Ask AI in docs',
  task_parse: 'Task line (@ai)',
};

const usd = (n: number) => `$${n.toFixed(n < 10 ? 2 : 0)}`;

/** Settings → AI: this month's spend against the cap, by feature, and the cap itself. */
export function AiSettings() {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'off' | 'failed'>('loading');
  const [cap, setCap] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const u = await recallApi.usage();
      setUsage(u);
      setCap(String(u.capUsd));
      setState('ready');
    } catch (e) {
      setState(recallErrorKind(e) === 'not-configured' ? 'off' : 'failed');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const n = Number(cap);
    if (!Number.isFinite(n) || n < 0 || n > 1000) {
      toast.error('Enter a monthly cap between $0 and $1000.');
      return;
    }
    setSaving(true);
    try {
      const capUsd = Math.round(n * 100) / 100;
      await recallApi.setCap(capUsd);
      // The headline and meter read the fresh numbers (the save's answer may not carry them).
      const fresh = await recallApi.usage().catch(() => null);
      setUsage((prev) => fresh ?? (prev ? { ...prev, capUsd } : prev));
      setCap(String(fresh?.capUsd ?? capUsd));
      toast.success('Monthly cap saved');
    } catch {
      toast.error('The cap was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className={cn(rcScope, 'set-section')} aria-busy>
        <RcSkel className="h-5 w-48" />
        <RcSkel className="mt-3 h-2 w-full" />
        <RcSkel className="mt-6 h-4 w-64" />
      </div>
    );
  }

  if (state !== 'ready' || !usage) {
    return (
      <div className={cn(rcScope, 'set-section')}>
        <p className="rc-body">
          {state === 'off'
            ? 'The AI isn’t set up on the server yet. Recall questions and grading switch on once it is.'
            : 'AI usage didn’t load. Check your connection and try again.'}
        </p>
        {state === 'failed' && (
          <RcButton className="mt-3" variant="outline" onClick={() => void load()}>
            Try again
          </RcButton>
        )}
      </div>
    );
  }

  const share = usage.capUsd > 0 ? Math.min(1, usage.spentUsd / usage.capUsd) : 0;
  const features = Object.entries(usage.byFeature).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  return (
    <div className={cn(rcScope, 'set-section')}>
      <p className="rc-title">
        {usd(usage.spentUsd)} of {usd(usage.capUsd)} this month
      </p>
      <p className="rc-meta mt-0.5">
        {usage.calls} {usage.calls === 1 ? 'request' : 'requests'} · {usage.model}
      </p>
      <div className="rc-meter set-meter mt-3" role="meter" aria-valuemin={0} aria-valuemax={usage.capUsd} aria-valuenow={usage.spentUsd} aria-label="AI spend this month">
        <span className="rc-meter-fill" style={{ width: `${share * 100}%` }} />
      </div>
      {usage.awake && (
        <p className="rc-meta rc-num mt-3">
          Database awake {usage.awake.hours} h of {usage.awake.allowanceHours} free this month ({usage.awake.percent}%) · on pace for {usage.awake.projectedHours} h
        </p>
      )}

      {features.length > 0 && (
        <ul className="set-list mt-5">
          {features.map(([k, v]) => (
            <li key={k} className="set-row">
              <span>{FEATURE_LABEL[k] ?? k}</span>
              <span className="rc-meta rc-num">{usd(v)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="set-field mt-6">
        <label htmlFor="ai-cap" className="rc-field-label">
          Monthly cap
        </label>
        <p className="rc-field-help">When this month reaches the cap, questions and grading pause until the 1st. Reviews still work.</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rc-ink-2">$</span>
          <input id="ai-cap" className="rc-input set-cap" inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value.replace(/[^0-9.]/g, '').replace(/(\.\d*)\./g, '$1'))} onKeyDown={(e) => { if (e.key === 'Enter') void save(); }} />
          <RcButton variant="outline" busy={saving} onClick={() => void save()} disabled={cap === String(usage.capUsd)}>
            Save cap
          </RcButton>
        </div>
      </div>
    </div>
  );
}
