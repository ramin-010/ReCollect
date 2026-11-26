'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RcSkel, RcSwitch } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';

/**
 * Settings › Agents (TOOL_ACCESS_PLAN §4.7, 11-27): whether chats may read and change the pocket (Home's quick private
 * notes). Off by default: chats can add a pocket note, nothing more. Only the app can turn it on, never an agent.
 */
export function PocketForAgents() {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    learningApi.getSettings().then(
      (s) => alive && setOn(s.pocketForAgents === true),
      () => alive && setOn(false),
    );
    return () => {
      alive = false;
    };
  }, []);

  const pick = async (next: boolean) => {
    const was = on;
    setOn(next);
    setBusy(true);
    try {
      const s = await learningApi.updateSettings({ pocketForAgents: next });
      setOn(s.pocketForAgents === true);
    } catch {
      setOn(was);
      toast.error('That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8">
      <p className="rc-field-label">Your pocket</p>
      {on === null ? (
        <RcSkel className="mt-2 h-12 w-full" />
      ) : (
        <ul className="set-list mt-2" aria-label="Your pocket">
          <li className="set-row track-row">
            <span className="min-w-0">
              <span className="block text-[15px] text-[var(--rc-ink-1)]">Chats can read and change my pocket notes</span>
              <span className="rc-meta block text-[13px]">Off: a chat can add a pocket note, never read one. On: it can also list, change and delete them, each undoable on Home.</span>
            </span>
            <RcSwitch checked={on} disabled={busy} label="Chats can read and change my pocket notes" onChange={(v) => void pick(v)} />
          </li>
        </ul>
      )}
    </div>
  );
}
