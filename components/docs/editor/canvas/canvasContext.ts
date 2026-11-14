'use client';

import { createContext, useContext } from 'react';
import type { CanvasApi } from './useCanvasBoard';

export interface CanvasCtx {
  editable: boolean;
  /** The box or arrow whose text is being typed, if any. */
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  api: CanvasApi;
  /** Arrowhead marker ids, unique per board (several boards can share a page). */
  markers: { normal: string; selected: string };
  /** Gives the keyboard back to the board (after typing a label). */
  focusBoard: () => void;
  /** More than one box is selected (boxes then show no resize handles or dots). */
  multi: boolean;
  /** A click on a box's side dot: a new box on that side, connected. */
  addBeside: (fromId: string, side: 't' | 'r' | 'b' | 'l') => void;
}

export const CanvasContext = createContext<CanvasCtx | null>(null);

/**
 * Focuses a text field in a box that may not be visible yet (React Flow shows a new box only once
 * it has measured it), retrying for a few frames. Returns a cancel function for effect cleanup.
 */
export function focusWhenVisible(el: HTMLInputElement | HTMLTextAreaElement | null, select: 'end' | 'all' = 'end'): () => void {
  let raf = 0;
  let frames = 0;
  const attempt = () => {
    if (!el || !el.isConnected) return;
    el.focus({ preventScroll: true });
    if (document.activeElement === el) {
      if (select === 'all') el.select();
      else el.setSelectionRange(el.value.length, el.value.length);
      return;
    }
    frames += 1;
    if (frames < 20) raf = requestAnimationFrame(attempt);
  };
  attempt();
  return () => cancelAnimationFrame(raf);
}

export function useCanvasCtx(): CanvasCtx {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvasCtx outside a canvas board');
  return ctx;
}
