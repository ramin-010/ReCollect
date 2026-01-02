'use client';

import { useState, useMemo, useEffect } from 'react';
import { Content } from '@/lib/utils/types';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { contentApi } from '@/lib/api/content';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { MoreVertical, Edit, Trash2, Heart, Archive, Share2, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner'
import { format } from 'date-fns';
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';
import { ShareContentDialog } from './ShareContentDialog';
import { ContentPreviewModal } from './ContentPreviewModal';
import { CanvasPreview } from './CanvasPreview';

interface ContentCardProps {
  content: Content;
  dashboardId: string;
  onEdit?: (content: Content) => void;
}

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

  const safeBody = useMemo(() => {
    if (!content.body || !Array.isArray(content.body)) return [];
    return content.body.filter(b => typeof b === 'object' && b !== null && 'type' in b);
  }, [content.body]);

  const safeTags = useMemo(() => {
    if (!content.tags || !Array.isArray(content.tags)) return [];
    return content.tags.filter(t => typeof t === 'object' && t !== null && 'name' in t);
  }, [content.tags]);


  return (
    <>
      <Card 
        className="group h-full p-3 flex flex-col min-h-[400px] gap-0 overflow-hidden border border-[hsl(var(--border))]/60 bg-[hsl(var(--card-bg))]/50 hover:border-[hsl(var(--brand-primary))]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 ease-out rounded-2xl cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        {/* 1. Canvas Preview (Top) - Tall Hero */}
        <div className="relative">
          <CanvasPreview 
            blocks={safeBody as any[]} 
            connections={(content as any).connections || []}
            containerHeight={280}
            containerWidth={500}
          />

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
        <div className="flex flex-col flex-1 p-5 pl-3 gap-3">
          
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
