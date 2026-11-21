'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { RcButton, RcSkel } from '@/components/rc-ui';

/** What the server says about their own key: never the key itself, only its last 4 (ECOSYSTEM_V2_PLAN stage 10). */
interface OwnKeyView {
  last4: string;
  addedAt: string;
  checkedAt: string | null;
  state: 'ok' | 'no_credit' | 'bad_key';
}

const STATE_WORDS: Record<OwnKeyView['state'], string> = { ok: 'works', no_credit: 'out of credit: add credit in the Claude Console', bad_key: 'not accepted any more: add it again' };
const message = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

/**
 * Settings → AI: their own Claude API key. The buddy, Ask AI and Recall run on it and they pay Anthropic directly. It is
 * checked when added, kept encrypted, and never shown again: only its last 4.
 */
export function OwnKey({ onChanged }: { onChanged?: () => void }) {
  const [view, setView] = useState<OwnKeyView | null | 'loading'>('loading');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axiosInstance.get('/api/ai/key').then(
      (r) => setView((r.data?.data as OwnKeyView | null) ?? null),
      () => setView(null),
    );
  }, []);

  const add = async () => {
    const clean = key.trim();
    if (!clean) return;
    setBusy(true);
    try {
      const r = await axiosInstance.put('/api/ai/key', { key: clean });
      setView(r.data?.data as OwnKeyView);
      setKey('');
      toast.success('Your key works. Your AI runs on it now.');
      onChanged?.();
    } catch (err) {
      toast.error(message(err) || 'The key wasn’t added. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await axiosInstance.delete('/api/ai/key');
      setView(null);
      toast.success('Your key is removed.');
      onChanged?.();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="set-field mt-6">
      <p className="rc-field-label">Your own Claude key</p>
      {view === 'loading' ? (
        <RcSkel className="mt-2 h-4 w-64" />
      ) : view ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rc-body rc-num">•••• {view.last4}</span>
          <span className={view.state === 'ok' ? 'rc-meta' : 'rc-meta text-[var(--rc-ink-1)]'}>· {STATE_WORDS[view.state]}</span>
          <RcButton size="sm" variant="quiet" busy={busy} onClick={() => void remove()}>
            Remove
          </RcButton>
        </div>
      ) : (
        <>
          <p className="rc-field-help">Your buddy, Ask AI and Recall run on it, and you pay Anthropic directly: about $5 to $15 a month of active use. It’s checked when you add it, kept encrypted, and never shown again.</p>
          <form
            className="mt-2 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <input className="rc-input flex-1" type="password" autoComplete="off" spellCheck={false} value={key} placeholder="sk-ant-…" aria-label="Your Claude API key" onChange={(e) => setKey(e.target.value)} />
            <RcButton type="submit" variant="outline" busy={busy} disabled={!key.trim()}>
              {busy ? 'Checking…' : 'Add key'}
            </RcButton>
          </form>
        </>
      )}
    </div>
  );
}
