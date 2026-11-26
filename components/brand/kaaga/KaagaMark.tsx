'use client';

// The Kaaga mark (KAAGA_REBRAND_PLAN D3): one circle in four slices, the third pulled out to the right, a memory being
// drawn out. Drawn in currentColor, so it takes the ink of wherever it sits (light, dark, the phone's looks). Its moving
// states are CSS keyframes (kaaga.css): no loop in JS, and still under prefers-reduced-motion.
//   still     the mark (the default; chrome never loops)
//   idle      the pulled slice breathes, slowly
//   thinking  a ripple runs through the slices: Kaaga is working (while an answer comes)
//   noted     the slice files back in and the one above flashes violet: something was saved
//   call      the slice slides out and lights violet: Kaaga has something to say
//   reveal    the slices arrive from both sides and lock into the mark (a first open)
// `once` plays noted or call a single time and rests; give the mark a new `key` to play it again.
import { useId } from 'react';
import './kaaga.css';

export type KaagaState = 'still' | 'idle' | 'thinking' | 'noted' | 'call' | 'reveal';

/** The circle and the pull, in the logo set's units. */
export const MARK = { R: 176, CX: 256, CY: 256, PULL: 40 } as const;

/** The gap between slices for a drawn size: the kit's wider gaps keep them apart when small (favicon, sidebar). */
export function sliceGap(size: number): number {
  return size <= 18 ? 26 : size <= 28 ? 22 : 14;
}

/** The four slices, as clip rects and circles; `prefix` keeps the clip ids unique when many marks share a page. */
export function Slices({ prefix, gap }: { prefix: string; gap: number }) {
  const { R, CX, CY } = MARK;
  const h = (2 * R - gap * 3) / 4;
  return (
    <>
      <defs>
        {[0, 1, 2, 3].map((i) => (
          <clipPath key={i} id={`${prefix}${i}`}>
            <rect x={-200} y={CY - R + i * (h + gap)} width={900} height={h} />
          </clipPath>
        ))}
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} clipPath={`url(#${prefix}${i})`}>
          <circle className={`kaaga-s kaaga-s${i}`} cx={CX} cy={CY} r={R} />
        </g>
      ))}
    </>
  );
}

export interface KaagaMarkProps {
  /** Drawn size in px (square). */
  size?: number;
  state?: KaagaState;
  /** noted / call: play once and rest. */
  once?: boolean;
  className?: string;
  /** A spoken name ("Kaaga"); without one the mark is decoration and hidden from screen readers. */
  label?: string;
}

export function KaagaMark({ size = 20, state = 'still', once = false, className = '', label }: KaagaMarkProps) {
  const prefix = `kg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg
      viewBox="58.9 38.9 434.2 434.2"
      width={size}
      height={size}
      className={`kaaga-mark kaaga-${state}${once ? ' kaaga-once' : ''} ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <Slices prefix={prefix} gap={sliceGap(size)} />
    </svg>
  );
}

/**
 * The mark where a line icon goes (lucide's slot: Ask Kaaga's buttons, the slash menu, the phone's tab bar): its size
 * comes from the className or the slot's CSS like the icons beside it; a stroke width is accepted and ignored.
 */
export function KaagaIcon({ className, state = 'still' }: { className?: string; strokeWidth?: number; state?: KaagaState; 'aria-hidden'?: boolean | 'true' | 'false' }) {
  return <KaagaMark size={18} state={state} className={className} />;
}
