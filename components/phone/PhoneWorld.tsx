'use client';

/**
 * The phone world's frame (PHONE_APP_REDESIGN_PLAN §7 step 2): signed in or off to the login, the look kept on <html>,
 * one screen at a time above the bottom bar (Today, Buds, Library, You), which stays across screens. The screens are
 * the mock-up's (mockups/phone-app), its CSS ported as phone.css under .pw. Inside the phone app (step 5) it tells the
 * shell the look's colours for the system bars and answers Back: a sheet closes first, a tab goes to Today.
 *
 * Moving around (the owner's ask, 11-18 evening): each new screen settles in, a tab with a quick fade, a deeper page
 * from the right, going back from the left (the mock-up's in-tab, in-forward, in-back). Enter only: the new screen is
 * there at once, nothing waits for an old one to leave. The tab bar never moves, and the tapped tab lights at the tap,
 * before the route has changed.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, Sun, User } from 'lucide-react';
import { KaagaIcon } from '@/components/brand/kaaga';
import { useAuthStore } from '@/lib/store/authStore';
import { useLook } from './look';
import { CompareSwitch } from './CompareSwitch';
import { bridge, hex6 } from './shell';

const TABS = [
  { href: '/m/today', label: 'Today', icon: Sun },
  // The chat with the buddy, which is Kaaga (KAAGA_REBRAND_PLAN D2): its name and its mark (11-26; was "Buds").
  { href: '/m/buddy', label: 'Kaaga', icon: KaagaIcon },
  { href: '/m/library', label: 'Library', icon: BookOpen },
  { href: '/m/you', label: 'You', icon: User },
] as const;

type Move = 'none' | 'tab' | 'forward' | 'back';
/** How deep a screen sits: a tab 0, Settings 1, Look 2 (deeper comes in from the right, shallower from the left). */
const depthOf = (path: string): number => (path.startsWith('/m/look') ? 2 : path.startsWith('/m/settings') ? 1 : 0);
const moveOf = (from: string, to: string): Move => {
  const a = depthOf(from);
  const b = depthOf(to);
  return b > a ? 'forward' : b < a ? 'back' : 'tab';
};

/** The screens a tab stands for (Settings and Look are reached from Today and You; the bar marks You for them). */
const tabOf = (path: string): string => (path.startsWith('/m/settings') || path.startsWith('/m/look') ? '/m/you' : (TABS.find((t) => path.startsWith(t.href))?.href ?? '/m/today'));

export function PhoneWorld({ fontClass, children }: { fontClass: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/m/today';
  const { isAuthenticated, isLoading } = useAuthStore();
  const { look, mode, ready } = useLook();
  // The last route seen, how the screen came in, and a tab tapped whose route has not arrived yet (it lights at once).
  // Kept with the route in one state and moved on during render when the route changes (React's pattern for
  // information from the previous render), so the new screen's first frame already has its way in.
  const [moved, setMoved] = useState<{ path: string; move: Move; tapped: string | null }>({ path: pathname, move: 'none', tapped: null });
  if (moved.path !== pathname) setMoved({ path: pathname, move: moveOf(moved.path, pathname), tapped: null });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [isLoading, isAuthenticated, pathname, router]);

  // Every tab fetched ahead once signed in (the owner, 11-21: a tap showed the old page for a second or two while the
  // new one came over the network), so a tap swaps the page at once.
  useEffect(() => {
    if (isAuthenticated) for (const t of TABS) router.prefetch(t.href);
  }, [isAuthenticated, router]);

  // The look on <html>, and the phone's own bars in its ground colour.
  useEffect(() => {
    if (!ready) return;
    const html = document.documentElement;
    html.setAttribute('data-pw-theme', look.theme);
    html.setAttribute('data-pw-mode', mode);
    const root = document.querySelector('.pw');
    const ground = root ? getComputedStyle(root).getPropertyValue('--ground').trim() : '';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    if (ground) meta.content = ground;
    // Inside the phone app: its status and navigation bars in the same colour (and its next first frame).
    const bars = ground ? hex6(ground) : null;
    if (bars) bridge()?.setBars(bars, mode === 'light');
  }, [ready, look.theme, mode]);

  // The phone's Back (Shell.java asks the page first): an open sheet or the design view closes; a tab other than Today
  // goes to Today; Today leaves the app; a page under a tab (Settings, Look) goes back one page. The tabs replace each
  // other in the history, so Back never walks through old tabs.
  useEffect(() => {
    const w = window as unknown as { __rcBack?: () => 'closed' | 'today' | 'leave' | 'back' };
    w.__rcBack = () => {
      const open = document.querySelector<HTMLElement>('.pw .sheet-layer.is-on') ?? document.querySelector<HTMLElement>('.pw .pw-compare.is-on');
      if (open) {
        open.click();
        return 'closed';
      }
      const path = window.location.pathname;
      if (!TABS.some((t) => t.href === path)) return 'back';
      if (path === '/m/today') return 'leave';
      router.replace('/m/today');
      return 'today';
    };
    return () => {
      delete w.__rcBack;
    };
  }, [router]);

  const on = moved.tapped ?? tabOf(pathname);
  return (
    <div className={`pw ${fontClass}`}>
      <div className="screens">
        <section key={pathname} className={`screen is-on${moved.move === 'none' ? '' : ` in-${moved.move}`}`}>
          {isLoading || !isAuthenticated ? <div className="scroll" aria-busy="true" /> : children}
        </section>
      </div>
      <CompareSwitch theme={look.theme} mode={mode} />
      <nav className="tabs" aria-label="Main">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            replace
            className={`tab${on === href ? ' is-on' : ''}`}
            aria-current={on === href ? 'page' : undefined}
            onClick={() => href !== on && setMoved((m) => ({ ...m, tapped: href }))}
          >
            <span className="cap">
              <Icon className="i" strokeWidth={on === href ? 2 : 1.75} aria-hidden />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
