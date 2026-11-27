'use client';

/**
 * The phone app's own updates (PHONE_UPDATE_PLAN §4): what Settings' version row and Today's slim row show, and their
 * words in one place. App 0.9.0 and later update themselves (android/…/Updates.java, through the bridge); an older app
 * can't, so the page offers its file, which the shell opens in the phone's browser and Android installs over the app with
 * its data kept (U6). In a browser there is no app: nothing shows.
 */
import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/utils/axios';
import { bridge, type ShellState } from '@/components/phone/shell';

/** Where an update is: ready to tap, waiting for Android's allowance, downloading, with Android, or stopped. */
export type UpdateStep = 'ready' | 'allow' | 'downloading' | 'installing' | 'failed';

export type UpdateView =
  | { kind: 'none' }
  | { kind: 'current'; version: string; checkedAt: number; checking: boolean }
  | { kind: 'ready'; version: string; installed: string; title: string; size: number | null; notes: string[]; step: UpdateStep; progress: number; error: string | null; hidden: boolean }
  | { kind: 'download'; version: string; installed: string; title: string; size: number | null; notes: string[]; url: string; hidden: boolean };

/** The server's description of its app file (GET /phone/kaaga.json). */
interface Release {
  package: string;
  version: string;
  versionCode: number;
  size: number;
  notes: string[];
  url: string;
}

/** "0.9.1-qa" reads "0.9.1". */
export const baseVersion = (v: string): string => v.split('-')[0] ?? v;

/** "Kaaga 0.9.1 is ready", or "A newer build of 0.9.0 is ready" when only the build number moved (U9). */
export const readyTitle = (installed: string, served: string): string =>
  baseVersion(installed) === baseVersion(served) ? `A newer build of ${baseVersion(served)} is ready` : `Kaaga ${baseVersion(served)} is ready`;

export const sizeWords = (bytes: number | null | undefined): string | null => (bytes ? `${Math.max(1, Math.round(bytes / 1024))} KB` : null);

/** x.y.z against x.y.z (an older app knows only its version name). */
export function newerVersion(installed: string, served: string): boolean {
  const a = baseVersion(installed).split('.').map((n) => Number(n) || 0);
  const b = baseVersion(served).split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) if ((b[i] ?? 0) !== (a[i] ?? 0)) return (b[i] ?? 0) > (a[i] ?? 0);
  return false;
}

/** What went wrong and what to do next (the updater's codes: Updates.java and UpdateRule.errorOf). */
const ERROR_WORDS: Record<string, string> = {
  offline: 'The download stopped. Check the connection and try again.',
  download: 'The server didn’t send the file. Try again in a while.',
  damaged: 'The file arrived damaged. Try again.',
  not_this_app: 'The file on the server isn’t this app, so nothing was installed.',
  not_newer: 'The file on the server isn’t newer than this app.',
  no_release: 'The server has no newer version now.',
  blocked: 'Android blocked the install. If your phone warned about an unknown app, its message says why.',
  conflict: 'Android can’t install it over this app: it was signed differently. Uninstall Kaaga, then download it again from Settings › Phone app on the web.',
  storage: 'There isn’t enough space on the phone. Free some up and try again.',
  incompatible: 'This version doesn’t run on this phone.',
  invalid: 'Android couldn’t read the file. Try again.',
  failed: 'It didn’t install. Try again.',
};
export const errorWords = (code: string | null): string => ERROR_WORDS[code ?? ''] ?? ERROR_WORDS.failed!;

const HIDDEN_KEY = 'pw:update-hidden';
function hiddenVersion(): string | null {
  try {
    return localStorage.getItem(HIDDEN_KEY);
  } catch {
    return null;
  }
}

/** One question to the server per page load, per file (an older app's path). */
const asked = new Map<string, Promise<Release | null>>();
function releaseOf(file: string): Promise<Release | null> {
  let p = asked.get(file);
  if (!p) {
    p = axiosInstance.get(file).then(
      (r) => (r.data?.data as Release | undefined) ?? null,
      () => null,
    );
    asked.set(file, p);
  }
  return p;
}

export interface AppUpdate {
  view: UpdateView;
  /** The app can check by itself (0.9.0 and later). */
  canCheck: boolean;
  check(): void;
  start(): void;
  allow(): void;
  hide(): void;
}

/** The app's update as the page shows it. */
export function useAppUpdate(shell: ShellState | null): AppUpdate {
  const inApp = !!shell;
  const version = shell?.version ?? '';
  const updater = !!bridge()?.checkUpdate;
  const api = String(axiosInstance.defaults.baseURL ?? '').replace(/\/+$/, '');
  const [release, setRelease] = useState<Release | null | undefined>(undefined);
  const [hidden, setHidden] = useState<string | null>(() => (typeof window === 'undefined' ? null : hiddenVersion()));

  useEffect(() => {
    if (!inApp) return;
    if (updater) {
      // The app asks its server when its last answer is over an hour old.
      bridge()?.checkUpdate?.(api, false);
      return;
    }
    let alive = true;
    void releaseOf(version.endsWith('-qa') ? '/phone/kaaga-qa.json' : '/phone/kaaga.json').then((r) => {
      if (alive) setRelease(r);
    });
    return () => {
      alive = false;
    };
  }, [inApp, updater, api, version]);

  let view: UpdateView = { kind: 'none' };
  if (shell && updater && shell.update) {
    const u = shell.update;
    if (u.available && u.version) {
      const step: UpdateStep =
        u.stage === 'downloading' ? 'downloading' : u.stage === 'installing' ? 'installing' : !u.canInstall ? 'allow' : u.stage === 'failed' ? 'failed' : 'ready';
      view = { kind: 'ready', version: u.version, installed: shell.version, title: readyTitle(shell.version, u.version), size: u.size ?? null, notes: u.notes ?? [], step, progress: u.progress, error: u.error, hidden: u.hidden };
    } else view = { kind: 'current', version: shell.version, checkedAt: u.checkedAt, checking: u.stage === 'checking' };
  } else if (shell && release && newerVersion(shell.version, release.version)) {
    view = { kind: 'download', version: release.version, installed: shell.version, title: readyTitle(shell.version, release.version), size: release.size ?? null, notes: release.notes ?? [], url: `${api}${release.url}`, hidden: hidden === release.version };
  } else if (shell) view = { kind: 'current', version: shell.version, checkedAt: 0, checking: release === undefined };

  return {
    view,
    canCheck: updater,
    check: () => bridge()?.checkUpdate?.(api, true),
    start: () => bridge()?.startUpdate?.(),
    allow: () => bridge()?.allowInstalls?.(),
    hide: () => {
      if (updater) {
        bridge()?.hideUpdate?.();
        return;
      }
      if (!release) return;
      try {
        localStorage.setItem(HIDDEN_KEY, release.version);
      } catch {
        /* the row comes back next time */
      }
      setHidden(release.version);
    },
  };
}
