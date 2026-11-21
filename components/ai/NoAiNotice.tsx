'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiApi } from '@/lib/api/aiApi';

/** Whether this account has no AI at all (no server key for it, no key of its own): null while it loads. */
export function useNoAi(): boolean | null {
  const [none, setNone] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    aiApi.access().then(
      (a) => alive && setNone(a.source === 'none'),
      () => alive && setNone(false),
    );
    return () => {
      alive = false;
    };
  }, []);
  return none;
}

/**
 * Stage 10 (ECOSYSTEM_V2_PLAN §9.2): an AI feature on an account without AI shows this one quiet line instead of a box
 * that would only fail: the two ways to get it. Everything else in the app works without AI.
 */
export function NoAiNotice({ what, className }: { what: string; className?: string }) {
  return (
    <div role="status" className={cn('rc-card flex items-start gap-3 px-4 py-3', className)}>
      <KeyRound aria-hidden className="rc-meta mt-0.5 size-4 shrink-0" />
      <p className="rc-meta min-w-0 flex-1">
        {what} needs AI. Add your own Claude key in Settings › AI, or connect your own Claude in Settings › Agents: it has the same tools, and everything else here works without AI.
      </p>
    </div>
  );
}
