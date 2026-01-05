import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { imageStorage } from '@/lib/storage/imageStorage';

export const ResizableImageComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [width, setWidth] = useState<string | number>(node.attrs.width || '100%');
  const [resizing, setResizing] = useState(false);
  const [hydratedSrc, setHydratedSrc] = useState<string | null>(null);
  
  const resizeRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Hydrate pending images from IndexedDB on mount
  useEffect(() => {
    const imageId = node.attrs.imageId;
    const currentSrc = node.attrs.src;
    
    // If we have an imageId and src is invalid (blob URLs don't persist across refresh)
    if (imageId && (!currentSrc || currentSrc.startsWith('blob:'))) {
      (async () => {
        try {
          const blob = await imageStorage.getImage(imageId);
          if (blob) {
            const blobUrl = imageStorage.createObjectURL(blob);
            setHydratedSrc(blobUrl);
            // Update the node so editor content has the fresh blob URL
            updateAttributes({ src: blobUrl });
          }
        } catch (err) {
          console.error(`[ResizableImage] Failed to hydrate image ${imageId}:`, err);
        }
      })();
    }
    
    // Cleanup blob URL on unmount
    return () => {
      if (hydratedSrc) {
        imageStorage.revokeObjectURL(hydratedSrc);
      }
    };
  }, [node.attrs.imageId]);

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
     
     if (rafRef.current) cancelAnimationFrame(rafRef.current);
     
     rafRef.current = requestAnimationFrame(() => {
         const diff = e.clientX - startX.current;
         const newWidth = Math.max(100, startWidth.current + diff);
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
    
    if (resizeRef.current) {
        const finalWidth = resizeRef.current.style.width;
        setWidth(finalWidth);
        updateAttributes({ width: finalWidth });
    }
  };

  const isSelectedOrResizing = selected || resizing;
  const displaySrc = hydratedSrc || node.attrs.src;

  return (
    <NodeViewWrapper className="flex justify-start my-4 relative group" style={{ overflow: 'visible', lineHeight: 0 }}>
       <div 
         ref={resizeRef}
         className={`relative transition-shadow duration-150 ${isSelectedOrResizing ? 'ring-2 ring-blue-500/50' : ''} rounded-lg flex`}
         style={{ width: width, maxWidth: '100%', height: 'auto' }}
       >
         {displaySrc ? (
           <img
             src={displaySrc}
             alt={node.attrs.alt}
             className="rounded-lg w-full h-auto object-cover pointer-events-none block m-0 p-0" 
             draggable={false}
           />
         ) : (
           <div className="rounded-lg w-full h-32 bg-gray-200 animate-pulse flex items-center justify-center">
             <span className="text-gray-400 text-sm">Loading...</span>
           </div>
         )}
         
         <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${isSelectedOrResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            
            <div
                onMouseDown={onMouseDown}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-12 bg-white rounded-full shadow-md border border-gray-200 cursor-ew-resize pointer-events-auto hover:scale-110 transition-transform flex items-center justify-center z-50"
            >
                <div className="w-1 h-4 bg-gray-300 rounded-full" />
            </div>

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
