'use client';

import { useCallback, useEffect, useState } from 'react';
import { CirclePause } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RcButton } from '@/components/rc-ui';
import { aiApi, type AiAccess } from '@/lib/api/aiApi';

/**
 * One calm line when the account's AI is paused (ECOSYSTEM_V2_PLAN stage 2): its key ran out of credit
 * or was not accepted, or this month's budget is used up. The rest of the app works, and the line says
 * so. "Try again" asks the key at once (the server allows it once a minute; it also checks by itself
 * every few hours). Nothing shows while the AI works, or for an account without AI (that is not news).
 */
const WORDS: Partial<Record<AiAccess['state'], string>> = {
  no_credit: 'The AI is paused: the Claude credits ran out. Everything else works.',
  bad_key: 'The AI is paused: the Claude key wasn’t accepted. Everything else works.',
  cap: 'This month’s AI budget is used up (Settings → AI). Everything else works.',
};

/** Stage 11: a friend's free AI waits (the server says why; the same words as its 503). */
const ALLOWANCE_WORDS: Record<NonNullable<NonNullable<AiAccess['allowance']>['reason']>, string> = {
  empty: 'Your free AI is used up. Everything else works and nothing you saved is lost: ask the person who invited you for more, or add your own Claude key in Settings › AI.',
  day: 'Today’s free AI is used up. It’s back tomorrow, and everything else works.',
  ceiling: 'The free AI is resting until next month. Everything else works.',
};

export function AiPausedNotice({ className }: { className?: string }) {
  const [access, setAccess] = useState<AiAccess | null>(null);
  const [trying, setTrying] = useState(false);

  const load = useCallback(() => {
    aiApi.access().then(setAccess, () => undefined);
  }, []);

  useEffect(() => {
    load();
    // Back on the tab: the key may work again (a probe, or credits added elsewhere).
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const reason = access?.state === 'allowance' ? access.allowance?.reason : null;
  const words = access ? (reason ? ALLOWANCE_WORDS[reason] : WORDS[access.state]) : undefined;
  if (!access || !words) return null;

  const retry = async () => {
    setTrying(true);
    try {
      const next = await aiApi.retryAccess();
      setAccess(next);
      if (next.state === 'ok') toast.success('The AI works again.');
      else toast('Still paused. It’s checked again by itself every few hours.');
    } catch {
      toast.error('That didn’t reach the server. Try again.');
    } finally {
      setTrying(false);
    }
  };

  return (
    <div role="status" className={cn('rc-card flex items-center gap-3 px-4 py-2.5', className)}>
      <CirclePause aria-hidden className="rc-meta size-4 shrink-0" />
      <p className="rc-meta min-w-0 flex-1">{words}</p>
      {access.state !== 'cap' && access.state !== 'allowance' && (
        <RcButton size="sm" variant="quiet" disabled={trying} onClick={() => void retry()}>
          {trying ? 'Trying…' : 'Try again'}
        </RcButton>
      )}
    </div>
  );
}
