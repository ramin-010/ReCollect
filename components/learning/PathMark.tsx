'use client';

import { CircleCheck, CircleDashed, CircleSlash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PathStatus } from '@/lib/learning/types';

/** A topic's place on its path, in words (the mark is never the only signal). */
export const PATH_STATUS_WORD: Record<PathStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  skipped: 'Skipped',
};

/**
 * The mark of a topic on its path (lucide's 1.75 stroke): a dashed circle for planned, a half-filled
 * one for in progress (drawn here: lucide has none), a check for done, a slashed circle for skipped.
 * Grey, except the current topic in ink. 18 px by default.
 */
export function PathMark({ status, className }: { status: PathStatus; className?: string }) {
  const common = { className: cn('h-[18px] w-[18px] shrink-0', className), strokeWidth: 1.75, role: 'img', 'aria-label': PATH_STATUS_WORD[status] } as const;
  switch (status) {
    case 'done':
      return <CircleCheck {...common} className={cn(common.className, 'text-[var(--rc-icon)]')} />;
    case 'skipped':
      return <CircleSlash {...common} className={cn(common.className, 'text-[var(--rc-ink-3)]')} />;
    case 'in_progress':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          role="img"
          aria-label={PATH_STATUS_WORD.in_progress}
          className={cn(common.className, 'text-[var(--rc-ink-1)]')}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return <CircleDashed {...common} className={cn(common.className, 'text-[var(--rc-icon)]')} />;
  }
}

/**
 * The prompt that starts a study chat on a topic (Home's Next up, the path's menu). The chat's
 * first call is get_brief (where Ramin stands, the topic's last session and weak spots, a session
 * key); the recollect-study skill takes it from there (SYNC_SPINE_SPEC 1.3).
 */
export function studyPrompt(subject: string, topic: { position: number; title: string }, nextStep: string | null): string {
  const step = nextStep ? ` (next step: ${nextStep})` : '';
  return `Study with me using Recollect: start with get_brief, then continue ${subject}, topic ${topic.position}. ${topic.title}${step}. Checkpoint as we go.`;
}
