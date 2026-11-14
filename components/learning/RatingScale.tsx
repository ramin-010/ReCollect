'use client';

import { cn } from '@/lib/utils';
import { lx } from './styles';

/** Revise's context tags (DayDebriefModal DEFAULT_TAGS / MultiDayCatchUpModal CONTEXT_TAGS). */
export const CONTEXT_TAGS = [
  'Slept Well',
  'Slept Poorly',
  'Exercised',
  'Stressed',
  'Sick',
  'Social',
  'Distracted',
  'Deep Work',
  'Flow State',
  'Low Motivation',
  'High Motivation',
  'Tired',
  'Burnout',
  'Family Time',
  'Errands',
  'Hydrated',
  'Caffeine Crash',
] as const;

/** 1–5 rating (Energy / Focus / Mood). */
export function RatingScale({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className={cn('rounded-xl p-3', lx.inset)}>
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon}
        <span className="text-xs font-semibold text-[hsl(var(--foreground))]/80">{label}</span>
      </div>
      <div className="flex items-center justify-between gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              value === n ? cn(lx.primaryBg, 'shadow-sm scale-110') : cn('bg-[hsl(var(--foreground))]/[0.06] hover:bg-[hsl(var(--foreground))]/[0.12] hover:text-[hsl(var(--foreground))]', lx.muted),
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A toggleable context tag chip. */
export function TagChip({ tag, selected, onToggle, rounded = 'lg' }: { tag: string; selected: boolean; onToggle: () => void; rounded?: 'lg' | 'full' }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'px-3 py-1.5 text-xs font-medium transition-colors border',
        rounded === 'full' ? 'rounded-full' : 'rounded-lg',
        selected ? 'bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))]' : cn('bg-[hsl(var(--background))]', lx.border, 'text-[hsl(var(--foreground))]/80', lx.hover),
      )}
    >
      {tag}
    </button>
  );
}
