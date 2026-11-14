'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { learningApi } from '@/lib/api/learningApi';
import { useLearningStore } from '@/lib/store/learningStore';
import type { RevisionBuckets, RevisionItem } from '@/lib/learning/types';
import { AttachmentThumbnails } from './AttachmentThumbnails';
import { ItemActionMenu } from './ItemActionMenu';
import { lx } from './styles';

const cycleName = (intervalDays: number) => `Day ${intervalDays}`;

type Variant = 'today' | 'overdue' | 'done';

function RevisionRow({ rev, variant, expanded, onToggleExpand }: { rev: RevisionItem; variant: Variant; expanded: boolean; onToggleExpand: () => void }) {
  const router = useRouter();
  const { completeRevision, uncompleteRevision, openReschedule, openEditCapture } = useLearningStore.getState();
  const isCapture = rev.kind === 'capture';
  const isDone = variant === 'done';

  const openTopic = async () => {
    let docId = rev.docId ?? null;
    if (!docId) {
      try {
        docId = (await learningApi.ensureTopicDoc(rev.itemId)).docId;
      } catch {
        toast.error('Could not open this topic');
        return;
      }
    }
    router.push(`/docs/${encodeURIComponent(docId)}`);
  };

  const open = () => (isCapture ? onToggleExpand() : void openTopic());

  return (
    <div
      onClick={open}
      className={cn(
        'group rounded-lg p-4 transition-colors flex items-center justify-between cursor-pointer',
        lx.card,
        variant === 'overdue' && 'border-[hsl(var(--destructive))]/20',
        isDone ? 'opacity-50 hover:opacity-75' : lx.hover,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <ItemActionMenu
          isDone={isDone}
          onToggle={() => (isDone ? uncompleteRevision(rev._id) : completeRevision(rev._id))}
          onReschedule={() => openReschedule({ kind: 'revision', id: rev._id, title: rev.title, scheduledFor: rev.scheduledFor })}
          onOpen={open}
          onEdit={isCapture ? () => openEditCapture({ captureId: rev.itemId, title: rev.title, content: rev.content ?? '' }) : undefined}
          circleClassName={
            variant === 'overdue'
              ? 'text-[hsl(var(--destructive))]/40 group-hover:text-[hsl(var(--destructive))]'
              : cn(lx.muted, 'group-hover:text-[hsl(var(--primary))]')
          }
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('font-medium truncate', isDone ? cn('line-through', lx.muted) : lx.fg)}>{rev.title}</span>
            {rev.tags[0] && (
              <div className={cn('flex items-center gap-1.5 ml-2 border-l pl-2 shrink-0', lx.border, isDone && 'opacity-50')}>
                <span className={cn('text-[10px] font-medium', lx.muted)}>#{rev.tags[0].replace('#', '')}</span>
              </div>
            )}
          </div>
          <p className={cn('text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap', lx.muted)}>
            {rev.subject?.name ?? 'General'}
            <span className="mx-0.5">•</span>
            {isCapture ? (
              <span className="flex items-center gap-1">
                <Zap className="w-[10px] h-[10px]" /> Note
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <BookOpen className="w-[10px] h-[10px]" /> Topic
              </span>
            )}
            <span className="mx-0.5">•</span>
            Cycle {rev.cycleNumber} of 4
          </p>
          {isCapture && rev.content && (
            <p className={cn('text-[10px] mt-1 whitespace-pre-wrap', !expanded && 'line-clamp-2', lx.muted)}>{rev.content}</p>
          )}
          {isCapture && rev.attachments && rev.attachments.length > 0 && (
            <AttachmentThumbnails attachments={rev.attachments} fallbackTitle={rev.title} dimmed={isDone} />
          )}
        </div>
      </div>
      {variant === 'today' && <span className={cn('text-sm font-medium shrink-0 ml-3', lx.muted)}>{cycleName(rev.intervalDays)}</span>}
      {variant === 'overdue' && (
        <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
          <span className={cn('text-xs font-medium flex items-center gap-1', lx.danger)}>
            <Clock className="w-3 h-3" /> Overdue ({cycleName(rev.intervalDays)})
          </span>
          <span className={cn('text-[10px]', lx.muted)}>
            {rev.daysLate ?? 1} {(rev.daysLate ?? 1) === 1 ? 'day' : 'days'} late
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Revise RevisionsList: "Revisions Due" + badge; today's rows (in subject order), then overdue
 * (collapsible, "N days late"), then done today (dimmed, Unmark); the all-caught-up card.
 */
export function RevisionsDue({ revisions }: { revisions: RevisionBuckets }) {
  const [isOverdueCollapsed, setIsOverdueCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { dueToday, overdue, doneToday, totalDue } = revisions;
  const hasToday = dueToday.length > 0;

  return (
    <section>
      <div className="flex justify-between items-center h-8 mb-4">
        <h2 className={cn(lx.sectionTitle, 'flex items-center gap-2')}>
          Revisions Due
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-sm normal-case tracking-normal font-bold', lx.primarySoft)}>{totalDue}</span>
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {dueToday.map((rev) => (
          <RevisionRow key={rev._id} rev={rev} variant="today" expanded={expanded.has(rev._id)} onToggleExpand={() => toggle(rev._id)} />
        ))}

        {overdue.length > 0 && (
          <div className="relative">
            {hasToday && <div className={cn('w-full h-px my-2', lx.divider)} />}
            <button
              onClick={() => setIsOverdueCollapsed((c) => !c)}
              className={cn(
                'absolute -left-6 p-0.5 rounded-md transition-colors z-10 hover:text-[hsl(var(--foreground))]',
                lx.muted,
                lx.hover,
                hasToday ? 'top-[18px]' : 'top-4',
              )}
              title={isOverdueCollapsed ? 'Show overdue' : 'Hide overdue'}
              aria-label={isOverdueCollapsed ? 'Show overdue' : 'Hide overdue'}
            >
              {isOverdueCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isOverdueCollapsed ? (
              <div
                className={cn('rounded-lg p-3 transition-colors flex items-center justify-center cursor-pointer mt-1 border border-dashed', lx.border, 'bg-[var(--surface-elevated)]/50', lx.hover)}
                onClick={() => setIsOverdueCollapsed(false)}
              >
                <span className={cn('text-xs font-medium', lx.muted)}>
                  {overdue.length} overdue {overdue.length === 1 ? 'item' : 'items'} hidden
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-1">
                {overdue.map((rev) => (
                  <RevisionRow key={rev._id} rev={rev} variant="overdue" expanded={expanded.has(rev._id)} onToggleExpand={() => toggle(rev._id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {doneToday.map((rev) => (
          <RevisionRow key={rev._id} rev={rev} variant="done" expanded={expanded.has(rev._id)} onToggleExpand={() => toggle(rev._id)} />
        ))}

        {totalDue === 0 && (
          <div className={cn('p-8 flex flex-col items-center justify-center text-center', lx.card)}>
            <CheckCircle2 className="w-8 h-8 text-[hsl(var(--success))]/50 mb-2" />
            <p className="font-medium text-[hsl(var(--foreground))]/80">You&apos;re all caught up!</p>
            <p className={cn('text-sm mt-1', lx.muted)}>No revisions due today.</p>
          </div>
        )}
      </div>
    </section>
  );
}
