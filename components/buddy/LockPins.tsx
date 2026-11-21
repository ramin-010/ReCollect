'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RcButton } from '@/components/rc-ui';
import { buddyApi, type LockPin } from '@/lib/api/buddyApi';

const DAY_WORDS = (p: LockPin) => {
  if (p.days.length === 5 && [1, 2, 3, 4, 5].every((d) => p.days.includes(d))) return 'weekdays';
  if (p.days.length === 2 && p.days.includes(0) && p.days.includes(6)) return 'weekends';
  if (p.days.length) return p.days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
  return p.until ? (p.until === new Date().toLocaleDateString('en-CA') ? 'today' : `until ${p.until}`) : '';
};

/**
 * Stage 7 (V1): his own words on the phone's lock screen for a window, over the buddy's words. Set here, by the
 * chat or by an agent on his word; each says who set it and can be cleared at once.
 */
export function LockPins() {
  const [pins, setPins] = useState<LockPin[] | null>(null);
  const [text, setText] = useState('');
  const [to, setTo] = useState('18:00');
  const [busy, setBusy] = useState(false);

  const load = () =>
    buddyApi.lockPins().then(
      (list) => setPins(list),
      () => setPins([]),
    );
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    setBusy(true);
    try {
      await buddyApi.setLockPin({ text: clean, to });
      setText('');
      await load();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const clear = async (id: string) => {
    setBusy(true);
    try {
      await buddyApi.clearLockPin(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="you-setting">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-[var(--rc-ink-1)]">On my lock screen</p>
        <p className="rc-meta mt-0.5">Your own words on the phone’s lock screen until a time today; in that window they show instead of your buddy’s.</p>
        {!!pins?.length && (
          <ul className="mt-2 grid gap-1">
            {pins.map((p) => (
              <li key={p._id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[14px] text-[var(--rc-ink-1)]">
                  “{p.text}”
                  <span className="rc-meta">
                    {` · ${p.from}–${p.to === '00:00' ? 'midnight' : p.to}${DAY_WORDS(p) ? ` · ${DAY_WORDS(p)}` : ''}${p.now ? ' · showing now' : ''}${p.setBy !== 'you' ? ` · set by ${p.setBy === 'ask_ai' ? 'Ask AI' : 'an agent'}` : ''}`}
                  </span>
                </span>
                <RcButton size="sm" variant="quiet" disabled={busy} onClick={() => void clear(p._id)}>
                  Clear
                </RcButton>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input className="rc-input min-w-[200px] flex-1" value={text} maxLength={120} placeholder="Words to show…" aria-label="Words for the lock screen" onChange={(e) => setText(e.target.value)} />
          <label className="rc-meta flex items-center gap-1.5">
            until
            <input className="rc-input w-[128px]" type="time" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Until" />
          </label>
          <RcButton type="submit" size="sm" variant="outline" busy={busy} disabled={!text.trim()}>
            Pin
          </RcButton>
        </form>
      </div>
    </div>
  );
}
