// The brand's words and addresses (KAAGA_REBRAND_PLAN), in one plain module that server files, route handlers and
// client components can all import. The drawn brand (mark, logo) is components/brand/kaaga.

/** The product's name in sentences. */
export const PRODUCT = 'Kaaga';
/** The buddy's name when the user hasn't given it one (D2: the buddy is Kaaga). */
export const DEFAULT_BUDDY_NAME = 'Kaaga';
/** The buddy's name as the app shows it: its own, else Kaaga. */
export const buddyName = (name: string | null | undefined): string => (name && name.trim()) || DEFAULT_BUDDY_NAME;
/** Whether the buddy is Kaaga itself (no name of its own): its face is then the mark, not a letter. */
export const isKaaga = (name: string | null | undefined): boolean => !(name && name.trim()) || name.trim().toLowerCase() === 'kaaga';
/** The public web app's address. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kaaga.in').replace(/\/$/, '');

/**
 * Clears the readable sign-in hint (auth_hint) the server sets for the whole site: on the parent domain of wherever the
 * app runs (kaaga.in, and re-collect.in while it still serves), and on the bare host for localhost.
 */
export function clearAuthHint(): void {
  const gone = 'auth_hint=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = gone;
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 2 && !/^[\d.]+$/.test(host)) document.cookie = `${gone}; domain=.${parts.slice(-2).join('.')}`;
}
