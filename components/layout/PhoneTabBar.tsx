'use client';

/**
 * The phone's bottom bar (ALWAYS_ON_SPEC 6.1): Home, Docs, Ask AI and a dark "+" that opens capture
 * (the Ctrl K palette). Under 768 px only; the sidebar drawer stays for everything else.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Home, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { href: '/docs', label: 'Docs', icon: FileText, match: (p: string) => p.startsWith('/docs') },
  { href: '/ask', label: 'Ask AI', icon: Sparkles, match: (p: string) => p.startsWith('/ask') },
] as const;

function openCapture() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
}

export function PhoneTabBar() {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Main" className="phone-tabs">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const on = match(pathname);
        return (
          <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={cn('phone-tab', on && 'phone-tab--on')}>
            <Icon aria-hidden strokeWidth={on ? 2 : 1.75} />
            <span>{label}</span>
          </Link>
        );
      })}
      <button type="button" className="phone-tab phone-tab--add" aria-label="Capture" onClick={openCapture}>
        <span className="phone-tab-plus">
          <Plus aria-hidden strokeWidth={2} />
        </span>
      </button>
    </nav>
  );
}
