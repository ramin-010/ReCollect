'use client';

import { BookOpen, Inbox, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TodayStats } from '@/lib/learning/types';
import { lx } from './styles';

/** Revise's "Progress" card (desktop: under the tasks; mobile: under Quick Notes). */
export function ProgressCard({ stats, inboxCount, className }: { stats: TodayStats; inboxCount: number; className?: string }) {
  const pct = stats.totalTopics > 0 ? (stats.mastered / stats.totalTopics) * 100 : 0;
  const row = cn('flex items-center gap-2 text-sm', lx.muted);
  const value = cn('text-sm font-semibold', lx.muted);
  return (
    <section className={className}>
      <h2 className={cn(lx.sectionTitle, 'h-8 flex items-center mb-4')}>Progress</h2>
      <div className={cn('p-4 space-y-4', lx.card)}>
        <div className="flex items-center justify-between">
          <div className={row}>
            <Target className="w-4 h-4 text-[hsl(var(--primary))]/50" />
            <span>Mastered</span>
          </div>
          <span className={value}>
            {stats.mastered} / {stats.totalTopics}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[hsl(var(--background))] rounded-full overflow-hidden">
          <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className={row}>
            <Zap className="w-4 h-4 text-[hsl(var(--warning))]/50" />
            <span>In progress</span>
          </div>
          <span className={value}>{stats.inProgress}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className={row}>
            <Inbox className="w-4 h-4 text-[hsl(var(--primary))]/50" />
            <span>Inbox ({inboxCount})</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className={row}>
            <BookOpen className="w-4 h-4" />
            <span>Not started</span>
          </div>
          <span className={value}>{stats.notStarted}</span>
        </div>
      </div>
    </section>
  );
}
