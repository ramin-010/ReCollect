export interface SmartBlockProps {
  id: string;
  type?: 'text' | 'image' | 'embed' | 'code' | 'stack';
  content: string;
  url?: string; // For images
  stackItems?: any[]; // Recursive type simplified
  width: number;
  height: number | 'auto';
  x: number;
  y: number;
  isSelected?: boolean;
  // Parent handlers (stable references) - block will call with its own ID
  onUpdateBlock?: (id: string, data: any) => void;
  onDeleteBlock?: (id: string) => void;
  onFocus?: (id: string) => void;
  onUnstack?: (block: any) => void;
  onAnchorMouseDown?: (id: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onAnchorMouseUp?: (id: string, side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onDimensionsChange?: (id: string, width: number, height: number) => void;
  isConnectionDragging?: boolean;
  readOnly?: boolean;
  color?: string; // Background color class
}

export interface TaskStats {
  total: number;
  checked: number;
  progress: number;
}