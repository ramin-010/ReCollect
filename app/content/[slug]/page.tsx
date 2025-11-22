// app/content/[slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shareLinkApi } from '@/lib/api/shareLink';
import { ShareLink } from '@/lib/utils/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui-base/Card';
import { Badge } from '@/components/ui-base/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link as LinkIcon, ExternalLink, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pattern p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data?.content) {
    return (
      <div className="min-h-screen bg-pattern flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
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
  const createdAt = content.createdAt ? new Date(content.createdAt) : null;
  const formattedCreatedAt =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? format(createdAt, 'PPP')
      : null;

  return (
    <div className="min-h-screen bg-pattern p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
          {formattedCreatedAt && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formattedCreatedAt}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {content.body && (
              <div 
                className="tiptap mb-6"
                dangerouslySetInnerHTML={{ __html: content.body }}
              />
            )}

            {content.tags && content.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag) => (
                    <Badge key={tag._id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {content.links && content.links.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Links
                </h3>
                <div className="space-y-2">
                  {content.links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 bg-[hsl(var(--muted))] rounded-lg hover:bg-[hsl(var(--muted))]/80 transition-colors"
                    >
                      <span className="flex-1 truncate text-sm">{link}</span>
                      <ExternalLink className="h-4 w-4 ml-2 text-[hsl(var(--muted-foreground))]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <p>Shared via Second Brain</p>
        </div>
      </div>
    </div>
  );
}