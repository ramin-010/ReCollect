// Share to log (11-22, the owner: "how would I track a LeetCode problem or a YouTube video that isn't in Recollect?"):
// a link shared to Recollect from another app can be logged as time in one tap. What it reads from the share: a title,
// the kind (a problem site is practice, anything else study) and, for a problem, its name.
import type { SessionKind } from './types';

export const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/i;

/** Problem sites: a shared problem is practice. */
const PRACTICE_HOSTS = /(^|\.)(leetcode\.com|leetcode\.cn|hackerrank\.com|codeforces\.com|geeksforgeeks\.org|codechef\.com|neetcode\.io|interviewbit\.com)$/i;

export interface SharedLog {
  url: string;
  title: string;
  kind: SessionKind;
  /** A problem's name (practice from a problem site). */
  problem: string | null;
}

const words = (slug: string) =>
  decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** What a share holds for a log, or null without a link. `text` is the shared text (YouTube sends "Title\nlink"). */
export function sharedForLog(text: string, opts: { url?: string | null; title?: string | null } = {}): SharedLog | null {
  const url = (opts.url ?? '').trim() || text.match(URL_IN_TEXT)?.[0] || '';
  if (!url) return null;
  let host = '';
  let path = '';
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\.|^m\./, '');
    path = u.pathname;
  } catch {
    return null;
  }
  const rest = text.replace(url, '').replace(/\s+/g, ' ').trim();
  const given = (opts.title ?? '').trim() || rest;
  if (PRACTICE_HOSTS.test(host)) {
    const slug = path.match(/\/problems?\/([^/]+)/i)?.[1] ?? null;
    const problem = (slug ? words(slug) : given || null)?.slice(0, 180) ?? null;
    const site = host.split('.')[0]!.replace(/^./, (c) => c.toUpperCase());
    return { url, kind: 'practice', problem, title: `${site === 'Leetcode' ? 'LeetCode' : site}: ${problem ?? 'a problem'}`.slice(0, 200) };
  }
  const site = /youtube\.com|youtu\.be/i.test(host) ? 'YouTube' : host;
  return { url, kind: 'study', problem: null, title: (given ? `${given}` : `A ${site} link`).slice(0, 200) };
}

/** The one-tap amounts. */
export const LOG_MINUTES = [15, 30, 45, 60] as const;
export const minutesLabel = (m: number) => (m < 60 ? `${m} min` : `${m / 60} h`);
