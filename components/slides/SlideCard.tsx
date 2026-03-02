'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Download, MoreVertical, Copy, Trash2, Heart, Play, Presentation, Pin, PinOff, Sparkles, CloudOff, FileText, Layers } from 'lucide-react';
import { SlideDeck } from './editor/useSlidePersistence';
import { MiniSlideRenderer } from './rendering/MiniSlideRenderer';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { format } from 'date-fns';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';

interface SlideCardProps {
  deck: SlideDeck & { isPinned?: boolean; deckType?: string };
  index: number;
  onOpen: (deck: SlideDeck) => void;
  onDelete: (deckId: string) => void;
  onPresent: (deck: SlideDeck) => void;
  onTogglePin?: (deckId: string, e: React.MouseEvent) => void;
  onChangeDeckType?: (deckId: string, type: string, e: React.MouseEvent) => void;
  onRenameDeck?: (deckId: string, name: string) => void;
}

export const SlideCard = ({ deck, onOpen, onDelete, onPresent, onTogglePin, onChangeDeckType, onRenameDeck }: SlideCardProps) => {

  // Parse content to get accurate block counts and preview
  const previewData = useMemo(() => {
    try {
      if (!deck.content) return { slide: null, blocks: [], connections: [], slideCount: 0 };
      const parsed = JSON.parse(deck.content);
      const slides = parsed.slides || [];
      const blocks = parsed.blocks || [];
      const allConnections = parsed.slides?.flatMap((s: any) => s.connections || []) || [];
      
      const firstSlide = slides.sort((a: any, b: any) => a.order - b.order)[0] || null;
      const firstSlideBlocks = firstSlide 
        ? blocks.filter((b: any) => b.slideId === firstSlide.slideId)
        : [];
      
      const firstSlideBlockIds = new Set(firstSlideBlocks.map((b: any) => b.blockId));
      const firstSlideConnections = allConnections.filter(
        (c: any) => firstSlideBlockIds.has(c.fromBlock) || firstSlideBlockIds.has(c.toBlock)
      );

      return {
        slide: firstSlide,
        blocks: firstSlideBlocks,
        connections: firstSlideConnections,
        slideCount: slides.length || (blocks.length > 0 ? 1 : 0),
      };
    } catch {
      return { slide: null, blocks: [], connections: [], slideCount: 0 };
    }
  }, [deck.content]);

  // ---- Inline Editing Logic ----
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(deck.name || 'Untitled Presentation');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleInput(deck.name || 'Untitled Presentation');
    }
  }, [deck.name, isEditingTitle]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleTitleSubmit = () => {
    if (titleInput.trim() !== deck.name && onRenameDeck) {
      onRenameDeck(deck.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <Card 
      className="group h-full p-3 flex flex-col min-h-[400px] gap-0 overflow-hidden border border-[hsl(var(--border))]/60 bg-[hsl(var(--card-bg))]/50  hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ease-out rounded-2xl"
    >
      <div 
        className="relative h-[250px] w-full rounded-xl overflow-hidden bg-[hsl(var(--muted))] border border-white/5 shadow-inner cursor-pointer"
        onClick={() => onOpen(deck)}
      >
        <MiniSlideRenderer slide={previewData.slide} blocks={previewData.blocks} connections={previewData.connections} />

        {/* Pinned Indicator - Top Left */}
        {deck.isPinned && (
          <div className="absolute top-3 left-3 z-20">
              <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 p-1.5 rounded-full shadow-sm">
                 <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </div>
          </div>
        )}

        {/* Action Overlay - Top Right mirroring ContentCard */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
           <div className="flex items-center gap-1">
             {onTogglePin && (
               <button
                  onClick={(e) => onTogglePin(deck.id, e)}
                  className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-colors shadow-sm ring-1 ring-black/5"
                  title={deck.isPinned ? 'Unpin' : 'Pin'}
               >
                 {deck.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5 " />}
               </button>
             )}
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-colors shadow-sm ring-1 ring-black/5">
                   <MoreVertical className="h-3.5 w-3.5" />
                 </button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl border-[hsl(var(--border))] shadow-xl bg-[hsl(var(--popover))]/95 backdrop-blur-sm">
                 {/* Menu Items */}
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPresent(deck); }} className="rounded-lg text-xs font-medium py-2 cursor-pointer text-amber-500">
                   <Play className="mr-2 h-3.5 w-3.5 opacity-70 fill-current" />Present Slide
                 </DropdownMenuItem>
                 <div className="h-px bg-[hsl(var(--border))]/50 my-1" />
                 <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Copy className="mr-2 h-3.5 w-3.5 opacity-70" />Duplicate
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Download className="mr-2 h-3.5 w-3.5 opacity-70" />Export JSON
                 </DropdownMenuItem>
                 <div className="h-px bg-[hsl(var(--border))]/50 my-1" />
                 <DropdownMenuItem 
                   onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }} 
                   className="rounded-lg text-xs font-medium py-2 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-500/10"
                 >
                   <Trash2 className="mr-2 h-3.5 w-3.5 opacity-70" />Delete Deck
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
        </div>
      </div>

      {/* 2. Content Body (Clean & Minimal) matching ContentCard exactly */}
      <div className="flex flex-col flex-1 p-4 px-4 gap-2">
        
        {/* Title Row */}
        <div className="flex items-start justify-between gap-3 mb-1">
           {!isEditingTitle ? (
             <h3 
               className="text-[18px] font-bold text-[hsl(var(--foreground))] line-clamp-1 group-hover:text-[hsl(var(--brand-primary))] transition-colors duration-300 tracking-tight leading-tight cursor-text"
               onClick={(e) => {
                 e.stopPropagation();
                 handleStartEdit(e);
               }}
               title="Click to edit"
             >
               {deck.name || 'Untitled Presentation'}
             </h3>
           ) : (
             <input
               ref={inputRef}
               type="text"
               value={titleInput}
               onChange={(e) => setTitleInput(e.target.value)}
               onBlur={handleTitleSubmit}
               onKeyDown={handleKeyDown}
               onClick={(e) => e.stopPropagation()}
               className="text-[18px] font-bold bg-transparent border-b border-amber-500 focus:outline-none w-full text-[hsl(var(--foreground))] p-0 leading-tight"
               autoFocus
             />
           )}
        </div>

        {/* Spacer to push footer to bottom */}
        <div className="flex-1" />

        {/* Footer Row: Meta & Tags & Slide Count */}
        <div className="flex items-center justify-between pt-2 gap-2 border-t border-[hsl(var(--border))]/30 mt-auto">
           {/* Left side: Date + Sync + Slide Count */}
           <div className="flex items-center gap-3 text-[11px] font-medium text-[hsl(var(--muted-foreground))] opacity-80">
             <span className="flex items-center gap-1.5">
               {deck.updatedAt ? format(new Date(deck.updatedAt), 'MMM d') : 'Just now'}

               {/* Cloud Unsync Indicator */}
               {deck.syncStatus === 'pending' && (
                 <span className="pl-0.5" title="Changes not synced to cloud">
                   <CloudOff className="w-3.5 h-3.5 text-rose-600 dark:text-blue-400" />
                 </span>
               )}
             </span>
             
             <div className="w-1 h-1 rounded-full bg-[hsl(var(--muted-foreground))]/40" />

             {/* Description / Subtitle (Slide count) */}
             <div className="flex items-center gap-1.5 opacity-90">
                <Layers className="w-3.5 h-3.5" /> 
                <span>{previewData.slideCount} {previewData.slideCount === 1 ? 'slide' : 'slides'}</span>
             </div>
           </div>

           {/* Right side: Doc Type Badge */}
           <div className="flex items-center gap-1.5 ml-auto" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-opacity-10 backdrop-blur-sm cursor-pointer hover:bg-opacity-20 transition-all
                      ${deck.deckType === 'meeting' ? 'bg-violet-500 border-violet-500/20 text-violet-600 dark:text-white' :
                        deck.deckType === 'project' ? 'bg-emerald-500 border-emerald-500/20 text-emerald-600 dark:text-white' :
                        deck.deckType === 'personal' ? 'bg-amber-500 border-amber-500/20 text-amber-600 dark:text-white' :
                        'bg-blue-500 border-blue-500/20 text-blue-600 dark:text-white'
                      }`}>
                     {deck.deckType === 'meeting' ? 'Meeting' :
                      deck.deckType === 'project' ? 'Project' :
                      deck.deckType === 'personal' ? 'Personal' : 'Presentation'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'presentation', e)}>
                    <Presentation className="w-3.5 h-3.5 mr-2 text-blue-500" /> Presentation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'meeting', e)}>
                    <Presentation className="w-3.5 h-3.5 mr-2 text-violet-500" /> Meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'project', e)}>
                    <Presentation className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'personal', e)}>
                    <Presentation className="w-3.5 h-3.5 mr-2 text-amber-500" /> Personal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </div>
      </div>
    </Card>
  );
};
