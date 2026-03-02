'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { PresentationView } from '@/components/slides/presentation/PresentationView';
import { Loader2 } from 'lucide-react';
import { SlideCanvasData } from '@/components/slides/core/types';

interface SharedSlideData {
  _id: string;
  name: string;
  content: string; // JSON string of SlideCanvasData
  previewContent?: string;
  deckType: string;
  isPinned: boolean;
  cloudImages: any[];
  updatedAt: string;
  createdAt: string;
}

export default function SharedSlidePage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [slideDeck, setSlideDeck] = useState<SharedSlideData | null>(null);
  const [parsedData, setParsedData] = useState<SlideCanvasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchSlide = async () => {
      try {
        setLoading(true);
        // Direct axios call to avoid auth interceptors, as this is a public page
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8002';
        const response = await axios.get(`${baseUrl}/api/slide/${slug}`);
        
        if (response.data.success) {
          // Schema populates the 'slide' field in the share metadata
          const deck = response.data.data.slide;
          setSlideDeck(deck);
          
          try {
            if (deck.content) {
              setParsedData(JSON.parse(deck.content));
            } else {
              setParsedData({ slides: [], blocks: [] });
            }
          } catch(e) {
            console.error("Failed to parse slide content", e);
            setParsedData({ slides: [], blocks: [] });
          }
        } else {
          setError('Failed to load slide deck');
        }
      } catch (err) {
        console.error("Error fetching shared slide:", err);
        setError('Slide deck not found or link expired');
      } finally {
        setLoading(false);
      }
    };

    fetchSlide();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p>Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (error || !slideDeck || !parsedData) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">Oops!</h1>
          <p className="text-[hsl(var(--muted-foreground))]">{error || 'Something went wrong while loading this presentation.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[hsl(var(--background))]">
       <PresentationView 
          deckId={slideDeck._id}
          isOwner={false}
          onClose={() => {}} // No close action on standalone page
          slides={parsedData.slides || []}
          getBlocksForSlide={(id) => parsedData.blocks?.filter(b => b.slideId === id) || []}
          getConnectionsForSlide={(id) => parsedData.slides?.find(s => s.slideId === id)?.connections || []}
       />
    </div>
  );
}
