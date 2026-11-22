'use client';

/**
 * The web app's look (the owner, 11-22): Slate (theme v2, the default) or Paper (the phone app's cream and warm ink),
 * each in light and dark. Kept per device like the theme; on <html> as data-look="paper" (app/theme-paper.css). A
 * small script in the root layout sets it before the first paint (WEB_LOOK_SCRIPT); this hook keeps it in step.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { WEB_LOOK_KEY } from './webLookScript';

export type WebLook = 'slate' | 'paper';
const CHANGED = 'rc-web-look-changed';

function read(): WebLook {
  try {
    return localStorage.getItem(WEB_LOOK_KEY) === 'paper' ? 'paper' : 'slate';
  } catch {
    return 'slate';
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === WEB_LOOK_KEY) {
      apply(read());
      onChange();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGED, onChange);
  };
}

function apply(look: WebLook) {
  const html = document.documentElement;
  if (look === 'paper') html.setAttribute('data-look', 'paper');
  else html.removeAttribute('data-look');
}

export function useWebLook(): [WebLook, (look: WebLook) => void] {
  const look = useSyncExternalStore(subscribe, read, () => 'slate' as WebLook);
  const set = useCallback((next: WebLook) => {
    try {
      localStorage.setItem(WEB_LOOK_KEY, next);
    } catch {
      /* storage blocked: this page only */
    }
    apply(next);
    window.dispatchEvent(new Event(CHANGED));
  }, []);
  return [look, set];
}
