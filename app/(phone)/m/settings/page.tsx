'use client';

/**
 * Settings on the phone (PHONE_APP_REDESIGN_PLAN §5, steps 4 and 5): the account; this phone (its connection, a
 * refresh, the rest of the app's own settings); the buddy (its name, its voice, whether it may ask questions, whether it
 * uses AI at all, with this month's spend); the app (the look, quiet hours, notifications); disconnect. This phone's
 * parts are the phone app's own (android/…/Shell.java, through the bridge): in a browser they don't show.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Unplug, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/authStore';
import { buddyApi, type BuddySettings } from '@/lib/api/buddyApi';
import { recallApi, type AiUsage } from '@/lib/api/recallApi';
import { lookName, useLook } from '@/components/phone/look';
import { Switch, agoWords } from '@/components/phone/parts';
import { bridge, connectThisPhone, minutesWords, useShell, type ShellState } from '@/components/phone/shell';
import { useKept } from '@/components/phone/kept';
import { PhoneChecklist, PhoneFeedback } from '@/components/phone/checklist';

type Patch = Partial<Pick<BuddySettings, 'name' | 'tone' | 'asksOn' | 'paused'>>;
type SheetKind = 'quiet' | 'notify' | 'disconnect';
const VOICES: Array<[BuddySettings['tone'], string]> = [
  ['candid', 'Candid'],
  ['gentle', 'Gentle'],
  ['bro', 'Bro'],
];

const notifyWords = (s: ShellState): string => (s.notes && s.reminders ? 'Questions, reminders' : s.notes ? 'Questions' : s.reminders ? 'Reminders' : 'Off');
const quietWords = (s: ShellState): string => (s.quiet ? `${minutesWords(s.quietFrom)} to ${minutesWords(s.quietTo)}` : 'Off');

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { look } = useLook();
  const shell = useShell();
  const [settings, setSettings] = useKept<BuddySettings | null>('settings:buddy', null);
  const [usage, setUsage] = useKept<AiUsage | null>('settings:usage', null);
  const [name, setName] = useState(() => settings?.name ?? '');
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [connecting, setConnecting] = useState(false);
  const initial = user?.name?.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    let alive = true;
    buddyApi.you().then(
      (y) => {
        if (!alive) return;
        setSettings(y.settings);
        setName(y.settings.name ?? '');
      },
      () => undefined,
    );
    recallApi.usage().then((u) => alive && setUsage(u), () => undefined);
    return () => {
      alive = false;
    };
  }, [setSettings, setUsage]);

  const save = async (patch: Patch, done?: string) => {
    if (!settings) return;
    const before = settings;
    setSettings({ ...settings, ...patch });
    try {
      setSettings(await buddyApi.updateSettings(patch));
      if (done) toast.success(done);
    } catch {
      setSettings(before);
      toast.error('That didn’t save. Try again.');
    }
  };
  const saveName = () => {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
    if ((settings?.name ?? '') === clean) return;
    void save({ name: clean || null }, clean ? `It answers to ${clean} now.` : 'It has no name now.');
  };
  const connect = async () => {
    setConnecting(true);
    try {
      await connectThisPhone();
    } catch {
      toast.error('It could not connect. Try again.');
    } finally {
      setConnecting(false);
    }
  };

  const buddyOn = !!settings?.enabled;
  const buddyName = settings?.name?.trim() || 'your buddy';
  const close = () => setSheet(null);
  return (
    <>
      <header className="bar">
        <Link href="/m/you" className="icon-btn" aria-label="Back">
          <ChevronLeft className="i" strokeWidth={1.75} aria-hidden />
        </Link>
        <p className="bar-title">Settings</p>
      </header>
      <div className="scroll" style={{ paddingTop: 0 }}>
        <div className="set" style={{ alignItems: 'center', marginTop: 6 }}>
          <span className="avatar">{initial}</span>
          <div className="row-main">
            <p className="row-title">{user?.name ?? 'Signed in'}</p>
            {user?.email ? <p className="meta">{user.email}</p> : null}
          </div>
        </div>

        {shell ? (
          <div className="group">
            <h2>This phone</h2>
            {shell.connected ? (
              <div className="set">
                <div className="row-main">
                  <p className="row-title">Connected</p>
                  {shell.failure ? (
                    <p className="meta" style={{ color: 'var(--attention)' }}>
                      <AlertCircle className="i s" strokeWidth={1.75} aria-hidden />
                      {shell.failure}
                    </p>
                  ) : (
                    <p className="meta">
                      <CheckCircle2 className="i s" strokeWidth={1.75} style={{ color: 'var(--good)' }} aria-hidden />
                      {shell.busy ? 'Refreshing…' : shell.okAt ? `Refreshed ${agoWords(new Date(shell.okAt).toISOString())}` : 'Not read yet'}
                    </p>
                  )}
                </div>
                <button type="button" className="btn out" style={{ height: 38, padding: '0 14px', opacity: shell.busy ? 0.55 : 1 }} disabled={shell.busy} onClick={() => bridge()?.refresh()}>
                  <RefreshCw className="i s" strokeWidth={1.75} aria-hidden />
                  Refresh
                </button>
              </div>
            ) : (
              <div className="set">
                <div className="row-main">
                  <p className="row-title">Not connected</p>
                  <p className="meta">Connect it for your lock screen, reminders that ring here, and questions</p>
                </div>
                <button type="button" className="btn main" style={{ height: 38, padding: '0 16px', opacity: connecting || shell.busy ? 0.55 : 1 }} disabled={connecting || shell.busy} onClick={() => void connect()}>
                  Connect
                </button>
              </div>
            )}
            <button type="button" className="set" style={{ width: '100%' }} onClick={() => bridge()?.openSettings()}>
              <div className="row-main">
                <p className="row-title">More on this phone</p>
                <p className="meta">The widget, notification icons, the pictures’ theme</p>
              </div>
              <span className="val">
                <ChevronRight className="i" strokeWidth={1.75} aria-hidden />
              </span>
            </button>
          </div>
        ) : null}

        {/* Stage 11 (his items 10c, 10d): what the phone allows, last times, diagnostics; feedback to the owner. */}
        {shell ? <PhoneChecklist shell={shell} /> : null}
        <PhoneFeedback />

        {settings && buddyOn ? (
          <div className="group">
            <h2>Your buddy</h2>
            <div className="set" style={{ display: 'block' }}>
              <label className="row-title" htmlFor="pw-buddy-name">
                Name
              </label>
              <input
                id="pw-buddy-name"
                className="field-input"
                value={name}
                maxLength={40}
                placeholder="Give it a name"
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
              />
            </div>
            <div className="set" style={{ display: 'block' }}>
              <p className="row-title">Voice</p>
              <div className="seg" style={{ marginTop: 8 }} role="group" aria-label="Voice">
                {VOICES.map(([tone, label]) => (
                  <button key={tone} type="button" className={settings.tone === tone ? 'is-on' : ''} aria-pressed={settings.tone === tone} onClick={() => void save({ tone })}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="set">
              <div className="row-main">
                <p className="row-title">May ask me questions</p>
                <p className="meta">Off: it still listens, and never asks</p>
              </div>
              <Switch on={settings.asksOn !== false} label="May ask me questions" onChange={(next) => void save({ asksOn: next })} />
            </div>
            <div className="set">
              <div className="row-main">
                <p className="row-title">Use AI</p>
                <p className="meta">{settings.paused ? 'Paused: nothing is read or written until you turn it on' : usage ? `$${usage.spentUsd.toFixed(2)} of $${usage.capUsd} used this month` : 'On'}</p>
              </div>
              <Switch on={!settings.paused} label="Use AI" onChange={(next) => void save({ paused: !next }, next ? 'On again.' : 'Paused.')} />
            </div>
          </div>
        ) : settings ? (
          <div className="group">
            <h2>Your buddy</h2>
            <p className="meta">Your buddy is off. Turn it on in the web app, under You.</p>
          </div>
        ) : null}

        <div className="group">
          <h2>The app</h2>
          <Link href="/m/look" className="set" style={{ width: '100%' }}>
            <div className="row-main">
              <p className="row-title">Look</p>
            </div>
            <span className="val">
              {lookName(look)}
              <ChevronRight className="i" strokeWidth={1.75} aria-hidden />
            </span>
          </Link>
          {shell ? (
            <>
              <button type="button" className="set" style={{ width: '100%' }} onClick={() => setSheet('quiet')}>
                <div className="row-main">
                  <p className="row-title">Quiet hours</p>
                </div>
                <span className="val">
                  {quietWords(shell)}
                  <ChevronRight className="i" strokeWidth={1.75} aria-hidden />
                </span>
              </button>
              <button type="button" className="set" style={{ width: '100%' }} onClick={() => setSheet('notify')}>
                <div className="row-main">
                  <p className="row-title">Notifications</p>
                </div>
                <span className="val">
                  {notifyWords(shell)}
                  <ChevronRight className="i" strokeWidth={1.75} aria-hidden />
                </span>
              </button>
            </>
          ) : null}
        </div>

        {shell ? (
          <div className="group">
            {shell.connected ? (
              <button type="button" className="danger-text" onClick={() => setSheet('disconnect')}>
                Disconnect this phone
              </button>
            ) : null}
            <p className="meta">Your day {shell.version} for Android</p>
          </div>
        ) : null}
      </div>

      {/* The sheets: quiet hours, notifications, and disconnect's question. Back or a tap outside closes them. */}
      <div className={`sheet-layer${sheet && shell ? ' is-on' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
        {sheet && shell ? (
          <div className="sheet is-on" role="dialog" aria-label={sheet === 'quiet' ? 'Quiet hours' : sheet === 'notify' ? 'Notifications' : 'Disconnect this phone'}>
            <div className="grab" />
            {sheet === 'quiet' ? (
              <>
                <div className="top-row">
                  <p className="sheet-title">Quiet hours</p>
                  <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
                    <X className="i" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
                <p className="meta">No picture changes or notifications in these hours. Reminders still ring at their time.</p>
                <div className="set">
                  <div className="row-main">
                    <p className="row-title">Quiet hours</p>
                  </div>
                  <Switch on={shell.quiet} label="Quiet hours" onChange={(next) => bridge()?.setSwitch('quiet', next)} />
                </div>
                {(['from', 'to'] as const).map((which) => (
                  <button key={which} type="button" className="set" style={{ width: '100%', opacity: shell.quiet ? 1 : 0.45 }} disabled={!shell.quiet} onClick={() => bridge()?.pickTime(which)}>
                    <div className="row-main">
                      <p className="row-title">{which === 'from' ? 'From' : 'To'}</p>
                    </div>
                    <span className="val">
                      {minutesWords(which === 'from' ? shell.quietFrom : shell.quietTo)}
                      <ChevronRight className="i" strokeWidth={1.75} aria-hidden />
                    </span>
                  </button>
                ))}
              </>
            ) : sheet === 'notify' ? (
              <>
                <div className="top-row">
                  <p className="sheet-title">Notifications</p>
                  <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
                    <X className="i" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
                <div className="set">
                  <div className="row-main">
                    <p className="row-title">Questions and notes from {buddyName}</p>
                    <p className="meta">At most two a day, never in quiet hours</p>
                  </div>
                  <Switch on={shell.notes} label={`Questions and notes from ${buddyName}`} onChange={(next) => bridge()?.setSwitch('notes', next)} />
                </div>
                <div className="set">
                  <div className="row-main">
                    <p className="row-title">Ring for my reminders</p>
                    <p className="meta">At their time, quiet hours or not</p>
                  </div>
                  <Switch on={shell.reminders} label="Ring for my reminders" onChange={(next) => bridge()?.setSwitch('reminders', next)} />
                </div>
              </>
            ) : (
              <>
                <p className="sheet-title">Disconnect this phone?</p>
                <p className="meta" style={{ marginTop: 6 }}>
                  The app stops reading your day, takes its pictures off your screens, and ends its code. Your reminders stop ringing here.
                </p>
                <div className="acts">
                  <button
                    type="button"
                    className="act danger"
                    onClick={() => {
                      bridge()?.disconnect();
                      close();
                    }}
                  >
                    <Unplug className="i" strokeWidth={1.75} aria-hidden />
                    <span>Disconnect</span>
                  </button>
                  <button type="button" className="act" onClick={close}>
                    <X className="i" strokeWidth={1.75} aria-hidden />
                    <span>Keep it connected</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
