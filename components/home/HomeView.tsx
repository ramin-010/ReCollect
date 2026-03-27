'use client';

import React, { useState, useEffect } from 'react';
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
  CalendarDays, ChevronRight, Mail,
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

  const [recents, setRecents] = useState<RecentVisit[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

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
    return () => clearInterval(interval);
  }, []);

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
      <div className="max-w-5xl mx-auto space-y-14">

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
          
          {/* Quick Actions (Absolute on Desktop, stacked on mobile) */}
          <div className="mt-6 md:mt-0 flex gap-3 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[var(--surface-raised)] hover:border-[var(--border-strong)] transition-all duration-200"
            >
              <FileText className="h-4 w-4" /> New Doc
            </Link>
            <Link
              href="/todo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] transition-all duration-200 shadow-sm"
            >
              <PenTool className="h-4 w-4" /> Add Task
            </Link>
          </div>
        </motion.div>

        {/* ─── 2. Recently Visited (Horizontal Cards) ─── */}
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
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 custom-scrollbar snap-x">
              {recents.map((item, i) => {
                const config = TYPE_CONFIG[item.itemType];
                const Icon = config.icon;
                
                // Card backgrounds mapping
                const bgColors: Record<string, string> = {
                  emerald: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20',
                  purple: 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20',
                  orange: 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20',
                  blue: 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20',
                };
                
                const cardGlow: Record<string, string> = {
                  emerald: 'group-hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]',
                  purple: 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]',
                  orange: 'group-hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]',
                  blue: 'group-hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]',
                };

                return (
                  <motion.button
                    key={item.itemId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    onClick={() => handleRecentClick(item)}
                    className={`shrink-0 w-[180px] sm:w-[220px] snap-center flex flex-col items-start gap-4 p-4 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all duration-300 group text-left ${cardGlow[config.color]}`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${bgColors[config.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="w-full">
                      <p className="text-[14px] font-medium text-[hsl(var(--foreground))] truncate mb-1 transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-[12px] text-[hsl(var(--muted-foreground))]">
                        <span>{config.label}</span>
                        <span>•</span>
                        <span>{getTimeAgo(item.visitedAt)}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* ─── 3. Learn & Tools Grid (Placeholder for Future Expansion) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
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
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--hover-bg)] transition-colors cursor-pointer group"
                      >
                        <div className="mt-0.5 shrink-0 w-[18px] h-[18px] rounded-[4px] border border-[hsl(var(--border))] group-hover:border-[hsl(var(--primary))]/50 transition-colors" />
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

        </div>
      </div>
    </div>
  );
}
