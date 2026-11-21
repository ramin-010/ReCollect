'use client';

/**
 * The phone app's checklist (ECOSYSTEM_V2_PLAN stage 11, his items 10c and 10d): what the app needs from this phone to
 * keep the pictures and reminders on time (exact alarms, notifications, the battery, the maker's auto-start, and for the
 * live lock screen notification access), each with its state and the button to the system's own screen, when the
 * pictures last changed, and "Send diagnostics" for the owner. Shown inside the app's shell (app 0.7.x) only.
 */
import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { agoWords } from '@/components/phone/parts';
import { bridge, sendDiagnostics, type PermissionKind, type PermissionState, type ShellState } from '@/components/phone/shell';
import { ownerApi } from '@/lib/api/ownerApi';

const ROWS: Array<{ kind: PermissionKind; title: string; why: string }> = [
  { kind: 'exactAlarms', title: 'Alarms on the minute', why: 'Reminders ring at their time, not a few minutes late' },
  { kind: 'notifications', title: 'Notifications', why: 'Reminders and the buddy’s questions can reach you' },
  { kind: 'battery', title: 'Not optimised for battery', why: 'The pictures and alarms keep running in the background' },
  { kind: 'autoStart', title: 'Start by itself', why: 'Your phone’s maker may stop apps after a restart: allow Recollect' },
  { kind: 'notificationAccess', title: 'Notification access', why: 'Only for the live lock screen’s notification icons' },
];

const STATE_WORDS: Record<PermissionState, string> = { ok: 'On', needed: 'Off', unknown: 'Check it once', not_asked: '' };

function StateIcon({ state }: { state: PermissionState }) {
  if (state === 'ok') return <CheckCircle2 className="i s" strokeWidth={1.75} style={{ color: 'var(--good)' }} aria-hidden />;
  if (state === 'needed') return <AlertCircle className="i s" strokeWidth={1.75} style={{ color: 'var(--attention)' }} aria-hidden />;
  return <HelpCircle className="i s" strokeWidth={1.75} aria-hidden />;
}

export function PhoneChecklist({ shell }: { shell: ShellState }) {
  const [sending, setSending] = useState(false);
  const perms = shell.permissions;
  if (!perms) return null;
  // Notification access matters only with the live lock screen on.
  const rows = ROWS.filter((r) => perms[r.kind] && perms[r.kind] !== 'not_asked' && (r.kind !== 'notificationAccess' || shell.live));

  const send = async () => {
    setSending(true);
    const ok = await sendDiagnostics();
    setSending(false);
    if (ok) toast.success('Sent. Thank you.');
    else toast.error(shell.connected ? 'It wasn’t sent. Try again.' : 'Connect this phone first.');
  };

  return (
    <div className="group">
      <h2>What this phone allows</h2>
      {rows.map((r) => {
        const state = perms[r.kind]!;
        return (
          <button key={r.kind} type="button" className="set" style={{ width: '100%' }} onClick={() => bridge()?.openPermission?.(r.kind)}>
            <div className="row-main">
              <p className="row-title">{r.title}</p>
              <p className="meta" style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ flex: 'none', marginTop: 1 }}>
                  <StateIcon state={state} />
                </span>
                <span style={{ minWidth: 0 }}>
                  {STATE_WORDS[state]} · {r.why}
                </span>
              </p>
            </div>
            <span className="val">
              <ChevronRight className="i" strokeWidth={1.75} aria-hidden />
            </span>
          </button>
        );
      })}
      <div className="set">
        <div className="row-main">
          <p className="row-title">Last updated</p>
          <p className="meta">
            Read {shell.okAt ? agoWords(new Date(shell.okAt).toISOString()) : 'never'} · pictures changed {shell.picturesAt ? agoWords(new Date(shell.picturesAt).toISOString()) : 'not yet'}
          </p>
        </div>
      </div>
      <div className="set">
        <div className="row-main">
          <p className="row-title">Send diagnostics</p>
          <p className="meta">Your phone’s model, Android version, screen size and these settings, to the person who runs this server. Nothing personal.</p>
        </div>
        <button type="button" className="btn out" style={{ height: 38, padding: '0 14px', opacity: sending ? 0.55 : 1 }} disabled={sending} onClick={() => void send()}>
          Send
        </button>
      </div>
    </div>
  );
}

/** Send feedback from the phone (§9.6 item 5): their words to the owner, as in the web app's Settings. */
export function PhoneFeedback() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await ownerApi.sendFeedback(text.trim(), '/m/settings');
      setText('');
      toast.success('Sent. Thank you.');
    } catch {
      toast.error('It wasn’t sent. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="group">
      <h2>Send feedback</h2>
      <div className="set" style={{ display: 'block' }}>
        <textarea
          className="note-field"
          rows={4}
          maxLength={4000}
          value={text}
          placeholder="What works, what doesn’t, what you wish it did"
          aria-label="Your feedback"
          onChange={(e) => setText(e.target.value)}
        />
        <p className="meta" style={{ marginTop: 6 }}>It goes to the person who runs this server, with your name.</p>
        <button type="button" className="btn main" style={{ height: 38, padding: '0 16px', marginTop: 10, opacity: busy || !text.trim() ? 0.55 : 1 }} disabled={busy || !text.trim()} onClick={() => void send()}>
          Send feedback
        </button>
      </div>
    </div>
  );
}
