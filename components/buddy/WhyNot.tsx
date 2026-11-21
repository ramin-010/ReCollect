'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { RcButton, RcIconButton } from '@/components/rc-ui';
import { THUMB_REASONS, type ThumbReason } from '@/lib/api/buddyApi';

/**
 * After a "not this" (ECOSYSTEM_V2_PLAN stage 5b): one optional row of reasons, so the buddy learns what to show and
 * when. One tap sends the reason; a few words may follow. "Too private" keeps that thread (or lines like it) off the
 * screens, and says so.
 */
export function WhyNot({ onReason, onClose, withWords = true }: { onReason: (reason: ThumbReason, words?: string) => Promise<{ offScreens?: 'threads' | 'topic' } | void>; onClose: () => void; withWords?: boolean }) {
  const [picked, setPicked] = useState<ThumbReason | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [words, setWords] = useState('');
  const [sending, setSending] = useState(false);

  const pick = async (reason: ThumbReason) => {
    setPicked(reason);
    try {
      const r = await onReason(reason);
      setSaid(reason === 'private' && r && r.offScreens ? (r.offScreens === 'threads' ? 'Got it. That stays off your screens now.' : 'Got it. Lines like that stay off your lock screen now.') : 'Got it, thanks.');
    } catch {
      setPicked(null);
      toast.error('That didn’t save. Try again.');
    }
  };

  const send = async () => {
    const clean = words.replace(/\s+/g, ' ').trim();
    if (!clean || !picked) return;
    setSending(true);
    try {
      await onReason(picked, clean);
      onClose();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="buddy-why flex flex-col gap-2" role="group" aria-label="What was off?">
      {picked ? (
        <>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-[14px] text-[var(--rc-ink-2)]">{said ?? 'Saving…'}</p>
            <RcIconButton size="sm" label="Close" onClick={onClose}>
              <X />
            </RcIconButton>
          </div>
          {withWords && said ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input className="rc-input flex-1" value={words} maxLength={200} placeholder="A few words, if you like" aria-label="Say why, in a few words" onChange={(e) => setWords(e.target.value)} />
              <RcButton type="submit" size="sm" variant="quiet" busy={sending} disabled={!words.trim()}>
                Send
              </RcButton>
            </form>
          ) : null}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[14px] text-[var(--rc-ink-2)]">What was off?</span>
          {THUMB_REASONS.map((r) => (
            <RcButton key={r.reason} size="sm" variant="quiet" onClick={() => void pick(r.reason)}>
              {r.label}
            </RcButton>
          ))}
          <RcIconButton size="sm" label="Skip" onClick={onClose}>
            <X />
          </RcIconButton>
        </div>
      )}
    </div>
  );
}
