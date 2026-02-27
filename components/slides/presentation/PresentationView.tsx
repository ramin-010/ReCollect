'use client';

import React, { useEffect, useMemo } from 'react';
import { SlideData, SlideBlockData, SLIDE_GAP } from '../core/types';
import { Connection } from '@/types/canvas';
import { X, Download, Loader2 } from 'lucide-react';
import { PresentationSlide } from './PresentationSlide';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';

interface PresentationViewProps {
  slides: SlideData[];
  getBlocksForSlide: (slideId: string) => SlideBlockData[];
  getConnectionsForSlide: (slideId: string) => Connection[];
  onClose?: () => void;
  deckId: string;
  printMode?: boolean;
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
}: PresentationViewProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
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

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.order - b.order),
    [slides]
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-[hsl(var(--background))] flex flex-col overflow-hidden">
      {/* Top navbar — visible on hover unless in printMode */}
      {!printMode && (
        <div className="absolute top-0 left-0 right-0 pt-0 pb-4 z-[1010] opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="h-13 bg-[hsl(var(--card-bg))]/90 backdrop-blur-md border-b border-[hsl(var(--border))]/50 flex items-center justify-between px-6 shadow-sm">
            {/* Left: Presentation Info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--brand-primary))]/10 flex items-center justify-center">
                <span className="text-[hsl(var(--brand-primary))] font-semibold text-xs">RM</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[hsl(var(--foreground))] leading-tight">Presentation Mode</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] leading-none mt-0.5">{slides.length} slides</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[hsl(var(--brand-primary))]/90 hover:bg-[hsl(var(--brand-primary))] text-white transition-colors border border-transparent disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="text-sm font-medium">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
              </button>
              <div className="w-px h-6 bg-[hsl(var(--border))]/50 mx-1"></div>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[hsl(var(--muted))]/50 hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] transition-colors border border-[hsl(var(--border))]/50"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable slide list */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth bg-[hsl(var(--background))] dark:bg-black"
        style={{ scrollSnapType: 'y proximity' }}
      >
        <div className="flex flex-col w-full" style={{ gap: SLIDE_GAP }}>
          {sortedSlides.map(slide => {
            const slideBlocks = getBlocksForSlide(slide.slideId);
            const slideConnections = getConnectionsForSlide(slide.slideId);

            return (
              <div
                key={slide.slideId}
                className="w-full shrink-0"
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
