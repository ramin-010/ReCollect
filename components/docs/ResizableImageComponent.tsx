import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

export const ResizableImageComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  // Use local state for initial render, but Refs for mutable resize values to avoid re-renders during drag
  const [width, setWidth] = useState<string | number>(node.attrs.width || '100%');
  const [resizing, setResizing] = useState(false);
  
  const resizeRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setWidth(node.attrs.width || '100%');
  }, [node.attrs.width]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizing(true);
    startX.current = e.clientX;
    
    if (resizeRef.current) {
        startWidth.current = resizeRef.current.offsetWidth;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
     if (!resizeRef.current) return;
     
     // Use requestAnimationFrame for smooth UI updates without React render cycle
     if (rafRef.current) cancelAnimationFrame(rafRef.current);
     
     rafRef.current = requestAnimationFrame(() => {
         const diff = e.clientX - startX.current;
         const newWidth = Math.max(100, startWidth.current + diff); // Min width 100px
         if (resizeRef.current) {
             resizeRef.current.style.width = `${newWidth}px`;
         }
     });
  };

  const onMouseUp = () => {
    setResizing(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // Save final width to TipTap
    if (resizeRef.current) {
        const finalWidth = resizeRef.current.style.width;
        setWidth(finalWidth);
        updateAttributes({ width: finalWidth });
    }
  };

  const isSelectedOrResizing = selected || resizing;

  return (
    <NodeViewWrapper className="flex justify-start my-4 relative group" style={{ overflow: 'visible', lineHeight: 0 }}>
       {/* Width constraint container */}
       <div 
         ref={resizeRef}
         className={`relative transition-shadow duration-150 ${isSelectedOrResizing ? 'ring-2 ring-blue-500/50' : ''} rounded-lg flex`}
         style={{ width: width, maxWidth: '100%', height: 'auto' }}
       >
         <img
            src={node.attrs.src}
            alt={node.attrs.alt}
            className="rounded-lg w-full h-auto object-cover pointer-events-none block m-0 p-0" 
            draggable={false}
         />
         
         {/* Handles - Visible on Hover or Selection */}
         {/* Use opacity transition for smooth appearance */}
         <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${isSelectedOrResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            
            {/* Right Drag Handle (Bar) */}
            <div
                onMouseDown={onMouseDown}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-12 bg-white rounded-full shadow-md border border-gray-200 cursor-ew-resize pointer-events-auto hover:scale-110 transition-transform flex items-center justify-center z-50"
            >
                <div className="w-1 h-4 bg-gray-300 rounded-full" />
            </div>

            {/* Bottom-Right Corner Handle (Circle) */}
            <div
                onMouseDown={onMouseDown}
                className="absolute -right-3 -bottom-3 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 cursor-nwse-resize pointer-events-auto hover:scale-110 transition-transform z-50 flex items-center justify-center"
            >
                 <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
            
         </div>
       </div>
    </NodeViewWrapper>
  );
};
