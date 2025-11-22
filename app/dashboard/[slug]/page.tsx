// app/dashboard/[slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shareLinkApi } from '@/lib/api/shareLink';
import { ShareLink } from '@/lib/utils/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui-base/Card';
import { Badge } from '@/components/ui-base/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Link as LinkIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function SharedDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [data, setData] = useState<ShareLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        console.log("fetching dash", slug)
        const response = await shareLinkApi.fetchDashboard(slug);
        console.log("dash : ",response.data)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pattern p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.dashboard) {
    return (
      <div className="min-h-screen bg-pattern flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
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
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="min-h-screen bg-pattern p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="text-[hsl(var(--muted-foreground))]">{dashboard.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {dashboard.contents?.length || 0} notes
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {dashboard?.createdAt ? format(new Date(dashboard.createdAt), 'PPP') : 'N/A'}
            </span>
          </div>
        </div>

        {!dashboard.contents || dashboard.contents.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-16 w-16 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
              <p className="text-[hsl(var(--muted-foreground))]">
                This dashboard doesn't have any notes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboard.contents.map((content) => (
              <Card key={content._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{content.title}</CardTitle>
                  {content.body && (
                    <CardDescription className="line-clamp-3">
                      {stripHtml(content.body)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {content.tags && content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {content.tags.map((tag) => (
                        <Badge key={tag._id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {content.links && content.links.length > 0 && (
                    <div className="flex items-center text-sm text-[hsl(var(--muted-foreground))]">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      <span>{content.links.length} link{content.links.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <p>Shared via Second Brain</p>
        </div>
      </div>
    </div>
  );
}