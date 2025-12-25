import React, { memo } from 'react';
import { Connection, BlockDims } from '@/types/canvas';

interface ConnectionLineProps {
    connection: Connection;
    fromBlock: BlockDims | undefined;
    toBlock: BlockDims | undefined;
    isSelected: boolean;
    onSelect: (id: string, e: React.MouseEvent) => void;
}

const getAnchorPos = (block: BlockDims, side: 'top' | 'right' | 'bottom' | 'left') => {
    const { x, y, width: w, height: h } = block;
    switch (side) {
        case 'top': return { x: x + w / 2, y };
        case 'right': return { x: x + w, y: y + h / 2 };
        case 'bottom': return { x: x + w / 2, y: y + h };
        case 'left': return { x, y: y + h / 2 };
    }
};

const getSplinePath = (points: {x: number, y: number}[]) => {
    if (points.length < 2) return "";
    
    let path = `M ${points[0].x} ${points[0].y}`;
    const t = 0.5; // Tension

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[0];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) * t / 3;
        const cp1y = p1.y + (p2.y - p0.y) * t / 3;

        const cp2x = p2.x - (p3.x - p1.x) * t / 3;
        const cp2y = p2.y - (p3.y - p1.y) * t / 3;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
};

const getPointOnBezier = (t: number, p0: {x:number,y:number}, p1: {x:number,y:number}, p2: {x:number,y:number}, p3: {x:number,y:number}) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    return { x, y };
};

const ConnectionLineComponent: React.FC<ConnectionLineProps> = ({ 
    connection, 
    fromBlock, 
    toBlock, 
    isSelected, 
    onSelect 
}) => {
    if (!fromBlock || !toBlock) return null;

    const start = getAnchorPos(fromBlock, connection.fromSide);
    const end = getAnchorPos(toBlock, connection.toSide);

    let cp1 = connection.controlPoint1;
    let cp2 = connection.controlPoint2;

    if (!cp1 || !cp2) {
         // Calculate "Ideal" Bezier Handles for smooth curve
         const dx = end.x - start.x;
         const dy = end.y - start.y;
         const dist = Math.hypot(dx, dy);
         const offset = Math.min(Math.max(dist * 0.5, 30), 200);

         const h1 = { ...start };
         if (connection.fromSide === 'top') h1.y -= offset;
         else if (connection.fromSide === 'bottom') h1.y += offset;
         else if (connection.fromSide === 'left') h1.x -= offset;
         else if (connection.fromSide === 'right') h1.x += offset;

         const h2 = { ...end };
         if (connection.toSide === 'top') h2.y -= offset;
         else if (connection.toSide === 'bottom') h2.y += offset;
         else if (connection.toSide === 'left') h2.x -= offset;
         else if (connection.toSide === 'right') h2.x += offset;

         // Sample the Ideal Bezier at 1/3 and 2/3 to get Waypoints ON the curve
         if (!cp1) cp1 = getPointOnBezier(0.33, start, h1, h2, end);
         if (!cp2) cp2 = getPointOnBezier(0.66, start, h1, h2, end);
    }

    const path = getSplinePath([start, cp1, cp2, end]);

    return (
        <g 
            className="pointer-events-auto" 
            onClick={(e) => { e.stopPropagation(); onSelect(connection.id, e); }}
        >
            <path 
                d={path} 
                stroke={connection.color || (isSelected ? "hsl(var(--brand-primary))" : "hsl(var(--muted-foreground))")} 
                strokeWidth={isSelected ? 3 : 2}
                fill="none"
                className="transition-colors duration-200 cursor-pointer hover:stroke-[hsl(var(--foreground))]"
                markerEnd="url(#arrowhead)"
            />
            {/* Hit area for easier selection */}
            <path d={path} stroke="transparent" strokeWidth={15} fill="none" className="cursor-pointer" />
        </g>
    );
};

// Custom Comparison for Performance
const arePropsEqual = (prev: ConnectionLineProps, next: ConnectionLineProps) => {
    // 1. Check simple scalars
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.connection.id !== next.connection.id) return false;
    if (prev.connection.color !== next.connection.color) return false;
    // Deep check connections control points if changed
    if (prev.connection.controlPoint1?.x !== next.connection.controlPoint1?.x) return false;
    if (prev.connection.controlPoint1?.y !== next.connection.controlPoint1?.y) return false;
    if (prev.connection.controlPoint2?.x !== next.connection.controlPoint2?.x) return false;
    if (prev.connection.controlPoint2?.y !== next.connection.controlPoint2?.y) return false;

    // 2. Check Blocks (Deep Value Comparison)
    // Even if object ref changed, if x/y/w/h are same, it's equal.
    const b1Prev = prev.fromBlock;
    const b1Next = next.fromBlock;
    if (b1Prev?.x !== b1Next?.x || b1Prev?.y !== b1Next?.y || b1Prev?.width !== b1Next?.width || b1Prev?.height !== b1Next?.height) return false;

    const b2Prev = prev.toBlock;
    const b2Next = next.toBlock;
    if (b2Prev?.x !== b2Next?.x || b2Prev?.y !== b2Next?.y || b2Prev?.width !== b2Next?.width || b2Prev?.height !== b2Next?.height) return false;

    return true;
};

export const ConnectionLine = memo(ConnectionLineComponent, arePropsEqual);
