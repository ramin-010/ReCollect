import axiosInstance from '@/lib/utils/axios';
import type { CanvasBoard } from '@/lib/editor/canvasBoard';

/**
 * The server's diagram tools for a board the browser shows (CANVAS_BLOCK_SPEC §9, step 3):
 * the same layout engine agents get ("Tidy up"), and the same drawing as their previews (save as
 * SVG or PNG). Stateless: the board goes up, the result comes back, the browser writes it itself
 * (so the board's own Undo covers a tidy).
 */

export interface CanvasReport {
  boxes: number;
  arrows: number;
  zones: number;
  width: number;
  height: number;
  zoom: number;
  warnings: string[];
}

type Raw = Record<string, unknown>;
const unwrap = <T>(r: { data: { data?: T } & Raw }): T => (r.data.data ?? (r.data as unknown as T)) as T;

export async function layoutBoard(board: CanvasBoard, direction?: 'LR' | 'TB'): Promise<{ board: CanvasBoard; report: CanvasReport }> {
  const r = await axiosInstance.post('/api/canvas/layout', { board, ...(direction ? { direction } : {}) });
  return unwrap(r);
}

export async function renderBoard(board: CanvasBoard, format: 'svg' | 'png', theme: 'light' | 'dark'): Promise<Blob> {
  const r = await axiosInstance.post('/api/canvas/render', { board, format, theme }, { responseType: 'blob' });
  return r.data as Blob;
}
