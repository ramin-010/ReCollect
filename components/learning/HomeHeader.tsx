'use client';

import { Flame, FolderPlus, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDay, greeting } from '@/lib/learning/dates';
import type { DayString, TodayStats } from '@/lib/learning/types';
import { lx } from './styles';

interface HomeHeaderProps {
  userName: string;
  today: DayString;
  timezone: string;
  stats: TodayStats;
  onWrapUpDay: () => void;
  onExport: () => void;
  onNewSubject: () => void;
}

/** Revise DashboardClient header: greeting + date │ Wrap Up Day · ✨ · streak · adherence ±Δ · New Subject. */
export function HomeHeader({ userName, today, timezone, stats, onWrapUpDay, onExport, onNewSubject }: HomeHeaderProps) {
  // Colour the adherence figure by where it sits, not by sentiment (Revise).
  const adherenceTone =
    stats.adherence === null ? lx.muted : stats.adherence >= 70 ? lx.success : stats.adherence >= 40 ? lx.warning : lx.danger;
  const firstName = userName.trim().split(/\s+/)[0] || 'there';

  return (
    <header className="flex flex-col gap-3 md:gap-1 mb-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 md:gap-0">
        <div>
          <h1 className={cn('text-2xl md:text-3xl font-bold', lx.fg)}>
            {greeting(timezone)}, {firstName}
          </h1>
          <p className={cn('text-sm mt-0.5 md:mt-1', lx.muted)}>{formatDay(today)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 md:mt-1">
          <button
            onClick={onWrapUpDay}
            className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors hover:bg-[hsl(var(--primary))]/20', lx.primarySoft)}
          >
            Wrap Up Day
          </button>
          <button
            onClick={onExport}
            className="p-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors rounded-lg border border-purple-500/20"
            title="Export AI Context"
            aria-label="Export AI Context"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <div className={cn('flex items-center gap-1.5 text-sm ml-2', lx.muted)} title={`Longest streak: ${stats.longestStreak} days`}>
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-orange-400">{stats.streak}</span>
            <span>day streak</span>
          </div>
          {stats.adherence !== null && (
            <>
              <div className={cn('h-4 w-px', lx.divider)} />
              {/* The honest number: streak and review counts only go up; this one can go down. */}
              <div
                className={cn('flex items-center gap-1.5 text-sm', lx.muted)}
                title={`${stats.adherenceDone} of ${stats.adherenceTotal} scheduled blocks completed in the last 7 days`}
              >
                <Target className={cn('w-4 h-4', adherenceTone)} />
                <span className={cn('font-semibold', adherenceTone)}>{stats.adherence}%</span>
                <span>blocks this week</span>
                {stats.adherenceDelta !== null && stats.adherenceDelta !== 0 && (
                  <span
                    className={cn('text-xs font-medium', stats.adherenceDelta > 0 ? lx.success : lx.danger)}
                    title={`${stats.adherenceDelta > 0 ? 'Up' : 'Down'} ${Math.abs(stats.adherenceDelta)} points vs the previous 7 days`}
                  >
                    {stats.adherenceDelta > 0 ? '↑' : '↓'}
                    {Math.abs(stats.adherenceDelta)}
                  </span>
                )}
              </div>
            </>
          )}
          <div className={cn('h-4 w-px hidden md:block ml-2', lx.divider)} />
          <button
            onClick={onNewSubject}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors md:ml-2 w-full md:w-auto justify-center', lx.primaryBg)}
          >
            <FolderPlus className="w-4 h-4" />
            New Subject
          </button>
        </div>
      </div>
    </header>
  );
}
