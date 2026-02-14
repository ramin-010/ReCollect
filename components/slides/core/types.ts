// Slide Canvas Types
// ===================

import { Connection } from '@/types/canvas';

export type { Connection } from '@/types/canvas';
export type { BlockDims } from '@/types/canvas';

export interface SlideData {
  slideId: string;
  order: number;
  backgroundColor?: string;
  connections: Connection[];
}

export interface SlideBlockData {
  blockId: string;
  slideId: string;
  type: 'text' | 'image' | 'embed' | 'code';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number | 'auto';
  language?: string;
  color?: string;
  // Legacy/Compatibility fields
  url?: string;
  imageId?: string;
  isUploaded?: boolean;
}

export interface SlideCanvasData {
  slides: SlideData[];
  blocks: SlideBlockData[];
}

export interface SlideCanvasProps {
  initialContent?: string; // JSON string of SlideCanvasData
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

// Constants
export const SLIDE_WIDTH = 1200;
export const SLIDE_MIN_HEIGHT = 700;
export const SLIDE_GAP = 24;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 1.5;
export const GUIDE_LINE_SPACING = 40;
