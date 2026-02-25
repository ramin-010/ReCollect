export interface SmartCanvasProps {
  initialContent?: string;
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
  language?: string;
  url?: string;
  imageId?: string;
  isUploaded?: boolean;
  stackItems?: BlockData[];
}

export interface DraftConnection {
  fromBlock: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  currentX: number;
  currentY: number;
}

export interface ActiveDragStart {
  blockId: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  startX: number;
  startY: number;
}
