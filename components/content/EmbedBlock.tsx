'use client';

import React from 'react';
import { ExternalLink, Youtube, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmbedBlockProps {
  url: string;
  type?: 'youtube' | 'twitter' | 'link';
  title?: string;
  description?: string;
  image?: string;
}

export function EmbedBlock({ url }: { url: string }) {
  const getEmbedType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'link';
  };

  const type = getEmbedType(url);

  if (type === 'youtube') {
    // Extract video ID
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        videoId = match[2];
    }

    return (
      <div className="w-full h-full min-h-[200px] bg-black/5 rounded-lg overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 p-2 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]/50">
           <Youtube className="w-4 h-4 text-red-500" />
           <span className="text-xs truncate text-[hsl(var(--muted-foreground))]">{url}</span>
        </div>
        <div className="flex-1 relative">
           <iframe
             width="100%"
             height="100%"
             src={`https://www.youtube.com/embed/${videoId}`}
             title="YouTube video player"
             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
             className="absolute inset-0"
           />
        </div>
      </div>
    );
  }

  if (type === 'twitter') {
    return (
       <div className="w-full h-full md:min-h-[100px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-[hsl(var(--brand-primary))]/30 transition-colors">
          <div className="flex items-center gap-2 mb-1">
             <Twitter className="w-4 h-4 text-sky-500" />
             <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">Twitter / X</span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[hsl(var(--foreground))] hover:underline line-clamp-3">
             {url}
          </a>
          <div className="mt-auto text-xs text-[hsl(var(--muted-foreground))] opacity-70">
             (Twitter embeds require API key for rich preview, click to view)
          </div>
       </div>
    );
  }

  // Generic Link Card
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block w-full h-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden hover:shadow-md transition-all group hover:border-[hsl(var(--brand-primary))]/50"
    >
        <div className="h-full flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))]">
                       <ExternalLink className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Bookmark</span>
                </div>
            </div>
            
            <div className="mt-3 flex-1">
                 <div className="text-sm font-semibold text-[hsl(var(--foreground))] break-words line-clamp-2">
                    {url}
                 </div>
                 <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate opacity-70">
                    Click to visit website
                 </div>
            </div>
        </div>
    </a>
  );
}
