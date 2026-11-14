'use client';

import { useState } from 'react';
import { CalendarDays, CalendarRange, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLearningStore } from '@/lib/store/learningStore';
import type { WeeklyReview } from '@/lib/learning/types';
import { LearningDialog } from './LearningDialog';
import { lx } from './styles';

/**
 * "Plan your week" (Mondays): last week's open "This week" tasks → move to this week, move to this
 * month, or mark done. Never opens by itself: Home shows a quiet link that opens it (LOOP_V2_SPEC §6).
 * Driven by `weeklyReview` from GET /api/today (the user's Monday, not the browser's getDay()).
 */
export function WeeklyReviewDialog({ review, isOpen, onClose }: { review: WeeklyReview; isOpen: boolean; onClose: () => void }) {
  const { shiftGoal, toggleTask } = useLearningStore.getState();
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);

  const open = review.goals.filter((g) => !handled.has(g._id));
  if (!isOpen) return null;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setProcessingId(id);
    try {
      const ok = await fn();
      if (ok !== false) setHandled((prev) => new Set(prev).add(id));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <LearningDialog
      isOpen
      onClose={onClose}
      width="max-w-md"
      icon={<CalendarRange className={cn('w-5 h-5', lx.primaryText)} />}
      title="Plan your week"
      subtitle={open.length ? `${open.length} ${open.length === 1 ? 'task' : 'tasks'} from last week ${open.length === 1 ? 'is' : 'are'} still open.` : 'All sorted. Nothing from last week is open.'}
      bodyClassName="p-4"
      footer={
        <button onClick={onClose} className={cn('w-full py-1 text-sm font-medium transition-colors hover:text-[hsl(var(--foreground))]', lx.muted)}>
          {open.length ? 'Later' : 'Close'}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        {open.map((goal) => (
          <div key={goal._id} className={cn('rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden', lx.inset)}>
            {processingId === goal._id && (
              <div className="absolute inset-0 bg-[hsl(var(--background))]/60 flex items-center justify-center z-10">
                <Loader2 className={cn('w-5 h-5 animate-spin', lx.primaryText)} />
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <h3 className={cn('font-medium text-[15px] break-words min-w-0', lx.fg)}>{goal.title}</h3>
              <button
                onClick={() => void run(goal._id, () => toggleTask(goal._id))}
                className="shrink-0 p-1.5 rounded-md transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10"
                title="Mark done"
                aria-label={`Mark “${goal.title}” done`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => void run(goal._id, () => shiftGoal(goal._id, 'THIS_WEEK'))}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors border', lx.border, lx.hover, lx.fg90)}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Move to this week
              </button>
              <button
                onClick={() => void run(goal._id, () => shiftGoal(goal._id, 'MONTHLY'))}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors border', lx.border, lx.hover, lx.fg90)}
              >
                <CalendarRange className="w-3.5 h-3.5" /> Move to this month
              </button>
            </div>
          </div>
        ))}
      </div>
    </LearningDialog>
  );
}
