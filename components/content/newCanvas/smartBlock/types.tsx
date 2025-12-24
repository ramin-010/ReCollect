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
  onUpdate: (content: string) => void;
  onUpdateBlock?: (id: string, data: any) => void; // Generic update handler
  onDelete?: () => void;
  onFocus?: () => void;
  onUnstack?: () => void;
  onStackUpdate?: (items: any[]) => void;
  onAnchorMouseDown?: (side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
  onAnchorMouseUp?: (side: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
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