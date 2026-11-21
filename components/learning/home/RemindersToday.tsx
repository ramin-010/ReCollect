'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import axiosInstance from '@/lib/utils/axios';
import { SectionHead } from './parts';

/** One of today's reminders (GET /api/reminders/today, stage 7). */
interface HomeReminder {
  _id: string;
  at: string;
  /** HH:mm on his clock. */
  time: string;
  text: string;
  /** Rings (an alarm on the phone, an email) or silent (shown here and on his phone's home screen). */
  ring: boolean;
  /** daily | weekdays | weekly, or chosen days ("mo,we,fr", Monday first). */
  repeat: string | null;
  past: boolean;
  by: 'you' | 'buddy';
}

const REPEATS: Record<string, string> = { daily: 'every day', weekdays: 'on weekdays', weekly: 'every week' };
const DAY_NAMES: Record<string, string> = { mo: 'Mon', tu: 'Tue', we: 'Wed', th: 'Thu', fr: 'Fri', sa: 'Sat', su: 'Sun' };
/** "on Mon, Wed, Fri" for a series on chosen days. */
const repeatWords = (repeat: string) => REPEATS[repeat] ?? `on ${repeat.split(',').map((d) => DAY_NAMES[d] ?? d).join(', ')}`;

/**
 * Today's reminders (ECOSYSTEM_V2_PLAN V2): the ones still to come, a silent one until 2 hours past its time
 * (it never rings or emails, so here and the phone's home screen are where it shows), and the buddy's own.
 * Hidden on a day without any; a failed call leaves it out.
 */
export function RemindersToday() {
  const [data, setData] = useState<{ items: HomeReminder[]; name: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    axiosInstance.get('/api/reminders/today').then(
      (res) => alive && setData(res.data.data),
      () => alive && setData(null),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!data?.items.length) return null;
  return (
    <section aria-labelledby="reminders-today-h">
      <SectionHead id="reminders-today-h" title="Reminders today" />
      <ul className="flex flex-col">
        {data.items.map((r) => {
          const Icon = r.ring ? Bell : BellOff;
          const meta = [r.ring ? 'Rings' : 'Silent', r.repeat ? repeatWords(r.repeat) : null, r.by === 'buddy' ? `set by ${data.name ?? 'your buddy'}` : null, r.past ? 'earlier' : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={r._id} className="rc-row -mx-2 flex items-start gap-3 rounded-[6px] px-2 py-[7px]">
              <span className={`w-[46px] shrink-0 pt-px text-[14px] font-medium tabular-nums ${r.past ? 'text-[var(--rc-ink-3)]' : 'text-[var(--rc-ink-2)]'}`}>{r.time}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[var(--rc-fs-body)] leading-[1.4] text-[var(--rc-ink-1)] break-words">{r.text}</p>
                <p className="rc-meta mt-0.5">{meta}</p>
              </div>
              <Icon
                className="mt-[3px] h-4 w-4 shrink-0 text-[var(--rc-icon)]"
                strokeWidth={1.75}
                aria-hidden
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
