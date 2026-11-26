'use client';

/** Small parts the phone screens share (PHONE_APP_REDESIGN_PLAN §5): the day's dial, times and days in words, the ears' names. */

/** The day's dial: one arc per thing today, lit when done (the mock-up's drawDial). */
export function Dial({ total, done, size = 38, r = 15, width = 4, label }: { total: number; done: number; size?: number; r?: number; width?: number; label: string }) {
  const n = Math.max(total, 1);
  const c = 2 * Math.PI * r;
  const seg = c / n;
  const dash = Math.max(seg - width - 3, 2);
  const lead = ((seg - dash) / 2 / c) * 360;
  return (
    <svg className="dial" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <circle
          key={i}
          className={i < done ? 'done' : undefined}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={`${dash.toFixed(2)} ${(c - dash).toFixed(2)}`}
          transform={`rotate(${(-90 + (i * 360) / n + lead).toFixed(1)} ${size / 2} ${size / 2})`}
        />
      ))}
    </svg>
  );
}

/** "9:30 pm". */
export const clockWords = (iso: string): string => new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));

/** "22:30" (a time on their clock) as "10:30 pm". */
export function hhmmWords(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return clockWords(d.toISOString());
}

const DAY_MS = 86_400_000;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "today", "yesterday", "Monday" (this week), else "4 Nov". From a day ("YYYY-MM-DD") or an instant. */
export function dayWords(value: string, now = new Date()): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  const diff = Math.round((dayStart(now) - dayStart(d)) / DAY_MS);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff > 1 && diff < 7) return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(d);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
}

/** "2 minutes ago", "3 hours ago", "yesterday", "4 Nov". */
export function agoWords(iso: string, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24 && dayStart(now) === dayStart(new Date(iso))) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return dayWords(iso, now);
}

/** The second review of four: the chain is 1, 3, 7 and 21 days. */
const ORDINALS = ['First', 'Second', 'Third', 'Fourth'];
export const reviewWords = (cycle: number): string => (cycle >= 1 && cycle <= 4 ? `${ORDINALS[cycle - 1]} review of four` : 'A review');

/** Where its words come from, in the person's terms (the ear meter's sources). */
export const SOURCE_WORDS: Record<string, string> = {
  hook: 'Claude Code',
  ask_ai: 'This chat and Ask Kaaga',
  doc_ask: 'Ask Kaaga in a doc',
  answer: 'Your answers to its questions',
  agent: 'Notes your agents saved',
  tell: 'Tell Kaaga',
  app: 'This app',
  pocket: 'Your pocket notes',
  import: 'Chats you brought in',
  connector: 'Your other AI apps',
};

/** The mock-up's switch (a button with role="switch"). */
export function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`switch${on ? ' is-on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      style={disabled ? { opacity: 0.45 } : undefined}
      onClick={() => onChange(!on)}
    />
  );
}
