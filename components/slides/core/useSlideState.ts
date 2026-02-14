'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SlideData, SlideBlockData, SlideCanvasData, GUIDE_LINE_SPACING } from './types';
import { Connection } from '@/types/canvas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSlide(order: number): SlideData {
  return { slideId: uuidv4(), order, connections: [] };
}

/** Parse raw JSON into SlideCanvasData */
function parseContent(raw: string | undefined): SlideCanvasData {
  if (!raw) return { slides: [createSlide(0)], blocks: [] };

  try {
    const parsed = JSON.parse(raw);

    // New format: { slides, blocks }
    if (parsed.slides && Array.isArray(parsed.slides)) {
      // Ensure each slide has a connections array
      const slides = parsed.slides.map((s: any) => ({
        ...s,
        connections: s.connections || [],
      }));
      return {
        slides,
        blocks: parsed.blocks || [],
      };
    }

    // Old SmartCanvas format: { blocks, connections } (no slides)
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

    // Array of blocks (legacy flat format)
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
    // Parse error — start fresh
  }

  return { slides: [createSlide(0)], blocks: [] };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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

  // ---- Initialization ----
  useEffect(() => {
    const contentStr = typeof initialContent === 'string' ? initialContent : JSON.stringify(initialContent);
    if (initializedRef.current && contentStr === lastContentRef.current) return;

    const data = parseContent(contentStr);
    setSlides(data.slides);
    setBlocks(data.blocks);
    setActiveSlideId(data.slides[0]?.slideId || null);

    initializedRef.current = true;
    lastContentRef.current = contentStr;
  }, [initialContent]);

  // ---- Autosave (interval-based, ref-driven) ----
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const slidesRef = useRef(slides);
  const blocksRef = useRef(blocks);
  const lastSavedRef = useRef<string>('');

  slidesRef.current = slides;
  blocksRef.current = blocks;

  useEffect(() => {
    const interval = setInterval(() => {
      const data: SlideCanvasData = {
        slides: slidesRef.current,
        blocks: blocksRef.current,
      };
      const json = JSON.stringify(data);
      if (json !== lastSavedRef.current && slidesRef.current.length > 0) {
        onChangeRef.current?.(json);
        lastSavedRef.current = json;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- Auto-slide creation (phantom slide) ----
  useEffect(() => {
    if (slides.length === 0) return;
    const lastSlide = slides[slides.length - 1];
    const lastSlideHasBlocks = blocks.some(b => b.slideId === lastSlide.slideId);

    if (lastSlideHasBlocks) {
      const newSlide = createSlide(slides.length);
      setSlides(prev => [...prev, newSlide]);
    }
  }, [blocks, slides]);

  // ---- Slide Operations ----
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

  // ---- Block Operations ----
  const addBlock = useCallback((slideId: string, type: SlideBlockData['type'], x?: number, y?: number) => {
    const defaults: Record<string, Partial<SlideBlockData>> = {
      text: { width: 300, height: 'auto', content: '' },
      code: { width: 450, height: 300, content: '// Start typing your code...\n' },
      image: { width: 300, height: 'auto', content: '' },
      embed: { width: 350, height: 220, content: '' },
    };
    const d = defaults[type] || defaults.text;

    // If y is provided, use it directly (assume caller handled snapping/offset).
    // If not, use default 40 and apply snap+offset for text.
    let finalY = y;
    if (finalY === undefined) {
      finalY = 40;
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

  const deleteBlock = useCallback((blockId: string) => {
    setBlocks(prev => prev.filter(b => b.blockId !== blockId));
    setSelectedBlockId(prev => prev === blockId ? null : prev);
    // Also remove connections referencing this block
    setSlides(prev => prev.map(s => ({
      ...s,
      connections: s.connections.filter(c => c.fromBlock !== blockId && c.toBlock !== blockId),
    })));
  }, []);

  // ---- Connection Operations (per-slide) ----
  const getConnectionsForSlide = useCallback((slideId: string): Connection[] => {
    const slide = slides.find(s => s.slideId === slideId);
    return slide?.connections || [];
  }, [slides]);

  const setConnectionsForSlide = useCallback((slideId: string, connections: Connection[]) => {
    setSlides(prev => prev.map(s =>
      s.slideId === slideId ? { ...s, connections } : s
    ));
  }, []);

  // ---- Getters ----
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
    // Slide ops
    addSlide,
    deleteSlide,
    reorderSlides,
    // Block ops
    addBlock,
    updateBlock,
    deleteBlock,
    getBlocksForSlide,
    // Connection ops
    getConnectionsForSlide,
    setConnectionsForSlide,
  };
}
