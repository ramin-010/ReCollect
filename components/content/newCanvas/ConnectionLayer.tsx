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
    onUpdateConnection?: (connection: Connection) => void;
    onRemoveConnection?: (id: string) => void;
    activeDragStart: ActiveDragStart | null;
    onDragComplete: () => void;
    getCanvasPoint: (e: { clientX: number, clientY: number }) => { x: number, y: number };
    selectedConnectionId: string | null;
    onSelectConnection: (id: string) => void;
    variant?: 'default' | 'controls'; // New prop to split rendering
}

export function ConnectionLayer({ 
    connections, 
    setConnections,
    blocks, 
    fullBlocks = [], 
    onUpdateConnection,
    onRemoveConnection,
    activeDragStart,
    onDragComplete,
    getCanvasPoint,
    selectedConnectionId,
    onSelectConnection,
    variant = 'default'
}: ConnectionLayerProps) {
    const containerRef = React.useRef<SVGSVGElement>(null); 
    const [draggingHandle, setDraggingHandle] = useState<{ connId: string, handle: 'cp1' | 'cp2' } | null>(null);

    // Internal Drag State (Only for 'default' creation variant)
    const [internalDraft, setInternalDraft] = useState<{
        fromBlock: string;
        fromSide: 'top' | 'right' | 'bottom' | 'left';
        currentX: number;
        currentY: number;
    } | null>(null);

    // Sync activeDragStart (only if default)
    useEffect(() => {
        if (variant === 'default' && activeDragStart) {
            setInternalDraft({
                fromBlock: activeDragStart.blockId,
                fromSide: activeDragStart.side,
                currentX: activeDragStart.startX,
                currentY: activeDragStart.startY
            });
        }
    }, [activeDragStart, variant]);

    // Track if we have actively initiated the internal draft
    const hasStartedRef = useRef(false);
    useEffect(() => { if (internalDraft) hasStartedRef.current = true; }, [internalDraft]);

    // Use our hooked drag logic (only if default)
    useConnectionDrag(
        variant === 'default' ? internalDraft : null,
        setInternalDraft,
        getCanvasPoint,
        blocks, 
        connections,
        setConnections
    );

    // Completion Logic (only if default)
    useEffect(() => {
        if (variant === 'default' && activeDragStart && !internalDraft && hasStartedRef.current) {
            onDragComplete();
            hasStartedRef.current = false; 
        }
    }, [internalDraft, activeDragStart, onDragComplete, variant]);


    // Helper: Get Anchor Coordinate using DOM (Shared)
    const getAnchorPos = useCallback((blockId: string, side: 'top' | 'right' | 'bottom' | 'left') => {
        const el = document.getElementById(blockId);
        const container = containerRef.current?.parentElement; 
        
        // Note: For the 'controls' layer (z-50), the parent might be different if we nest differently, 
        // but assuming it's in the same relative container.
        
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
    }, [blocks]); 

    // Helper: Generate a smooth spline path passing through points [p0, p1, p2, p3]
    // Using simple Catmull-Rom to Cubic Bezier conversion
    const getSplinePath = (points: {x: number, y: number}[]) => {
        if (points.length < 2) return "";
        
        let path = `M ${points[0].x} ${points[0].y}`;
        
        // Tension: 0.5 is standard Catmull-Rom
        const t = 0.5; // Tension

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[0];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : p2;

            const cp1x = p1.x + (p2.x - p0.x) * t / 3; // Divide by 6? Standard is /6 for distance, but /3 for Bezier grid? 
            // Catmull-Rom to Bezier: CP1 = P1 + (P2-P0)/6 * tension? 
            // Let's use standard d = distance * tension.
            const cp1y = p1.y + (p2.y - p0.y) * t / 3;

            const cp2x = p2.x - (p3.x - p1.x) * t / 3;
            const cp2y = p2.y - (p3.y - p1.y) * t / 3;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return path;
    };

    // Helper: Get Control Points (Waypoints)
    const getControlPoints = (conn: Connection) => {
        const start = getAnchorPos(conn.fromBlock, conn.fromSide);
        const end = getAnchorPos(conn.toBlock, conn.toSide);
        
        let cp1 = conn.controlPoint1;
        let cp2 = conn.controlPoint2;

        if (!cp1 || !cp2) {
             // For Spline, defaults should be ON the curve.
             // Let's default to a nice arc or 1/3, 2/3 straights. 
             // Catmull-Rom smooths corners, so zigzag is fine.
             
             // Let's use the previous "Smart Curve" offset but add it to the 1/3 2/3 points
             const dx = end.x - start.x;
             const dy = end.y - start.y;
             const dist = Math.hypot(dx, dy);
             const offset = Math.min(dist * 0.25, 100); // reduced offset for waypoints

             // Base points on straight line
             const p1Base = { x: start.x + dx * 0.33, y: start.y + dy * 0.33 };
             const p2Base = { x: start.x + dx * 0.66, y: start.y + dy * 0.66 };

             if (!cp1) {
                 cp1 = { ...p1Base };
                 // Offset perpendicular? Or just simple side-push
                 if (conn.fromSide === 'top') cp1.y -= offset;
                 if (conn.fromSide === 'bottom') cp1.y += offset;
                 if (conn.fromSide === 'left') cp1.x -= offset;
                 if (conn.fromSide === 'right') cp1.x += offset;
             }
             if (!cp2) {
                 cp2 = { ...p2Base };
                   // For p2, if we have a C-shape (e.g. Right to Right), we push same dir.
                   // If S-shape (Right to Left), we might push opposite or just let spline handle it.
                   // Simple logic: Push based on ToSide
                 if (conn.toSide === 'top') cp2.y -= offset;
                 if (conn.toSide === 'bottom') cp2.y += offset;
                 if (conn.toSide === 'left') cp2.x -= offset;
                 if (conn.toSide === 'right') cp2.x += offset;
             }
        }
        return { cp1, cp2 };
    };

    const getPath = (conn: Connection) => {
        const start = getAnchorPos(conn.fromBlock, conn.fromSide);
        const end = getAnchorPos(conn.toBlock, conn.toSide);
        const { cp1, cp2 } = getControlPoints(conn);
        
        // Generate Spline passing through S -> CP1 -> CP2 -> E
        return getSplinePath([start, cp1, cp2, end]);
    };

    // Handle Control Point Dragging (Variant: 'controls')
    useEffect(() => {
        if (variant !== 'controls' || !draggingHandle) return;

        let animationFrameId: number;

        const handleMouseMove = (e: MouseEvent) => {
            animationFrameId = requestAnimationFrame(() => {
                const { x, y } = getCanvasPoint(e);
                
                // Optimistically update the local state or parent?
                // Updating parent triggers re-render loop.
                // Using rAF debounces it slightly to screen sync.
                
                setConnections(prev => prev.map(c => {
                    if (c.id !== draggingHandle.connId) return c;
                    const currentCPs = getControlPoints(c); // Use mostly stable reference
                    return {
                        ...c,
                        controlPoint1: draggingHandle.handle === 'cp1' ? { x, y } : currentCPs.cp1,
                        controlPoint2: draggingHandle.handle === 'cp2' ? { x, y } : currentCPs.cp2
                    };
                }));
            });
        };

        const handleMouseUp = () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            setDraggingHandle(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingHandle, getCanvasPoint, setConnections, blocks, variant]);

    
    return (
        <svg 
            ref={containerRef}
            className={`absolute inset-0 pointer-events-none overflow-visible w-full h-full ${variant === 'controls' ? 'z-[50]' : 'z-0'}`}
        >
            {connections.map(conn => {
                const isSelected = selectedConnectionId === conn.id;

                if (variant === 'default') {
                    // RENDER LINES
                    const path = getPath(conn);
                    return (
                        <g key={conn.id} className="pointer-events-auto" onClick={(e) => {
                            e.stopPropagation(); 
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
                            <path d={path} stroke="transparent" strokeWidth={15} fill="none" className="cursor-pointer" />
                        </g>
                    );
                } else if (variant === 'controls' && isSelected) {
                    // RENDER CONTROLS
                     const { cp1, cp2 } = getControlPoints(conn);
                     const start = getAnchorPos(conn.fromBlock, conn.fromSide);
                     const end = getAnchorPos(conn.toBlock, conn.toSide);
                     return (
                        <g 
                            key={`${conn.id}-controls`} 
                            className="pointer-events-auto"
                            onClick={(e) => e.stopPropagation()} // Prevent canvas click (deselect)
                        >
                             {/* Guide Lines Removed - Handles are on the path now */}

                             {/* Handle 1 - No scaling on hover to prevent jitter */}
                             <circle 
                                 cx={cp1.x} cy={cp1.y} r={6} 
                                 fill="hsl(var(--background))" 
                                 stroke="hsl(var(--brand-primary))" 
                                 strokeWidth={2}
                                 className="cursor-move"
                                 onMouseDown={(e) => {
                                     e.stopPropagation(); 
                                     setDraggingHandle({ connId: conn.id, handle: 'cp1' });
                                 }}
                                 onDoubleClick={(e) => {
                                     e.stopPropagation();
                                     // Reset CP1 to undefined to revert to smart default
                                     setConnections(prev => prev.map(c => 
                                         c.id === conn.id ? { ...c, controlPoint1: undefined } : c
                                     ));
                                 }}
                             />
                             {/* Handle 2 */}
                             <circle 
                                 cx={cp2.x} cy={cp2.y} r={6} 
                                 fill="hsl(var(--background))" 
                                 stroke="hsl(var(--brand-primary))" 
                                 strokeWidth={2}
                                 className="cursor-move"
                                 onMouseDown={(e) => {
                                     e.stopPropagation();
                                     setDraggingHandle({ connId: conn.id, handle: 'cp2' });
                                 }}
                                 onDoubleClick={(e) => {
                                     e.stopPropagation();
                                     // Reset CP2 to undefined
                                     setConnections(prev => prev.map(c => 
                                         c.id === conn.id ? { ...c, controlPoint2: undefined } : c
                                     ));
                                 }}
                             />
                        </g>
                     );
                }
                return null;
            })}

             {/* Internal Draft Connection (Only default layer) */}
             {variant === 'default' && internalDraft && (
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

            {variant === 'default' && (
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="context-stroke" />
                    </marker>
                </defs>
            )}
        </svg>
    );
}
