'use client';

import { useState, useMemo } from 'react';
import { Content } from '@/lib/utils/types';
import { useDashboardStore } from '@/lib/store/dashboardStore';
import { contentApi } from '@/lib/api/content';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { Badge } from '@/components/ui-base/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { MoreVertical, Edit, Trash2, Pin, Link as LinkIcon, Share2, Clock, Globe, Lock, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { UpdateContentDialog } from './UpdateContentDialog';
import { DeleteConfirmDialog } from '../shared/DeleteConfirmDialog';
import { ShareContentDialog } from './ShareContentDialog';

interface ContentCardProps {
  content: Content;
  dashboardId: string;
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

export function ContentCard({ content, dashboardId }: ContentCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateContent = useDashboardStore((state) => state.updateContent);
  const removeContent = useDashboardStore((state) => state.removeContent);

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

  const handleTogglePin = async () => {
    try {
      const response = await contentApi.update(content._id, { isPinned: !content.isPinned, DashId: dashboardId });
      if (response.success && response.data) {
        updateContent(dashboardId, content._id, { isPinned: !content.isPinned });
        toast.success(content.isPinned ? 'Unpinned' : 'Pinned', { description: `Note has been ${content.isPinned ? 'unpinned' : 'pinned'}.` });
      }
    } catch (error: any) {
      toast.error('Failed to update', { description: error.response?.data?.message || 'Something went wrong.' });
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const summaryText = () => {
    const textBlocks = content.body?.filter(block => block.type === 'text' && block.content) || [];
    if (textBlocks.length === 0) return 'No preview available yet.';
    return stripHtml(textBlocks[0].content || '').slice(0, 160);
  };

  // Calculate bounding box and scaled positions for all blocks
  const previewData = useMemo(() => {
    if (!content.body || content.body.length === 0) return null;

    const blocks = content.body.filter(b => (b.type === 'text' && b.content) || b.type === 'image');
    if (blocks.length === 0) return null;

    // Get bounds for each block
    const blockBounds: (BlockBounds & { block: typeof blocks[0] })[] = blocks.map(block => {
      const x = typeof block.x === 'number' ? block.x : parseFloat(block.x as string) || 0;
      const y = typeof block.y === 'number' ? block.y : parseFloat(block.y as string) || 0;
      let w = typeof block.width === 'number' ? block.width : parseFloat(block.width as string) || 0;
      let h = typeof block.height === 'number' ? block.height : parseFloat(block.height as string) || 0;

      // Default dimensions based on type
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
    const previewWidth = 400 - PREVIEW_PADDING * 2;
    const previewHeight = 220 - PREVIEW_PADDING * 2;

    // Calculate scale to fit content in preview
    const scaleX = contentWidth > 0 ? previewWidth / contentWidth : 1;
    const scaleY = contentHeight > 0 ? previewHeight / contentHeight : 1;
    const scale = Math.min(scaleX, scaleY, 1.5); // Cap scale at 1.5x to prevent huge single elements

    // Calculate scaled dimensions
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;

    // Center offset
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
  }, [content.body]);

  const renderCanvasPreview = () => {
    if (!previewData) {
      return (
        <div className="min-h-[220px] bg-gradient-to-br from-[#111111] via-[#1a1a1a] to-[#111111]/90 rounded-2xl flex items-center justify-center border border-[hsl(var(--border))] shadow-lg">
          <div className="flex flex-col items-center gap-2 text-white/40">
            <FileText className="h-8 w-8" />
            <span className="text-xs">No content blocks</span>
          </div>
        </div>
      );
    }

    const { transformedBlocks, scale } = previewData;

    return (
      <div className="min-h-[220px] bg-gradient-to-br from-[#111111] via-[#1a1a1a] to-[#111111]/90 rounded-2xl relative overflow-hidden border border-[hsl(var(--border))] shadow-lg">
        {/* Content area with padding */}
        <div className="absolute inset-0" style={{ padding: PREVIEW_PADDING }}>
          <div className="relative w-full h-full">
            {transformedBlocks.map(({ block, left, top, width, height }, index) => {
              if (block.type === 'text') {
                // Scale font size based on overall scale
                const fontSize = Math.max(8, Math.min(14, 12 * scale));
                return (
                  <div
                    key={block._id || index}
                    className="absolute text-white/80 bg-white/10 rounded px-2 py-1 overflow-hidden"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      fontSize: `${fontSize}px`,
                      lineHeight: '1.3',
                    }}
                  >
                    <div className="line-clamp-3">{stripHtml(block.content || '')}</div>
                  </div>
                );
              }

              // Image block
              const hasImage = Boolean(block.url);
              return (
                <div
                  key={block._id || index}
                  className="absolute bg-white/20 rounded border border-white/30 flex items-center justify-center overflow-hidden"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                >
                  {hasImage ? (
                    <img src={block.url!} alt="note preview" className="w-full h-full object-cover" />
                  ) : (
                    <Eye className="h-3 w-3 text-white/60" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Block count indicator */}
        <div className="absolute bottom-2 right-2 text-xs text-white/60 bg-black/30 rounded px-2 py-1">
          {content.body?.length || 0} block{(content.body?.length || 0) !== 1 ? 's' : ''}
        </div>

        {/* Scale indicator for debugging (optional, can remove) */}
        {/* <div className="absolute top-2 left-2 text-[10px] text-white/40">
          {(scale * 100).toFixed(0)}%
        </div> */}
      </div>
    );
  };

  return (
    <>
      <Card className="pro-card hover-lift group h-full flex flex-col min-h-[380px] md:min-h-[460px] gap-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {content.isPinned && (
                  <Pin className="h-4 w-4 text-[hsl(var(--primary))] fill-current shrink-0" />
                )}
                <CardTitle className="text-lg font-semibold truncate">{content.title}</CardTitle>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  content.visibility === 'Public' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {content.visibility === 'Public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  <span>{content.visibility}</span>
                </div>
              </div>
              {content.updatedAt && (
                <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(content.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTogglePin}>
                  <Pin className="mr-2 h-4 w-4" />{content.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />Share
                </DropdownMenuItem>
                <DropdownMenuItem destructive onClick={() => setIsDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <div className="flex flex-col space-y-4">
          <div className="flex-1">{renderCanvasPreview()}</div>
          <div className="space-y-1 mt-auto">
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-3">{summaryText()}</p>
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col space-y-4">
          <div className="space-y-3">
            {content.tags && content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {content.tags.slice(0, 4).map((tag, index) => (
                  <Badge key={tag._id ?? `${tag.name}-${index}`} variant="secondary" className="text-xs">#{tag.name}</Badge>
                ))}
                {content.tags.length > 4 && <Badge variant="secondary" className="text-xs">+{content.tags.length - 4}</Badge>}
              </div>
            )}
            {content.links && content.links.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  <LinkIcon className="h-3 w-3" />
                  <span>{content.links.length} {content.links.length === 1 ? 'link' : 'links'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {content.links.slice(0, 2).map((link, index) => (
                    <a key={index} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 truncate max-w-full block">{link}</a>
                  ))}
                  {content.links.length > 2 && <span className="text-xs text-[hsl(var(--muted-foreground))]">+{content.links.length - 2} more</span>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <UpdateContentDialog
        content={{ ...content, tags: content.tags || [], links: content.links || [] }}
        dashboardId={dashboardId}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
      <ShareContentDialog content={content} open={isShareOpen} onOpenChange={setIsShareOpen} />
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Note"
        description={`Are you sure you want to delete "${content.title}"? This action cannot be undone.`}
      />
    </>
  );
}