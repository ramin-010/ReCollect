'use client';

/**
 * The phone app around the phone world (PHONE_APP_REDESIGN_PLAN §7 step 5). Inside the app's shell (android/…/Shell.java)
 * the page talks to it through a small bridge, window.RcShell: the system bars in the look's colours, the app's own
 * settings (the lock screen's style, what shows on the screens, quiet hours, notifications, this phone's connection),
 * and voice for the mic. The shell answers through window.__rcShell(kind, text), turned here into a window event. In a
 * browser there is no bridge: these parts don't show.
 */
import { useSyncExternalStore } from 'react';
import axiosInstance from '@/lib/utils/axios';
import { agentApi } from '@/lib/api/agentApi';

/** What the phone app holds (its own settings, kept on the phone and sent with each picture it asks for). */
export interface ShellState {
  version: string;
  connected: boolean;
  /** The server it reads, as "host:port". */
  server: string | null;
  /** When it last read the day (ms; 0: never). */
  okAt: number;
  /** The last problem, worded for the person, or null. */
  failure: string | null;
  lock: boolean;
  home: boolean;
  live: boolean;
  hideTitles: boolean;
  style: string;
  color: string | null;
  /** Stage 11 (app 0.7.x): each screen its own look; an older app has only `style` and `color` for both. */
  lockStyle?: string;
  lockColor?: string | null;
  homeStyle?: string;
  homeColor?: string | null;
  /** Stage 11: the permissions checklist (ok, needed, not_asked, unknown) and when the pictures last changed (ms). */
  permissions?: Partial<Record<PermissionKind, PermissionState>>;
  picturesAt?: number;
  /** The pictures' theme now (the app's own choice, or the phone's dark mode). */
  pictureTheme: 'dark' | 'light';
  quiet: boolean;
  /** Minutes after midnight. */
  quietFrom: number;
  quietTo: number;
  /** Questions and notes as notifications. */
  notes: boolean;
  /** Reminders ring on the phone. */
  reminders: boolean;
  /** Android's speech recognizer is there. */
  voice: boolean;
  /** A refresh or a connect is running. */
  busy: boolean;
}

export type ShellSwitch = 'lock' | 'home' | 'hideTitles' | 'notes' | 'reminders' | 'quiet';

/** Stage 11 (his item 10c): what the app needs from the phone. */
export type PermissionKind = 'exactAlarms' | 'notifications' | 'battery' | 'autoStart' | 'notificationAccess';
export type PermissionState = 'ok' | 'needed' | 'not_asked' | 'unknown';

interface Bridge {
  state(): string;
  setBars(ground: string, darkIcons: boolean): void;
  setSwitch(key: ShellSwitch, on: boolean): void;
  setStyle(style: string, color: string | null): void;
  /** Stage 11 (app 0.7.x): one screen's look; absent in older apps. */
  setScreenStyle?(screen: 'lock' | 'home', style: string, color: string | null): void;
  openPermission?(kind: PermissionKind): void;
  sendDiagnostics?(): void;
  pickTime(which: 'from' | 'to'): void;
  refresh(): void;
  connect(server: string, token: string): void;
  disconnect(): void;
  openSettings(): void;
  listen(): void;
}

const EVENT = 'rc-shell';
interface ShellEvent {
  kind: 'changed' | 'heard' | 'voice-none' | 'diagnostics';
  text: string | null;
}

/** Stage 11: one screen's look as the app holds it (an older app: the one look of both screens). */
export function screenLook(shell: ShellState, screen: 'lock' | 'home'): { style: string; color: string | null } {
  const style = screen === 'lock' ? shell.lockStyle : shell.homeStyle;
  const color = screen === 'lock' ? shell.lockColor : shell.homeColor;
  return style ? { style, color: color ?? null } : { style: shell.style, color: shell.color };
}

/** Stage 11: sets one screen's look (an older app sets both). */
export function setScreenLook(screen: 'lock' | 'home', style: string, color: string | null): void {
  const b = bridge();
  if (!b) return;
  if (b.setScreenStyle) b.setScreenStyle(screen, style, color);
  else b.setStyle(style, color);
}

/** Stage 11 (his item 10d): sends the phone's facts to the owner; resolves true when the server took them. */
export function sendDiagnostics(): Promise<boolean> {
  const b = bridge();
  if (!b?.sendDiagnostics) return Promise.resolve(false);
  return new Promise((resolve) => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<ShellEvent>).detail;
      if (d?.kind !== 'diagnostics') return;
      window.removeEventListener(EVENT, on);
      resolve(d.text === 'sent');
    };
    window.addEventListener(EVENT, on);
    b.sendDiagnostics!();
  });
}

/** The bridge, inside the app's shell; null in a browser. */
export const bridge = (): Bridge | null => (typeof window === 'undefined' ? null : ((window as unknown as { RcShell?: Bridge }).RcShell ?? null));

if (typeof window !== 'undefined') {
  (window as unknown as { __rcShell?: (kind: string, text: string | null) => void }).__rcShell = (kind, text) => {
    window.dispatchEvent(new CustomEvent<ShellEvent>(EVENT, { detail: { kind: kind as ShellEvent['kind'], text } }));
  };
}

// The same object while the shell's answer is the same (a store's snapshot must not change on every read).
let cached: { raw: string; state: ShellState } | null = null;
function read(): ShellState | null {
  const b = bridge();
  if (!b) return null;
  try {
    const raw = b.state();
    if (!cached || cached.raw !== raw) cached = { raw, state: JSON.parse(raw) as ShellState };
    return cached.state.version ? cached.state : null;
  } catch {
    return null;
  }
}
let latest: ShellState | null = null;
function snapshot(): ShellState | null {
  if (latest === null && bridge()) latest = read();
  return latest;
}
function subscribe(onChange: () => void): () => void {
  const on = (e: Event) => {
    if ((e as CustomEvent<ShellEvent>).detail?.kind !== 'changed') return;
    latest = read();
    onChange();
  };
  window.addEventListener(EVENT, on);
  return () => window.removeEventListener(EVENT, on);
}
const none = (): ShellState | null => null;

/** The phone app's settings, kept in step with the shell; null in a browser (and before the page runs). */
export function useShell(): ShellState | null {
  return useSyncExternalStore(subscribe, snapshot, none);
}

/**
 * Android's speech recognizer: resolves with the words heard, or null (nothing heard, cancelled, no recognizer).
 */
export function listen(): Promise<string | null> {
  const b = bridge();
  if (!b) return Promise.resolve(null);
  return new Promise((resolve) => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<ShellEvent>).detail;
      if (d?.kind !== 'heard' && d?.kind !== 'voice-none') return;
      window.removeEventListener(EVENT, on);
      resolve(d.kind === 'heard' ? d.text : null);
    };
    window.addEventListener(EVENT, on);
    b.listen();
  });
}

/**
 * Connects this phone from the signed-in page: a code with the narrow `ambient` scope (what the connect QR carries),
 * handed straight to the app, which checks it against the server before it keeps it.
 */
export async function connectThisPhone(): Promise<void> {
  const b = bridge();
  if (!b) return;
  const made = await agentApi.createToken({ name: 'Phone app', scopes: ['ambient'] });
  b.connect(String(axiosInstance.defaults.baseURL ?? ''), made.token);
}

/**
 * A colour as #RRGGBB for the shell's bars: the built CSS shortens #FFFFFF to #fff, and a browser may report rgb().
 */
export function hex6(color: string): string | null {
  const c = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toUpperCase();
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(c);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  return null;
}

/** "11 pm", "7:30 am". */
export function minutesWords(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}
