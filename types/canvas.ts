
export interface Connection {
  id: string;
  fromBlock: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  toBlock: string;
  toSide: 'top' | 'right' | 'bottom' | 'left';
  // Control points relative to the midpoint of the straight line between anchors? 
  // OR Absolute coordinates?
  // Let's use Absolute coordinates for simplicity in dragging, 
  // but we might need to update them when blocks move.
  // actually, let's store them as "offset" from the midpoint?
  // No, absolute is best for "molding". We just update them when blocks move.
  controlPoint1?: { x: number, y: number }; 
  controlPoint2?: { x: number, y: number };
  color?: string;
  // Stack preservation: hidden connections are preserved but not rendered
  hidden?: boolean;
  // Track which block this connection originally belonged to (when hidden inside a stack)
  originalBlockId?: string;
}

export interface BlockDims {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
