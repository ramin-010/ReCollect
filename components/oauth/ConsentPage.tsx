'use client';

/**
 * An app asks to use Kaaga (ALWAYS_ON_SPEC 6.5): claude.ai's connector or Claude Code signing in
 * through OAuth. One quiet column on the page colour: who asks, what it will be able to do (the
 * words Settings → Agents uses), where Allow sends him (the redirect's host, as the MCP spec asks),
 * and Allow (the one dark button) or Deny. Signed out, he signs in first and comes back here.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, CircleAlert, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton, RcSkel, rcScope } from '@/components/rc-ui';
import { useAuthStore } from '@/lib/store/authStore';
import { oauthApi, type ConsentInfo } from '@/lib/api/oauthApi';
import './consent.css';
import { KaagaLogo } from '@/components/brand/kaaga';

/** The same words as Settings → Agents (one name for one thing). */
const SCOPE_WORDS: Record<string, string> = {
  read: 'Read docs, goals and today',
  'docs:write': 'Write docs',
  'learning:write': 'Set goals, focus lines and notes',
  'sessions:write': 'Log study and work sessions',
  'tasks:write': 'Add and change your tasks',
};

type View = { kind: 'loading' } | { kind: 'ready'; info: ConsentInfo } | { kind: 'gone'; message: string } | { kind: 'leaving'; host: string; allowed: boolean };

export function ConsentPage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const request = params.get('request') ?? '';
  const authLoading = useAuthStore((s) => s.isLoading);
  const loggedIn = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user) as { name?: string; email?: string } | null;
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [busy, setBusy] = useState<'allow' | 'deny' | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!loggedIn) {
      // Sign in first, then come back to this same request.
      router.replace(`/login?redirect=${encodeURIComponent(`${pathname}?request=${encodeURIComponent(request)}`)}`);
      return;
    }
    let live = true;
    oauthApi
      .request(request)
      .then((info) => live && setView({ kind: 'ready', info }))
      .catch((err: { response?: { data?: { message?: string } } }) => {
        if (live) setView({ kind: 'gone', message: err?.response?.data?.message || 'This sign-in link has expired. Go back to the app that sent you here and start again.' });
      });
    return () => {
      live = false;
    };
  }, [authLoading, loggedIn, request, pathname, router]);

  const answer = async (allow: boolean) => {
    if (view.kind !== 'ready') return;
    setBusy(allow ? 'allow' : 'deny');
    try {
      const to = await oauthApi.answer(request, allow);
      setView({ kind: 'leaving', host: view.info.client.redirectHost, allowed: allow });
      window.location.assign(to);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setView({ kind: 'gone', message: message || 'That did not go through. Go back to the app and start again.' });
    } finally {
      setBusy(null);
    }
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
            <RcSkel className="mt-8 h-4 w-2/3" />
            <RcSkel className="mt-3 h-4 w-3/5" />
            <RcSkel className="mt-3 h-4 w-2/3" />
          </div>
        )}

        {view.kind === 'gone' && (
          <>
            <h1 className="oauth-title">This sign-in can&rsquo;t go on</h1>
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

        {view.kind === 'leaving' && (
          <>
            <h1 className="oauth-title">{view.allowed ? 'Allowed' : 'Denied'}</h1>
            <p className="oauth-sub">Sending you back to {view.host}…</p>
          </>
        )}

        {view.kind === 'ready' && (
          <>
            <h1 className="oauth-title">
              Allow <b>{view.info.client.name}</b> to use Kaaga?
            </h1>
            {user?.email && (
              <p className="oauth-sub">
                Signed in as {user.name ? `${user.name} · ` : ''}
                {user.email}
              </p>
            )}

            <h2 className="oauth-label">It will be able to</h2>
            <ul className="oauth-scopes">
              {view.info.scopes.map((s) => (
                <li key={s}>
                  <Check className="oauth-scope-icon" strokeWidth={2} aria-hidden />
                  <span>{SCOPE_WORDS[s] ?? s}</span>
                </li>
              ))}
            </ul>

            <p className="oauth-note">
              <Undo2 className="oauth-note-icon" strokeWidth={1.75} aria-hidden />
              <span>Every change it makes shows under Home → From your agent, where you can undo it. End this connection any time in Settings → Agents.</span>
            </p>

            <p className="oauth-where">
              Allow sends you back to <b>{view.info.client.redirectHost}</b>.
            </p>

            <div className="oauth-actions">
              <RcButton variant="outline" busy={busy === 'deny'} disabled={!!busy} onClick={() => void answer(false)}>
                Deny
              </RcButton>
              <RcButton variant="main" busy={busy === 'allow'} disabled={!!busy} onClick={() => void answer(true)}>
                Allow
              </RcButton>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
