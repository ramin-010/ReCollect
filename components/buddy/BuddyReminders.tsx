'use client';

import { useEffect, useState } from 'react';
import { RcButton } from '@/components/rc-ui';
import { buddyApi, type BuddyReminderItem } from '@/lib/api/buddyApi';

const TIME = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Stage 7 (§4.7): the buddy's own silent reminders (for something you keep going; 2 a day at most, never a
 * task, never a sound). Shown only when it has set one; each can be taken back.
 */
export function BuddyReminders() {
  const [list, setList] = useState<BuddyReminderItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () =>
    buddyApi.buddyReminders().then(
      (l) => setList(l),
      () => setList([]),
    );
  useEffect(() => {
    void load();
  }, []);
  if (!list.length) return null;
  const takeBack = async (id: string) => {
    setBusy(id);
    try {
      await buddyApi.cancelBuddyReminder(id);
      await load();
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="you-setting">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">Its reminders</p>
        <p className="rc-meta mt-0.5">Quiet notes it set on your phone’s home screen for things you keep going. They never ring.</p>
        <ul className="mt-2 grid gap-1">
          {list.map((r) => (
            <li key={r._id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-[14px] text-[var(--rc-ink-1)]">
                {r.text}
                <span className="rc-meta">{` · ${TIME.format(new Date(r.at))}${r.thread ? ` · ${r.thread}` : ''}`}</span>
              </span>
              <RcButton size="sm" variant="quiet" busy={busy === r._id} onClick={() => void takeBack(r._id)}>
                Take back
              </RcButton>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
