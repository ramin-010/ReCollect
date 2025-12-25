import React, { useEffect, useRef, useState } from 'react';
import { Connection, BlockDims } from '@/types/canvas';
import { DragController } from './DragController';

interface NativeConnectionLayerProps {
    connections: Connection[];
    blocks: BlockDims[]; 
    dragController: DragController;
    selectedConnectionId: string | null;
    onSelectConnection: (id: string, e: React.MouseEvent) => void;
    containerRef: React.RefObject<HTMLDivElement>; // Parent container to calculate relative offsets
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

// --- Initial Path Generation (Using React Props for initial render) ---
const calculateInitialPath = (conn: Connection, blocks: BlockDims[]) => {
    const fromBlock = blocks.find(b => b.id === conn.fromBlock);
    const toBlock = blocks.find(b => b.id === conn.toBlock);
    if (!fromBlock || !toBlock) return "";

    const start = getAnchorPos({x: fromBlock.x, y: fromBlock.y, w: fromBlock.width, h: fromBlock.height}, conn.fromSide);
    const end = getAnchorPos({x: toBlock.x, y: toBlock.y, w: toBlock.width, h: toBlock.height}, conn.toSide);

    // Simplistic Control Point logic (same as ConnectionLine)
    let cp1 = conn.controlPoint1;
    let cp2 = conn.controlPoint2;
    if (!cp1 || !cp2) {
         const dx = end.x - start.x;
         const dy = end.y - start.y;
         const offset = Math.min(Math.hypot(dx, dy) * 0.25, 100);
         const p1Base = { x: start.x + dx * 0.33, y: start.y + dy * 0.33 };
         const p2Base = { x: start.x + dx * 0.66, y: start.y + dy * 0.66 };
         if (!cp1) {
             cp1 = { ...p1Base };
             if (conn.fromSide === 'top') cp1.y -= offset;
             if (conn.fromSide === 'bottom') cp1.y += offset;
             if (conn.fromSide === 'left') cp1.x -= offset;
             if (conn.fromSide === 'right') cp1.x += offset;
         }
         if (!cp2) {
             cp2 = { ...p2Base };
             if (conn.toSide === 'top') cp2.y -= offset;
             if (conn.toSide === 'bottom') cp2.y += offset;
             if (conn.toSide === 'left') cp2.x -= offset;
             if (conn.toSide === 'right') cp2.x += offset;
         }
    }
    return getSplinePath([start, cp1, cp2, end]);
};

export const NativeConnectionLayer: React.FC<NativeConnectionLayerProps> = ({
    connections,
    blocks,
    dragController,
    selectedConnectionId,
    onSelectConnection,
    containerRef
}) => {
    // We only need to trigger Re-renders when structure changes (new connection / deletion / selection change)
    // Dragging will NOT trigger re-renders here.

    // --- The Matrix Engine: rAF Loop ---
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
            
            if (blockEl && containerEl) {
                const contRect = containerEl.getBoundingClientRect();
                const bRect = blockEl.getBoundingClientRect();
                
                const x = bRect.left - contRect.left + containerEl.scrollLeft;
                const y = bRect.top - contRect.top + containerEl.scrollTop;
                const w = bRect.width;
                const h = bRect.height;
                const activeBlockGeo = { x, y, w, h };

                connections.forEach(conn => {
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
                                 x: r.left - contRect.left + containerEl.scrollLeft,
                                 y: r.top - contRect.top + containerEl.scrollTop,
                                 w: r.width,
                                 h: r.height
                             };
                         } else {
                             const b = blocks.find(b => b.id === conn.fromBlock);
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
                                 x: r.left - contRect.left + containerEl.scrollLeft,
                                 y: r.top - contRect.top + containerEl.scrollTop,
                                 w: r.width,
                                 h: r.height
                             };
                         } else {
                             const b = blocks.find(b => b.id === conn.toBlock);
                             if (b) toGeo = { x: b.x, y: b.y, w: b.width, h: b.height };
                         }
                    }

                    if (fromGeo && toGeo) {
                        const start = getAnchorPos(fromGeo, conn.fromSide);
                        const end = getAnchorPos(toGeo, conn.toSide);
                        
                        let cp1 = conn.controlPoint1;
                        let cp2 = conn.controlPoint2;

                         if (!cp1 || !cp2) {
                             // ... (existing cp calc logic)
                             const dx = end.x - start.x;
                             const dy = end.y - start.y;
                             const offset = Math.min(Math.hypot(dx, dy) * 0.25, 100);
                             const p1Base = { x: start.x + dx * 0.33, y: start.y + dy * 0.33 };
                             const p2Base = { x: start.x + dx * 0.66, y: start.y + dy * 0.66 };
                             if (!cp1) {
                                 cp1 = { ...p1Base };
                                 if (conn.fromSide === 'top') cp1.y -= offset;
                                 if (conn.fromSide === 'bottom') cp1.y += offset;
                                 if (conn.fromSide === 'left') cp1.x -= offset;
                                 if (conn.fromSide === 'right') cp1.x += offset;
                             }
                             if (!cp2) {
                                 cp2 = { ...p2Base };
                                 if (conn.toSide === 'top') cp2.y -= offset;
                                 if (conn.toSide === 'bottom') cp2.y += offset;
                                 if (conn.toSide === 'left') cp2.x -= offset;
                                 if (conn.toSide === 'right') cp2.x += offset;
                             }
                        }

                        const newPath = getSplinePath([start, cp1, cp2, end]);
                        
                        const pathEl = document.getElementById(`conn-path-${conn.id}`);
                        if (pathEl) {
                            pathEl.setAttribute('d', newPath);
                            // console.log('updated path', conn.id);
                        } else {
                            // console.warn('path el not found', conn.id);
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
    }, [dragController, connections, blocks]); // Deps: standard react deps

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
            {connections.map(conn => {
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
