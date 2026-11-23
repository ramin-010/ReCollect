'use client';

import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rcScope } from '@/components/rc-ui';
import { learningApi } from '@/lib/api/learningApi';
import { SESSIONS_CHANGED_EVENT } from '@/lib/learning/sessionLog';
import type { RecordParts } from '@/lib/learning/stand';
import type { StandData, StandLens } from '@/lib/learning/types';
import { shortDay } from './format';


/**
 * The year for Home's header (the owner, 11-22: the GitHub-type consistency graph as the page's
 * header, at the very top): Where you stand's numbers, loaded now and again when today's activity
 * changes (`activityKey`), a session is logged, or the window gets focus. `null` while loading,
 * 'failed' when the call failed (the header then keeps the week's rhythm and Home works on).
 */
export function useYearStand(activityKey: string, lens?: StandLens): StandData | null | 'failed' {
  const [stand, setStand] = useState<StandData | null | 'failed'>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const again = () => setTick((n) => n + 1);
    window.addEventListener(SESSIONS_CHANGED_EVENT, again);
    window.addEventListener('focus', again);
    return () => {
      window.removeEventListener(SESSIONS_CHANGED_EVENT, again);
      window.removeEventListener('focus', again);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    learningApi.getStand(lens).then(
      (s) => alive && setStand(s),
      () => alive && setStand((v) => (v && v !== 'failed' ? v : 'failed'))
    );
    return () => {
      alive = false;
    };
  }, [activityKey, tick, lens]);

  return stand;
}

/** The header's figure: '33 active days since 23 Aug', or '… in the last year' once the record covers it. */
export function yearWords(stand: StandData): string {
  const year = stand.periods.year;
  const n = year.current.activeDays;
  return `${n} active ${n === 1 ? 'day' : 'days'} ${year.partial ? `since ${shortDay(stand.recordStart, stand.today)}` : 'in the last year'}`;
}

const PART_ROWS: Array<{ key: keyof RecordParts; label: string }> = [
  { key: 'learning', label: 'Learning' },
  { key: 'building', label: 'Building' },
  { key: 'work', label: 'Work' },
];

/**
 * Home's graph filter (the owner, 11-23): which parts of the record the year graph shows, for this view only. It
 * starts as Settings › Tracking's progress ticks; what counts as progress doesn't change. At least one stays ticked.
 */
export function GraphFilter({ parts, progress, onChange }: { parts: RecordParts; progress: RecordParts; onChange: (p: RecordParts) => void }) {
  const changed = PART_ROWS.some((r) => parts[r.key] !== progress[r.key]);
  const ticked = PART_ROWS.filter((r) => parts[r.key]).length;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Show on the graph"
          title="Show on the graph"
          className={cn(
            'relative -my-1 grid h-6 w-6 place-items-center rounded-[6px] text-[var(--rc-ink-3)] hover:bg-[var(--rc-hover)] hover:text-[var(--rc-ink-1)]',
            changed && 'text-[var(--rc-ink-1)]'
          )}
        >
          <ListFilter className="h-[14px] w-[14px]" strokeWidth={1.75} aria-hidden />
          {changed && <span className="absolute right-[3px] top-[3px] h-[5px] w-[5px] rounded-full bg-[var(--rc-accent)]" aria-hidden />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="center" sideOffset={6} collisionPadding={12} className={cn(rcScope, 'rc-float rc-menu')}>
          <DropdownMenu.Label className="px-2 pb-1 pt-0.5 text-[12px] text-[var(--rc-ink-3)]">Show on the graph</DropdownMenu.Label>
          {PART_ROWS.map((r) => (
            <DropdownMenu.CheckboxItem
              key={r.key}
              className="rc-menu-item"
              checked={parts[r.key]}
              disabled={parts[r.key] && ticked === 1}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(on) => onChange({ ...parts, [r.key]: on === true })}
            >
              <span className="inline-grid h-4 w-4 place-items-center">{parts[r.key] && <Check className="h-4 w-4" strokeWidth={2} aria-hidden />}</span>
              {r.label}
            </DropdownMenu.CheckboxItem>
          ))}
          {changed && (
            <>
              <DropdownMenu.Separator className="rc-menu-sep" />
              <DropdownMenu.Item className="rc-menu-item" onSelect={() => onChange(progress)}>
                <span className="inline-block w-4" aria-hidden />
                Back to what counts as progress
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
