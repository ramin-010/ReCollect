'use client';

/**
 * The phone app's update on screen (PHONE_UPDATE_PLAN §4): Settings' version row (always, inside the app) and Today's
 * slim row (only while a newer version waits; its × closes it for that version). The words live in update.ts.
 */
import Link from 'next/link';
import { AlertCircle, ArrowDownToLine, CheckCircle2, X } from 'lucide-react';
import { agoWords } from '@/components/phone/parts';
import type { ShellState } from '@/components/phone/shell';
import { baseVersion, errorWords, sizeWords, useAppUpdate } from '@/components/phone/update';

const BUTTON = { height: 38, padding: '0 16px' } as const;

/** Settings › This phone: the app's version, and its update when one is out. */
export function UpdateRow({ shell }: { shell: ShellState }) {
  const u = useAppUpdate(shell);
  const v = u.view;
  if (v.kind === 'none') return null;

  if (v.kind === 'current') {
    return (
      <div className="set" data-update="current">
        <div className="row-main">
          <p className="row-title">Kaaga {v.version}</p>
          <p className="meta">
            {v.checking ? (
              'Checking for a newer version…'
            ) : (
              <>
                <CheckCircle2 className="i s" strokeWidth={1.75} style={{ color: 'var(--good)' }} aria-hidden />
                {v.checkedAt ? `Up to date · checked ${agoWords(new Date(v.checkedAt).toISOString())}` : 'Up to date'}
              </>
            )}
          </p>
        </div>
        {u.canCheck ? (
          <button type="button" className="btn out" style={{ ...BUTTON, padding: '0 14px', opacity: v.checking ? 0.55 : 1 }} disabled={v.checking} onClick={u.check}>
            Check
          </button>
        ) : null}
      </div>
    );
  }

  const step = v.kind === 'download' ? 'download' : v.step;
  const failed = step === 'failed';
  const meta =
    step === 'download'
      ? 'This version can’t update itself: download it once, and later versions install from here.'
      : step === 'allow'
        ? 'Android asks once to let Kaaga install its updates.'
        : step === 'downloading'
          ? `Downloading… ${v.kind === 'ready' ? v.progress : 0}%`
          : step === 'installing'
            ? 'Android is installing it…'
            : failed
              ? errorWords(v.kind === 'ready' ? v.error : null)
              : [`You have ${baseVersion(v.installed)}`, sizeWords(v.size)].filter(Boolean).join(' · ');
  const showNotes = (step === 'ready' || step === 'allow' || step === 'download') && v.notes.length > 0;
  return (
    <div className="set" data-update={step}>
      <div className="row-main">
        <p className="row-title">{v.title}</p>
        <p className="meta" style={failed ? { color: 'var(--attention)', flexWrap: 'nowrap', alignItems: 'flex-start' } : undefined}>
          {failed ? <AlertCircle className="i s" strokeWidth={1.75} style={{ flex: 'none', marginTop: 2 }} aria-hidden /> : null}
          <span>{meta}</span>
        </p>
        {step === 'downloading' && v.kind === 'ready' ? (
          <span className="update-line" role="progressbar" aria-label="Downloading the update" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.progress}>
            <i style={{ width: `${v.progress}%` }} />
          </span>
        ) : null}
        {showNotes ? (
          <ul className="update-notes" aria-label="What’s new">
            {v.notes.map((n) => (
              <li key={n} className="meta">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {step === 'download' && v.kind === 'download' ? (
        // Another address than the app's pages: the shell opens it in the phone's browser, which downloads it.
        <a className="btn main" style={BUTTON} href={v.url}>
          Download
        </a>
      ) : step === 'allow' ? (
        <button type="button" className="btn main" style={BUTTON} onClick={u.allow}>
          Allow
        </button>
      ) : step === 'ready' || step === 'downloading' ? (
        <button type="button" className="btn main" style={{ ...BUTTON, opacity: step === 'downloading' ? 0.55 : 1 }} disabled={step === 'downloading'} onClick={u.start}>
          Update
        </button>
      ) : failed ? (
        <button type="button" className="btn out" style={{ ...BUTTON, padding: '0 14px' }} onClick={u.start}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** Today: one slim row while a newer version waits (U3). */
export function UpdateBanner({ shell }: { shell: ShellState | null }) {
  const u = useAppUpdate(shell);
  const v = u.view;
  if (v.kind !== 'ready' && v.kind !== 'download') return null;
  const step = v.kind === 'download' ? 'download' : v.step;
  // Under way, it stays (closing it would hide what is happening); otherwise the × closes it for this version.
  const busy = step === 'downloading' || step === 'installing';
  if (v.hidden && !busy) return null;
  const words = step === 'downloading' && v.kind === 'ready' ? `Downloading… ${v.progress}%` : step === 'installing' ? 'Android is installing it…' : step === 'failed' ? 'The update didn’t finish' : v.title;
  return (
    <div className="update-pill" role="status" data-update={step}>
      <ArrowDownToLine className="i" strokeWidth={1.75} aria-hidden />
      <p className="words">{words}</p>
      {step === 'ready' ? (
        <button type="button" className="link" onClick={u.start}>
          Update
        </button>
      ) : step === 'allow' ? (
        <Link href="/m/settings" className="link">
          Update
        </Link>
      ) : step === 'failed' ? (
        <Link href="/m/settings" className="link">
          See why
        </Link>
      ) : step === 'download' && v.kind === 'download' ? (
        <a href={v.url} className="link">
          Download
        </a>
      ) : null}
      {busy ? null : (
        <button type="button" className="icon-btn" aria-label="Not now" onClick={u.hide}>
          <X className="i" strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </div>
  );
}
