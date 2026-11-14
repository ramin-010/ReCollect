'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format12h, minutesToTime, timeToMinutes } from '@/lib/learning/engine';
import { nowMinutes } from '@/lib/learning/dates';
import type { Slot } from '@/lib/learning/types';
import { lx } from './styles';

interface ScheduleTimelineProps {
  slots: Slot[];
  timezone: string;
  onManageDay: () => void;
}

interface ComputedSlot extends Slot {
  startMin: number;
  endMin: number;
  duration: number;
  isCurrentlyActive: boolean;
}

/**
 * Revise ScheduleTimeline: today's non-skipped slots as one bar, the "now" dot (refreshed
 * every 30 s, in the user's zone), labels below, ⚙ opens the Day Manager.
 */
export function ScheduleTimeline({ slots, timezone, onManageDay }: ScheduleTimelineProps) {
  const [currentMinutes, setCurrentMinutes] = useState(() => nowMinutes(timezone));

  useEffect(() => {
    const id = setInterval(() => setCurrentMinutes(nowMinutes(timezone)), 30_000);
    return () => clearInterval(id);
  }, [timezone]);

  const renderSlots: ComputedSlot[] = useMemo(
    () =>
      slots
        .filter((s) => s.status !== 'SKIPPED')
        .map((s) => {
          const startMin = timeToMinutes(s.startTime);
          let endMin = timeToMinutes(s.endTime);
          if (endMin <= startMin) endMin += 24 * 60; // midnight crossover
          return {
            ...s,
            startMin,
            endMin,
            duration: endMin - startMin,
            isCurrentlyActive: currentMinutes >= startMin && currentMinutes < endMin,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [slots, currentMinutes],
  );

  const gear = (
    <button
      onClick={onManageDay}
      className={cn('absolute -top-6 right-0 p-1 transition-colors outline-none z-20 hover:text-[hsl(var(--foreground))]', lx.muted)}
      title="Manage Day"
      aria-label="Manage Day"
    >
      <Settings2 className="w-4 h-4" />
    </button>
  );

  if (renderSlots.length === 0) {
    // Revise rendered an empty bar with no way into the Day Manager; the gear stays reachable here.
    return (
      <section className="mb-8 mt-6 relative">
        {gear}
        <div className={cn('relative flex h-[6px] rounded-full overflow-hidden', lx.divider)} />
      </section>
    );
  }

  const timelineStart = Math.min(...renderSlots.map((b) => b.startMin));
  let timelineEnd = Math.max(...renderSlots.map((b) => b.endMin)) + 30; // buffer on the end only
  if (currentMinutes >= timelineStart && currentMinutes < timelineEnd) {
    timelineEnd = Math.max(timelineEnd, currentMinutes + 30);
  }
  const totalMinutes = timelineEnd - timelineStart;
  const toPct = (min: number) => ((min - timelineStart) / totalMinutes) * 100;

  const lastBlock = renderSlots[renderSlots.length - 1];
  const showEndLabel = !!lastBlock && lastBlock.duration > 60;
  const anyActive = renderSlots.some((s) => s.isCurrentlyActive);
  const nowPct = Math.max(0, Math.min(100, toPct(currentMinutes)));

  return (
    <section className="mb-12 mt-4 relative w-full">
      {gear}
      <div className="overflow-x-auto custom-scrollbar pb-6 -mb-6">
        <div className="relative mt-2 min-w-[600px] w-full">
          {/* Track */}
          <div className="absolute top-0 w-full h-[8px] rounded-full bg-[var(--border-subtle)] pointer-events-none" />

          {/* Blocks */}
          <div className="relative h-[8px] rounded-full w-full">
            {renderSlots.map((block) => {
              const startPct = toPct(block.startMin);
              const widthPct = toPct(block.endMin) - startPct;
              return (
                <div
                  key={block._id}
                  className={cn('absolute top-0 h-full transition-all duration-300 hover:opacity-100 z-10', block.isCurrentlyActive ? 'opacity-100' : 'opacity-80')}
                  style={{ left: `${Math.max(0, startPct)}%`, width: `${Math.max(0, widthPct)}%` }}
                  title={`${block.title} · ${format12h(block.startTime)} – ${format12h(block.endTime)}`}
                >
                  <div className="w-full h-full rounded-full bg-[hsl(var(--primary))]" />
                </div>
              );
            })}
          </div>

          {/* Now */}
          <div className="absolute top-[-3px] z-20 transition-all duration-1000 pointer-events-none" style={{ left: `${nowPct}%` }}>
            <div
              className={cn(
                'w-[14px] h-[14px] rounded-full border-2 border-[hsl(var(--background))] -ml-[7px]',
                anyActive ? 'bg-[hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary)/0.6)]' : 'bg-[hsl(var(--foreground))]/40',
              )}
            />
          </div>

          {/* Labels */}
          <div className="relative mt-3 min-h-[35px] pointer-events-none">
            {renderSlots.map((block) => {
              const startPct = toPct(block.startMin);
              const widthPct = toPct(block.endMin) - startPct;
              return (
                <div
                  key={block._id}
                  style={{ left: `${Math.max(0, startPct)}%`, width: `${Math.max(0, widthPct)}%` }}
                  className="absolute top-0 min-w-0 pr-2 transition-all duration-300"
                >
                  <div className="flex items-center gap-1.5" title={block.title}>
                    {block.isCurrentlyActive && <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[hsl(var(--primary))] animate-pulse" />}
                    <p className={cn('text-[10px] font-medium truncate', block.isCurrentlyActive ? 'text-[hsl(var(--foreground))]/90' : lx.muted)}>{block.title}</p>
                  </div>
                  <p className={cn('text-[9.5px] font-mono mt-0.5 truncate', block.isCurrentlyActive ? lx.primaryText : lx.muted)}>
                    {format12h(minutesToTime(block.startMin))}
                  </p>
                </div>
              );
            })}
            {showEndLabel && lastBlock && (
              <div className="absolute right-0 top-0 text-right w-[60px]">
                <p className="text-[10px] font-medium text-transparent select-none">End</p>
                <p className={cn('text-[9px] font-mono mt-px', lx.muted)}>{format12h(lastBlock.endTime)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
