'use client';

import { useState } from 'react';
import type { DayString, TodayPayload } from '@/lib/learning/types';
import { RcButton } from '@/components/rc-ui';
import { ScheduleTimeline } from '../ScheduleTimeline';
import { DayManagerDialog } from '../DayManagerDialog';
import { DayDebriefDialog } from '../DayDebriefDialog';
import { CatchUpDialog } from '../CatchUpDialog';
import { SectionHead } from './parts';
import { plural } from './format';

/**
 * Time blocks and day review: Revise's routine (timeline, Day Manager, Wrap up day, debrief /
 * catch-up). Rendered only while routineEnabled (GET /api/today sends `schedule`); kept in code,
 * off by default (LOOP_V2_SPEC §6). Nothing here opens by itself: past days wait behind a link.
 */
export function RoutinePanel({ data, today }: { data: TodayPayload; today: DayString }) {
  const [manageOpen, setManageOpen] = useState(false);
  const [wrapOpen, setWrapOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  if (!data.schedule) return null;
  const slots = data.schedule.slots;
  const triage = data.triage;
  const pendingReview = !reviewed && triage && triage.kind !== 'none';
  const pastDays = triage?.kind === 'catch-up' ? triage.days.length : 1;

  return (
    <section aria-labelledby="routine-h" className="mb-8">
      <SectionHead id="routine-h" title="Time blocks">
        {data.stats.adherence !== null && (
          <span className="rc-meta rc-num pr-2">
            {data.stats.adherenceDone} of {data.stats.adherenceTotal} blocks done this week
          </span>
        )}
        <RcButton size="sm" variant="outline" onClick={() => setWrapOpen(true)}>
          Wrap up day
        </RcButton>
      </SectionHead>
      {pendingReview && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--rc-surface-2)] py-1.5 pl-3.5 pr-1.5 text-[15px] rc-ink-2">
          <span>{plural(pastDays, 'past day')} of blocks to review, whenever you like.</span>
          <RcButton size="sm" variant="quiet" onClick={() => setReviewOpen(true)}>
            Review
          </RcButton>
        </div>
      )}
      <ScheduleTimeline slots={slots} timezone={data.timezone} onManageDay={() => setManageOpen(true)} />

      <DayManagerDialog isOpen={manageOpen} onClose={() => setManageOpen(false)} slots={slots} today={today} timezone={data.timezone} />
      <DayDebriefDialog isOpen={wrapOpen} onSaved={() => setWrapOpen(false)} onDismiss={() => setWrapOpen(false)} date={today} slots={slots} existingDebrief={data.todayDebrief} />
      {triage?.kind === 'catch-up' && (
        <CatchUpDialog
          isOpen={reviewOpen}
          onSaved={() => {
            setReviewOpen(false);
            setReviewed(true);
          }}
          onDismiss={() => setReviewOpen(false)}
          days={triage.days}
          prefill={triage.prefill}
        />
      )}
      {triage?.kind === 'debrief' && (
        <DayDebriefDialog
          isOpen={reviewOpen}
          onSaved={() => {
            setReviewOpen(false);
            setReviewed(true);
          }}
          onDismiss={() => setReviewOpen(false)}
          date={triage.date}
          slots={triage.slots}
          existingDebrief={triage.existingDebrief}
          title="Review a past day"
          subtitle={`${plural(triage.slots.length, 'block')} from ${triage.date}`}
        />
      )}
    </section>
  );
}
