'use client';

import * as Popover from '@radix-ui/react-popover';
import { Check, Plus } from 'lucide-react';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { rcScope } from './index';

export interface PickerOption {
  value: string;
  label: string;
  /** Small grey text after the label (a count, a date). */
  hint?: string;
  icon?: React.ReactNode;
  /** Other words the search finds it by (a language's aliases: "ts" finds TypeScript). */
  keywords?: string[];
}

/**
 * A custom select (DESIGN_RULES: never the browser's dropdown): a floating list under its trigger,
 * with a search field once there are more than about 10 choices, arrow keys and Enter.
 * `onCreate` adds a "Create “…”" row for a query that matches nothing exactly.
 */
export function RcPicker({
  options,
  value,
  onChange,
  label,
  children,
  searchPlaceholder = 'Search',
  width = 240,
  align = 'start',
  onCreate,
  createLabel = (q: string) => `Create “${q}”`,
  emptyText = 'Nothing matches',
  searchable,
  open: openProp,
  onOpenChange,
}: {
  options: PickerOption[];
  value: string | null;
  onChange: (v: string) => void;
  label: string;
  /** The trigger, rendered as-is (asChild). */
  children: React.ReactElement;
  searchPlaceholder?: string;
  width?: number;
  align?: 'start' | 'end' | 'center';
  onCreate?: (query: string) => void;
  createLabel?: (q: string) => string;
  emptyText?: string;
  searchable?: boolean;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChange?.(o);
  };
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const withSearch = searchable ?? (options.length > 10 || !!onCreate);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    // Best match first: the exact name or a keyword ("ts" → TypeScript), then names that start with it, then the rest.
    const rank = (o: PickerOption) => {
      const label = o.label.toLowerCase();
      const words = [o.value.toLowerCase(), ...(o.keywords ?? []).map((k) => k.toLowerCase())];
      if (label === t || words.includes(t)) return 0;
      if (label.startsWith(t)) return 1;
      if (label.includes(t) || words.some((w) => w.includes(t))) return 2;
      return -1;
    };
    return options
      .map((o, i) => ({ o, i, r: rank(o) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.o);
  }, [options, q]);
  const query = q.trim();
  const canCreate = !!onCreate && query.length > 0 && !options.some((o) => o.label.toLowerCase() === query.toLowerCase());
  const rows = filtered.length + (canCreate ? 1 : 0);

  useEffect(() => {
    if (!open) {
      setQ('');
      return;
    }
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    setActive(i);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it opens
  }, [open]);

  useEffect(() => setActive(0), [q]);

  const choose = (i: number) => {
    if (i < filtered.length) {
      onChange(filtered[i]!.value);
      setOpen(false);
    } else if (canCreate) {
      onCreate!(query);
      setOpen(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!rows) return;
      const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + rows) % rows;
      setActive(next);
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild aria-label={label} aria-haspopup="listbox">
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={4}
          collisionPadding={12}
          className={cn(rcScope, 'rc-float rc-menu rc-picker')}
          style={{ width }}
          onKeyDown={onKeyDown}
          onOpenAutoFocus={(e) => {
            if (!withSearch) {
              e.preventDefault();
              listRef.current?.focus();
            }
          }}
        >
          {withSearch && (
            <input
              className="rc-picker-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={rows ? `${listId}-${active}` : undefined}
            />
          )}
          <div ref={listRef} id={listId} role="listbox" aria-label={label} tabIndex={-1} className="rc-picker-list">
            {filtered.map((o, i) => (
              <div
                key={o.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                data-active={i === active || undefined}
                className="rc-menu-item"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                {o.icon}
                <span className="min-w-0 flex-1">{o.label}</span>
                {o.hint && <span className="rc-picker-hint">{o.hint}</span>}
                <Check className={cn('h-4 w-4 shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')} strokeWidth={2} aria-hidden />
              </div>
            ))}
            {canCreate && (
              <div
                id={`${listId}-${filtered.length}`}
                data-index={filtered.length}
                role="option"
                aria-selected={false}
                data-active={active === filtered.length || undefined}
                className="rc-menu-item"
                onMouseEnter={() => setActive(filtered.length)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(filtered.length)}
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1">{createLabel(query)}</span>
              </div>
            )}
            {!rows && <div className="rc-picker-empty">{emptyText}</div>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
