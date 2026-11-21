'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rcScope, RcButton, RcSheet } from '@/components/rc-ui';
import axiosInstance from '@/lib/utils/axios';
import { useAuthStore } from '@/lib/store/authStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import './settings.css';

/**
 * Settings › Your data (ECOSYSTEM_V2_PLAN stage 11, §9.6 item 6): everything that is yours in one file, and deleting
 * the account. An account made with Google has no password here: it confirms with its typed email instead.
 */
export function YourData() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user) as { email?: string; authProvider?: string } | null;
  const google = user?.authProvider === 'google';
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [gone, setGone] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const r = await axiosInstance.get('/api/account/export', { timeout: 120_000 });
      const data = r.data?.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recollect-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('The download didn’t start. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!secret.trim()) {
      setError(google ? 'Type your email address.' : 'Enter your password.');
      return;
    }
    setGone(true);
    setError('');
    try {
      await axiosInstance.delete('/api/account', { data: google ? { confirm: secret.trim() } : { password: secret } });
      useSettingsStore.getState().setIsOpen(false);
      useAuthStore.getState().logout();
      try {
        localStorage.removeItem('auth_hint');
      } catch {
        // private window
      }
      toast.success('Your account and everything in it were deleted.');
      router.replace('/welcome');
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'It wasn’t deleted. Try again.');
      setGone(false);
    }
  };

  return (
    <div className={cn(rcScope, 'set-section')}>
      <section aria-labelledby="data-download">
        <h2 id="data-download" className="text-[15px] font-[600] text-[var(--rc-ink-1)]">
          Download everything
        </h2>
        <p className="rc-meta mt-1">
          One file with all that is yours: your docs as Markdown, tasks, reminders, plans and reviews, Ask AI’s conversations, everything your buddy keeps, and
          the AI you used. No passwords or keys.
        </p>
        <RcButton className="mt-3" variant="outline" icon={<Download />} busy={busy} onClick={() => void download()}>
          Download everything
        </RcButton>
      </section>

      <section aria-labelledby="data-delete" className="mt-9 border-t border-[var(--rc-line)] pt-6">
        <h2 id="data-delete" className="text-[15px] font-[600] text-[var(--rc-ink-1)]">
          Delete your account
        </h2>
        <p className="rc-meta mt-1">Removes your account and everything in it at once. It can’t be undone, so download first if you want a copy.</p>
        <RcButton
          className="mt-3"
          variant="danger"
          onClick={() => {
            setSecret('');
            setError('');
            setDeleting(true);
          }}
        >
          Delete my account…
        </RcButton>
      </section>

      <p className="rc-meta mt-9">
        How your data is kept and used:{' '}
        <Link href="/privacy" className="underline hover:text-[var(--rc-ink-1)]">
          Privacy
        </Link>{' '}
        ·{' '}
        <Link href="/terms" className="underline hover:text-[var(--rc-ink-1)]">
          Terms
        </Link>
      </p>

      <RcSheet
        open={deleting}
        onOpenChange={(o) => !gone && setDeleting(o)}
        title="Delete your account?"
        description="Your docs, tasks, plans, chats and everything your buddy keeps are removed at once. This can’t be undone."
        initialFocusId="delete-confirm"
        footer={
          <>
            <RcButton variant="outline" disabled={gone} onClick={() => setDeleting(false)}>
              Keep my account
            </RcButton>
            <RcButton variant="danger-solid" busy={gone} onClick={() => void remove()}>
              Delete everything
            </RcButton>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void remove();
          }}
        >
          <label htmlFor="delete-confirm" className="rc-field-label">
            {google ? `Type your email (${user?.email ?? ''}) to confirm` : 'Your password'}
          </label>
          <input
            id="delete-confirm"
            className="rc-input"
            type={google ? 'email' : 'password'}
            autoComplete={google ? 'off' : 'current-password'}
            value={secret}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setSecret(e.target.value)}
          />
          {error && <p className="rc-field-error">{error}</p>}
          <button type="submit" hidden />
        </form>
      </RcSheet>
    </div>
  );
}
