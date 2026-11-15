'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RcButton, RcSkel } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';

const MAX = 600;

/**
 * "About you, for your agents" (SYNC_SPINE_SPEC 1.3): a few lines every chat's brief starts with,
 * so a study chat or Claude Code knows how you learn and work without being told again.
 */
export function AgentProfile() {
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    learningApi.getSettings().then(
      (s) => {
        if (!alive) return;
        setSaved(s.agentProfile ?? '');
        setDraft(s.agentProfile ?? '');
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const s = await learningApi.updateSettings({ agentProfile: draft.trim() || null });
      setSaved(s.agentProfile ?? '');
      setDraft(s.agentProfile ?? '');
      toast.success('Saved. The next brief starts with it.');
    } catch {
      toast.error('That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8">
      <p className="rc-field-label">About you, for your agents</p>
      <p className="rc-meta mt-0.5">A few lines every chat reads first (get_brief): how you learn, what you are aiming at, what to avoid.</p>
      {failed ? (
        <p className="rc-meta mt-2">This didn’t load. Reopen Settings to try again.</p>
      ) : saved === null ? (
        <RcSkel className="mt-2 h-24 w-full" />
      ) : (
        <>
          <textarea
            className="rc-input mt-2 block min-h-[96px] w-full resize-y py-2 leading-[1.5]"
            value={draft}
            maxLength={MAX}
            aria-label="About you, for your agents"
            placeholder="E.g. Backend engineer, studying system design and DSA around a full-time job. Short explanations first, then a quiz. Diagrams for anything with moving parts."
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="rc-meta tabular-nums">
              {draft.length} / {MAX}
            </span>
            <RcButton size="sm" variant="outline" busy={busy} disabled={draft.trim() === (saved ?? '').trim()} onClick={() => void save()}>
              Save
            </RcButton>
          </div>
        </>
      )}
    </div>
  );
}
