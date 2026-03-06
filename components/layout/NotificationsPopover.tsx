// components/layout/NotificationsPopover.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Bell, Check, X, RefreshCw, CheckCheck, Users, ClipboardList, Megaphone, Info, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui-base/Popover';
import { Button } from '@/components/ui-base/Button';
import { notificationApi, AppNotification } from '@/lib/api/notificationApi';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// ── Tab filter types ──
type TabFilter = 'all' | 'unread' | 'actionable';

// ── Icon mapping by notification type ──
function getNotificationIcon(type: string, category: string) {
  switch (type) {
    case 'workspace_invite':
      return <Users className="w-4 h-4 text-indigo-400" />;
    case 'task_assigned':
    case 'task_reminder':
      return <ClipboardList className="w-4 h-4 text-amber-400" />;
    default:
      if (category === 'promotional') return <Megaphone className="w-4 h-4 text-pink-400" />;
      return <Info className="w-4 h-4 text-sky-400" />;
  }
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

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

  // ── Fetch unread count ──
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.success) setUnreadCount(res.data.count);
    } catch {
      // Silent fail
    }
  }, []);

  // ── Fetch on popover open ──
  useEffect(() => {
    if (open) {
      fetchNotifications(1, activeTab);
      fetchUnreadCount();
      hasFetchedRef.current = true;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial unread count on mount ──
  useEffect(() => {
    fetchUnreadCount();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const res = await notificationApi.accept(id);
      if (res.success) {
        setNotifications(prev =>
          prev.map(n => n._id === id ? { ...n, status: 'accepted', isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success(res.message || 'Accepted!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setActionLoadingId(null);
    }
  }, []);

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
    } catch (err: any) {
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

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'actionable', label: 'Action Required' },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Notifications</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                activeTab === tab.key
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Notification List ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[420px] overflow-y-auto"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center mb-3">
                <Bell className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {activeTab === 'unread' ? 'No unread notifications' :
                 activeTab === 'actionable' ? 'Nothing requires action' :
                 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]/50">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  isActionLoading={actionLoadingId === notification._id}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          )}

          {/* Load more spinner */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Individual Notification Card ──
function NotificationItem({
  notification,
  isActionLoading,
  onAccept,
  onDecline,
}: {
  notification: AppNotification;
  isActionLoading: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const isActionable = notification.category === 'actionable' && notification.status === 'pending';
  const isHandled = notification.status === 'accepted' || notification.status === 'declined';
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--accent))]/40",
        !notification.isRead && "bg-[hsl(var(--accent))]/20"
      )}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center shrink-0 mt-0.5">
        {notification.sender?.avatar ? (
          <img
            src={notification.sender.avatar}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          getNotificationIcon(notification.type, notification.category)
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[13px] leading-snug",
          notification.isRead
            ? "text-[hsl(var(--muted-foreground))]"
            : "text-[hsl(var(--foreground))]"
        )}>
          <span className="font-medium">{notification.title}</span>
        </p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]/60 mt-1">
          {timeAgo}
        </p>

        {/* Action Buttons for actionable notifications */}
        {isActionable && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onAccept(notification._id)}
              disabled={isActionLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 rounded-md transition-colors disabled:opacity-50"
            >
              {isActionLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Accept
            </button>
            <button
              onClick={() => onDecline(notification._id)}
              disabled={isActionLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] rounded-md transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              Decline
            </button>
          </div>
        )}

        {/* Status badge for handled notifications */}
        {isHandled && (
          <span className={cn(
            "inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider",
            notification.status === 'accepted'
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-rose-400 bg-rose-500/10"
          )}>
            {notification.status}
          </span>
        )}
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-2" />
      )}
    </div>
  );
}
