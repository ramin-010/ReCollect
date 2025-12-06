// app/dashboard/[slug]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { shareLinkApi } from '@/lib/api/shareLink';
import { ShareLink } from '@/lib/utils/types';
import { Card, CardContent } from '@/components/ui-base/Card';
import { Badge } from '@/components/ui-base/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui-base/Button';
import { 
  FileText, 
  Link as LinkIcon, 
  Calendar, 
  Bookmark,
  Sparkles,
  Clock,
  Globe,
  FolderOpen,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Canvas constants
const DEFAULT_TEXT_WIDTH = 150;
const DEFAULT_TEXT_HEIGHT = 40;
const DEFAULT_IMAGE_WIDTH = 100;
const DEFAULT_IMAGE_HEIGHT = 100;

export default function SharedDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [data, setData] = useState<ShareLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await shareLinkApi.fetchDashboard(slug);
        if (response.success && response.data) {
          setData(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchDashboard();
    }
  }, [slug]);

  const handleSaveDashboard = () => {
    toast.success('Dashboard saved!', { description: 'This feature is coming soon.' });
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-pattern flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.dashboard) {
    return (
      <div className="h-screen bg-pattern flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Dashboard Not Found</h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              {error || 'This link may have expired or been removed.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboard = data.dashboard;
  const contents = dashboard.contents?.filter((c: any) => c && c.visibility === 'Public') || [];

  return (
    <div className="h-screen bg-pattern flex flex-col p-4 lg:p-6 overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden max-w-6xl w-full mx-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate">{dashboard.name}</h1>
                <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {contents.length} public {contents.length === 1 ? 'note' : 'notes'}
                  </span>
                  {dashboard.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(dashboard.createdAt), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleSaveDashboard}
            leftIcon={<Bookmark className="h-4 w-4" />}
            className="shrink-0 bg-violet-600 hover:bg-violet-700"
          >
            Save
          </Button>
        </div>

        {/* Description */}
        {dashboard.description && (
          <div className="px-6 py-3 border-b border-[hsl(var(--border))] shrink-0">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{dashboard.description}</p>
          </div>
        )}

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {contents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))]/40 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-[hsl(var(--muted-foreground))]/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Public Notes</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center max-w-sm">
                This dashboard doesn't have any publicly visible notes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contents.map((content: any) => (
                <ContentCard key={content._id} content={content} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-[hsl(var(--border))] flex items-center justify-center gap-2 shrink-0">
          <Sparkles className="h-3 w-3 text-violet-500" />
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Shared via <span className="font-medium">Second Brain</span>
          </span>
        </div>
      </Card>
    </div>
  );
}

// Content Card Component
function ContentCard({ content }: { content: any }) {
  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const safeBody = useMemo(() => {
    if (!content.body || !Array.isArray(content.body)) return [];
    return content.body.filter((b: any) => typeof b === 'object' && b !== null && 'type' in b);
  }, [content.body]);

  const safeTags = useMemo(() => {
    if (!content.tags || !Array.isArray(content.tags)) return [];
    return content.tags.filter((t: any) => typeof t === 'object' && t !== null && 'name' in t);
  }, [content.tags]);

  // Calculate preview data for canvas
  const previewData = useMemo(() => {
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
    
    return { blockBounds, minX, minY, contentWidth: maxX - minX, contentHeight: maxY - minY };
  }, [safeBody]);

  return (
    <Card className="group flex flex-col overflow-hidden hover:shadow-lg transition-all hover:border-violet-500/30">
      {/* Canvas Preview */}
      <div className="h-32 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/50 dark:to-gray-800/30 relative overflow-hidden">
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)',
            backgroundSize: '8px 8px'
          }}
        />
        
        {previewData ? (
          <svg 
            className="w-full h-full"
            viewBox={`0 0 ${previewData.contentWidth + 20} ${previewData.contentHeight + 20}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <g transform="translate(10, 10)">
              {previewData.blockBounds.slice(0, 5).map(({ x, y, width, height, block }: any, index: number) => {
                const relX = x - previewData.minX;
                const relY = y - previewData.minY;

                if (block.type === 'text') {
                  return (
                    <g key={block._id || index}>
                      <rect
                        x={relX}
                        y={relY}
                        width={width}
                        height={height}
                        rx="4"
                        fill="rgba(255,255,255,0.9)"
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth="0.5"
                        className="dark:fill-gray-800/90"
                      />
                    </g>
                  );
                }

                return (
                  <g key={block._id || index}>
                    <rect
                      x={relX}
                      y={relY}
                      width={width}
                      height={height}
                      rx="4"
                      fill="rgba(240,240,240,0.8)"
                      stroke="rgba(0,0,0,0.1)"
                      strokeWidth="0.5"
                      className="dark:fill-gray-700/60"
                    />
                    {block.url && (
                      <image
                        href={block.url}
                        x={relX}
                        y={relY}
                        width={width}
                        height={height}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        ) : (
          <div className="h-full flex items-center justify-center">
            <FileText className="h-8 w-8 text-[hsl(var(--muted-foreground))]/30" />
          </div>
        )}

        {/* Item count */}
        <div className="absolute bottom-2 right-2 text-[9px] font-semibold text-gray-500 bg-white/90 dark:bg-gray-800/90 rounded-full px-1.5 py-0.5">
          {safeBody.length} items
        </div>

        {/* Public badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5">
          <Globe className="h-2.5 w-2.5" />
          Public
        </div>
      </div>

      {/* Content Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold text-sm truncate group-hover:text-violet-500 transition-colors">
          {content.title}
        </h3>

        {content.description && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
            {content.description}
          </p>
        )}

        {/* Tags */}
        {safeTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {safeTags.slice(0, 3).map((tag: any, index: number) => (
              <Badge 
                key={tag._id || index} 
                variant="secondary" 
                className="text-[9px] px-1.5 py-0"
              >
                #{tag.name}
              </Badge>
            ))}
            {safeTags.length > 3 && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                +{safeTags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Links & Date */}
        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
          {content.links && content.links.length > 0 && (
            <span className="flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              {content.links.length} {content.links.length === 1 ? 'link' : 'links'}
            </span>
          )}
          {content.updatedAt && (
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {format(new Date(content.updatedAt), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}