export interface SmartBlockProps {
  id: string;
  type?: 'text' | 'image' | 'embed' | 'code' | 'stack';
  content: string;
  language?: string;
  url?: string;
  stackItems?: any[];
  fontSize?: number;
  width: number;
  height: number | 'auto';
  x: number;
  y: number;
  isSelected?: boolean;
    onUpdateBlock?: (id: string, data: any) => void;
  onDeleteBlock?: (id: string) => void;
  onFocus?: (id: string) => void;
  onUnstack?: (block: any) => void;
  onAnchorMouseDown?: (id: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onAnchorMouseUp?: (id: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onDimensionsChange?: (id: string, width: number, height: number) => void;
  isConnectionDragging?: boolean;
  readOnly?: boolean;
  color?: string;
  /** If provided, double-click on text blocks calls this instead of opening inline editor */
  onEditRequest?: (id: string) => void;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  isConnected?: boolean;
}

export interface TaskStats {
  total: number;
  checked: number;
  progress: number;
}