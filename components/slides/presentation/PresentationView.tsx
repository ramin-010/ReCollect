'use client';

import React, { useEffect, useMemo } from 'react';
import { SlideData, SlideBlockData, SLIDE_GAP } from '../core/types';
import { Connection } from '@/types/canvas';
import { X, Download, Loader2, ChevronLeft } from 'lucide-react';
import { PresentationSlide } from './PresentationSlide';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { useDataChannel, useRoomContext } from '@livekit/components-react';

interface PresentationViewProps {
  slides: SlideData[];
  getBlocksForSlide: (slideId: string) => SlideBlockData[];
  getConnectionsForSlide: (slideId: string) => Connection[];
  onClose?: () => void;
  deckId: string;
  printMode?: boolean;
  isOwner?: boolean;
}

/**
 * Full-screen presentation overlay.
 * Renders a vertically-scrollable list of PresentationSlide components.
 */
export function PresentationView({
  slides,
  getBlocksForSlide,
  getConnectionsForSlide,
  onClose,
  deckId,
  printMode,
  isOwner,
}: PresentationViewProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.order - b.order),
    [slides]
  );

  // ---------------------------------------------------------------------------
  // LiveKit DataChannel: Slide Synchronization
  // ---------------------------------------------------------------------------
  let sendSyncPayload: any = null;
  
  try {
     const room = useRoomContext();
     const { send } = useDataChannel('slide_sync', (msg) => {
        if (isOwner) return; // Owners dictate state, they don't listen to viewers
        try {
           const decoder = new TextDecoder();
           const data = JSON.parse(decoder.decode(msg.payload));
           if (data.type === 'SYNC' && data.slideId) {
              const el = document.getElementById(`presentation-slide-${data.slideId}`);
              if (el) {
                 el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
           }
        } catch(e) {}
     });
     sendSyncPayload = send;
  } catch(e) {
     // Not inside a LiveRoom context (normal presentation mode)
  }

  // Set up IntersectionObserver so the Presenter can broadcast which slide they are looking at
  useEffect(() => {
     if (!isOwner || printMode) return;
     
     const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
           if (entry.isIntersecting) {
              const slideId = entry.target.getAttribute('data-slide-id');
              if (slideId) {
                 try {
                    const encoder = new TextEncoder();
                    const payload = encoder.encode(JSON.stringify({ type: 'SYNC', slideId }));
                    if (sendSyncPayload) {
                       sendSyncPayload(payload, { reliable: true });
                    }
                 } catch(e) {}
              }
           }
        });
     }, {
       root: containerRef.current,
       threshold: 0.5 // Slide must be at least 50% visible to count as "active"
     });

     const slideElements = document.querySelectorAll('.presentation-slide-container');
     slideElements.forEach(el => observer.observe(el));

     return () => observer.disconnect();
  }, [isOwner, printMode, sortedSlides]); // Re-bind if slides array changes


  useEffect(() => {
    // 1) Log when passing data to presentation view
    const allPresentationBlocks = slides.flatMap(s => getBlocksForSlide(s.slideId));
    console.log('[DEBUG 1 - PRESENTATION VIEW] Blocks passed to presentation:', JSON.stringify(allPresentationBlocks, null, 2));
  }, [slides, getBlocksForSlide]);

  const handleExport = async () => {
    toast.info('Comming Soon...')
    return;  //export feature is in progress !
    if (!deckId) {
      toast.error('Please save the deck to the cloud first before exporting.');
      return;
    }
    try {
      setIsExporting(true);
      toast.info('Generating PDF... This may take a few seconds.');
      
      const response = await axiosInstance.get(`/api/slides/${deckId}/export`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presentation-${deckId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Escape to close
  useEffect(() => {
    if (printMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, printMode]);

  return (
    <div className="fixed inset-0 z-[1000] bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))] flex flex-col overflow-hidden">
      {/* Header Bar - Sleek Simple Style matching SlideEditor */}
      {!printMode && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 border-b border-[hsl(var(--divider))]/40 bg-[hsl(var(--sidebar-bg))] backdrop-blur-sm pointer-events-auto transition-opacity duration-300 opacity-0 hover:opacity-100">
          {/* Left Section */}
          <div className="flex items-center gap-3 w-1/3">
            <button
              onClick={onClose}
              className="group flex items-center gap-1.5 h-8 px-3 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/5 border border-transparent hover:border-[hsl(var(--border))]/40 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="text-xs font-semibold tracking-wide">Back</span>
            </button>
            <div className="w-[1px] h-4 bg-[hsl(var(--divider))]" />
            <div className="flex items-center gap-2 max-w-[250px] group px-2">
              <span className="text-md font-medium text-[hsl(var(--foreground))] truncate cursor-default">
                Presentation Mode
              </span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-none">
                ({slides.length} slides)
              </span>
            </div>
          </div>

          {/* Right Section */}
          {/* <div className="flex-1 flex items-center justify-end gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/5 border border-transparent hover:border-[hsl(var(--border))]/40 transition-all duration-200 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="text-xs font-semibold tracking-wide">Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/5 border border-transparent hover:border-[hsl(var(--border))]/40 transition-all duration-200"
            >
              <X className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide">Exit</span>
            </button>
          </div> */}
        </div>
      )}

      {/* Scrollable slide list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-[hsl(var(--background))] dark:bg-[hsl(var(--background))]"
        style={{ scrollSnapType: 'y proximity' }}
      >
        <div className="flex flex-col w-full" style={{ gap: SLIDE_GAP }}>
          {sortedSlides.map(slide => {
            const slideBlocks = getBlocksForSlide(slide.slideId);
            const slideConnections = getConnectionsForSlide(slide.slideId);

            return (
              <div
                key={slide.slideId}
                id={`presentation-slide-${slide.slideId}`}
                data-slide-id={slide.slideId}
                className="w-full shrink-0 presentation-slide-container"
                style={{ scrollSnapAlign: 'start' }}
              >
                <PresentationSlide
                  slideId={slide.slideId}
                  blocks={slideBlocks}
                  connections={slideConnections}
                  backgroundColor={slide.backgroundColor}
                  title={slide.title}
                  showTitle={slide.showTitle}
                  coverImage={slide.coverImage}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
