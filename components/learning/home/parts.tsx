'use client';

import React from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton } from '@/components/rc-ui';

/** A Home section heading row: the title, and actions at the right on the same baseline. */
export function SectionHead({ title, id, children, className }: { title: string; id: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 min-h-[34px] mb-2.5', className)}>
      <h2 id={id} className="rc-h2">
        {title}
      </h2>
      {children && <div className="flex items-center gap-1 shrink-0">{children}</div>}
    </div>
  );
}

/**
 * A section whose call failed: it says what is missing and offers one retry; the rest of Home
 * keeps working (DESIGN_RULES §4 "a failed call").
 */
export function SectionFailed({ what, onRetry, className }: { what: string; onRetry: () => void; className?: string }) {
  return (
    <div role="status" className={cn('rc-card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5', className)}>
      <p className="text-[15px] rc-ink-2">Couldn’t load {what}.</p>
      <RcButton size="sm" variant="outline" icon={<RotateCw />} onClick={onRetry}>
        Try again
      </RcButton>
    </div>
  );
}

/** Opens the global Ctrl+K palette (the app layout owns it and listens on document). */
export function openCapturePalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
}
