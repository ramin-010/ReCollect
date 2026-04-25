'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Download, MoreVertical, Copy, Trash2, Heart, Play, Files, Pin, PinOff, Sparkles, CloudOff, FileText, Layers, Share2, Loader2 } from 'lucide-react';
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
import { AlertDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from '@/components/ui-base/Dialog';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';

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

  // ---- Share & Delete Modals Logic ----
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    try {
      const serverId = deck.serverId || deck.id;
      if (!serverId || serverId.startsWith('local-')) {
        toast.error('Please save the deck to the cloud first before sharing.');
        return;
      }
      setIsGenerating(true);
      
      const response = await axiosInstance.post('/api/create-slide-link', {
        type: 'slide',
        slideId: serverId,
        role: 'viewer'
      });
      
      if (response.data.success && response.data.data.url) {
        setGeneratedUrl(response.data.data.url);
        await navigator.clipboard.writeText(response.data.data.url);
        toast.success('Share link generated and copied to clipboard!');
      } else {
        toast.error('Failed to generate share link');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      toast.success('Link copied to clipboard!');
    }
  };

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
      className="group h-full p-3 flex flex-col min-h-[300px] gap-0 overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out rounded-2xl cursor-pointer"
    >
      <div 
        className="relative h-[210px] w-full rounded-xl overflow-hidden bg-[var(--surface-inset)] border border-[var(--border-subtle)] cursor-pointer"
        onClick={() => onOpen(deck)}
      >
        <MiniSlideRenderer slide={previewData.slide} blocks={previewData.blocks} connections={previewData.connections} />

        {/* Pinned Indicator - Top Left */}
        {deck.isPinned && (
          <div className="absolute top-1 left-1 z-20">
              <div className="">
                 <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              </div>
          </div>
        )}

        {/* Action Overlay - Top Right mirroring ContentCard */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
           <div className="flex items-center gap-1">
             {onTogglePin && (
               <button
                  onClick={(e) => onTogglePin(deck.id, e)}
                   className="p-1.5 rounded-full bg-[var(--surface-raised)] backdrop-blur-md hover:bg-[var(--surface-overlay)] text-[hsl(var(--foreground))] transition-colors shadow-sm ring-1 ring-[var(--border-subtle)]"
                  title={deck.isPinned ? 'Unpin' : 'Pin'}
               >
                 {deck.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5 " />}
               </button>
             )}
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-full bg-[var(--surface-raised)] backdrop-blur-md hover:bg-[var(--surface-overlay)] text-[hsl(var(--foreground))] transition-colors shadow-sm ring-1 ring-[var(--border-subtle)]">
                   <MoreVertical className="h-3.5 w-3.5" />
                 </button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl border-[hsl(var(--border))] shadow-xl bg-[hsl(var(--popover))]/95 backdrop-blur-sm">
                 {/* Menu Items */}
                 {/* <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPresent(deck); }} className="rounded-lg text-xs font-medium py-2 cursor-pointer text-amber-500">
                   <Play className="mr-2 h-3.5 w-3.5 opacity-70 fill-current" />Present Slide
                 </DropdownMenuItem> */}
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Share2 className="mr-2 h-3.5 w-3.5 opacity-70" />Share
                 </DropdownMenuItem>
                 <div className="h-px bg-[hsl(var(--border))]/50 my-1" />
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast('Export functionality coming soon', { icon: '🚧' }); }} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Download className="mr-2 h-3.5 w-3.5 opacity-70" />Export
                 </DropdownMenuItem>
                 <div className="h-px bg-[hsl(var(--border))]/50 my-1" />
                 <DropdownMenuItem 
                   onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(true); }} 
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
               className="text-[16px] font-bold group-hover:bg-[hsl(var(--foreground))]/5 py-1 px-2 rounded-sm text-[hsl(var(--foreground))] line-clamp-1 transition-colors duration-300 tracking-tight leading-tight cursor-text"
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
           <div className="flex items-center gap-3 text-[11px] font-medium text-[hsl(var(--muted-foreground))]/60">
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
                  <button className={`text-[10px] font-medium px-2 py-0.5 rounded-sm border cursor-pointer hover:opacity-80 transition-all
                      ${deck.deckType === 'meeting' ? 'bg-violet-500/10 border-violet-500/15 text-violet-400' :
                        deck.deckType === 'project' ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' :
                        deck.deckType === 'personal' ? 'bg-amber-500/10 border-amber-500/15 text-amber-400' :
                        'bg-blue-500/10 border-blue-500/15 text-blue-400'
                      }`}>
                     {deck.deckType === 'meeting' ? 'Meeting' :
                      deck.deckType === 'project' ? 'Project' :
                      deck.deckType === 'personal' ? 'Personal' : 'Presentation'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-36 mb-1">
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'presentation', e)}>
                    <Files className="w-3.5 h-3.5 mr-2 text-blue-500" /> Presentation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'meeting', e)}>
                    <Files className="w-3.5 h-3.5 mr-2 text-violet-500" /> Meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'project', e)}>
                    <Files className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => onChangeDeckType?.(deck.id, 'personal', e)}>
                    <Files className="w-3.5 h-3.5 mr-2 text-amber-500" /> Personal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </div>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Slide Deck"
        description={`Are you sure you want to delete "${deck.name || 'Untitled Deck'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          onDelete(deck.id);
          setIsDeleteDialogOpen(false);
        }}
      />

      <Dialog open={isShareOpen} onOpenChange={(open) => { setIsShareOpen(open); if (!open) setGeneratedUrl(null); }}>
        <DialogContent onClose={() => setIsShareOpen(false)} onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              Share "{deck.name || 'Untitled Deck'}"
            </DialogTitle>
            <DialogDescription>
              Generate a public, read-only link to share your presentation. Unauthenticated users can view this link.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {!generatedUrl ? (
              <Button 
                onClick={handleGenerateLink} 
                disabled={isGenerating}
                className="w-full bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Generate Public Link
                  </>
                )}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 max-w-full">
                  <div className="flex-1 px-3 py-2 bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] rounded-md text-sm truncate font-mono text-[hsl(var(--foreground))]">
                    {generatedUrl}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleCopyLink}
                    className="shrink-0"
                    title="Copy Link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setGeneratedUrl(null)}
                  className="text-xs text-[hsl(var(--muted-foreground))]"
                >
                  Reset & Generate New
                </Button>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
