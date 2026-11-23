'use client';

import React from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcButton } from '@/components/rc-ui';
import { requestPaletteMode, type PaletteMode } from '@/lib/capturePalette';

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
 * The centre's label line (the owner, 11-21: nothing flashy; a list of topics with checkboxes needs
 * no headline): one 13 px line with the name in medium, its figures after it, and what acts on the
 * right, over a hairline. The rows under it say by their shape what they are.
 */
export function LabelLine({ title, id, meta, children, className }: { title: string; id: string; meta?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-0.5 flex min-h-[26px] items-center justify-between gap-3 border-b border-[var(--rc-line)] pb-1.5 text-[13px] leading-[1.4] text-[var(--rc-ink-3)]', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2">
        <h2 id={id} className="text-[13px] font-[600] leading-[1.4] text-[var(--rc-ink-2)]">
          {title}
        </h2>
        {meta && <span className="rc-num">{meta}</span>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-1 -mr-1">{children}</div>}
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
export function openCapturePalette(mode: PaletteMode | null = null) {
  requestPaletteMode(mode);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
}
