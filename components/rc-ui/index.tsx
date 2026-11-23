'use client';

/**
 * Recollect UI shared parts (DESIGN.md "Shared parts"). Styles live in rc-ui.css; every part
 * expects to render inside an `.rc` scope (portals add it themselves via `rcScope`).
 */
import React, { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, Minus, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rcFontVars } from './fonts';
import './rc-ui.css';

/** Class list for an `.rc` root: the token scope plus the faces. */
export const rcScope = `rc ${rcFontVars}`;

// ─── Buttons ────────────────────────────────────────────────────────────────

type ButtonVariant = 'main' | 'outline' | 'quiet' | 'danger' | 'danger-solid';

export interface RcButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: React.ReactNode;
  busy?: boolean;
}

export const RcButton = forwardRef<HTMLButtonElement, RcButtonProps>(function RcButton(
  { variant = 'outline', size = 'md', icon, busy, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn('rc-btn', `rc-btn--${variant}`, size === 'sm' && 'rc-btn--sm', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export interface RcIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need a name. */
  label: string;
  size?: 'md' | 'sm';
}

export const RcIconButton = forwardRef<HTMLButtonElement, RcIconButtonProps>(function RcIconButton(
  { label, size = 'md', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label} className={cn('rc-icon-btn', size === 'sm' && 'rc-icon-btn--sm', className)} {...rest}>
      {children}
    </button>
  );
});

// ─── Segmented ──────────────────────────────────────────────────────────────

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function RcSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn('rc-seg', className)}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {o.label}
          {o.count !== undefined && <span className="rc-seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Switch ─────────────────────────────────────────────────────────────────

export function RcSwitch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="rc-switch" onClick={() => onChange(!checked)} />
  );
}

// ─── Stepper ────────────────────────────────────────────────────────────────

export function RcStepper({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  label,
  idPrefix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
  /** Ids `${idPrefix}-less` / `${idPrefix}-more`, so a caller can move focus to the stepper. */
  idPrefix?: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <RcIconButton
        id={idPrefix ? `${idPrefix}-less` : undefined}
        label={`Less: ${Math.max(min, value - step)} ${unit}`}
        className="rc-btn--outline border border-[var(--rc-line-strong)]"
        disabled={value <= min}
        onClick={() => set(value - step)}
      >
        <Minus />
      </RcIconButton>
      <output aria-live="polite" className="rc-num min-w-[64px] text-center text-[17px] font-[650]">
        {value} {unit}
      </output>
      <RcIconButton
        id={idPrefix ? `${idPrefix}-more` : undefined}
        label={`More: ${Math.min(max, value + step)} ${unit}`}
        className="rc-btn--outline border border-[var(--rc-line-strong)]"
        disabled={value >= max}
        onClick={() => set(value + step)}
      >
        <Plus />
      </RcIconButton>
    </div>
  );
}

// ─── Select list (custom list; search past ~10 choices) ─────────────────────

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

export function RcSelectList({
  value,
  options,
  onChange,
  label,
  placeholder = 'Choose',
  searchPlaceholder = 'Search',
  id,
  width = 260,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  searchPlaceholder?: string;
  id?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const searchable = options.length > 10;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t) || o.value.toLowerCase().includes(t)) : options;
  }, [options, q]);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, filtered.findIndex((o) => o.value === value));
    setActive(i);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when it opens
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(filtered.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
      setActive(next);
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[active];
      if (o) pick(o.value);
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`${label}: ${current?.label ?? placeholder}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="rc-input flex items-center justify-between gap-2 text-left cursor-pointer"
          style={{ maxWidth: width }}
        >
          <span className={cn('truncate', !current && 'rc-ink-3')}>{current?.label ?? placeholder}</span>
          <ChevronDown className="w-4 h-4 shrink-0 rc-ink-3" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(rcScope, 'rc-float rc-pop')}
          style={{ width }}
          onKeyDown={onKey}
          onOpenAutoFocus={(e) => {
            if (!searchable) {
              e.preventDefault();
              listRef.current?.focus();
            }
          }}
        >
          {searchable && (
            <div className="relative p-1 pb-2">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 -mt-0.5 rc-ink-3" aria-hidden />
              <input
                autoFocus
                className="rc-input pl-9"
                placeholder={searchPlaceholder}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              />
            </div>
          )}
          <div ref={listRef} id={listId} role="listbox" aria-label={label} tabIndex={-1} className="max-h-[280px] overflow-y-auto outline-none">
            {filtered.length === 0 && <p className="px-3 py-3 rc-meta">No match for “{q}”.</p>}
            {filtered.map((o, i) => (
              <div
                key={o.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
                className={cn('rc-menu-item justify-between', i === active && 'bg-[var(--rc-surface-2)]')}
              >
                <span className="truncate">
                  {o.label}
                  {o.hint && <span className="rc-ink-3 font-normal"> {o.hint}</span>}
                </span>
                {o.value === value && <Check className="!text-[var(--rc-accent)]" />}
              </div>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// ─── Sheet (side sheet ≥ 640, bottom sheet below) and confirm dialog ─────────

export function RcSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  initialFocusId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Focus this element when the sheet opens (instead of the first focusable one). */
  initialFocusId?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(rcScope, 'rc-overlay')} />
        <DialogPrimitive.Content
          className={cn(rcScope, 'rc-float rc-sheet')}
          onOpenAutoFocus={(e) => {
            if (!initialFocusId) return;
            e.preventDefault();
            requestAnimationFrame(() => document.getElementById(initialFocusId)?.focus());
          }}
        >
          <div className="rc-sheet-head">
            <div className="min-w-0">
              <DialogPrimitive.Title className="rc-sheet-title">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="rc-meta mt-1">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <RcIconButton label="Close" className="-mr-1.5 -mt-1">
                <X />
              </RcIconButton>
            </DialogPrimitive.Close>
          </div>
          <div className="rc-sheet-body">{children}</div>
          {footer && <div className="rc-sheet-foot">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * A centred dialog for reading (STUDY_FLOW_PLAN §4.4: a lesson's revision card): a title line with a quiet note at its
 * right, a body that scrolls on its own, a footer that stays. Full screen on a phone.
 */
export function RcDialog({
  open,
  onOpenChange,
  title,
  aside,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Quiet words at the title line's right ("Review 2 of 4"). */
  aside?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(rcScope, 'rc-overlay')} />
        <DialogPrimitive.Content className={cn(rcScope, 'rc-float rc-read', className)}>
          <div className="rc-read-head">
            <DialogPrimitive.Title className="rc-read-title">{title}</DialogPrimitive.Title>
            {aside ? <span className="rc-meta shrink-0">{aside}</span> : null}
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            <DialogPrimitive.Close asChild>
              <RcIconButton label="Close" className="-mr-1.5">
                <X />
              </RcIconButton>
            </DialogPrimitive.Close>
          </div>
          <div className="rc-read-body">{children}</div>
          {footer ? <div className="rc-read-foot">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function RcConfirm({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(rcScope, 'rc-overlay')} />
        <DialogPrimitive.Content role="alertdialog" className={cn(rcScope, 'rc-float rc-dialog')}>
          <DialogPrimitive.Title className="rc-sheet-title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description asChild>
            <div className="mt-2 text-[15px] leading-[1.45] rc-ink-2">{body}</div>
          </DialogPrimitive.Description>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <DialogPrimitive.Close asChild>
              <RcButton variant="outline" disabled={busy}>
                {cancelLabel}
              </RcButton>
            </DialogPrimitive.Close>
            <RcButton variant={danger ? 'danger-solid' : 'main'} busy={busy} onClick={onConfirm}>
              {confirmLabel}
            </RcButton>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Menu (row actions) ─────────────────────────────────────────────────────

export interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

export function RcMenu({ label, actions, children, align = 'end' }: { label: string; actions: MenuAction[]; children: React.ReactNode; align?: 'start' | 'end' }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild aria-label={label}>
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={4} collisionPadding={12} className={cn(rcScope, 'rc-float rc-menu')}>
          {actions.map((a) => (
            <React.Fragment key={a.label}>
              {a.separatorBefore && <DropdownMenu.Separator className="rc-menu-sep" />}
              <DropdownMenu.Item className="rc-menu-item" data-danger={a.danger || undefined} onSelect={a.onSelect}>
                {a.icon}
                {a.label}
              </DropdownMenu.Item>
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Check cell and stamp ───────────────────────────────────────────────────

export const RcCheck = forwardRef<
  HTMLButtonElement,
  { checked: boolean; onToggle: () => void; label: string; disabled?: boolean; className?: string } & Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onClick' | 'children' | 'role' | 'type'
  > & { onClick?: React.MouseEventHandler<HTMLButtonElement> }
>(function RcCheck({ checked, onToggle, label, disabled, className, onClick, ...rest }, ref) {
  // Other props pass through, so a check can also open a menu (Home's Revise: Complete or Quiz me on it).
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
        onToggle();
      }}
      className={cn('rc-check rc-hit', className)}
    >
      <Check aria-hidden />
    </button>
  );
});

export function RcStamp({ children, press, flat, className, label }: { children: React.ReactNode; press?: boolean; flat?: boolean; className?: string; label?: string }) {
  return (
    <span className={cn('rc-stamp', press && 'rc-stamp--press', flat && 'rc-stamp--flat', className)} aria-label={label}>
      {children}
    </span>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

export function RcSkel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={cn('rc-skel', className)} style={style} />;
}
