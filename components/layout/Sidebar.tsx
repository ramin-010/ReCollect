// ReCollect - Redesigned Sidebar Component (Sleek & Funky)
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useViewStore } from '@/lib/store/viewStore';
import { useNotificationStore } from '@/lib/store/notificationStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui-base/Button';
import { cn } from '@/lib/utils';
import {
  PanelLeft,
  Home,
  Menu,
  X,
  Settings,
  PenTool,
  CheckSquare,
  FileText,
  Files,
  Search,
  CalendarDays,
  Inbox,
  Library,
  Users,
  ChevronDown,
  Mail,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { NotificationsPopover } from './NotificationsPopover';
import { getRecentVisitsFromCache, RecentVisit } from '@/lib/services/recentVisits';

// ─── Nav Item Definition ────────────────────────────────────────────────────
interface NavItem {
  id: string;
  route: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  comingSoon?: boolean;
  subItems?: { id: string; label: string; icon: React.ReactNode }[];
}

const primaryNav: NavItem[] = [
  { id: 'home', route: '/', label: 'Home', icon: <Home className="h-[18px] w-[18px]" /> },
  { id: 'docs', route: '/docs', label: 'Docs', icon: <FileText className="h-[18px] w-[18px]" /> },
  { id: 'workspace', route: '/workspace', label: 'Workspace', icon: <Users className="h-[18px] w-[18px] text-indigo-500/60" /> },
  { 
    id: 'todo', 
    route: '/todo',
    label: 'Tasks', 
    icon: <CheckSquare className="h-[18px] w-[18px] text-emerald-500/60" />,
    subItems: [
      { id: 'inbox', label: 'Inbox', icon: <Inbox className="h-3.5 w-3.5" /> },
    ]
  },
  { id: 'presentations', route: '/slides', label: 'Presentations', icon: <Files className="h-[18px] w-[18px] " /> },
    { id: 'inbox-notif', route: '#', label: 'Inbox', icon: <Inbox className="h-[18px] w-[18px]" /> },

  { id: 'drawing', route: '/drawing', label: 'Whiteboard', icon: <PenTool className="h-[18px] w-[18px]" /> },
  { id: 'email', route: '/email', label: 'Email', icon: <Mail className="h-[18px] w-[18px]" /> },
];

const secondaryNav: NavItem[] = [];

// ─── Main Sidebar Wrapper ───────────────────────────────────────────────────
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const isCollapsed = useViewStore((state) => state.isSidebarCollapsed);
  const setIsCollapsed = useViewStore((state) => state.setSidebarCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const todoFilter = useViewStore((state) => state.todoFilter);
  const setTodoFilter = useViewStore((state) => state.setTodoFilter);
  const setSettingsOpen = useSettingsStore((state) => state.setIsOpen);

  const handleNavClick = (route: string) => {
    setIsMobileOpen(false);
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'U';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'U';
    return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || 'U';
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50 bg-[hsl(var(--sidebar-bg))]"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-[260px] z-50 lg:hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                isCollapsed={false}
                onCollapse={() => {}}
                onMobileClose={() => setIsMobileOpen(false)}
                isMobile={true}
                user={user}
                pathname={pathname}
                todoFilter={todoFilter}
                setTodoFilter={setTodoFilter}
                onNavClick={handleNavClick}
                onSettingsClick={() => setSettingsOpen(true)}
                getInitials={getInitials}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:block relative z-30"
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onCollapse={() => setIsCollapsed(!isCollapsed)}
          onMobileClose={() => {}}
          isMobile={false}
          user={user}
          pathname={pathname}
          todoFilter={todoFilter}
          setTodoFilter={setTodoFilter}
          onNavClick={handleNavClick}
          onSettingsClick={() => setSettingsOpen(true)}
          getInitials={getInitials}
        />
      </motion.aside>
    </>
  );
}

// ─── Sidebar Content (shared between mobile & desktop) ──────────────────────
interface SidebarContentProps {
  isCollapsed: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
  isMobile: boolean;
  user: any;
  pathname: string;
  todoFilter?: any;
  setTodoFilter?: (filter: any) => void;
  onNavClick: (route: string) => void;
  onSettingsClick: () => void;
  getInitials: (name?: string) => string;
}

function SidebarContent({
  isCollapsed,
  onCollapse,
  onMobileClose,
  isMobile,
  user,
  pathname,
  todoFilter,
  setTodoFilter,
  onNavClick,
  onSettingsClick,
  getInitials,
}: SidebarContentProps & { currentView?: any }) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([]);

  useEffect(() => {
    // Update recents whenever path changes (which implies navigation)
    setRecentVisits(getRecentVisitsFromCache().slice(0, 15));
  }, [pathname]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'doc': return <FileText className="h-[18px] w-[18px]" />;
      case 'drawing': return <PenTool className="h-[18px] w-[18px]" />;
      case 'slide': return <Files className="h-[18px] w-[18px]" />;
      case 'workspace': return <Users className="h-[18px] w-[18px]" />;
      default: return <FileText className="h-[18px] w-[18px]" />;
    }
  };

  return (
    <div className="h-full flex flex-col notion-navbar notion-font border-r border-[hsl(var(--foreground))]/5 text-[hsl(var(--foreground))]/90">
      
      {/* ── Header: Top User Profile & Toggle ────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3 shrink-0">
        {!isCollapsed && (
          <button
            onClick={() => {
              if (isMobile) onMobileClose();
              onSettingsClick();
            }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--hover-bg))] transition-colors flex-1 min-w-0 group cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-sm bg-brand-primary p-[1px] shrink-0 group-hover:bg-brand-secondary transition-all">
              <div className="w-full h-full rounded-sm overflow-hidden bg-[hsl(var(--sidebar-bg))] flex items-center justify-center">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user?.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] font-bold text-[hsl(var(--foreground))]">{getInitials(user?.name)}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1 ml-1.5">
              <span className="text-[14px] font-medium truncate text-[hsl(var(--foreground))] tracking-tight w-full text-left">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate w-full text-left group-hover:text-[hsl(var(--foreground))]/80 transition-colors">Workspace</span>
            </div>
            <ChevronDown className="h-3 w-3 text-[hsl(var(--muted-foreground))]/70 shrink-0 ml-auto group-hover:text-[hsl(var(--foreground))]/80 transition-colors" />
          </button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={isMobile ? onMobileClose : onCollapse}
          className={cn(
            "shrink-0 h-8 w-8 p-0 rounded-lg hover:bg-[hsl(var(--hover-bg))]",
            isCollapsed && "mx-auto mt-1"
          )}
        >
          {isMobile ? <X className="h-[18px] w-[18px]" /> : <PanelLeft className="h-[18px] w-[18px] text-[hsl(var(--muted-foreground))]" />}
        </Button>
      </div>

      {/* ── Search Bar ────────────────────────── */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[hsl(var(--card))]/50 border  text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]/80 border-[hsl(var(--border-light))] transition-all duration-200 text-[14px] font-medium group subpixel-antialiased">
            <Search className="h-[15px] w-[15px] group-hover:text-[hsl(var(--foreground))]/80 transition-colors" />
            <span className="truncate">Search...</span>
          </button>
        </div>
      )}

      {/* ── Primary Navigation (Fixed) ──────────────────────────────── */}
      <div className="px-3 py-1 shrink-0">
        <nav className="space-y-0.5">
          {primaryNav.map((item) => {
            const currentItem = item.id === 'inbox-notif' && unreadCount > 0 
              ? { ...item, badge: unreadCount > 99 ? '99+' : unreadCount } 
              : item;

            const navItem = (
              <SidebarNavItem
                key={currentItem.id}
                item={currentItem}
                isActive={pathname === currentItem.route || (currentItem.route === '/' && pathname === '/')}
                isCollapsed={isCollapsed}
                onClick={() => onNavClick(currentItem.route)}
                todoFilter={todoFilter}
                onSubItemClick={(filterId) => {
                  if (currentItem.id === 'todo' && setTodoFilter) setTodoFilter(filterId);
                  onNavClick('/todo');
                }}
              />
            );

            if (currentItem.id === 'inbox-notif') {
              return (
                <NotificationsPopover key={item.id}>
                  <div className="w-full h-full relative z-10">
                    {navItem}
                  </div>
                </NotificationsPopover>
              );
            }

            return navItem;
          })}
        </nav>
      </div>

      {/* ── Recently Visited (Scrollable) ───────────────────────── */}
      {/* {!isCollapsed && recentVisits.length > 0 && (
        <>
          <div className="mx-4 my-1.5 h-[0.5px] bg-[hsl(var(--border-light))]/20 shrink-0" />
          <div className="flex-1 overflow-y-auto px-3 pb-4 pt-1 custom-scrollbar">
            <nav className="space-y-0.5">
              {recentVisits.map((visit) => (
                <Link
                  key={`${visit.itemType}-${visit.itemId}`}
                  href={visit.route}
                  onClick={() => {
                    if (isMobile) onMobileClose();
                  }}
                  className={cn(
                    "block px-3 py-1.5 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover-bg))] hover:text-[hsl(var(--foreground))] transition-colors group",
                    pathname === visit.route && "bg-[hsl(var(--active-bg))] text-[hsl(var(--foreground))]"
                  )}
                  title={visit.title}
                >
                  <span className="truncate block">{visit.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )} */}

      {/* Always stretch space since recents are commented out */}
      <div className="flex-1" />

      {/* ── Collapsed User Avatar ──────────────────────────── */}
      {isCollapsed && (
        <div className="px-2 pb-2 shrink-0">
          <button
            onClick={() => {
              onSettingsClick();
            }}
            className="mx-auto flex items-center justify-center w-8 h-8 rounded-sm bg-brand-primary p-[1px] hover:bg-brand-secondary transition-all cursor-pointer"
          >
            <div className="w-full h-full rounded-sm overflow-hidden bg-[hsl(var(--sidebar-bg))] flex items-center justify-center text-[hsl(var(--foreground))] text-[10px] font-bold">
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user?.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : getInitials(user?.name)}
            </div>
          </button>
        </div>
      )}

      {/* ── Footer: Settings ──────────────── */}
      <div className="border-t border-[hsl(var(--foreground))]/5 px-2 py-2 shrink-0 flex items-center justify-center">
        {!isCollapsed ? (
          <button
            onClick={() => {
              if (isMobile) onMobileClose();
              onSettingsClick();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover-bg))] hover:text-[hsl(var(--foreground))] transition-colors text-[13px] cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (isMobile) onMobileClose();
              onSettingsClick();
            }}
            className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--hover-bg))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
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
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isExpanded = isActive && hasSubItems && !isCollapsed;

  const Component = item.route === '#' ? 'button' : Link;
  const linkProps = item.route === '#' ? { type: 'button' as const } : { href: item.route };

  return (
    <div className="flex flex-col space-y-0.5">
      <Component
        {...linkProps as any}
        onClick={onClick}
        className={cn(
        "w-full flex items-center gap-3 px-3 py-[9px] rounded-lg text-[14px] font-medium transition-all duration-200 group relative outline-none subpixel-antialiased",
        isActive
          ? "text-[hsl(var(--foreground))]"
          : "text-[hsl(var(--foreground))]/60 hover:text-[hsl(var(--foreground))] hover:bg-[var(--hover-bg)]",
        item.comingSoon && "opacity-50 hover:opacity-100",
        isCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
      )}
    >
      {/* Sleek active state background mapping entirely inside the button */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-bg"
          className="absolute inset-0 rounded-lg bg-[var(--active-bg)]"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}

      {/* Vertical Indicator Line */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-line"
          className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-brand-primary"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}

      <span className={cn(
        "shrink-0 transition-all duration-300 relative z-10",
        isActive ? "text-[hsl(var(--foreground))]" : "group-hover:scale-110 group-hover:text-[hsl(var(--foreground))]"
      )}>
        {item.icon}
        {item.badge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-[hsl(var(--sidebar-bg))]" />
        )}
      </span>

      {!isCollapsed && (
        <>
          <span className="truncate relative z-10">{item.label}</span>
          
          {item.badge && typeof item.badge !== 'boolean' && (
            <span className="ml-auto flex items-center justify-center min-w-[10px] h-[16px] px-1.5 text-[9px] font-bold text-white bg-rose-600/80 rounded-sm relative z-10 shadow-sm shadow-rose-500/20">
              {item.badge}
            </span>
          )}

          {hasSubItems && !isCollapsed && (
            <ChevronDown className={cn("h-3.5 w-3.5 ml-auto text-[hsl(var(--muted-foreground))]/70 transition-transform duration-200 relative z-10 shrink-0", isExpanded && "rotate-180")} />
          )}

          {item.comingSoon && (
            <span className="ml-auto text-[9px] uppercase font-bold tracking-widest text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface-raised))] px-1.5 py-0.5 rounded border border-[hsl(var(--border-subtle))] relative z-10 leading-none group-hover:bg-[hsl(var(--surface-overlay))] transition-colors">
              Soon
            </span>
          )}
        </>
      )}
      </Component>

      {/* ── Sub Items (e.g., Inbox, Today) ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-9 pr-2 py-1 space-y-0.5">
              {item.subItems!.map((sub) => {
                const isSubActive = todoFilter === sub.id;
                return (
                  <Link
                    href={item.route}
                    key={sub.id}
                    onClick={() => {
                      if (onSubItemClick) onSubItemClick(sub.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group relative outline-none subpixel-antialiased",
                      isSubActive
                        ? "text-[hsl(var(--foreground))] bg-[var(--active-bg)]"
                        : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[var(--hover-bg)]"
                    )}
                  >
                    <span className={cn(
                      "shrink-0 transition-colors",
                      isSubActive ? "text-[hsl(var(--foreground))]" : "group-hover:text-[hsl(var(--foreground))]/80"
                    )}>
                      {sub.icon}
                    </span>
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}