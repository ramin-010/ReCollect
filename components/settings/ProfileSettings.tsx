'use client';

import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useAuthStore } from '@/lib/store/authStore';
import { rcScope, RcButton } from '@/components/rc-ui';
import './settings.css';

type ApiError = { response?: { data?: { message?: string } } };
const reason = (e: unknown, fallback: string) => (e as ApiError)?.response?.data?.message || fallback;

function initials(name?: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') : 'U';
}

/**
 * Settings → Profile on theme v2 (STATE §8 "the Settings Profile tab"): the photo and the name you
 * can type straight into (saved on Enter or when you leave the field), then the account's rows in the
 * Agents tab's rhythm: the sign-in email, the password (a code by email first, in a dialog) and the
 * address the morning email goes to (a code to the new address first).
 */
export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  /** What he is typing; null while the field shows the saved name. */
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? user?.name ?? '';
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveName = async () => {
    if (draft === null || !user) return;
    const next = draft.trim();
    if (next === user.name) return setDraft(null);
    if (!next) {
      setDraft(null);
      toast.error('Your name can’t be empty.');
      return;
    }
    setSavingName(true);
    try {
      const res = await axiosInstance.patch('/api/update-profile', { name: next });
      if (res.data?.data) setUser(res.data.data);
      setDraft(null);
      toast.success('Name saved');
    } catch (e) {
      toast.error(reason(e, 'Your name was not saved. Try again.'));
    } finally {
      setSavingName(false);
    }
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return void toast.error('Choose an image file for your photo.');
    if (file.size > 5 * 1024 * 1024) return void toast.error('Choose a photo under 5 MB.');
    setUploading(true);
    const form = new FormData();
    form.append('avatar', file);
    try {
      const res = await axiosInstance.post('/api/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data?.success && user) setUser({ ...user, avatar: res.data.data.avatar });
      toast.success('Photo changed');
    } catch (e) {
      toast.error(reason(e, 'Your photo was not changed. Try again.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={cn(rcScope, 'set-section pt-4')}>
      <div className="flex items-start gap-5">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        <button type="button" className="set-avatar" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label={user?.avatar ? 'Change your photo' : 'Add a photo'} title={user?.avatar ? 'Change your photo' : 'Add a photo'}>
          {user?.avatar ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden>{initials(user?.name)}</span>}
          {uploading && <span className="set-avatar-busy" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <label htmlFor="set-name" className="rc-field-label">
            Preferred name
          </label>
          <input
            id="set-name"
            className="rc-input set-name"
            value={name}
            maxLength={50}
            disabled={savingName}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void saveName()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === 'Escape' && draft !== null) {
                e.preventDefault(); // undo the edit; a second Esc closes Settings
                setDraft(null);
              }
            }}
          />
          <div className="mt-1.5">
            <RcButton size="sm" variant="quiet" className="-ml-2" onClick={() => fileRef.current?.click()} busy={uploading}>
              {user?.avatar ? 'Change photo' : 'Add a photo'}
            </RcButton>
          </div>
        </div>
      </div>

      <p className="rc-field-label mt-8">Account</p>
      <ul className="set-list">
        <li className="set-row">
          <span className="min-w-0">
            <span className="block font-medium">Email</span>
            <span className="rc-meta break-all">{user?.email}</span>
          </span>
        </li>
        <li className="set-row">
          <span className="min-w-0">
            <span className="block font-medium">Password</span>
            <span className="rc-meta">To change it, we first email a 4-digit code to your address.</span>
          </span>
          <RcButton size="sm" variant="outline" onClick={() => setPasswordOpen(true)}>
            Change password
          </RcButton>
        </li>
        <MorningEmailRow />
      </ul>

      {/* Mounted only while open, so each time starts fresh and sends a new code. */}
      {passwordOpen && <PasswordDialog onClose={() => setPasswordOpen(false)} email={user?.email ?? ''} />}
    </div>
  );
}

// ─── The morning email's address ───────────────────────────────────────────

function MorningEmailRow() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<'idle' | 'address' | 'code'>('idle');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const current = user?.reminderEmail || user?.email || '';

  const reset = () => {
    setStep('idle');
    setAddress('');
    setCode('');
  };

  const send = async () => {
    const to = address.trim();
    if (!/^\S+@\S+\.\S+$/.test(to)) return void toast.error('Enter an email address, like you@example.com.');
    setBusy(true);
    try {
      await axiosInstance.post('/api/otp/generate-for-email', { email: to });
      toast.success(`Code sent to ${to}`);
      setCode('');
      setStep('code');
    } catch (e) {
      toast.error(reason(e, 'The code was not sent. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 4) return void toast.error('Enter all 4 digits.');
    setBusy(true);
    try {
      await axiosInstance.post('/api/otp/verify', { email: address.trim(), otp: value });
      const res = await axiosInstance.patch('/api/update-profile', { reminderEmail: address.trim() });
      if (res.data?.data) setUser(res.data.data);
      toast.success('The morning email goes to the new address');
      reset();
    } catch (e) {
      toast.error(reason(e, 'That code didn’t work. Check it, or send a new one.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="set-row set-row--grow">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="min-w-0">
          <span className="block font-medium">Morning email</span>
          <span className="rc-meta break-all">
            {current ? `Goes to ${current}` : 'Goes to your sign-in email'}
          </span>
        </span>
        {step === 'idle' && (
          <RcButton size="sm" variant="outline" onClick={() => setStep('address')}>
            Change address
          </RcButton>
        )}
      </div>
      {step === 'address' && (
        <div className="mt-2 flex w-full flex-wrap items-center gap-2 pb-1">
          <input
            type="email"
            className="rc-input set-name"
            placeholder="The new address"
            aria-label="The new address for the morning email"
            value={address}
            autoFocus
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send();
              if (e.key === 'Escape') {
                e.preventDefault();
                reset();
              }
            }}
          />
          <RcButton size="sm" variant="main" busy={busy} onClick={() => void send()}>
            Send a code
          </RcButton>
          <RcButton size="sm" variant="quiet" onClick={reset}>
            Cancel
          </RcButton>
        </div>
      )}
      {step === 'code' && (
        <div className="mt-2 w-full pb-1">
          <p className="rc-meta">Enter the 4-digit code we sent to {address.trim()}.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CodeBoxes value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} label="The code from the email" />
            <RcButton size="sm" variant="main" busy={busy} onClick={() => void verify()}>
              Verify
            </RcButton>
            <RcButton size="sm" variant="quiet" disabled={busy} onClick={() => void send()}>
              Send again
            </RcButton>
            <RcButton size="sm" variant="quiet" disabled={busy} onClick={reset}>
              Cancel
            </RcButton>
          </div>
        </div>
      )}
    </li>
  );
}

// ─── The password, changed after a code by email ───────────────────────────

/** Asks the server to email the sign-in address a code; resolves to whether it went out. */
async function requestCode(): Promise<boolean> {
  try {
    await axiosInstance.post('/api/otp/generate-auth');
    return true;
  } catch (e) {
    toast.error(reason(e, 'The code was not sent. Try again.'));
    return false;
  }
}

function PasswordDialog({ onClose, email }: { onClose: () => void; email: string }) {
  const [step, setStep] = useState<'sending' | 'code' | 'password'>('sending');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const onOpenChange = (o: boolean) => !o && onClose();

  const sendCode = async () => {
    setStep('sending');
    setSendFailed(false);
    const sent = await requestCode();
    setCode('');
    if (sent) setStep('code');
    else setSendFailed(true);
  };

  // Opening the dialog sends the code (that is what "Change password" promises), once: Strict
  // Mode runs a mount effect twice, and a second email would replace the first code.
  const asked = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (!asked.current) {
      asked.current = true;
      void requestCode().then((sent) => {
        if (!alive.current) return;
        if (sent) setStep('code');
        else setSendFailed(true);
      });
    }
    return () => {
      alive.current = false;
    };
  }, []);
  const open = true;

  const verify = async (value = code) => {
    if (value.length !== 4) return void toast.error('Enter all 4 digits.');
    setBusy(true);
    try {
      await axiosInstance.post('/api/otp/verify', { email, otp: value });
      setStep('password');
    } catch (e) {
      toast.error(reason(e, 'That code didn’t work. Check it, or send a new one.'));
    } finally {
      setBusy(false);
    }
  };

  const change = async () => {
    if (password.length < 8) return void toast.error('Use at least 8 characters.');
    if (password !== confirm) return void toast.error('The two passwords don’t match.');
    setBusy(true);
    try {
      await axiosInstance.post('/api/change-password', { newPassword: password, confirmPassword: confirm });
      toast.success('Password changed');
      onClose();
    } catch (e) {
      toast.error(reason(e, 'Your password was not changed. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(rcScope, 'rc-overlay')} />
        <DialogPrimitive.Content className={cn(rcScope, 'rc-float rc-dialog')}>
          <DialogPrimitive.Title className="rc-sheet-title">Change password</DialogPrimitive.Title>
          {step === 'sending' && (
            <DialogPrimitive.Description asChild>
              <div className="mt-2 text-[15px] leading-[1.45] rc-ink-2">
                {sendFailed ? (
                  <>
                    The code to {email} was not sent.
                    <div className="mt-5 flex justify-end gap-2">
                      <DialogPrimitive.Close asChild>
                        <RcButton variant="outline">Cancel</RcButton>
                      </DialogPrimitive.Close>
                      <RcButton variant="main" onClick={() => void sendCode()}>
                        Try again
                      </RcButton>
                    </div>
                  </>
                ) : (
                  <span aria-busy>Sending a code to {email}…</span>
                )}
              </div>
            </DialogPrimitive.Description>
          )}
          {step === 'code' && (
            <>
              <DialogPrimitive.Description className="mt-2 text-[15px] leading-[1.45] rc-ink-2">
                Enter the 4-digit code we sent to {email}. It works for 3 minutes.
              </DialogPrimitive.Description>
              <div className="mt-4">
                <CodeBoxes value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} label="The code from the email" autoFocus />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <RcButton variant="quiet" disabled={busy} onClick={() => void sendCode()} className="-ml-2">
                  Send again
                </RcButton>
                <div className="flex gap-2">
                  <DialogPrimitive.Close asChild>
                    <RcButton variant="outline" disabled={busy}>
                      Cancel
                    </RcButton>
                  </DialogPrimitive.Close>
                  <RcButton variant="main" busy={busy} onClick={() => void verify()}>
                    Verify
                  </RcButton>
                </div>
              </div>
            </>
          )}
          {step === 'password' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void change();
              }}
            >
              <DialogPrimitive.Description className="mt-2 text-[15px] leading-[1.45] rc-ink-2">Code accepted. Choose a new password.</DialogPrimitive.Description>
              <label htmlFor="set-pw" className="rc-field-label mt-4">
                New password
              </label>
              <input id="set-pw" type="password" className="rc-input w-full" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="rc-field-help">At least 8 characters.</p>
              <label htmlFor="set-pw2" className="rc-field-label mt-3">
                The same again
              </label>
              <input id="set-pw2" type="password" className="rc-input w-full" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              <div className="mt-5 flex justify-end gap-2">
                <DialogPrimitive.Close asChild>
                  <RcButton variant="outline" disabled={busy}>
                    Cancel
                  </RcButton>
                </DialogPrimitive.Close>
                <RcButton type="submit" variant="main" busy={busy}>
                  Change password
                </RcButton>
              </div>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Four boxes for a code ─────────────────────────────────────────────────

function CodeBoxes({ value, onChange, onComplete, disabled, label, autoFocus }: { value: string; onChange: (v: string) => void; onComplete: (v: string) => void; disabled?: boolean; label: string; autoFocus?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? '');

  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, 4);
    onChange(clean);
    if (clean.length === 4) onComplete(clean);
    return clean;
  };

  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="rc-input set-code"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          maxLength={4}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '');
            if (typed.length > 1) {
              // A pasted or autofilled code fills the boxes from here.
              const clean = set((value.slice(0, i) + typed).slice(0, 4));
              refs.current[Math.min(3, clean.length)]?.focus();
              return;
            }
            const next = (value.slice(0, i) + typed + value.slice(i + 1)).slice(0, 4);
            set(next);
            if (typed && i < 3) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
