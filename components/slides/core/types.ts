// Slide Canvas Types
// ===================

import { Connection } from '@/types/canvas';

export type { Connection } from '@/types/canvas';
export type { BlockDims } from '@/types/canvas';

export interface SlideData {
  slideId: string;
  order: number;
  title?: string;
  showTitle?: boolean; // defaults to true; false hides the heading area
  coverImage?: string | null;
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
  textColor?: string; // Custom text color (CSS color value)
  fontSize?: number; // Custom font size (default DEFAULT_FONT_SIZE)
  // Legacy/Compatibility fields
  url?: string;
  imageId?: string;
  isUploaded?: boolean;
}

export interface SlideCanvasData {
  slides: SlideData[];
  blocks: SlideBlockData[];
}

export interface SelectedBlockInfo {
  blockId: string;
  type: string;
  fontSize?: number;
  textColor?: string;
  color?: string;
}

export interface SlideCanvasProps {
  initialContent?: string; // JSON string of SlideCanvasData
  onChange?: (content: string) => void;
  readOnly?: boolean;
  onSelectionChange?: (block: SelectedBlockInfo | null) => void;
  isPresenting?: boolean;
  onClosePresentation?: () => void;
  deckId?: string;
  isTasksPanelOpen?: boolean;
}

// Constants
export const DEFAULT_FONT_SIZE = 18;
export const SLIDE_WIDTH = 1230;
export const SLIDE_MIN_HEIGHT = 800;
export const SLIDE_GAP = 24;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 1.5;
export const GUIDE_LINE_SPACING = 20;
