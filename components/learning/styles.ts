/**
 * Revise's dashboard classes mapped onto Kaaga's theme tokens (LEARNING_SPEC §3 "Look"):
 *   bg-sidebar → --surface-elevated · hover:bg-hover → --surface-raised · border-divider → --border-subtle
 *   text-foreground / text-muted → --foreground / --muted-foreground · accent → --primary
 *   emerald / amber / red → --success / --warning / --destructive
 * Kept as full literal class strings so Tailwind picks them up.
 */
export const lx = {
  fg: 'text-[hsl(var(--foreground))]',
  fg90: 'text-[hsl(var(--foreground))]/90',
  muted: 'text-[hsl(var(--muted-foreground))]',
  /** bg-sidebar border border-divider rounded-lg */
  card: 'bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg',
  hover: 'hover:bg-[var(--surface-raised)]',
  border: 'border-[var(--border-subtle)]',
  divider: 'bg-[var(--border-subtle)]',
  /** bg-background (inputs / inner panels inside a dialog) */
  inset: 'bg-[hsl(var(--background))] border border-[var(--border-subtle)]',
  primaryText: 'text-[hsl(var(--primary))]',
  primaryBg: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90',
  primarySoft: 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20',
  success: 'text-[hsl(var(--success))]',
  warning: 'text-[hsl(var(--warning))]',
  danger: 'text-[hsl(var(--destructive))]',
  sectionTitle: 'text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider',
  input:
    'w-full bg-[hsl(var(--background))] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 placeholder:text-[hsl(var(--muted-foreground))]/70',
} as const;
