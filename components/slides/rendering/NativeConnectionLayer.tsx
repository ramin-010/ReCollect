import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Connection, BlockDims } from '@/types/canvas';
import { DragController } from './DragController';
import { calculateConnectionPath, calculatePathFromRects, BlockRect } from './connectionGeometry';

interface NativeConnectionLayerProps {
    connections: Connection[];
    blocks: BlockDims[]; 
    dragController?: DragController | null;
    selectedConnectionId: string | null;
    onSelectConnection: (id: string, e: React.MouseEvent) => void;
    containerRef: React.RefObject<HTMLDivElement>;
    zoom: number;
}

export const NativeConnectionLayer: React.FC<NativeConnectionLayerProps> = ({
    connections,
    blocks,
    dragController,
    selectedConnectionId,
    onSelectConnection,
    containerRef,
    zoom
}) => {
        const connectionsRef = useRef(connections);
    const blocksRef = useRef(blocks);
    const zoomRef = useRef(zoom);
    
        useEffect(() => { connectionsRef.current = connections; }, [connections]);
    useEffect(() => { blocksRef.current = blocks; }, [blocks]);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);

            useLayoutEffect(() => {
        const containerEl = containerRef.current;
        if (!containerEl || connections.length === 0) return;

                const elToRect = (el: Element, contRect: DOMRect): BlockRect => {
            const r = el.getBoundingClientRect();
            return {
                x: (r.left - contRect.left + containerEl.scrollLeft) / zoom,
                y: (r.top - contRect.top + containerEl.scrollTop) / zoom,
                width: r.width / zoom,
                height: r.height / zoom,
            };
        };

        const updatePaths = () => {
            const contRect = containerEl.getBoundingClientRect();
            
            connections.filter(conn => !conn.hidden).forEach(conn => {
                const fromEl = containerEl.querySelector(`[id="${conn.fromBlock}"]`);
                const toEl = containerEl.querySelector(`[id="${conn.toBlock}"]`);
                if (!fromEl || !toEl) return;
                
                const newPath = calculatePathFromRects(conn, elToRect(fromEl, contRect), elToRect(toEl, contRect));
                const pathEl = containerEl.querySelector(`[id="conn-path-${conn.id}"]`);
                if (pathEl) pathEl.setAttribute('d', newPath);
            });
        };
        
        let rafId = requestAnimationFrame(updatePaths);

        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updatePaths);
        });

        // Observe the container itself for generic layout shifts
        observer.observe(containerEl);

        // Map over unique connected blocks to observe them
        const blockIdsToObserve = new Set<string>();
        connections.filter(c => !c.hidden).forEach(c => {
            blockIdsToObserve.add(c.fromBlock);
            blockIdsToObserve.add(c.toBlock);
        });

        blockIdsToObserve.forEach(id => {
            const el = containerEl.querySelector(`[id="${id}"]`);
            if (el) observer.observe(el);
        });

        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [connections, blocks, zoom, containerRef]);

    useEffect(() => {
        if (!dragController) return;

        let rafId: number;
        let isActive = false;

        const updateLoop = () => {
            if (!isActive) return;
            const activeId = dragController.activeId;
            if (!activeId) return;

            const containerEl = containerRef.current;
            if (!containerEl) return;
            const blockEl = containerEl.querySelector(`[id="${activeId}"]`) as HTMLElement | null;
            const currentZoom = zoomRef.current;
            const currentConnections = connectionsRef.current;
            const currentBlocks = blocksRef.current;
            
            if (blockEl && containerEl) {
                const contRect = containerEl.getBoundingClientRect();

                const elToRect = (el: Element): BlockRect => {
                    const r = el.getBoundingClientRect();
                    return {
                        x: (r.left - contRect.left + containerEl.scrollLeft) / currentZoom,
                        y: (r.top - contRect.top + containerEl.scrollTop) / currentZoom,
                        width: r.width / currentZoom,
                        height: r.height / currentZoom,
                    };
                };

                let activeBlockGeo: BlockRect | undefined;
                
                if (dragController.activeOffset) {
                    const { x, y } = dragController.activeOffset;
                    const width = blockEl ? blockEl.offsetWidth : 200; 
                    const height = blockEl ? blockEl.offsetHeight : 200;
                    activeBlockGeo = { x, y, width, height };
                } else if (blockEl) {
                    activeBlockGeo = elToRect(blockEl);
                }

                if (!activeBlockGeo) return;

                currentConnections.forEach(conn => {
                    if (conn.hidden) return;
                    if (conn.fromBlock !== activeId && conn.toBlock !== activeId) return;

                    const isFromMoving = conn.fromBlock === activeId;
                    
                    let fromGeo: BlockRect | undefined;
                    if (isFromMoving) {
                        fromGeo = activeBlockGeo;
                    } else {
                         const el = containerEl.querySelector(`[id="${conn.fromBlock}"]`);
                         if (el) {
                             fromGeo = elToRect(el);
                         } else {
                             const b = currentBlocks.find(b => b.id === conn.fromBlock);
                             if (b) fromGeo = { x: b.x, y: b.y, width: b.width, height: b.height };
                         }
                    }

                    let toGeo: BlockRect | undefined;
                    if (!isFromMoving) {
                        toGeo = activeBlockGeo;
                    } else {
                        const el = containerEl.querySelector(`[id="${conn.toBlock}"]`);
                         if (el) {
                             toGeo = elToRect(el);
                         } else {
                             const b = currentBlocks.find(b => b.id === conn.toBlock);
                             if (b) toGeo = { x: b.x, y: b.y, width: b.width, height: b.height };
                         }
                    }

                    if (fromGeo && toGeo) {
                        const newPath = calculatePathFromRects(conn, fromGeo, toGeo);
                        const pathEl = containerEl.querySelector(`[id="conn-path-${conn.id}"]`);
                        if (pathEl) pathEl.setAttribute('d', newPath);
                    }
                });
            }

            rafId = requestAnimationFrame(updateLoop);
        };

        if (!dragController) return;

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
    }, [dragController, containerRef]); 
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
                const path = calculateConnectionPath(conn, blocks);                 return (
                    <g 
                        key={conn.id} 
                        className="pointer-events-auto" 
                        onClick={(e) => { e.stopPropagation(); onSelectConnection(conn.id, e); }}
                    >
                        <path 
                            id={`conn-path-${conn.id}`}                             d={path} 
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
