'use client';

import React, { useEffect, useState, use } from 'react';
import { PresentationView } from '@/components/slides/presentation/PresentationView';
import { SlideData, SlideBlockData, SLIDE_GAP } from '@/components/slides/core/types';
import { parseContent } from '@/components/slides/core/useSlideState';
import { Connection } from '@/types/canvas';
import { slideApi } from '@/lib/api/slideApi';
import { Loader2 } from 'lucide-react';
import { EditorStyles } from '@/components/docs/doc_editor/EditorStyles';

export default function PrintSlideDeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  // In Next.js 15+ App Router, `params` is a Promise and must be unwrapped with React.use()
  const resolvedParams = use(params);
  const deckId = resolvedParams.deckId;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [blocks, setBlocks] = useState<SlideBlockData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    async function fetchDeck() {
      try {
        if (!deckId) return;
        setIsLoading(true);
        const deck = await slideApi.fetchDeck(deckId);
        
        // 3) Log when fetching data from the backend in print route
        console.log('[DEBUG 3 - PRINT ROUTE] Fetched deck from backend:', deck?.content);
        
        if (deck && deck.content) {
          const rawContent = deck.content;
          const parsed = parseContent(rawContent);
          setSlides(parsed.slides);
          setBlocks(parsed.blocks);
          
          const allConnections = parsed.slides.flatMap(s => s.connections || []);
          setConnections(allConnections);
        } else {
          setError('Failed to load presentation or presentation is empty.');
        }
      } catch (err: any) {
        console.error('Print view fetch error:', err);
        setError(err.message || 'Error loading presentation.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchDeck();
  }, [deckId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-gray-500">
        {error || 'No slides found'}
      </div>
    );
  }

  const getBlocksForSlide = (slideId: string) => {
    return blocks.filter((b) => b.slideId === slideId);
  };

  const getConnectionsForSlide = (slideId: string) => {
    const slideBlockIds = new Set(getBlocksForSlide(slideId).map((b) => b.blockId));
    return connections.filter(
      (c: Connection) => slideBlockIds.has(c.fromBlock) || slideBlockIds.has(c.toBlock)
    );
  };

  return (
    <>
      <EditorStyles />
      <div className="notion-editor w-full h-full">
        <PresentationView
          slides={slides}
          getBlocksForSlide={getBlocksForSlide}
          getConnectionsForSlide={getConnectionsForSlide}
          deckId={deckId}
          printMode={true}
        />
      </div>
    </>
  );
}
