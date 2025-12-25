import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Connection, BlockDims } from '@/types/canvas';
import { DragController } from './DragController';

interface NativeConnectionLayerProps {
    connections: Connection[];
    blocks: BlockDims[]; 
    dragController: DragController;
    selectedConnectionId: string | null;
    onSelectConnection: (id: string, e: React.MouseEvent) => void;
    containerRef: React.RefObject<HTMLDivElement>; // Fixed type
    zoom: number; // Added zoom prop
}

// --- Helper Functions (Pure Math) ---
const getAnchorPos = (block: {x: number, y: number, w: number, h: number}, side: 'top' | 'right' | 'bottom' | 'left') => {
    const { x, y, w, h } = block;
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
    const t = 0.5; 
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

// --- Initial Path Generation (Using React Props for initial render) ---
const calculateInitialPath = (conn: Connection, blocks: BlockDims[]) => {
    const fromBlock = blocks.find(b => b.id === conn.fromBlock);
    const toBlock = blocks.find(b => b.id === conn.toBlock);
    if (!fromBlock || !toBlock) return "";

    const start = getAnchorPos({x: fromBlock.x, y: fromBlock.y, w: fromBlock.width, h: fromBlock.height}, conn.fromSide);
    const end = getAnchorPos({x: toBlock.x, y: toBlock.y, w: toBlock.width, h: toBlock.height}, conn.toSide);

    // Initial Path Calculation with Sampled Defaults
    let cp1 = conn.controlPoint1;
    let cp2 = conn.controlPoint2;
    if (!cp1 || !cp2) {
         const dx = end.x - start.x;
         const dy = end.y - start.y;
         const dist = Math.hypot(dx, dy);
         const offset = Math.min(Math.max(dist * 0.5, 30), 200);

         const h1 = { ...start };
         if (conn.fromSide === 'top') h1.y -= offset;
         else if (conn.fromSide === 'bottom') h1.y += offset;
         else if (conn.fromSide === 'left') h1.x -= offset;
         else if (conn.fromSide === 'right') h1.x += offset;

         const h2 = { ...end };
         if (conn.toSide === 'top') h2.y -= offset;
         else if (conn.toSide === 'bottom') h2.y += offset;
         else if (conn.toSide === 'left') h2.x -= offset;
         else if (conn.toSide === 'right') h2.x += offset;

         if (!cp1) cp1 = getPointOnBezier(0.33, start, h1, h2, end);
         if (!cp2) cp2 = getPointOnBezier(0.66, start, h1, h2, end);
    }
    return getSplinePath([start, cp1, cp2, end]);
};

export const NativeConnectionLayer: React.FC<NativeConnectionLayerProps> = ({
    connections,
    blocks,
    dragController,
    selectedConnectionId,
    onSelectConnection,
    containerRef,
    zoom
}) => {
    // Use refs to avoid re-creating the effect when these change
    const connectionsRef = useRef(connections);
    const blocksRef = useRef(blocks);
    const zoomRef = useRef(zoom);
    
    // Keep refs updated
    useEffect(() => { connectionsRef.current = connections; }, [connections]);
    useEffect(() => { blocksRef.current = blocks; }, [blocks]);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);

    // Recalculate paths using actual DOM positions after render
    // This ensures consistency between live dragging and static render
    useLayoutEffect(() => {
        const containerEl = containerRef.current;
        if (!containerEl || connections.length === 0) return;

        // Small delay to ensure DOM is fully rendered
        const updatePaths = () => {
            const contRect = containerEl.getBoundingClientRect();
            
            // Only update visible (non-hidden) connections
            connections.filter(conn => !conn.hidden).forEach(conn => {
                const fromEl = document.getElementById(conn.fromBlock);
                const toEl = document.getElementById(conn.toBlock);
                
                if (!fromEl || !toEl) return;
                
                const fromRect = fromEl.getBoundingClientRect();
                const toRect = toEl.getBoundingClientRect();
                
                // Calculate logical coordinates (unscaled)
                const fromGeo = {
                    x: (fromRect.left - contRect.left + containerEl.scrollLeft) / zoom,
                    y: (fromRect.top - contRect.top + containerEl.scrollTop) / zoom,
                    w: fromRect.width / zoom,
                    h: fromRect.height / zoom
                };
                
                const toGeo = {
                    x: (toRect.left - contRect.left + containerEl.scrollLeft) / zoom,
                    y: (toRect.top - contRect.top + containerEl.scrollTop) / zoom,
                    w: toRect.width / zoom,
                    h: toRect.height / zoom
                };
                
                const start = getAnchorPos(fromGeo, conn.fromSide);
                const end = getAnchorPos(toGeo, conn.toSide);
                
                let cp1 = conn.controlPoint1;
                let cp2 = conn.controlPoint2;
                
                if (!cp1 || !cp2) {
                    const dx = end.x - start.x;
                    const dy = end.y - start.y;
                    const dist = Math.hypot(dx, dy);
                    const offset = Math.min(Math.max(dist * 0.5, 30), 200);

                    const h1 = { ...start };
                    if (conn.fromSide === 'top') h1.y -= offset;
                    else if (conn.fromSide === 'bottom') h1.y += offset;
                    else if (conn.fromSide === 'left') h1.x -= offset;
                    else if (conn.fromSide === 'right') h1.x += offset;

                    const h2 = { ...end };
                    if (conn.toSide === 'top') h2.y -= offset;
                    else if (conn.toSide === 'bottom') h2.y += offset;
                    else if (conn.toSide === 'left') h2.x -= offset;
                    else if (conn.toSide === 'right') h2.x += offset;

                    if (!cp1) cp1 = getPointOnBezier(0.33, start, h1, h2, end);
                    if (!cp2) cp2 = getPointOnBezier(0.66, start, h1, h2, end);
                }
                
                const newPath = getSplinePath([start, cp1, cp2, end]);
                
                const pathEl = document.getElementById(`conn-path-${conn.id}`);
                if (pathEl) {
                    pathEl.setAttribute('d', newPath);
                }
            });
        };
        
        // Use requestAnimationFrame to ensure DOM is painted
        const rafId = requestAnimationFrame(updatePaths);
        return () => cancelAnimationFrame(rafId);
    }, [connections, blocks, zoom, containerRef]);

    useEffect(() => {
        let rafId: number;
        let isActive = false;

        const updateLoop = () => {
            if (!isActive) return;
            const activeId = dragController.activeId;
            if (!activeId) return;

            // 1. Get Live Stats of the Dragged Block
            const blockEl = document.getElementById(activeId);
            const containerEl = containerRef.current;
            const currentZoom = zoomRef.current;
            const currentConnections = connectionsRef.current;
            const currentBlocks = blocksRef.current;
            
            if (blockEl && containerEl) {
                const contRect = containerEl.getBoundingClientRect();
                const bRect = blockEl.getBoundingClientRect();
                
                // CRITICAL: Unscale physical coordinates to Logical Canvas coordinates
                // x = (Physical Relative Pos) / zoom
                const x = (bRect.left - contRect.left + containerEl.scrollLeft) / currentZoom;
                const y = (bRect.top - contRect.top + containerEl.scrollTop) / currentZoom;
                const w = bRect.width / currentZoom;
                const h = bRect.height / currentZoom;
                const activeBlockGeo = { x, y, w, h };

                currentConnections.forEach(conn => {
                    // Skip hidden connections and connections not involving the dragged block
                    if (conn.hidden) return;
                    if (conn.fromBlock !== activeId && conn.toBlock !== activeId) return;

                    const isFromMoving = conn.fromBlock === activeId;
                    
                    let fromGeo;
                    if (isFromMoving) {
                        fromGeo = activeBlockGeo;
                    } else {
                         const el = document.getElementById(conn.fromBlock);
                         if (el) {
                             const r = el.getBoundingClientRect();
                             fromGeo = {
                                 x: (r.left - contRect.left + containerEl.scrollLeft) / currentZoom,
                                 y: (r.top - contRect.top + containerEl.scrollTop) / currentZoom,
                                 w: r.width / currentZoom,
                                 h: r.height / currentZoom
                             };
                         } else {
                             // Store blocks are already logical, no unscaling needed
                             const b = currentBlocks.find(b => b.id === conn.fromBlock);
                             if (b) fromGeo = { x: b.x, y: b.y, w: b.width, h: b.height };
                         }
                    }

                    let toGeo;
                    if (!isFromMoving) {
                        toGeo = activeBlockGeo;
                    } else {
                        const el = document.getElementById(conn.toBlock);
                         if (el) {
                             const r = el.getBoundingClientRect();
                             toGeo = {
                                 x: (r.left - contRect.left + containerEl.scrollLeft) / currentZoom,
                                 y: (r.top - contRect.top + containerEl.scrollTop) / currentZoom,
                                 w: r.width / currentZoom,
                                 h: r.height / currentZoom
                             };
                         } else {
                             const b = currentBlocks.find(b => b.id === conn.toBlock);
                             if (b) toGeo = { x: b.x, y: b.y, w: b.width, h: b.height };
                         }
                    }

                    if (fromGeo && toGeo) {
                        const start = getAnchorPos(fromGeo, conn.fromSide);
                        const end = getAnchorPos(toGeo, conn.toSide);
                        
                        let cp1 = conn.controlPoint1;
                        let cp2 = conn.controlPoint2;

                         if (!cp1 || !cp2) {
                             const dx = end.x - start.x;
                             const dy = end.y - start.y;
                             const dist = Math.hypot(dx, dy);
                             const offset = Math.min(Math.max(dist * 0.5, 30), 200);

                             const h1 = { ...start };
                             if (conn.fromSide === 'top') h1.y -= offset;
                             else if (conn.fromSide === 'bottom') h1.y += offset;
                             else if (conn.fromSide === 'left') h1.x -= offset;
                             else if (conn.fromSide === 'right') h1.x += offset;

                             const h2 = { ...end };
                             if (conn.toSide === 'top') h2.y -= offset;
                             else if (conn.toSide === 'bottom') h2.y += offset;
                             else if (conn.toSide === 'left') h2.x -= offset;
                             else if (conn.toSide === 'right') h2.x += offset;

                             if (!cp1) cp1 = getPointOnBezier(0.33, start, h1, h2, end);
                             if (!cp2) cp2 = getPointOnBezier(0.66, start, h1, h2, end);
                        }

                        const newPath = getSplinePath([start, cp1, cp2, end]);
                        
                        const pathEl = document.getElementById(`conn-path-${conn.id}`);
                        if (pathEl) {
                            pathEl.setAttribute('d', newPath);
                        }
                    }
                });
            }

            rafId = requestAnimationFrame(updateLoop);
        };

        const unsubscribe = dragController.subscribe((isDragging) => {
            if (isDragging) {
                isActive = true;
                rafId = requestAnimationFrame(updateLoop);
            } else {
                isActive = false;
                cancelAnimationFrame(rafId);
            }
        });

        return () => {
            unsubscribe();
            cancelAnimationFrame(rafId);
        };
    }, [dragController, containerRef]); // Only re-subscribe when dragController changes

    return (
        <svg 
            className="absolute inset-0 pointer-events-none overflow-visible w-full h-full z-0"
        >
            <defs>
                 <marker 
                     id="arrowhead" 
                     markerWidth="16" 
                     markerHeight="16" 
                     refX="16" 
                     refY="7" 
                     orient="auto"
                     markerUnits="userSpaceOnUse"
                 >
                     <polygon points="0 0, 19 7, 0 14" fill="context-stroke" />
                 </marker>
             </defs>
            {connections.filter(conn => !conn.hidden).map(conn => {
                const isSelected = selectedConnectionId === conn.id;
                const path = calculateInitialPath(conn, blocks); // Initial render
                return (
                    <g 
                        key={conn.id} 
                        className="pointer-events-auto" 
                        onClick={(e) => { e.stopPropagation(); onSelectConnection(conn.id, e); }}
                    >
                        <path 
                            id={`conn-path-${conn.id}`} // Hook for Matrix
                            d={path} 
                            stroke={conn.color || (isSelected ? "hsl(var(--brand-primary))" : "hsl(var(--muted-foreground))")} 
                            strokeWidth={isSelected ? 3 : 2}
                            fill="none"
                            className="transition-colors duration-200 cursor-pointer hover:stroke-[hsl(var(--foreground))]"
                            markerEnd="url(#arrowhead)"
                        />
                         {/* Hit area */}
                         <path d={path} stroke="transparent" strokeWidth={15} fill="none" className="cursor-pointer" />
                    </g>
                );
            })}
        </svg>
    );
};
