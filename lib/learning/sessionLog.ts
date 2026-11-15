// "log 40m graphs" in the Ctrl K palette (SYNC_SPINE_SPEC 1.2): a session logged by hand in two
// seconds. Never required: agents and hooks write the record; this is for work done elsewhere.
import type { SessionKind } from './types';

export interface SessionLogText {
  minutes: number;
  kind: SessionKind;
  title: string;
}

const KINDS: SessionKind[] = ['study', 'practice', 'build', 'review'];

/**
 * "log 40m graphs" · "log 1h build recollect paths" · "log 1.5h dp problems" · "log 25 min review".
 * The number and its unit (m, min, h, hr, hour…), then an optional kind word, then the title.
 * Anything else is not a log line (null).
 */
export function parseSessionLog(text: string): SessionLogText | null {
  const m = /^\s*log\s+(\d{1,3}(?:\.\d)?)\s*(m|mins?|minutes?|h|hrs?|hours?)\b\s*(.*)$/i.exec(text);
  if (!m) return null;
  const amount = Number(m[1]);
  const minutes = Math.round(/^h/i.test(m[2]!) ? amount * 60 : amount);
  if (!minutes || minutes > 600) return null;
  let rest = m[3]!.trim();
  let kind: SessionKind = 'study';
  const first = rest.split(/\s+/)[0]?.toLowerCase() as SessionKind | undefined;
  if (first && KINDS.includes(first)) {
    kind = first;
    rest = rest.slice(first.length).trim();
  }
  const title = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : kind.charAt(0).toUpperCase() + kind.slice(1);
  return { minutes, kind, title: title.slice(0, 200) };
}

/** "40 min", "1 h", "1 h 20 min". */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const min = total % 60;
  return min ? `${h} h ${min} min` : `${h} h`;
}

/** Fired on window when a session was logged or changed, so Home's line reloads. */
export const SESSIONS_CHANGED_EVENT = 'recollect:sessions-changed';
