export interface SmartCanvasProps {
  initialContent?: string; // JSON string of blocks
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

export interface BlockData {
  blockId: string;
  type: 'text' | 'image' | 'embed' | 'code' | 'stack';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number | 'auto';
  color?: string;
  // Legacy/Compatibility fields
  url?: string;
  imageId?: string;
  isUploaded?: boolean;
  // Stack Items
  stackItems?: BlockData[];
}

export interface DraftConnection {
  fromBlock: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  currentX: number;
  currentY: number;
}

// Optimized drag which only tracks start info in main state
export interface ActiveDragStart {
  blockId: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  startX: number;
  startY: number;
}