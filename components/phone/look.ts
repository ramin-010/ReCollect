'use client';

/**
 * The phone world's look, kept per device (PHONE_APP_REDESIGN_PLAN §2, §8: Paper is the default, Slate the web app's
 * greys; light, dark or the system's). It lives on <html> as data-pw-theme and data-pw-mode: a small script in the
 * phone layout sets them before the first paint (LOOK_SCRIPT), and this hook keeps them in step when it changes.
 * The device's storage and the system's dark mode are read as external stores (no state copied in effects).
 */
import { useCallback, useSyncExternalStore } from 'react';
import { LOOK_KEY } from './lookScript';

export type LookTheme = 'paper' | 'slate';
export type LookMode = 'light' | 'dark' | 'system';
export interface Look {
  theme: LookTheme;
  mode: LookMode;
}

export const DEFAULT_LOOK: Look = { theme: 'paper', mode: 'system' };
const CHANGED = 'rc-phone-look';
const DARK = '(prefers-color-scheme: dark)';

function parseLook(raw: string | null): Look {
  try {
    const v = JSON.parse(raw ?? 'null') as Partial<Look> | null;
    if (v && (v.theme === 'paper' || v.theme === 'slate') && (v.mode === 'light' || v.mode === 'dark' || v.mode === 'system')) return { theme: v.theme, mode: v.mode };
  } catch {
    /* not a look: the default */
  }
  return DEFAULT_LOOK;
}

// The same object while the stored words are the same (a store's snapshot must not change on every read).
let cached: { raw: string | null; look: Look } | null = null;
function lookSnapshot(): Look {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOOK_KEY);
  } catch {
    /* storage blocked: the default */
  }
  if (!cached || cached.raw !== raw) cached = { raw, look: parseLook(raw) };
  return cached.look;
}

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK);
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange);
  mq.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
    mq.removeEventListener('change', onChange);
  };
}

const serverLook = (): Look => DEFAULT_LOOK;
const systemDark = (): boolean => window.matchMedia(DARK).matches;
const no = (): boolean => false;
const yes = (): boolean => true;

/**
 * The look, the mode it resolves to now, and a way to change it (saved on this device; every screen follows).
 * `ready` is true once the page runs on the device: until then nothing should touch <html> (the first-paint script
 * already set it right).
 */
export function useLook(): { look: Look; mode: 'light' | 'dark'; ready: boolean; save: (next: Look) => void } {
  const look = useSyncExternalStore(subscribe, lookSnapshot, serverLook);
  const dark = useSyncExternalStore(subscribe, systemDark, no);
  const ready = useSyncExternalStore(subscribe, yes, no);

  const save = useCallback((next: Look) => {
    try {
      localStorage.setItem(LOOK_KEY, JSON.stringify(next));
    } catch {
      /* not kept on this device */
    }
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  const mode: 'light' | 'dark' = look.mode === 'system' ? (dark ? 'dark' : 'light') : look.mode;
  return { look, mode, ready, save };
}

export const lookName = (look: Look): string => `${look.theme === 'paper' ? 'Paper' : 'Slate'}, ${look.mode}`;
