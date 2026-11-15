'use client';

import { CalendarClock, CheckCircle2 } from 'lucide-react';
import type { TopicStatus } from '@/lib/learning/types';
import { formatStampDay } from '@/components/docs/page/format';

/** A doc's revision state in plain words (the library's status column, and done topics on a path). */
export function StatusCell({ status }: { status: TopicStatus | null }) {
  if (!status) return <span className="lib-status" />;
  switch (status.state) {
    case 'due':
      return (
        <span className="lib-status lib-status--due">
          <CalendarClock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Revise today
        </span>
      );
    case 'early':
      return <span className="lib-status">Next tomorrow</span>;
    case 'wait':
      return <span className="lib-status">{status.next ? `Next ${formatStampDay(status.next.scheduledFor)}` : 'Scheduled'}</span>;
    case 'completed':
      return (
        <span className="lib-status lib-status--good">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Mastered
        </span>
      );
    default:
      return <span className="lib-status lib-status--quiet">Not scheduled</span>;
  }
}
