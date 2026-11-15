// components/layout/NotificationsPopover.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Bell, Check, RefreshCw, CheckCheck, Users, ClipboardList, Megaphone, Info, Share2 } from 'lucide-react';
import { rcScope, RcButton, RcIconButton, RcSegmented, RcSkel } from '@/components/rc-ui';
import './notifications.css';
import { useRouter } from 'next/navigation';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui-base/Popover';
import { Button } from '@/components/ui-base/Button';
import { notificationApi, AppNotification } from '@/lib/api/notificationApi';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNotificationStore } from '@/lib/store/notificationStore';

const POLL_INTERVAL_MS =  1 * 60 * 1000; // 2 minutes

// ── Tab filter types ──
type TabFilter = 'all' | 'unread' | 'actionable';

// ── Icon by notification type (the icon grey; colour never announces) ──
function getNotificationIcon(type: string, category: string) {
  switch (type) {
    case 'workspace_invite':
      return <Users aria-hidden />;
    case 'task_assigned':
    case 'task_reminder':
      return <ClipboardList aria-hidden />;
    // Sharing (MANAGER_AND_DOCS_PLAN §2): someone asks to edit, shared a doc, said yes.
    case 'doc_access_request':
    case 'doc_shared':
    case 'doc_access_approved':
      return <Share2 aria-hidden />;
    default:
      return category === 'promotional' ? <Megaphone aria-hidden /> : <Info aria-hidden />;
  }
}

export function NotificationsPopover({ children, open: externalOpen, onOpenChange: externalOnOpenChange }: { 
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    if (externalOnOpenChange) externalOnOpenChange(newOpen);
  };

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);
  const roleHashRef = useRef<string | null>(null);

  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);
  const router = useRouter();

  // A notification that points somewhere (metadata.url, e.g. a doc's Share menu) opens it and counts as read.
  const handleOpen = (notification: AppNotification) => {
    const url = notification.metadata?.url;
    if (typeof url !== 'string' || !url.startsWith('/')) return;
    if (!notification.isRead) {
      setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n)));
      setUnreadCount(Math.max(0, unreadCount - 1));
      notificationApi.markAsRead(notification._id).catch(() => {});
    }
    handleOpenChange(false);
    router.push(url);
  };

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async (pageNum = 1, filter: TabFilter = activeTab, append = false) => {
    try {
      if (pageNum === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      const res = await notificationApi.getNotifications(pageNum, 20, filter);
      if (res.success) {
        if (append) {
          setNotifications(prev => [...prev, ...res.data]);
        } else {
          setNotifications(res.data);
        }
        setHasMore(res.pagination.hasMore);
        setPage(pageNum);
      }
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeTab]);

  // ── Fetch unread count + role drift detection ──
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.data.count);

        // Role drift detection
        const newHash = res.data.workspaceRoleHash;
        if (roleHashRef.current !== null && roleHashRef.current !== newHash) {
          // Role changed! Refresh workspace data silently
          fetchWorkspaces();
          toast.info('Your workspace permissions were updated', {
            description: 'The page has been refreshed with your updated role.',
          });
        }
        roleHashRef.current = newHash;
      }
    } catch {
      // Silent fail
    }
  }, [fetchWorkspaces]);

  // ── Fetch on popover open ──
  useEffect(() => {
    if (open) {
      fetchNotifications(1, activeTab);
      fetchUnreadCount();
      hasFetchedRef.current = true;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial unread count on mount + 2min polling ──
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // ── Tab change ──
  const handleTabChange = useCallback((tab: TabFilter) => {
    setActiveTab(tab);
    fetchNotifications(1, tab);
  }, [fetchNotifications]);

  // ── Pull to refresh — load more on scroll to bottom ──
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingMore || !hasMore) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      fetchNotifications(page + 1, activeTab, true);
    }
  }, [isLoadingMore, hasMore, page, activeTab, fetchNotifications]);

  // ── Refresh button ──
  const handleRefresh = useCallback(() => {
    fetchNotifications(1, activeTab);
    fetchUnreadCount();
  }, [activeTab, fetchNotifications, fetchUnreadCount]);

  // ── Accept notification ──
  const handleAccept = useCallback(async (id: string) => {
    try {
      setActionLoadingId(id);

      // Find the notification type before accepting
      const notification = notifications.find(n => n._id === id);

      const res = await notificationApi.accept(id);
      if (res.success) {
        setNotifications(prev =>
          prev.map(n => n._id === id ? { ...n, status: 'accepted', isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success(res.message || 'Accepted!');

        // Refresh relevant stores based on notification type
        if (notification?.type === 'workspace_invite' || 
            notification?.type === 'workspace_join_request' ||
            notification?.type === 'task_assigned') {
          fetchWorkspaces();
        }
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setActionLoadingId(null);
    }
  }, [notifications, fetchWorkspaces]);

  // ── Decline notification ──
  const handleDecline = useCallback(async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await notificationApi.decline(id);
      if (res.success) {
        setNotifications(prev =>
          prev.map(n => n._id === id ? { ...n, status: 'declined', isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success(res.message || 'Declined');
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to decline');
    } finally {
      setActionLoadingId(null);
    }
  }, []);

  // ── Mark all as read ──
  const handleMarkAllRead = useCallback(async () => {
    try {
      const res = await notificationApi.markAllAsRead();
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      toast.error('Failed to mark all as read');
    }
  }, []);

  const TABS: { value: TabFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'actionable', label: 'To answer' },
  ];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className="relative text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] h-8 w-8 p-0"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={12} collisionPadding={12} className={cn(rcScope, 'rc-float nt-pop')}>
        <div className="nt-head">
          <h3 className="nt-title">Notifications</h3>
          <div className="nt-head-actions">
            <RcIconButton label="Refresh" size="sm" onClick={handleRefresh}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} strokeWidth={1.75} />
            </RcIconButton>
            {unreadCount > 0 && (
              <RcIconButton label="Mark all as read" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="h-4 w-4" strokeWidth={1.75} />
              </RcIconButton>
            )}
          </div>
        </div>
        <div className="nt-tabs">
          <RcSegmented label="Show" options={TABS} value={activeTab} onChange={(v) => handleTabChange(v)} />
        </div>
        <div ref={scrollRef} onScroll={handleScroll} className="nt-list">
          {isLoading ? (
            <div aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="nt-row">
                  <RcSkel className="h-6 w-6" />
                  <div className="flex-1">
                    <RcSkel className="h-4 w-3/4" />
                    <RcSkel className="mt-2 h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="nt-empty">
              <Bell aria-hidden />
              {activeTab === 'unread' ? 'Nothing unread.' : activeTab === 'actionable' ? 'Nothing waits for your answer.' : 'No notifications yet.'}
            </p>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                isActionLoading={actionLoadingId === notification._id}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onOpen={handleOpen}
              />
            ))
          )}
          {isLoadingMore && (
            <div className="nt-row">
              <RcSkel className="h-4 w-2/3" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── One notification ──
function NotificationItem({
  notification,
  isActionLoading,
  onAccept,
  onDecline,
  onOpen,
}: {
  notification: AppNotification;
  isActionLoading: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onOpen: (notification: AppNotification) => void;
}) {
  const opens = typeof notification.metadata?.url === 'string' && notification.metadata.url.startsWith('/');
  const isActionable = notification.category === 'actionable' && notification.status === 'pending';
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
  const sender = notification.sender;

  return (
    <div
      className="nt-row"
      data-unread={notification.isRead ? undefined : true}
      data-opens={opens || undefined}
      role={opens ? 'link' : undefined}
      tabIndex={opens ? 0 : undefined}
      onClick={opens ? () => onOpen(notification) : undefined}
      onKeyDown={opens ? (e) => { if (e.key === 'Enter') onOpen(notification); } : undefined}
    >
      <span className="nt-avatar" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- avatars come from any host */}
        {sender?.avatar ? <img src={sender.avatar} alt="" referrerPolicy="no-referrer" /> : getNotificationIcon(notification.type, notification.category)}
      </span>
      <span className="nt-body">
        <span className="nt-name">{notification.title}</span>
        {notification.message && <span className="nt-message">{notification.message}</span>}
        <span className="nt-time">{timeAgo}</span>
        {isActionable && (
          <span className="nt-actions">
            <RcButton size="sm" variant="outline" busy={isActionLoading} icon={<Check className="h-4 w-4" strokeWidth={1.75} />} onClick={(e) => { e.stopPropagation(); onAccept(notification._id); }}>
              Accept
            </RcButton>
            <RcButton size="sm" variant="quiet" disabled={isActionLoading} onClick={(e) => { e.stopPropagation(); onDecline(notification._id); }}>
              Decline
            </RcButton>
          </span>
        )}
        {notification.status === 'accepted' && <span className="nt-answer nt-answer--yes"><Check aria-hidden /> Accepted</span>}
        {notification.status === 'declined' && <span className="nt-answer">Declined</span>}
      </span>
      {!notification.isRead && <span className="nt-dot" aria-label="Unread" />}
    </div>
  );
}
