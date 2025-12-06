// app/content/[slug]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { shareLinkApi } from '@/lib/api/shareLink';
import { ShareLink } from '@/lib/utils/types';
import { Card, CardContent } from '@/components/ui-base/Card';
import { Badge } from '@/components/ui-base/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui-base/Button';
import {Logo} from "@/components/brand/Logo"
import { 
  Link as LinkIcon, 
  ExternalLink, 
  Clock, 
  Globe, 
  Lock, 
  FileText, 
  Eye,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Canvas constants
const DEFAULT_TEXT_WIDTH = 150;
const DEFAULT_TEXT_HEIGHT = 40;
const DEFAULT_IMAGE_WIDTH = 100;
const DEFAULT_IMAGE_HEIGHT = 100;

export default function SharedContentPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [data, setData] = useState<ShareLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await shareLinkApi.fetchContent(slug);
        if (response.success && response.data) {
          setData(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchContent();
    }
  }, [slug]);

  const handleSaveNote = () => {
    toast.success('Note saved!', { description: 'This feature is coming soon.' });
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-pattern flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.content) {
    return (
      <div className="h-screen bg-pattern flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Content Not Found</h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              {error || 'This link may have expired or been removed.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = data.content;
  const hasLinks = content.links && content.links.length > 0;
  const hasTags = content.tags && content.tags.length > 0;

  return (
    <div className="h-screen bg-pattern flex flex-col p-4 lg:p-6 overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden max-w-5xl w-full mx-auto">
        {/* Header Row */}
        <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold truncate">{content.title}</h1>
              {content.visibility && (
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                  content.visibility === 'Public'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {content.visibility === 'Public' ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                  {content.visibility}
                </span>
              )}
            </div>
            {content.updatedAt && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {format(new Date(content.updatedAt), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleSaveNote}
            leftIcon={<Bookmark className="h-4 w-4" />}
            className="shrink-0 bg-violet-600 hover:bg-violet-700"
          >
            Save
          </Button>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Canvas */}
          <div className="flex-1 p-4 flex flex-col min-w-0">
            {content.description && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3 line-clamp-1">{content.description}</p>
            )}
            <div className="flex-1">
              <CanvasRenderer body={content.body} />
            </div>
          </div>

          {/* Right: Tags & Links Sidebar (only if has content) */}
          {(hasTags || hasLinks) && (
            <div className="w-64 border-l border-[hsl(var(--border))] p-4 shrink-0 flex flex-col gap-4 overflow-hidden">
              {/* Tags */}
              {hasTags && (
                <div>
                  <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {content.tags.slice(0, 6).map((tag: any) => (
                      <Badge key={tag._id} variant="secondary" className="text-[10px] px-2 py-0.5">
                        #{tag.name}
                      </Badge>
                    ))}
                    {content.tags.length > 6 && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        +{content.tags.length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Links */}
              {hasLinks && (
                <div className="flex-1 min-h-0">
                  <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    Links
                  </h3>
                  <div className="space-y-1.5">
                    {content.links.slice(0, 4).map((link: string, index: number) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-[hsl(var(--muted))]/50 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors text-xs"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0 text-[hsl(var(--muted-foreground))]" />
                        <span className="truncate">{new URL(link).hostname}</span>
                      </a>
                    ))}
                    {content.links.length > 4 && (
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        +{content.links.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-[hsl(var(--border))] flex items-center justify-center shrink-0">
          <Logo size="md" className="p-0 m-0" showText={false} />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Shared via <span className="font-medium">Recollect </span>
            
          </span>
          
        </div>
      </Card> 
    </div>
  );
}

// Canvas Renderer
function CanvasRenderer({ body }: { body: any }) {
  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const safeBody = useMemo(() => {
    if (!body || !Array.isArray(body)) return [];
    return body.filter((b: any) => typeof b === 'object' && b !== null && 'type' in b);
  }, [body]);

  const previewData = useMemo(() => {
    if (safeBody.length === 0) return null;

    const blocks = safeBody.filter((b: any) => (b.type === 'text' && b.content) || b.type === 'image');
    if (blocks.length === 0) return null;

    const blockBounds = blocks.map((block: any) => {
      const x = typeof block.x === 'number' ? block.x : parseFloat(block.x) || 0;
      const y = typeof block.y === 'number' ? block.y : parseFloat(block.y) || 0;
      let w = typeof block.width === 'number' ? block.width : parseFloat(block.width) || 0;
      let h = typeof block.height === 'number' ? block.height : parseFloat(block.height) || 0;

      if (block.type === 'text') {
        w = w || DEFAULT_TEXT_WIDTH;
        h = h || DEFAULT_TEXT_HEIGHT;
      } else {
        w = w || DEFAULT_IMAGE_WIDTH;
        h = h || DEFAULT_IMAGE_HEIGHT;
      }

      return { x, y, width: w, height: h, block };
    });

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    blockBounds.forEach(({ x, y, width, height }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    return { blockBounds, minX, minY, contentWidth, contentHeight };
  }, [safeBody]);

  if (!previewData) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-[hsl(var(--muted))]/30 to-[hsl(var(--muted))]/10 rounded-xl flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border))]/60">
        <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))]/40 flex items-center justify-center mb-3">
          <FileText className="h-6 w-6 text-[hsl(var(--muted-foreground))]/50" />
        </div>
        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]/50 uppercase tracking-widest">Empty Canvas</span>
      </div>
    );
  }

  const { blockBounds, minX, minY, contentWidth, contentHeight } = previewData;

  return (
    <div className="h-full w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/50 dark:to-gray-800/30 rounded-xl relative overflow-hidden border border-[hsl(var(--border))]/50">
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)',
          backgroundSize: '10px 10px'
        }}
      />

      {/* SVG with viewBox for auto-scaling */}
      <svg 
        className="w-full h-full"
        viewBox={`0 0 ${contentWidth + 40} ${contentHeight + 40}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform="translate(20, 20)">
          {blockBounds.map(({ x, y, width, height, block }: any, index: number) => {
            const relX = x - minX;
            const relY = y - minY;

            if (block.type === 'text') {
              const fontSize = typeof block.fontSize === 'number' ? block.fontSize : parseFloat(block.fontSize) || 16;
              const content = stripHtml(block.content?.trim() || '');
              
              return (
                <g key={block._id || index}>
                  <rect
                    x={relX}
                    y={relY}
                    width={width}
                    height={height}
                    rx="6"
                    fill="rgba(255,255,255,0.9)"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="1"
                    className="dark:fill-gray-800/90 dark:stroke-gray-700"
                  />
                  <foreignObject x={relX + 8} y={relY + 6} width={width - 16} height={height - 12}>
                    <div 
                      className="text-gray-700 dark:text-gray-300 font-medium leading-snug overflow-hidden"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {content}
                    </div>
                  </foreignObject>
                </g>
              );
            }

            // Image block
            return (
              <g key={block._id || index}>
                <rect
                  x={relX}
                  y={relY}
                  width={width}
                  height={height}
                  rx="6"
                  fill="rgba(240,240,240,0.8)"
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="1"
                  className="dark:fill-gray-700/60 dark:stroke-gray-600"
                />
                {block.url ? (
                  <image
                    href={block.url}
                    x={relX}
                    y={relY}
                    width={width}
                    height={height}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`inset(0 round 6px)`}
                  />
                ) : (
                  <g transform={`translate(${relX + width/2 - 12}, ${relY + height/2 - 12})`}>
                    <Eye className="h-6 w-6 text-gray-400" />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Item count */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5">
        <div className="w-1 h-1 rounded-full bg-violet-500" />
        {safeBody.length} {safeBody.length === 1 ? 'item' : 'items'}
      </div>
    </div>
  );
}