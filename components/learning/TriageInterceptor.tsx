'use client';

import { useState } from 'react';
import type { Triage } from '@/lib/learning/types';
import { CatchUpDialog } from './CatchUpDialog';
import { DayDebriefDialog } from './DayDebriefDialog';

/**
 * Revise TriageInterceptor, driven by `GET /api/today` `triage` (computed server side, no writes):
 *   - 'catch-up' (2+ days with unresolved blocks) → Welcome Back (CatchUpDialog)
 *   - 'debrief'  (one day)                        → DayDebriefDialog titled "Action Required"
 * Dismissing only hides it for this visit; nothing is saved, so it returns on the next load.
 */
export function TriageInterceptor({ triage }: { triage: Triage }) {
  const [dismissed, setDismissed] = useState(false);
  const [saved, setSaved] = useState(false);
  if (dismissed || saved || triage.kind === 'none') return null;

  if (triage.kind === 'catch-up') {
    return <CatchUpDialog isOpen onSaved={() => setSaved(true)} onDismiss={() => setDismissed(true)} days={triage.days} prefill={triage.prefill} />;
  }

  const n = triage.slots.length;
  return (
    <DayDebriefDialog
      isOpen
      onSaved={() => setSaved(true)}
      onDismiss={() => setDismissed(true)}
      date={triage.date}
      slots={triage.slots}
      existingDebrief={triage.existingDebrief}
      title="Action Required"
      subtitle={`${n} unresolved ${n === 1 ? 'block' : 'blocks'} from the past`}
    />
  );
}
