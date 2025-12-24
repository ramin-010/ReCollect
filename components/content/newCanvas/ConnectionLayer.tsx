import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Connection, BlockDims } from '@/types/canvas';
import { ActiveDragStart, BlockData } from './smartCanvas/types';
import { v4 as uuidv4 } from 'uuid';
import { useConnectionDrag } from './smartCanvas/useConnectionDrag';

interface ConnectionLayerProps {
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    blocks: BlockDims[]; // Needed to calculate anchor positions (visuals)
    fullBlocks?: BlockData[]; // Needed for logic snapping
    onUpdateConnection: (connection: Connection) => void;
    onRemoveConnection?: (id: string) => void;
    activeDragStart: ActiveDragStart | null;
    onDragComplete: () => void;
    getCanvasPoint: (e: { clientX: number, clientY: number }) => { x: number, y: number };
    selectedConnectionId: string | null;
    onSelectConnection: (id: string) => void;
}

export function ConnectionLayer({ 
    connections, 
    setConnections,
    blocks, // For visual rendering of existing connections
    fullBlocks = [], // For dragging logic (snap targets)
    onUpdateConnection,
    onRemoveConnection,
    activeDragStart,
    onDragComplete,
    getCanvasPoint,
    selectedConnectionId,
    onSelectConnection
}: ConnectionLayerProps) {
    const containerRef = React.useRef<SVGSVGElement>(null); 

    // Internal Drag State - Only causes re-renders in this layer!
    const [internalDraft, setInternalDraft] = useState<{
        fromBlock: string;
        fromSide: 'top' | 'right' | 'bottom' | 'left';
        currentX: number;
        currentY: number;
    } | null>(null);

    // Sync activeDragStart (from parent) to internalDraft (local)
    useEffect(() => {
        if (activeDragStart) {
            setInternalDraft({
                fromBlock: activeDragStart.blockId,
                fromSide: activeDragStart.side,
                currentX: activeDragStart.startX,
                currentY: activeDragStart.startY
            });
        }
    }, [activeDragStart]);

    // Track if we have actively initiated the internal draft
    const hasStartedRef = useRef(false);
    useEffect(() => {
        if (internalDraft) {
            hasStartedRef.current = true;
        }
    }, [internalDraft]);

    // Use our hooked drag logic
    useConnectionDrag(
        internalDraft,
        setInternalDraft,
        getCanvasPoint,
        blocks, // Use resolved dimensions (BlockDims) for accurate snapping
        connections,
        setConnections
    );

    // Completion Logic: Only report done if we *had* a draft and now it's gone
    useEffect(() => {
        if (activeDragStart && !internalDraft && hasStartedRef.current) {
            onDragComplete();
            hasStartedRef.current = false; // Reset
        }
    }, [internalDraft, activeDragStart, onDragComplete]);


    // Helper: Get Anchor Coordinate using DOM
    const getAnchorPos = useCallback((blockId: string, side: 'top' | 'right' | 'bottom' | 'left') => {
        const el = document.getElementById(blockId);
        const container = containerRef.current?.parentElement; // The div wrapping Rnd/Blocks

        if (!el || !container) {
            // Fallback to simpler math if DOM not found (e.g. initial render race)
            const block = blocks.find(b => b.id === blockId);
            if (!block) return { x: 0, y: 0 };
            const w = block.width;
            const h = block.height; 
            // Fallback calculations...
             switch (side) {
                case 'top': return { x: block.x + w / 2, y: block.y };
                case 'right': return { x: block.x + w, y: block.y + h / 2 };
                case 'bottom': return { x: block.x + w / 2, y: block.y + h };
                case 'left': return { x: block.x, y: block.y + h / 2 };
            }
        }

        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Relative Position inside the container
        const relX = elRect.left - containerRect.left;
        const relY = elRect.top - containerRect.top;
        const w = elRect.width;
        const h = elRect.height;

        switch (side) {
            case 'top': return { x: relX + w / 2, y: relY };
            case 'right': return { x: relX + w, y: relY + h / 2 };
            case 'bottom': return { x: relX + w / 2, y: relY + h };
            case 'left': return { x: relX, y: relY + h / 2 };
        }
    }, [blocks]); // Re-calc when blocks change (layout effects)

    // Helper: Get Path d attribute
    const getPath = (conn: Connection) => {
        const start = getAnchorPos(conn.fromBlock, conn.fromSide);
        const end = getAnchorPos(conn.toBlock, conn.toSide);
        
        // Default Control Points logic
        let cp1 = conn.controlPoint1;
        let cp2 = conn.controlPoint2;

        if (!cp1 || !cp2) {
             const dx = end.x - start.x;
             const dy = end.y - start.y;
             const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5 + 50;

             if (!cp1) {
                 cp1 = { ...start };
                 if (conn.fromSide === 'top') cp1.y -= offset;
                 if (conn.fromSide === 'bottom') cp1.y += offset;
                 if (conn.fromSide === 'left') cp1.x -= offset;
                 if (conn.fromSide === 'right') cp1.x += offset;
             }
             if (!cp2) {
                 cp2 = { ...end };
                 if (conn.toSide === 'top') cp2.y -= offset;
                 if (conn.toSide === 'bottom') cp2.y += offset;
                 if (conn.toSide === 'left') cp2.x -= offset;
                 if (conn.toSide === 'right') cp2.x += offset;
             }
        }

        return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
    };

    return (
        <svg 
            ref={containerRef}
            className="absolute inset-0 pointer-events-none overflow-visible w-full h-full z-0"
        >
            {connections.map(conn => {
                const path = getPath(conn);
                const isSelected = selectedConnectionId === conn.id;

                  return (
                    <g key={conn.id} className="pointer-events-auto" onClick={(e) => {
                        e.stopPropagation(); // Prevent canvas getting click
                        onSelectConnection(conn.id);
                    }}>
                        <path 
                            d={path} 
                            stroke={isSelected ? "hsl(var(--brand-primary))" : "hsl(var(--muted-foreground))"} 
                            strokeWidth={isSelected ? 3 : 2}
                            fill="none"
                            className="transition-colors duration-200 cursor-pointer hover:stroke-[hsl(var(--foreground))]"
                            markerEnd="url(#arrowhead)"
                        />
                        {/* Hidden fat path for easier clicking */}
                        <path d={path} stroke="transparent" strokeWidth={15} fill="none" className="cursor-pointer" />
                    </g>
                 );
            })}

             {/* Internal Draft Connection (Live Render) */}
             {internalDraft && (
                (() => {
                    const start = getAnchorPos(internalDraft.fromBlock, internalDraft.fromSide);
                    const end = { x: internalDraft.currentX, y: internalDraft.currentY };
                    const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`; 
                    return (
                        <path 
                            d={path} 
                            stroke="hsl(var(--brand-primary))" 
                            strokeWidth={2} 
                            strokeDasharray="5,5"
                            fill="none" 
                            markerEnd="url(#arrowhead)"
                            className="pointer-events-none"
                        />
                    );
                })()
             )}

            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="context-stroke" />
                </marker>
            </defs>
        </svg>
    );
}
