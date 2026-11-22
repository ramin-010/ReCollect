// Recollect sidebar, theme v2 (2026-11-14). It follows Notion's pattern: a workspace row, a search
// row, 30px rows of grey icons and medium text, a quiet "Recent" section and settings at the foot.
// Nothing bounces. Tokens come from app/theme-v2.css (--ui-*).
'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useViewStore, type TodoFilterType } from '@/lib/store/viewStore';
import { useNotificationStore } from '@/lib/store/notificationStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { Button } from '@/components/ui-base/Button';
import { cn } from '@/lib/utils';
import {
  Bell,
  CheckSquare,
  FileText,
  Files,
  Home,
  Inbox,
  Mail,
  Menu,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/ownerApi';
import { NotificationsPopover } from './NotificationsPopover';
import { SidebarChats } from './SidebarChats';
import { ThemeSwitcher } from './ThemeSwitcher';
import { getRecentVisitsFromCache, RecentVisit } from '@/lib/services/recentVisits';
import { features, type FeatureName } from '@/lib/features';
import { useYearStand } from '@/components/learning/home/YearGrid';
import { cellLevel } from '@/lib/learning/stand';

const ICON = 'h-[18px] w-[18px]';
const STROKE = 1.75;

// ─── Nav Item Definition ────────────────────────────────────────────────────
interface NavItem {
  id: string;
  route: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  subItems?: { id: string; label: string; icon: React.ReactNode }[];
  /** Hidden while this feature flag is off (see lib/features.ts). */
  feature?: FeatureName;
}

const allPrimaryNav: NavItem[] = [
  { id: 'home', route: '/', label: 'Home', icon: <Home className={ICON} strokeWidth={STROKE} /> },
  { id: 'docs', route: '/docs', label: 'Docs', icon: <FileText className={ICON} strokeWidth={STROKE} /> },
  { id: 'ask', route: '/ask', label: 'Ask AI', icon: <Sparkles className={ICON} strokeWidth={STROKE} /> },
  {
    id: 'todo',
    route: '/todo',
    label: 'Tasks',
    icon: <CheckSquare className={ICON} strokeWidth={STROKE} />,
    subItems: [{ id: 'inbox', label: 'Inbox', icon: <Inbox className="h-4 w-4" strokeWidth={STROKE} /> }],
  },
  { id: 'inbox-notif', route: '#', label: 'Notifications', icon: <Bell className={ICON} strokeWidth={STROKE} /> },
  { id: 'workspace', route: '/workspace', label: 'Workspace', icon: <Users className={ICON} strokeWidth={STROKE} /> },
  { id: 'presentations', route: '/slides', label: 'Presentations', icon: <Files className={ICON} strokeWidth={STROKE} />, feature: 'slides' },
  { id: 'email', route: '/email', label: 'Email', icon: <Mail className={ICON} strokeWidth={STROKE} />, feature: 'email' },
];

// Entries for hidden features are dropped here, so the desktop sidebar and the mobile drawer both lose them.
const primaryNav = allPrimaryNav.filter((item) => !item.feature || features[item.feature]);

/** Stage 11: who uses this server and the free AI they get (the owner only). */
const PEOPLE_ITEM: NavItem = { id: 'people', route: '/owner', label: 'People', icon: <UserRound className={ICON} strokeWidth={STROKE} /> };

/** Opens the global Ctrl+K palette (the app layout owns it and listens on document). */
function openSearch() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
}

function initialsOf(name?: string) {
  if (!name || typeof name !== 'string') return 'U';
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || 'U';
}

// ─── Main Sidebar Wrapper ───────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const isCollapsed = useViewStore((state) => state.isSidebarCollapsed);
  const setIsCollapsed = useViewStore((state) => state.setSidebarCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const todoFilter = useViewStore((state) => state.todoFilter);
  const setTodoFilter = useViewStore((state) => state.setTodoFilter);
  const setSettingsOpen = useSettingsStore((state) => state.setIsOpen);

  // The collapsed sidebar is remembered per browser; Ctrl+\ toggles it (Notion's key).
  useEffect(() => {
    try {
      if (localStorage.getItem('sidebar-collapsed') === '1') setIsCollapsed(true);
    } catch {
      /* storage blocked: start expanded */
    }
  }, [setIsCollapsed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        const next = !useViewStore.getState().isSidebarCollapsed;
        setIsCollapsed(next);
        try {
          localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setIsCollapsed]);
  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const shared = {
    user,
    pathname,
    todoFilter,
    setTodoFilter,
    onSettingsClick: () => setSettingsOpen(true),
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-3 left-3 z-50 bg-[var(--ui-sidebar)]"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open the menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-[var(--overlay-mask)] z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: [0.2, 0.9, 0.25, 1] }}
              className="fixed inset-y-0 left-0 w-[264px] z-50 lg:hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent {...shared} isCollapsed={false} isMobile onCollapse={() => setIsMobileOpen(false)} onNavigate={() => setIsMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 60 : 248 }}
        transition={{ duration: 0.2, ease: [0.2, 0.9, 0.25, 1] }}
        className="hidden lg:block relative z-30 shrink-0"
      >
        <SidebarContent {...shared} isCollapsed={isCollapsed} isMobile={false} onCollapse={toggleCollapsed} onNavigate={() => {}} />
      </motion.aside>
    </>
  );
}

// ─── Sidebar Content (shared between mobile & desktop) ──────────────────────
interface SidebarContentProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onCollapse: () => void;
  onNavigate: () => void;
  user: ReturnType<typeof useAuthStore.getState>['user'];
  pathname: string;
  todoFilter?: TodoFilterType;
  setTodoFilter?: (filter: TodoFilterType) => void;
  onSettingsClick: () => void;
}

/**
 * The sidebar is Recollect's own (the owner, 11-22: "a friend said it's a Notion replica"; his pick of the options):
 * Recollect's mark on top, "Search or capture", the open page in the plain grey selection, this week's seven days under
 * the menu, you and Settings at the foot. Same width and colours as before.
 */

/** Recollect's mark (the app icon's two rings and three dots), in the ink colour. */
function RecollectMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <ellipse cx="7.6" cy="13" rx="4.6" ry="5.6" fill="none" stroke="currentColor" strokeWidth="2.3" />
      <ellipse cx="16.4" cy="13" rx="4.6" ry="5.6" fill="none" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="7.6" cy="7.4" r="1.9" fill="currentColor" />
      <circle cx="16.4" cy="7.4" r="1.9" fill="currentColor" />
      <circle cx="12" cy="13" r="1.9" fill="currentColor" />
    </svg>
  );
}

/** The year card's heat steps (the sidebar sits outside the .rc scope: --ui-heat-* in app/theme-v2.css and theme-paper.css). */
const WEEK_FILL = ['var(--ui-heat-0)', 'var(--ui-heat-1)', 'var(--ui-heat-2)', 'var(--ui-heat-3)', 'var(--ui-heat-4)'] as const;

/** This week's seven days under the menu, Monday first, in the year card's greens. */
function WeekStrip({ onNavigate }: { onNavigate: () => void }) {
  const stand = useYearStand('sidebar');
  if (!stand || stand === 'failed') return <div className="h-[46px]" aria-hidden />;
  const today = new Date(`${stand.today}T00:00:00Z`);
  const monday = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * 86_400_000);
  const byDay = new Map(stand.days.map((d) => [d.day, d]));
  const week = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  return (
    <Link href="/mirror" onClick={onNavigate} className="mx-2 mt-4 block rounded-[8px] px-2 py-2 transition-colors hover:bg-[var(--ui-hover)]" title="Where you stand">
      <span className="block text-[12px] font-[500] text-[var(--ui-ink-3)]">This week</span>
      <span className="mt-2 flex items-center gap-[7px]">
        {week.map((d) => {
          const day = byDay.get(d);
          const future = d > stand.today;
          const level = day ? cellLevel(day) : 0;
          return (
            <span
              key={d}
              className={cn('block h-[13px] w-[13px] rounded-[3px]', d === stand.today && 'ring-1 ring-[var(--ui-ink-3)] ring-offset-1 ring-offset-[var(--ui-sidebar)]')}
              style={{ background: WEEK_FILL[level], opacity: future ? 0.45 : 1 }}
            />
          );
        })}
      </span>
    </Link>
  );
}

const rowBase =
  'w-full flex items-center gap-2 h-[30px] px-2 rounded-[6px] text-[14px] font-[500] leading-none outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-fill)]';

function SidebarContent({ isCollapsed, isMobile, onCollapse, onNavigate, user, pathname, todoFilter, setTodoFilter, onSettingsClick }: SidebarContentProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [recent, setRecent] = useState<RecentVisit[]>([]);
  // Stage 11: the People page, for the owner of this server only (asked once a session).
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    let live = true;
    void ownerApi.isOwner().then((o) => live && setIsOwner(o));
    return () => {
      live = false;
    };
  }, []);
  const nav = isOwner ? [...primaryNav, PEOPLE_ITEM] : primaryNav;
  // The lower list: Chats while in Ask AI, Recent elsewhere; a click on the other tab holds until he navigates.
  const [choice, setChoice] = useState<{ path: string; tab: 'recent' | 'chats' } | null>(null);
  const onAsk = pathname === '/ask' || !!pathname?.startsWith('/ask/');
  const section: 'recent' | 'chats' = choice && choice.path === pathname ? choice.tab : onAsk ? 'chats' : 'recent';

  // Recents update whenever the path changes (a navigation).
  useEffect(() => {
    setRecent(getRecentVisitsFromCache().slice(0, 6));
  }, [pathname]);

  const recentIcon = (type: string) => {
    const cls = 'h-4 w-4 shrink-0 text-[var(--ui-icon)]';
    if (type === 'slide') return <Files className={cls} strokeWidth={STROKE} />;
    if (type === 'workspace') return <Users className={cls} strokeWidth={STROKE} />;
    return <FileText className={cls} strokeWidth={STROKE} />;
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ui-sidebar)] border-r border-[var(--ui-sidebar-edge)] text-[var(--ui-ink-2)]">
      {/* ── Workspace row ── */}
      <div className={cn('flex items-center gap-1 px-2 pt-2.5 pb-1.5 shrink-0', isCollapsed && 'flex-col')}>
        <Link
          href="/"
          onClick={onNavigate}
          title="Home"
          className={cn('flex h-[32px] min-w-0 items-center gap-2 rounded-[6px] px-1.5 text-[var(--ui-ink-1)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-fill)]', isCollapsed ? 'w-[30px] justify-center px-0' : 'flex-1')}
        >
          <RecollectMark className="h-[20px] w-[20px] shrink-0" />
          {!isCollapsed && <span className="text-[15px] font-[650] tracking-[-0.01em]">Recollect</span>}
        </Link>
        <button
          type="button"
          onClick={onCollapse}
          aria-label={isMobile ? 'Close the menu' : isCollapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
          title={isMobile ? 'Close' : isCollapsed ? 'Expand (Ctrl+\\)' : 'Collapse (Ctrl+\\)'}
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[6px] text-[var(--ui-icon)] transition-colors hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]"
        >
          {isMobile ? <X className={ICON} strokeWidth={STROKE} /> : <PanelLeft className={ICON} strokeWidth={STROKE} />}
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-2 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNavigate();
            openSearch();
          }}
          aria-keyshortcuts="Control+K"
          title={isCollapsed ? 'Search (Ctrl K)' : undefined}
          className={cn(
            rowBase,
            'group/search font-[400] text-[var(--ui-ink-3)] hover:text-[var(--ui-ink-2)]',
            'border border-[var(--ui-sidebar-edge)] hover:bg-[var(--ui-hover)]',
            isCollapsed && 'justify-center px-0',
          )}
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={STROKE} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Search or capture</span>
              <kbd
                className={cn(
                  'grid h-[20px] place-items-center rounded-[4px] bg-[var(--ui-kbd)] px-1.5 font-[inherit] text-[12px] font-[500] text-[var(--ui-ink-3)]',
                  'opacity-0 transition-opacity group-hover/search:opacity-100',
                )}
              >
                Ctrl K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* ── Primary navigation ── */}
      <nav className="px-2 shrink-0 flex flex-col gap-px" aria-label="Main">
        {nav.map((item) => {
          const current = item.id === 'inbox-notif' && unreadCount > 0 ? { ...item, badge: unreadCount > 99 ? '99+' : unreadCount } : item;
          const row = (
            <SidebarNavItem
              key={current.id}
              item={current}
              isActive={pathname === current.route || (current.route !== '/' && !!pathname?.startsWith(current.route + '/'))}
              isCollapsed={isCollapsed}
              onClick={onNavigate}
              todoFilter={todoFilter}
              onSubItemClick={(filterId) => {
                if (current.id === 'todo' && setTodoFilter) setTodoFilter(filterId as TodoFilterType);
                onNavigate();
              }}
            />
          );
          return current.id === 'inbox-notif' ? (
            <NotificationsPopover key={item.id}>
              <div className="relative z-10 w-full">{row}</div>
            </NotificationsPopover>
          ) : (
            row
          );
        })}
      </nav>

      {!isCollapsed && <WeekStrip onNavigate={onNavigate} />}

      {/* ── Recent · Chats (Notion's way: Ask AI's conversations live here, not in a column of its own) ── */}
      {!isCollapsed ? (
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
          <div
            role="tablist"
            aria-label="Lists"
            className="flex h-[26px] items-center gap-0.5 px-1"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              const next = section === 'recent' ? 'chats' : 'recent';
              setChoice({ path: pathname, tab: next });
              e.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
            }}
          >
            {(['recent', 'chats'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                data-tab={t}
                aria-selected={section === t}
                tabIndex={section === t ? 0 : -1}
                onClick={() => setChoice({ path: pathname, tab: t })}
                className={cn(
                  'h-[22px] rounded-[5px] px-1.5 text-[12px] font-[500] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-fill)]',
                  section === t ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'text-[var(--ui-ink-3)] hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-2)]',
                )}
              >
                {t === 'recent' ? 'Recent' : 'Chats'}
              </button>
            ))}
          </div>
          {section === 'chats' ? (
            <div className="mt-1">
              <Suspense fallback={null}>
                <SidebarChats onNavigate={onNavigate} />
              </Suspense>
            </div>
          ) : recent.length > 0 ? (
            <div className="mt-1 flex flex-col gap-px">
              {recent.map((v) => (
                <Link
                  key={`${v.itemType}-${v.itemId}`}
                  href={v.route}
                  onClick={onNavigate}
                  title={v.title}
                  className={cn(
                    rowBase,
                    'font-[400]',
                    pathname === v.route ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'hover:bg-[var(--ui-hover)]',
                  )}
                >
                  {recentIcon(v.itemType)}
                  <span className="ui-fade-end min-w-0 flex-1 py-1 text-left">{v.title || 'Untitled'}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-2 pt-2 text-[13px] leading-[1.4] text-[var(--ui-ink-3)]">Docs you open show here.</p>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* ── Footer ── */}
      <div className={cn('flex items-center gap-1 px-2 pb-2.5 pt-1.5 shrink-0', isCollapsed && 'flex-col', 'border-t border-[var(--ui-sidebar-edge)] pt-2')}>
          <button
            type="button"
            onClick={() => {
              onNavigate();
              onSettingsClick();
            }}
            title="Account and settings"
            className={cn(rowBase, 'h-[34px] flex-1 min-w-0 px-1.5 hover:bg-[var(--ui-hover)]', isCollapsed && 'w-[30px] flex-none justify-center px-0')}
          >
            <span className="grid h-[24px] w-[24px] shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--ui-avatar-bg)] text-[11px] font-[600] text-[var(--ui-avatar-ink)]">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initialsOf(user?.name)}
            </span>
            {!isCollapsed && (
              <>
                <span className="ui-fade-end min-w-0 flex-1 text-left text-[13.5px] font-[500] text-[var(--ui-ink-1)]">{user?.name || 'You'}</span>
                <Settings className="h-4 w-4 shrink-0 text-[var(--ui-icon)]" strokeWidth={STROKE} />
              </>
            )}
          </button>
        <ThemeSwitcher />
      </div>
    </div>
  );
}

// ─── Individual Nav Item ────────────────────────────────────────────────────
interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  todoFilter?: string;
  onSubItemClick?: (id: string) => void;
}

function SidebarNavItem({ item, isActive, isCollapsed, onClick, todoFilter, onSubItemClick }: SidebarNavItemProps) {
  const hasSubItems = !!item.subItems?.length;
  const isExpanded = isActive && hasSubItems && !isCollapsed;
  const Component = item.route === '#' ? 'button' : Link;
  const linkProps = item.route === '#' ? { type: 'button' as const } : { href: item.route };

  return (
    <div className="flex flex-col gap-px">
      <Component
        {...(linkProps as any)}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        title={isCollapsed ? item.label : undefined}
        className={cn(
          rowBase,
          'group relative',
          isActive
            ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]'
            : 'hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]',
          isCollapsed && 'justify-center px-0',
        )}
      >
        <span
          className={cn('relative shrink-0 transition-colors', isActive ? 'text-[var(--ui-ink-1)]' : 'text-[var(--ui-icon)] group-hover:text-[var(--ui-ink-2)]')}
        >
          {item.icon}
          {item.badge && isCollapsed && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--ui-accent-fill)]" />}
        </span>
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
            {item.badge !== undefined && typeof item.badge !== 'boolean' && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-[#1f6fd1] px-1 text-[12px] font-[600] leading-none text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Component>

      {/* Sub items (Tasks → Inbox) show while the section is open */}
      {isExpanded && (
        <div className="flex flex-col gap-px pl-6">
          {item.subItems!.map((sub) => {
            const isSubActive = todoFilter === sub.id;
            return (
              <Link
                href={item.route}
                key={sub.id}
                onClick={() => onSubItemClick?.(sub.id)}
                className={cn(
                  rowBase,
                  'h-[28px] text-[13.5px]',
                  isSubActive ? 'bg-[var(--ui-selected)] text-[var(--ui-ink-1)]' : 'hover:bg-[var(--ui-hover)] hover:text-[var(--ui-ink-1)]',
                )}
              >
                <span className={cn('shrink-0', isSubActive ? 'text-[var(--ui-ink-1)]' : 'text-[var(--ui-icon)]')}>{sub.icon}</span>
                <span className="truncate">{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
