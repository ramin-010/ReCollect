'use client';

// The Kaaga logo: the mark and the word "kaaga", laid out as the logo set does (03-header, 04-sidebar), in currentColor.
//   header   the website's header (the word a little smaller beside the mark)
//   sidebar  the app's sidebar, open (the word larger, for small sizes)
// KaagaWordmark is the word alone (footers, legal pages, where the mark already shows).
import { useId } from 'react';
import { MARK, Slices, type KaagaState } from './KaagaMark';
import { WORD_PATH } from './wordmark';
import './kaaga.css';

const LAYOUT = {
  header: { viewBox: [58.9, 58.9, 1126.9, 394.2], word: 'translate(549.4 347.5) scale(1.2838)' },
  sidebar: { viewBox: [58.9, 58.9, 1177.9, 394.2], word: 'translate(538.9 347.5) scale(1.4121)' },
} as const;

export interface KaagaLogoProps {
  /** Drawn height in px; the width follows. */
  height?: number;
  variant?: keyof typeof LAYOUT;
  /** The mark's state (the word never moves). */
  state?: KaagaState;
  once?: boolean;
  className?: string;
  label?: string;
}

export function KaagaLogo({ height = 22, variant = 'sidebar', state = 'still', once = false, className = '', label = 'Kaaga' }: KaagaLogoProps) {
  const prefix = `kl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { viewBox, word } = LAYOUT[variant];
  const width = Math.round((height * viewBox[2]) / viewBox[3]);
  return (
    <svg
      viewBox={viewBox.join(' ')}
      width={width}
      height={height}
      className={`kaaga-mark kaaga-${state}${once ? ' kaaga-once' : ''} ${className}`.trim()}
      role="img"
      aria-label={label}
      focusable="false"
    >
      {/* Small logos keep the slices apart (the kit's sidebar sizes); large ones use the drawing's own gap. */}
      <Slices prefix={prefix} gap={height <= 28 ? 22 : 14} />
      <path transform={word} d={WORD_PATH} fill="currentColor" />
    </svg>
  );
}

export function KaagaWordmark({ height = 20, className = '', label = 'Kaaga' }: { height?: number; className?: string; label?: string }) {
  const width = Math.round((height * 503.2) / 204);
  return (
    <svg viewBox="-12 -142 503.2 204" width={width} height={height} className={`kaaga-mark ${className}`.trim()} role="img" aria-label={label} focusable="false">
      <path d={WORD_PATH} fill="currentColor" />
    </svg>
  );
}

export { MARK };
