'use client';

/**
 * The marks a task row carries on theme v2: its status (an 18 px circle drawn for us, the way the
 * study path draws its marks) and its priority (signal bars, the words beside them). Colour only
 * where it means something: done is the accent fill with a white tick, in review and urgent take the
 * attention colour, blocked the danger colour; everything else is ink.
 */
import { cn } from '@/lib/utils';

export function TaskStatusMark({ status, className }: { status: string; className?: string }) {
  const common = cn('h-[18px] w-[18px] shrink-0', className);
  if (status === 'complete') {
    return (
      <svg viewBox="0 0 18 18" className={common} aria-hidden>
        <circle cx="9" cy="9" r="9" fill="var(--rc-accent-fill)" />
        <path d="M5.2 9.3 7.8 11.8 12.9 6.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'in_progress') {
    return (
      <svg viewBox="0 0 18 18" className={common} aria-hidden>
        <circle cx="9" cy="9" r="8.25" fill="none" stroke="var(--rc-ink-2)" strokeWidth="1.5" />
        <path d="M9 3.5a5.5 5.5 0 0 1 0 11z" fill="var(--rc-ink-2)" />
      </svg>
    );
  }
  if (status === 'review') {
    return (
      <svg viewBox="0 0 18 18" className={common} aria-hidden>
        <circle cx="9" cy="9" r="8.25" fill="none" stroke="var(--rc-attn-mark)" strokeWidth="1.5" />
        <circle cx="9" cy="9" r="3" fill="var(--rc-attn-mark)" />
      </svg>
    );
  }
  if (status === 'blocked') {
    return (
      <svg viewBox="0 0 18 18" className={common} aria-hidden>
        <circle cx="9" cy="9" r="8.25" fill="none" stroke="var(--rc-danger)" strokeWidth="1.5" />
        <path d="M4.2 13.8 13.8 4.2" stroke="var(--rc-danger)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 18 18" className={common} aria-hidden>
      <circle cx="9" cy="9" r="8.25" fill="none" stroke="var(--rc-icon)" strokeWidth="1.5" className="transition-[stroke] group-hover/mark:[stroke:var(--rc-ink-2)]" />
    </svg>
  );
}

/** Signal bars: urgent and high fill three, medium two, low one. */
export function PriorityBars({ priority, className }: { priority?: string | null; className?: string }) {
  const level = priority === 'urgent' || priority === 'high' ? 3 : priority === 'medium' || priority === 'normal' ? 2 : priority === 'low' ? 1 : 0;
  const on = priority === 'urgent' ? 'var(--rc-attn-mark)' : 'var(--rc-ink-2)';
  return (
    <svg viewBox="0 0 14 14" className={cn('h-3.5 w-3.5 shrink-0', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1 + i * 4.5} y={9 - i * 3.5} width="3" height={4 + i * 3.5} rx="1" fill={i < level ? on : 'var(--rc-line-strong)'} />
      ))}
    </svg>
  );
}
