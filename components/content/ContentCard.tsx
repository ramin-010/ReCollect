'use client';

import { useState, useMemo, useEffect } from 'react';
import { Content } from '@/lib/utils/types';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { contentApi } from '@/lib/api/content';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Badge } from '@/components/ui-base/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { MoreVertical, Edit, Trash2, Heart, Archive, Link as LinkIcon, Share2, Clock, Globe, Lock, Eye, FileText, AlignLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';
import { ShareContentDialog } from './ShareContentDialog';
import { ContentPreviewModal } from './ContentPreviewModal';

interface ContentCardProps {
  content: Content;
  dashboardId: string;
  onEdit?: (content: Content) => void;
}

interface BlockBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_TEXT_WIDTH = 150;
const DEFAULT_TEXT_HEIGHT = 40;
const DEFAULT_IMAGE_WIDTH = 100;
const DEFAULT_IMAGE_HEIGHT = 100;
const PREVIEW_PADDING = 16;

export function ContentCard({ content, dashboardId, onEdit }: ContentCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateContent = useDashboardStore((state) => state.updateContent);
  const removeContent = useDashboardStore((state) => state.removeContent);

  // Handle Escape key to close preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewOpen) {
        setIsPreviewOpen(false);
      }
    };
    
    if (isPreviewOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPreviewOpen]);

  const handleDoubleClick = () => {
    setIsPreviewOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await contentApi.delete(content._id, dashboardId);
      if (response.success) {
        removeContent(dashboardId, content._id);
        toast.success('Note deleted', { description: 'The note has been deleted successfully.' });
        setIsDeleteOpen(false);
      }
    } catch (error: any) {
      toast.error('Failed to delete', { description: error.response?.data?.message || 'Something went wrong.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const response = await contentApi.update(content._id, { isPinned: !content.isPinned, DashId: dashboardId });
      if (response.success && response.data) {
        updateContent(dashboardId, content._id, { isPinned: !content.isPinned });
        toast.success(content.isPinned ? 'Removed from favorites' : 'Added to favorites', { 
          description: `Note has been ${content.isPinned ? 'removed from' : 'added to'} favorites.` 
        });
      }
    } catch (error: any) {
      toast.error('Failed to update', { description: error.response?.data?.message || 'Something went wrong.' });
    }
  };

  const handleToggleArchive = async () => {
    try {
      const response = await contentApi.update(content._id, { isArchived: !content.isArchived, DashId: dashboardId });
      if (response.success && response.data) {
        updateContent(dashboardId, content._id, { isArchived: !content.isArchived });
        toast.success(content.isArchived ? 'Unarchived' : 'Archived', { 
          description: `Note has been ${content.isArchived ? 'unarchived' : 'archived'}.` 
        });
      }
    } catch (error: any) {
      toast.error('Failed to update', { description: error.response?.data?.message || 'Something went wrong.' });
    }
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const safeBody = useMemo(() => {
    if (!content.body || !Array.isArray(content.body)) return [];
    return content.body.filter(b => typeof b === 'object' && b !== null && 'type' in b);
  }, [content.body]);

  const safeTags = useMemo(() => {
    if (!content.tags || !Array.isArray(content.tags)) return [];
    return content.tags.filter(t => typeof t === 'object' && t !== null && 'name' in t);
  }, [content.tags]);

  const previewData = useMemo(() => {
    if (safeBody.length === 0) return null;

    const blocks = safeBody.filter(b => (b.type === 'text' && b.content) || b.type === 'image');
    if (blocks.length === 0) return null;

    const blockBounds = blocks.map(block => {
      const x = typeof block.x === 'number' ? block.x : parseFloat(block.x as string) || 0;
      const y = typeof block.y === 'number' ? block.y : parseFloat(block.y as string) || 0;
      let w = typeof block.width === 'number' ? block.width : parseFloat(block.width as string) || 0;
      let h = typeof block.height === 'number' ? block.height : parseFloat(block.height as string) || 0;

      if (block.type === 'text') {
        w = w || DEFAULT_TEXT_WIDTH;
        h = h || DEFAULT_TEXT_HEIGHT;
      } else {
        w = w || DEFAULT_IMAGE_WIDTH;
        h = h || DEFAULT_IMAGE_HEIGHT;
      }

      return { x, y, width: w, height: h, block };
    });

    // Calculate bounding box of all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    blockBounds.forEach(({ x, y, width, height }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Preview container dimensions (accounting for padding)
    const previewWidth = 500 - PREVIEW_PADDING * 2;
    const previewHeight = 200 - PREVIEW_PADDING * 1;

    // Calculate scale to fit content width exactly, but don't scale up (max 1.0)
    // User requirement: "take that total widht and decide the size of the blocks so that they can fit inside the fixed canvas preview width"
    // Also: "it should not increase the hiegt and widht of the block if the conent is lesss"
    const scale = contentWidth > 0 ? Math.min(previewWidth / contentWidth, 1) : 1;

    // Calculate scaled dimensions
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;

    // Center offset (Vertical only, horizontal will be 0 if we fit width)
    const offsetX = (previewWidth - scaledWidth) / 2;
    const offsetY = (previewHeight - scaledHeight) / 2;

    // Transform each block
    const transformedBlocks = blockBounds.map(({ x, y, width, height, block }) => ({
      block,
      left: offsetX + (x - minX) * scale,
      top: offsetY + (y - minY) * scale,
      width: width * scale,
      height: height * scale,
    }));

    return { transformedBlocks, scale };
  }, [safeBody]);

  const renderCanvasPreview = () => {
    if (!previewData) {
      return (
        <div className="h-[280px] w-full bg-gradient-to-br from-[hsl(var(--muted))]/30 to-[hsl(var(--muted))]/10 flex flex-col items-center justify-center border-b border-[hsl(var(--border))]/40 group-hover:bg-[hsl(var(--muted))]/20 transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))]/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
            <FileText className="h-6 w-6 text-[hsl(var(--muted-foreground))]/50" />
          </div>
          <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]/50 uppercase tracking-widest">Empty Canvas</span>
        </div>
      );
    }

    const { transformedBlocks, scale } = previewData;

    return (
      <div className="h-[280px] w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/50 dark:to-gray-800/30 relative overflow-hidden border-b border-[hsl(var(--border))]/40 group-hover:shadow-inner transition-all duration-500">
        {/* Subtle dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)',
            backgroundSize: '12px 12px'
          }}
        />

        <div className="absolute inset-0" style={{ padding: PREVIEW_PADDING }}>
          <div className="relative w-full h-full">
            {transformedBlocks.map(({ block, left, top, width, height }, index) => {
              if (block.type === 'text') {
                const baseFontSize = typeof block.fontSize === 'number' ? block.fontSize : parseFloat(block.fontSize as any) || 20;
                const fontSize = Math.max(4, baseFontSize * scale);
                const content = block.content?.trim() || '';
                return (
                  <div
                    key={block._id || index}
                    className="absolute shadow-sm hover:shadow-md transition-shadow duration-300"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      fontSize: `${fontSize}px`,
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <div className="line-clamp-3 backdrop-blur-sm bg-white/80 dark:bg-gray-800/100 text-gray-700 dark:text-gray-300 font-medium rounded-sm p-1 border border-gray-200/30 dark:border-gray-700/30 opacity-90">{stripHtml(content)}</div>
                  </div>
                );
              }

              const hasImage = Boolean(block.url);
              return (
                <div
                  key={block._id || index}
                  className="absolute bg-gray-100/60 dark:bg-gray-700/40 rounded-lg border border-gray-200/80 dark:border-gray-600/80 flex items-center justify-center overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                >
                  {hasImage ? (
                    <img
                      src={block.url!}
                      alt="note preview"
                      className="w-full h-full object-cover opacity-95 hover:opacity-100 transition-opacity duration-300"
                    />
                  ) : (
                    <Eye className="h-4 w-4 text-[hsl(var(--muted-foreground))]/40" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Subtle vignette effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/5 via-transparent to-transparent dark:from-black/20" />

        {/* Item count badge - Floating bottom right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 shadow-sm">
          <div className="w-1 h-1 rounded-full bg-[hsl(var(--brand-primary))]" />
          {safeBody.length} {safeBody.length === 1 ? 'ITEM' : 'ITEMS'}
        </div>
      </div>
    );
  };


  return (
    <>
      <Card 
        className="group h-full flex flex-col min-h-[400px] gap-0 overflow-hidden border border-[hsl(var(--border))]/60 bg-[hsl(var(--card-bg))]/50 hover:border-[hsl(var(--brand-primary))]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ease-out rounded-2xl cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        {/* 1. Canvas Preview (Top) - Tall Hero */}
        <div className="relative">
          {renderCanvasPreview()}

          {/* Action Overlay - Top Right */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-lg border border-white/10 shadow-sm">
                   <MoreVertical className="h-4 w-4" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl border-[hsl(var(--border))] shadow-xl bg-[hsl(var(--popover))]/95 backdrop-blur-sm">
                 {/* Menu Items */}
                 <DropdownMenuItem onClick={() => onEdit?.(content)} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Edit className="mr-2 h-3.5 w-3.5 opacity-70" />Edit Note
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={handleToggleFavorite} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Heart className={`mr-2 h-3.5 w-3.5 opacity-70 ${content.isPinned ? 'fill-current text-[hsl(var(--brand-primary))]' : ''}`} />
                   {content.isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={handleToggleArchive} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Archive className={`mr-2 h-3.5 w-3.5 opacity-70 ${content.isArchived ? 'text-amber-500' : ''}`} />
                   {content.isArchived ? 'Unarchive' : 'Archive'}
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setIsShareOpen(true)} className="rounded-lg text-xs font-medium py-2 cursor-pointer">
                   <Share2 className="mr-2 h-3.5 w-3.5 opacity-70" />Share
                 </DropdownMenuItem>
                 <div className="h-px bg-[hsl(var(--border))]/50 my-1" />
                 <DropdownMenuItem destructive onClick={() => setIsDeleteOpen(true)} className="rounded-lg text-xs font-medium py-2 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-500/10">
                   <Trash2 className="mr-2 h-3.5 w-3.5 opacity-70" />Delete
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
          </div>

          {/* Status Overlay - Top Left */}
          <div className="absolute top-3 left-3 flex gap-1.5 pointer-events-none">
             {content.isPinned && (
               <div className="bg-rose-500/90 text-white p-1 rounded-md shadow-sm backdrop-blur-sm">
                 <Heart className="h-3 w-3 fill-current" />
               </div>
             )}
             {content.isArchived && (
               <div className="bg-amber-500/90 text-white p-1 rounded-md shadow-sm backdrop-blur-sm">
                 <Archive className="h-3 w-3" />
               </div>
             )}
          </div>
        </div>

        {/* 2. Content Body (Clean & Minimal) */}
        <div className="flex flex-col flex-1 p-5 gap-3">
          
          {/* Title Row */}
          <div className="flex items-start justify-between gap-3">
             <h3 className="text-xl font-bold text-[hsl(var(--foreground))] line-clamp-1 group-hover:text-[hsl(var(--brand-primary))] transition-colors duration-300">
               {content.title}
             </h3>
          </div>

          {/* Description */}
          {content.description && (
             <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed font-medium opacity-90">
                {content.description}
             </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer Row: Meta & Tags */}
          <div className="flex items-center justify-between pt-1 gap-2 border-t border-transparent">
             {/* Meta Info */}
             <div className="flex items-center gap-3 text-[11px] font-medium text-[hsl(var(--muted-foreground))] opacity-80">
               <span className="flex items-center gap-1.5">
                 {content.updatedAt ? format(new Date(content.updatedAt), 'MMM d') : 'Just now'}
               </span>
               <span className="text-[hsl(var(--border))]">|</span>
                <span className={`flex items-center gap-1`}>
                   {content.visibility === 'Public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                   {content.visibility}
                 </span>
             </div>

             {/* Minimal Tags */}
             {safeTags.length > 0 && (
               <div className="flex items-center gap-1.5">
                 {safeTags.slice(0, 2).map((tag, index) => (
                   <span key={tag._id || index} className="text-[10px] font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-md">
                     #{tag.name}
                   </span>
                 ))}
                 {safeTags.length > 2 && (
                   <span className="text-[10px] text-[hsl(var(--muted-foreground))]">+{safeTags.length - 2}</span>
                 )}
               </div>
             )}
          </div>
        </div>
      </Card>

      <ShareContentDialog content={content} open={isShareOpen} onOpenChange={setIsShareOpen} />
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Note"
        description={`Are you sure you want to delete "${content.title}"? This action cannot be undone.`}
      />
      <ContentPreviewModal 
        content={content} 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
      />
    </>
  );
}
