'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useDocStore } from '@/lib/store/docStore';
import { todoApi } from '@/lib/api/todoApi';
import {
  getRecentVisitsFromCache,
  syncRecentVisits,
  RecentVisit,
} from '@/lib/services/recentVisits';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Clock, FileText, PenTool, CheckSquare, Files,
  CalendarDays, ChevronRight, ChevronLeft, Mail,
  LayoutDashboard, Presentation, ArrowRight, Inbox
} from 'lucide-react';

// ─── Helper Functions ─────────────────────────────────────
const TYPE_CONFIG = {
  doc: { icon: FileText, color: 'emerald', label: 'Document' },
  drawing: { icon: PenTool, color: 'purple', label: 'Whiteboard' },
  slide: { icon: Files, color: 'orange', label: 'Presentation' },
  workspace: { icon: LayoutDashboard, color: 'blue', label: 'Workspace' },
} as const;

const getTimeAgo = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const diffMins = diffMs / (1000 * 60);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${Math.floor(diffMins)}m ago`;
  const diffHours = diffMins / 60;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  const diffDays = diffHours / 24;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(timestamp));
};

const getSmartDueDate = (dateStr: string) => {
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Overdue', className: 'text-red-400 bg-red-400/10' };
  if (diffDays === 0) return { label: 'Today', className: 'text-amber-400 bg-amber-400/10' };
  if (diffDays === 1) return { label: 'Tomorrow', className: 'text-blue-400 bg-blue-400/10' };
  return {
    label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(due),
    className: 'text-[hsl(var(--muted-foreground))] bg-[var(--surface-elevated)]'
  };
};

// ─── Main HomeView ────────────────────────────────────────
export function HomeView() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const setCurrentDoc = useDocStore((state) => state.setCurrentDoc);
  const docs = useDocStore((state) => state.docs);

  const [recents, setRecents] = useState<RecentVisit[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [dailyFocus, setDailyFocus] = useState('');

  // ── Scroll State ──
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [recents]);

  // ── Clock & Greeting ──
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');

      setCurrentDate(new Intl.DateTimeFormat('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      }).format(now));

      setCurrentTime(new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      }).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 60 * 1000);

    // Load daily focus
    const savedFocus = localStorage.getItem('recollect_daily_focus');
    if (savedFocus) setDailyFocus(savedFocus);

    return () => clearInterval(interval);
  }, []);

  const handleFocusChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDailyFocus(e.target.value);
    localStorage.setItem('recollect_daily_focus', e.target.value);
  };

  // ── Fetch Data ──
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);

      // 1. Read from localStorage cache instantly (no spinner)
      const cached = getRecentVisitsFromCache();
      if (cached.length > 0 && mounted) {
        setRecents(cached);
        setIsLoading(false); // show cached data immediately
      }

      try {
        // 2. Fetch tasks + sync recent visits from server in parallel
        const [tasksRes, freshRecents] = await Promise.allSettled([
          todoApi.fetchTodos(),
          syncRecentVisits(),
        ]);

        if (!mounted) return;

        // Recent visits (server-synced)
        if (freshRecents.status === 'fulfilled') {
          setRecents(freshRecents.value);
        }

        // Tasks
        const allTasks = tasksRes.status === 'fulfilled' ? tasksRes.value : [];
        const pendingTasks = allTasks
          .filter((t: any) => t.status !== 'complete')
          .sort((a: any, b: any) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .slice(0, 5);
        setTasks(pendingTasks);
      } catch (error) {
        console.error('Failed to load home data', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  // ── Click Handlers ──
  const handleRecentClick = (item: RecentVisit) => {
    router.push(item.route);
  };

  // ── Skeleton State ──
  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 min-h-screen overflow-y-auto custom-scrollbar pb-24">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Skeleton */}
          <div className="flex flex-col items-center justify-center pt-8 pb-4">
            <Skeleton className="h-10 w-64 rounded-xl bg-[var(--surface-elevated)] mb-2" />
          </div>

          {/* Recents Skeleton */}
          <div>
            <Skeleton className="h-6 w-32 rounded bg-[var(--surface-elevated)] mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-44 shrink-0 rounded-2xl bg-[var(--surface-elevated)]" />)}
            </div>
          </div>

          {/* Tasks Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl bg-[var(--surface-elevated)]" />
            <Skeleton className="h-64 rounded-2xl bg-[var(--surface-elevated)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-10 min-h-screen overflow-y-auto custom-scrollbar pb-24">
      <div className="max-w-[1050px] mx-auto space-y-14">

        {/* ─── 1. Hero Greeting ─── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-center text-center pt-6 pb-2 relative"
        >
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))] mb-2">
            {greeting},{' '}
            <span className="text-[hsl(var(--foreground))]/90">
              {user?.name?.split(' ')[0] || 'there'}
            </span>
          </h1>
        </motion.div>

        {/* ─── 2. Main Content Grid ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* ─── Left Column (Content) ─── */}
          <div className="xl:col-span-8 space-y-8">

            {/* Recently Visited */}
            <motion.section

          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4 px-1 text-white/70">
            <Clock className="h-4 w-4" />
            <h2 className="text-[14px] font-medium">Recently visited</h2>
          </div>

          {recents.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <Clock className="h-8 w-8 text-[hsl(var(--muted-foreground))]/40 mx-auto mb-3" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]/60">No recent activity yet</p>
            </div>
          ) : (
            <div className="relative group/scroll">
              <div 
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className="flex overflow-x-auto gap-4 pb-4 -mx-1 px-1 custom-scrollbar snap-x no-scrollbar"
              >
                {recents.map((item, i) => {
                  const config = TYPE_CONFIG[item.itemType];
                  const Icon = config.icon;
                  const doc = item.itemType === 'doc' ? docs.find(d => d._id === item.itemId) : null;
                  const coverImg = doc?.coverImage || null;

                  return (
                    <motion.button
                      key={item.itemId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      onClick={() => handleRecentClick(item)}
                      className="shrink-0 w-[180px] h-[150px] snap-center flex flex-col rounded-[14px] bg-[var(--surface-elevated)] hover:bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all duration-300 group text-left overflow-hidden relative shadow-none"
                    >
                      {/* Top Half */}
                      <div className="h-[45%] w-full bg-white/[0.02] border-b border-[hsl(var(--border))]/30 flex items-end px-4 pb-2 relative">
                        {/* Cover Image */}
                        {coverImg && (
                          <div className="absolute inset-0 w-full h-full overflow-hidden">
                            <img 
                              src={coverImg}
                              alt="Cover"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20" /> {/* Subtle overlay for better icon visibility */}
                          </div>
                        )}
                        <Icon className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors relative z-10" strokeWidth={1.5} />
                      </div>
                      
                      {/* Bottom Half */}
                      <div className="h-[55%] w-full p-4 flex flex-col justify-between">
                        <p className="text-[14px] font-medium text-[hsl(var(--foreground))] truncate leading-snug">
                          {item.title}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-auto">
                          {/* Mini Avatar */}
                          <div className="h-[18px] w-[18px] rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center text-[10px] font-semibold border border-[hsl(var(--border))]/50">
                            {user?.name?.charAt(0)?.toUpperCase() || 'R'}
                          </div>
                          <span className="text-[12px] text-[hsl(var(--muted-foreground))]/80">
                            {getTimeAgo(item.visitedAt)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Left Fade Overlay & Scroll Button */}
              {canScrollLeft && (
                <>
                  <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-[hsl(var(--background))] to-transparent pointer-events-none z-10" />
                  <div className="absolute left-0 top-0 bottom-4 w-32 pointer-events-none z-20 flex items-center justify-start pl-2 opacity-0 group-hover/scroll:opacity-100 transition-opacity">
                    <div 
                      className="h-8 w-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shadow-md pointer-events-auto cursor-pointer hover:bg-[var(--surface-raised)] text-[hsl(var(--foreground))] transition-transform hover:scale-105 active:scale-95"
                      onClick={() => {
                        if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </div>
                  </div>
                </>
              )}

              {/* Right Fade Overlay & Scroll Button */}
              {canScrollRight && (
                <>
                  <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-[hsl(var(--background))] to-transparent pointer-events-none z-10" />
                  <div className="absolute right-0 top-0 bottom-4 w-32 pointer-events-none z-20 flex items-center justify-end pr-2 opacity-0 group-hover/scroll:opacity-100 transition-opacity">
                    <div 
                      className="h-8 w-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shadow-md pointer-events-auto cursor-pointer hover:bg-[var(--surface-raised)] text-[hsl(var(--foreground))] transition-transform hover:scale-105 active:scale-95"
                      onClick={() => {
                        if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.section>

            {/* Plan your day Widget */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-5"
            >
              <h2 className="text-[14px] font-medium text-[hsl(var(--foreground))] mb-3">
                Plan your day
              </h2>
              <textarea
                value={dailyFocus}
                onChange={handleFocusChange}
                placeholder="Start typing..."
                className="w-full bg-transparent border-none resize-none focus:ring-0 text-[15px] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 min-h-[150px] outline-none custom-scrollbar"
              />
            </motion.section>

          </div> {/* End Left Column */}

          {/* ─── Right Column (Actionables) ─── */}
          <div className="xl:col-span-4 space-y-8">
          
          {/* Upcoming Tasks */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2 text-white/70">
                <CheckSquare className="h-4 w-4" />
                <h2 className="text-[14px] font-medium">Upcoming Tasks</h2>
              </div>
              <Link href="/todo" className="text-[12px] text-white/40 hover:text-white/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-2">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <CheckSquare className="h-6 w-6 text-white/20 mb-2" />
                  <p className="text-[13px] font-medium text-white/50">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {tasks.map((task, i) => {
                    const dueInfo = task.dueDate ? getSmartDueDate(task.dueDate) : null;
                    const priorityColors: Record<string, string> = {
                      high: 'text-red-400 bg-red-400/10',
                      medium: 'text-amber-400 bg-amber-400/10',
                      low: 'text-white/40 bg-white/5',
                    };

                    return (
                      <div
                        key={task._id}
                        onClick={() => router.push('/todo')}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer group"
                      >
                        <div className="mt-1 shrink-0 text-[hsl(var(--muted-foreground))]/50 group-hover:text-[hsl(var(--primary))] transition-colors">
                          <CheckSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors leading-relaxed">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {dueInfo && (
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${dueInfo.className}`}>
                                {dueInfo.label}
                              </span>
                            )}
                            {task.priority && task.priority !== 'none' && (
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium capitalize ${priorityColors[task.priority] || ''}`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>

          </div> {/* End Right Column */}
        </div> {/* End Main Content Grid */}
      </div>
    </div>
  );
}
