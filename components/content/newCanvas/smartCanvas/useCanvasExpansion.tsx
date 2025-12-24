import { useState, useEffect } from 'react';
import { BlockData } from './types';

export const useCanvasExpansion = (
  blocks: BlockData[],
  containerRef: React.RefObject<HTMLDivElement | null>
) => {
  const [canvasSize, setCanvasSize] = useState({ width: '100%', height: '100%' });

  useEffect(() => {
    if (blocks.length === 0) return;

    // 1. Calculate bounding box of content
    let maxX = 0;
    let maxY = 0;
    
    blocks.forEach(b => {
      const bRight = b.x + b.width;
      const bBottom = b.y + (typeof b.height === 'number' ? b.height : 200); // approx for auto
      if (bRight > maxX) maxX = bRight;
      if (bBottom > maxY) maxY = bBottom;
    });

    if (containerRef.current) {
      const currentW = containerRef.current.clientWidth;
      const currentH = containerRef.current.clientHeight;
      const thresholdX = currentW * 0.8;
      const thresholdY = currentH * 0.8;
      let newW = currentW;
      let newH = currentH;
      let needsUpdate = false;

      if (maxX > thresholdX) {
        newW = Math.max(currentW, maxX + 400); 
        needsUpdate = true;
      }

      if (maxY > thresholdY) {
        newH = Math.max(currentH, maxY + 400); 
        needsUpdate = true;
      }

      if (needsUpdate) {
        setCanvasSize({ 
          width: `${newW}px`, 
          height: `${newH}px` 
        });
      }
    }
  }, [blocks, containerRef]);

  return canvasSize;
};