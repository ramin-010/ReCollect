'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RcButton, RcSwitch } from '@/components/rc-ui';
import { buddyApi, type ScreenRule } from '@/lib/api/buddyApi';

/**
 * Stage 5b (ECOSYSTEM_V2_PLAN, part B): what the buddy learned about his screens: when it may ask him (his words in any
 * chat) and what stays off his lock screen (his words, or "Not this: too private" on a line about no thread). Each
 * says where it came from; Remove ends it. A thread kept off the screens shows under On my mind.
 * Stage 16: the goal on the phone's pictures is a switch here, off by default (a goal may be private); it shows with
 * or without the loop, the rules only with it.
 */
export function OnMyScreens({ rules, loop, goalOnScreens, onChanged }: { rules: ScreenRule[]; loop: boolean; goalOnScreens: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await buddyApi.endScreenRule(id);
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const toggleGoal = async (next: boolean) => {
    setBusy('goal');
    try {
      await buddyApi.updateSettings({ goalOnScreens: next });
      toast.success(next ? 'Your goal shows on your phone’s lock screen' : 'Your goal stays off your phone’s screens');
      onChanged();
    } catch {
      toast.error('That didn’t save. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="you-setting">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Show my goal on my phone screens</p>
          <p className="rc-meta mt-0.5">Its days left, quietly, under the lock screen’s rows. Off by default: anyone near your phone can read it.</p>
        </div>
        <RcSwitch checked={goalOnScreens} disabled={busy === 'goal'} onChange={(v) => void toggleGoal(v)} label="Show my goal on my phone screens" />
      </div>
      {loop && (
        <div className="you-setting">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">On my screens</p>
            <p className="rc-meta mt-0.5">When it may ask you, and what stays off your lock screen. Tell it in the chat (“ask me later in the evening”), or tap “Not this” on a line.</p>
            {rules.length ? (
              <ul className="mt-2 grid gap-1">
                {rules.map((r) => (
                  <li key={r._id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-[14px] text-[var(--rc-ink-1)]">
                      {r.what}
                      <span className="rc-meta">{r.source === 'thumb' ? ' · from your “not this”' : r.kind === 'topic' ? '' : ` · you said “${r.text}”`}</span>
                    </span>
                    <RcButton size="sm" variant="quiet" busy={busy === r._id} onClick={() => void remove(r._id)}>
                      Remove
                    </RcButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-[var(--rc-ink-2)]">Nothing yet: it asks in the hours it judges best and keeps private things off.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
