'use client';

import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartDatePicker } from '@/components/ui-base/SmartDatePicker';
import { addDays, formatDayChip, dueInstantForDay, dayOf } from '@/lib/learning/dates';
import { resolveTimeZone, type DayString } from '@/lib/learning/engine';
import { useLearningStore } from '@/lib/store/learningStore';
import { LearningDialog } from './LearningDialog';
import { lx } from './styles';

/** The calendar day the user picked on the wheel (its local Y-M-D), independent of time zones. */
const pickedDay = (d: Date): DayString => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Revise RescheduleModal, with Recollect's SmartDatePicker instead of the 589-line calendar.
 * Revisions take the date part only (a day ≥ today in the user's zone; later cycles shift
 * with it server side); tasks take date + time.
 */
export function RescheduleDialog({ today, timezone }: { today: DayString; timezone: string }) {
  const target = useLearningStore((s) => s.rescheduleTarget);
  const close = () => useLearningStore.getState().openReschedule(null);
  const { rescheduleRevision, updateTask } = useLearningStore.getState();
  const [error, setError] = useState<string | null>(null);
  const tz = resolveTimeZone(timezone);

  useEffect(() => setError(null), [target]);

  if (!target) return null;
  const isRevision = target.kind === 'revision';
  const current = isRevision ? target.scheduledFor : target.dueDate ? dayOf(new Date(target.dueDate), tz) : null;

  const applyDay = async (day: DayString, instant?: Date) => {
    if (isRevision) {
      if (day < today) {
        setError('Pick today or a later day.');
        return;
      }
      close();
      await rescheduleRevision(target.id, day);
    } else {
      close();
      await updateTask(target.id, { dueDate: (instant ?? dueInstantForDay(day, tz)).toISOString() });
    }
  };

  const quick: { label: string; day: DayString }[] = [
    { label: 'Today', day: today },
    { label: 'Tomorrow', day: addDays(today, 1) },
    { label: 'In 3 days', day: addDays(today, 3) },
    { label: 'Next week', day: addDays(today, 7) },
  ];

  const initial = target.kind === 'task' && target.dueDate ? new Date(target.dueDate) : dueInstantForDay(current && current >= today ? current : addDays(today, 1), tz);

  return (
    <LearningDialog
      isOpen
      onClose={close}
      width="max-w-md"
      icon={<CalendarClock className={cn('w-5 h-5', lx.primaryText)} />}
      title="Reschedule"
      subtitle={
        <span>
          <span className={cn('font-medium', lx.fg)}>{target.title}</span>
          {current && <span> · now {formatDayChip(current)}</span>}
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {quick.map((q) => (
            <button
              key={q.label}
              onClick={() => void applyDay(q.day)}
              disabled={q.day === current}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40', lx.border, lx.hover, lx.fg90)}
            >
              {q.label} <span className={lx.muted}>· {formatDayChip(q.day)}</span>
            </button>
          ))}
        </div>
        {isRevision && <p className={cn('text-[11px] text-center', lx.muted)}>Later cycles of this item move by the same number of days.</p>}
        <SmartDatePicker selectedDate={initial} onSelect={(d) => void applyDay(pickedDay(d), isRevision ? undefined : d)} />
        {error && <p className={cn('text-xs', lx.danger)}>{error}</p>}
      </div>
    </LearningDialog>
  );
}
