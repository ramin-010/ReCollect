'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SlideData, SlideBlockData, SlideCanvasData, GUIDE_LINE_SPACING } from './types';
import { Connection } from '@/types/canvas';
import { slideImageStorage } from '@/lib/storage/slideImageStorage';





function createSlide(order: number): SlideData {
  return { slideId: uuidv4(), order, connections: [] };
}

/** Parse raw JSON into SlideCanvasData */
export function parseContent(raw: string | undefined): SlideCanvasData {
  if (!raw) return { slides: [createSlide(0)], blocks: [] };

  try {
    const parsed = JSON.parse(raw);


    if (parsed.slides && Array.isArray(parsed.slides)) {

      const slides = parsed.slides.map((s: any) => ({
        ...s,
        connections: s.connections || [],
      }));
      return {
        slides,
        blocks: parsed.blocks || [],
      };
    }


    if (parsed.blocks && Array.isArray(parsed.blocks)) {
      const slide = createSlide(0);
      slide.connections = parsed.connections || [];
      const migratedBlocks = parsed.blocks.map((b: any) => ({
        ...b,
        slideId: slide.slideId,
      }));
      return {
        slides: [slide],
        blocks: migratedBlocks,
      };
    }


    if (Array.isArray(parsed)) {
      const slide = createSlide(0);
      const migratedBlocks = parsed.map((b: any) => ({
        ...b,
        slideId: slide.slideId,
      }));
      return {
        slides: [slide],
        blocks: migratedBlocks,
      };
    }
  } catch {

  }

  return { slides: [createSlide(0)], blocks: [] };
}





export function useSlideState(
  initialContent: string | undefined,
  onChange?: (content: string) => void
) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [blocks, setBlocks] = useState<SlideBlockData[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const lastContentRef = useRef<string | undefined>(undefined);


  // Initialize ONCE from initialContent — hydrate images BEFORE first render
  // (Matches SmartCanvas pattern: Promise.all hydration → setBlocks)
  useEffect(() => {
    if (initializedRef.current) return;

    const loadContent = async () => {
      const contentStr = typeof initialContent === 'string' ? initialContent : JSON.stringify(initialContent);
      const data = parseContent(contentStr);

      // Hydrate images from IndexedDB or cloud BEFORE setting blocks
      // This prevents the "Loading image..." flash
      const hydratedBlocks = await Promise.all(
        data.blocks.map(async (block) => {
          if (block.type !== 'image' || !block.imageId) return block;

          // Case 1: Already uploaded to cloud with a valid cloud URL — pass through
          if (block.isUploaded && block.url && !block.url.startsWith('blob:') 
              && block.url !== 'PENDING_UPLOAD' && block.url !== 'IDB_IMAGE') {
            return block;
          }

          // Case 2: Already has a valid blob URL (current session) — pass through
          if (block.url?.startsWith('blob:')) {
            return block;
          }

          // Case 3: Needs hydration (local image: IDB_IMAGE, PENDING_UPLOAD, or no URL)
          // Try to restore from slideImageStorage using imageId
          try {
            const blob = await slideImageStorage.getImage(block.imageId);
            if (blob) {
              console.log('[useSlideState] Hydrated image', block.imageId, 'from IndexedDB');
              return { ...block, url: slideImageStorage.createObjectURL(blob) };
            } else {
              console.warn('[useSlideState] Image', block.imageId, 'NOT found in IndexedDB — may need re-upload');
            }
          } catch (err) {
            console.error('[useSlideState] Failed to hydrate image:', block.imageId, err);
          }
          return block;
        })
      );

      // Set skip BEFORE the state update — the initial true was already consumed
      // by the empty-state first render (slides=[], blocks=[])
      skipNextOnChangeRef.current = true;

      setSlides(data.slides);
      setBlocks(hydratedBlocks);
      setActiveSlideId(data.slides[0]?.slideId || null);
      
      initializedRef.current = true;
      lastContentRef.current = contentStr;
    };

    loadContent();
  }, [initialContent]);

  // Allow external forcing of hydration (e.g. reverting to server state)
  const hydrate = useCallback(async (content: string) => {
    const data = parseContent(content);
    
    const hydratedBlocks = await Promise.all(
      data.blocks.map(async (block) => {
        if (block.type !== 'image' || !block.imageId) return block;

        if (block.isUploaded && block.url && !block.url.startsWith('blob:') 
            && block.url !== 'PENDING_UPLOAD' && block.url !== 'IDB_IMAGE') {
          return block;
        }

        if (block.url?.startsWith('blob:')) return block;

        try {
          const blob = await slideImageStorage.getImage(block.imageId);
          if (blob) {
            return { ...block, url: slideImageStorage.createObjectURL(blob) };
          }
        } catch (err) {}
        return block;
      })
    );

    setSlides(data.slides);
    setBlocks(hydratedBlocks);
    setActiveSlideId(data.slides[0]?.slideId || null);
    lastContentRef.current = content;

    // Prevent the reactive useEffect from firing onChange for this hydration
    skipNextOnChangeRef.current = true;
  }, []);


  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Skip onChange for init and hydration — these load existing state, not user edits
  const skipNextOnChangeRef = useRef(true);

  // Reactive onChange — fires on next render after any slides/blocks mutation
  useEffect(() => {
    if (skipNextOnChangeRef.current) {
      skipNextOnChangeRef.current = false;
      return;
    }
    if (slides.length === 0) return;
    const json = JSON.stringify({ slides, blocks } as SlideCanvasData);
    onChangeRef.current?.(json);
  }, [slides, blocks]);




  useEffect(() => {
    if (slides.length === 0) return;
    const lastSlide = slides[slides.length - 1];
    const lastSlideHasBlocks = blocks.some(b => b.slideId === lastSlide.slideId);

    if (lastSlideHasBlocks) {
      const newSlide = createSlide(slides.length);
      // Skip onChange for this auto-generated slide — it's not a user edit
      skipNextOnChangeRef.current = true;
      setSlides(prev => [...prev, newSlide]);
    }
  }, [blocks, slides]);


  const addSlide = useCallback((afterOrder?: number) => {
    setSlides(prev => {
      const insertAt = afterOrder !== undefined ? afterOrder + 1 : prev.length;
      const newSlide = createSlide(insertAt);
      const updated = [...prev];
      updated.splice(insertAt, 0, newSlide);
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const deleteSlide = useCallback((slideId: string) => {
    setSlides(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(s => s.slideId !== slideId).map((s, i) => ({ ...s, order: i }));
    });
    setBlocks(prev => prev.filter(b => b.slideId !== slideId));
  }, []);

  const reorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    setSlides(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const updateSlide = useCallback((slideId: string, updates: Partial<SlideData>) => {
    setSlides(prev => prev.map(s => s.slideId === slideId ? { ...s, ...updates } : s));
  }, []);

  const addBlock = useCallback((slideId: string, type: SlideBlockData['type'], x?: number, y?: number) => {
    const defaults: Record<string, Partial<SlideBlockData>> = {
      text: { width: 300, height: 'auto', content: '' },
      code: { width: 450, height: 300, content: '// Start typing your code...\n' },
      image: { width: 300, height: 'auto', content: '' },
      embed: { width: 300, height: 160, content: '' },
    };
    const d = defaults[type] || defaults.text;



    let finalY = y;
    if (finalY === undefined) {
      finalY = 40; // Default slightly below the true padding edge
      if (type === 'text') {
        const offset = -19;
        finalY = Math.round((finalY - offset) / GUIDE_LINE_SPACING) * GUIDE_LINE_SPACING + offset;
      }
    }

    const newBlock: SlideBlockData = {
      blockId: uuidv4(),
      slideId,
      type,
      content: d.content || '',
      x: x ?? 40,
      y: finalY,
      width: d.width || 300,
      height: d.height || 'auto',
    };

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.blockId);
    return newBlock.blockId;
  }, []);

  const updateBlock = useCallback((blockId: string, updates: Partial<SlideBlockData>) => {
    setBlocks(prev => prev.map(b => b.blockId === blockId ? { ...b, ...updates } : b));
  }, []);

  const shiftBlocksY = useCallback((slideId: string, deltaY: number) => {
    if (deltaY === 0) return;
    setBlocks(prev => prev.map(b => 
      b.slideId === slideId ? { ...b, y: Math.max(0, b.y + deltaY) } : b
    ));
  }, []);

  const deleteBlock = useCallback((blockId: string) => {

    setBlocks(prev => {
      const block = prev.find(b => b.blockId === blockId);
      if (block?.type === 'image' && block.imageId) {
        slideImageStorage.deleteImage(block.imageId).catch(err =>
          console.error(`[useSlideState] Failed to delete image ${block.imageId}:`, err)
        );
        // Revoke blob URL if it exists
        if (block.url?.startsWith('blob:')) {
          URL.revokeObjectURL(block.url);
        }
      }
      return prev.filter(b => b.blockId !== blockId);
    });
    setSelectedBlockId(prev => prev === blockId ? null : prev);

    setSlides(prev => prev.map(s => ({
      ...s,
      connections: s.connections.filter(c => c.fromBlock !== blockId && c.toBlock !== blockId),
    })));
  }, []);


  const getConnectionsForSlide = useCallback((slideId: string): Connection[] => {
    const slide = slides.find(s => s.slideId === slideId);
    return slide?.connections || [];
  }, [slides]);

  const setConnectionsForSlide = useCallback((slideId: string, connections: Connection[]) => {
    setSlides(prev => prev.map(s =>
      s.slideId === slideId ? { ...s, connections } : s
    ));
  }, []);


  const getBlocksForSlide = useCallback((slideId: string) => {
    return blocks.filter(b => b.slideId === slideId);
  }, [blocks]);

  return {
    slides,
    blocks,
    activeSlideId,
    selectedBlockId,
    selectedConnectionId,
    setActiveSlideId,
    setSelectedBlockId,
    setSelectedConnectionId,
    setBlocks,
    
    hydrate,

    addSlide,
    deleteSlide,
    reorderSlides,
    updateSlide,

    addBlock,
    updateBlock,
    deleteBlock,
    shiftBlocksY,
    getBlocksForSlide,

    getConnectionsForSlide,
    setConnectionsForSlide,

    addImageBlock: useCallback(async (slideId: string, file: File, x: number = 40, y: number = 40) => {
      const imageId = uuidv4();
      try {
        await slideImageStorage.storeImage(imageId, file);
      } catch (err) {
        console.error('[useSlideState] Failed to store image:', err);
        return null;
      }
      const blobUrl = URL.createObjectURL(file);
      const blockId = uuidv4();
      const newBlock: SlideBlockData = {
        blockId,
        slideId,
        type: 'image',
        content: '',
        url: blobUrl,
        imageId,
        isUploaded: false,
        x,
        y,
        width: 400,
        height: 'auto',
      };
      setBlocks(prev => [...prev, newBlock]);
      setSelectedBlockId(blockId);
      return blockId;
    }, []),
  };
}
