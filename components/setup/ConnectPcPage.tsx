'use client';

/**
 * A computer asks to use Kaaga (EASY_SETUP_PLAN §3.2): `npx kaaga-setup` showed a code in a terminal and
 * opened this page with it. The same quiet column as an app's sign-in (ConsentPage): the computer as it calls itself,
 * the code to check against the terminal (the one guard against someone else's link), what it will be able to do, and
 * Approve (the one dark button) or Deny. Signed out, they sign in first and come back here. No code in the link: they
 * type the one their terminal shows.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, CircleAlert, Laptop, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton, RcSkel, rcScope } from '@/components/rc-ui';
import { useAuthStore } from '@/lib/store/authStore';
import { setupApi, type PcSignIn } from '@/lib/api/setupApi';
import '@/components/oauth/consent.css';
import './connect-pc.css';
import { KaagaLogo } from '@/components/brand/kaaga';

/** The same words as Settings → Agents (one name for one thing). */
const ABILITIES = ['Read docs, goals and today', 'Write docs', 'Set goals, focus lines and notes', 'Log study and work sessions', 'Add and change your tasks'];

type View =
  | { kind: 'loading' }
  | { kind: 'enter' }
  | { kind: 'ready'; info: PcSignIn }
  | { kind: 'done'; info: PcSignIn }
  | { kind: 'gone'; message: string };

const GONE = 'This code doesn’t exist or ran out (a code lasts 10 minutes). Run the command on your computer again for a new one.';
const messageOf = (err: unknown, fallback: string) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export function ConnectPcPage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const code = (params.get('code') ?? '').trim();
  const authLoading = useAuthStore((s) => s.isLoading);
  const loggedIn = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user) as { name?: string; email?: string } | null;
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'allow' | 'deny' | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!loggedIn) {
      // Sign in first, then come back to this same code.
      router.replace(`/login?redirect=${encodeURIComponent(code ? `${pathname}?code=${encodeURIComponent(code)}` : pathname)}`);
      return;
    }
    if (!code) {
      setView({ kind: 'enter' });
      return;
    }
    let live = true;
    setupApi
      .request(code)
      .then((info) => {
        if (!live) return;
        if (info.status === 'waiting') setView({ kind: 'ready', info });
        else if (info.status === 'expired') setView({ kind: 'gone', message: GONE });
        else if (info.status === 'used') setView({ kind: 'gone', message: 'This code was already used. If you didn’t, run the command on your computer again.' });
        else setView({ kind: 'done', info });
      })
      .catch((err) => live && setView({ kind: 'gone', message: messageOf(err, GONE) }));
    return () => {
      live = false;
    };
  }, [authLoading, loggedIn, code, pathname, router]);

  const answer = async (allow: boolean) => {
    if (view.kind !== 'ready') return;
    setBusy(allow ? 'allow' : 'deny');
    try {
      setView({ kind: 'done', info: await setupApi.answer(view.info.code, allow) });
    } catch (err) {
      setView({ kind: 'gone', message: messageOf(err, 'That didn’t go through. Run the command on your computer again.') });
    } finally {
      setBusy(null);
    }
  };

  const enterCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = typed.toUpperCase().replace(/[^A-Z]/g, '');
    if (clean.length !== 8) return;
    router.replace(`${pathname}?code=${clean.slice(0, 4)}-${clean.slice(4)}`);
  };

  return (
    <div className={cn(rcScope, 'oauth-page')}>
      <main className="oauth-col">
        <Link href="/" className="oauth-brand" aria-label="Kaaga">
          <KaagaLogo height={26} variant="header" />
        </Link>

        {view.kind === 'loading' && (
          <div className="oauth-skel" aria-busy="true" aria-label="Loading">
            <RcSkel className="h-7 w-4/5" />
            <RcSkel className="mt-3 h-4 w-1/2" />
            <RcSkel className="mt-8 h-12 w-full" />
            <RcSkel className="mt-6 h-4 w-2/3" />
            <RcSkel className="mt-3 h-4 w-3/5" />
          </div>
        )}

        {view.kind === 'enter' && (
          <form onSubmit={enterCode}>
            <h1 className="oauth-title">Connect a computer</h1>
            <p className="oauth-sub">
              Type the code your terminal shows after <code className="rc-code">npx kaaga-setup</code>.
            </p>
            <label htmlFor="pc-code" className="oauth-label block">
              Code
            </label>
            <input
              id="pc-code"
              className="rc-input pc-code-input mt-2"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 9))}
              placeholder="BCDF-GHJK"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
            />
            <div className="oauth-actions">
              <RcButton variant="main" type="submit" disabled={typed.replace(/[^A-Za-z]/g, '').length !== 8}>
                Continue
              </RcButton>
            </div>
          </form>
        )}

        {view.kind === 'gone' && (
          <>
            <h1 className="oauth-title">This code can&rsquo;t be used</h1>
            <p className="oauth-problem">
              <CircleAlert className="oauth-problem-icon" strokeWidth={1.75} aria-hidden />
              <span>{view.message}</span>
            </p>
            <div className="oauth-actions">
              <RcButton variant="outline" onClick={() => router.push('/')}>
                Go to Kaaga
              </RcButton>
            </div>
          </>
        )}

        {view.kind === 'done' && (
          <>
            <h1 className="oauth-title">{view.info.status === 'denied' ? 'Denied' : 'Connected'}</h1>
            <p className="oauth-sub">
              {view.info.status === 'denied'
                ? 'Nothing was connected. You can close this tab.'
                : `${view.info.device} can use Kaaga now. Your terminal goes on by itself; you can close this tab.`}
            </p>
          </>
        )}

        {view.kind === 'ready' && (
          <>
            <h1 className="oauth-title">Connect this computer to Kaaga?</h1>
            {user?.email && (
              <p className="oauth-sub">
                Signed in as {user.name ? `${user.name} · ` : ''}
                {user.email}
              </p>
            )}

            <div className="pc-card" role="group" aria-label="The computer">
              <Laptop className="pc-card-icon" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <p className="pc-card-name">{view.info.device}</p>
                <p className="pc-card-code">
                  Code <b className="rc-num">{view.info.code}</b>
                </p>
              </div>
            </div>
            <p className="pc-check">Approve only if your terminal shows this same code, from a command you just ran yourself.</p>

            <h2 className="oauth-label">It will be able to</h2>
            <ul className="oauth-scopes">
              {ABILITIES.map((s) => (
                <li key={s}>
                  <Check className="oauth-scope-icon" strokeWidth={2} aria-hidden />
                  <span>{s}</span>
                </li>
              ))}
            </ul>

            <p className="oauth-note">
              <Undo2 className="oauth-note-icon" strokeWidth={1.75} aria-hidden />
              <span>Every change its AI tools make shows under Home → From your agent, where you can undo it. End this computer’s access any time in Settings → Agents.</span>
            </p>

            <div className="oauth-actions">
              <RcButton variant="outline" busy={busy === 'deny'} disabled={!!busy} onClick={() => void answer(false)}>
                Deny
              </RcButton>
              <RcButton variant="main" busy={busy === 'allow'} disabled={!!busy} onClick={() => void answer(true)}>
                Approve
              </RcButton>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
