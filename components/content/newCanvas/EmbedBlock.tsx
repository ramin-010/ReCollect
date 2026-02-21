'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Globe } from 'lucide-react';

interface EmbedBlockProps {
  url: string;
  className?: string;
}

/** Parse domain & path from URL */
function parseUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      domain: u.hostname.replace(/^www\./, ''),
      path: u.pathname === '/' ? '' : u.pathname,
      protocol: u.protocol,
    };
  } catch {
    return { domain: url, path: '', protocol: 'https:' };
  }
}

/** Detect embed type */
function getEmbedType(url: string): 'youtube' | 'twitter' | 'generic' {
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed/i.test(url)) return 'youtube';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  return 'generic';
}

/** Extract YouTube video ID */
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  return match ? match[1] : null;
}

/** Favicon URL via Google's service */
function getFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/** Get a color accent based on domain name (deterministic) */
function getDomainColor(domain: string): string {
  const colors = [
    'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    'from-purple-500/20 to-purple-600/5 border-purple-500/30',
    'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30',
    'from-amber-500/20 to-amber-600/5 border-amber-500/30',
    'from-rose-500/20 to-rose-600/5 border-rose-500/30',
    'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30',
    'from-indigo-500/20 to-indigo-600/5 border-indigo-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function EmbedBlock({ url, className }: EmbedBlockProps) {
  const type = getEmbedType(url);
  const { domain, path } = parseUrl(url);

  // YouTube Embed
  if (type === 'youtube') {
    const videoId = getYouTubeId(url);
    if (videoId) {
      return (
        <div className={cn("w-full h-full flex flex-col rounded-lg overflow-hidden relative group/embed", className)}>
          {/* Overlay: visible by default to allow drag. Hidden on double-click to enable playback. */}
          {/* The parent SmartBlock uses the outer div as drag handle, so we need this overlay */}
          {/* to prevent iframe from stealing mouse events during drag. */}
          <div 
            className="absolute inset-0 z-10 group-[.embed-interactive]/embed:hidden"
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Toggle the overlay off so user can interact with the iframe
              const parent = (e.currentTarget as HTMLElement).parentElement;
              if (parent) {
                parent.classList.add('embed-interactive');
                // Also hide this overlay div directly
                (e.currentTarget as HTMLElement).style.display = 'none';
              }
            }}
          >
            {/* Play hint */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
              <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full flex-1 min-h-[200px] pointer-events-auto relative z-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
            draggable={false}
          />
        </div>
      );
    }
  }

  // Twitter/X Embed
  if (type === 'twitter') {
    return (
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank');
        }}
        className={cn(
          "block w-full h-full rounded-lg border border-[hsl(var(--border))] overflow-hidden transition-all hover:shadow-lg group cursor-pointer",
          className
        )}
      >
        <div className="bg-gradient-to-br from-sky-500/15 to-transparent p-4 h-full flex flex-col justify-between pointer-events-none">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{domain}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">{url}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-sky-400 group-hover:text-sky-300 transition-colors">
            <ExternalLink className="w-3 h-3" />
            <span>Double-click to view</span>
          </div>
        </div>
      </div>
    );
  }

  // Generic Link Card (Premium Design)
  const domainColor = getDomainColor(domain);

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        window.open(url, '_blank');
      }}
      className={cn(
        "block w-full h-full rounded-lg border overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.01] group cursor-pointer",
        className
      )}
    >
      <div className={cn(
        "h-full flex flex-col bg-gradient-to-br p-4 pointer-events-none",
        domainColor
      )}>
        {/* Top: Favicon + Domain */}
        <div className="flex items-center gap-2.5 mb-3">
          <img 
            src={getFaviconUrl(domain)} 
            alt="" 
            className="w-5 h-5 rounded-sm flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs font-semibold text-[hsl(var(--foreground))]/80 uppercase tracking-wider truncate">
            {domain}
          </span>
        </div>

        {/* Middle: URL path as title-like display */}
        <div className="flex-1 min-h-0">
          {path && (
            <div className="text-sm font-medium text-[hsl(var(--foreground))] leading-snug line-clamp-2 mb-1.5">
              {decodeURIComponent(path.replace(/\//g, ' / ').replace(/-/g, ' ')).trim()}
            </div>
          )}
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1 font-mono">
            {url.length > 60 ? url.slice(0, 60) + '…' : url}
          </div>
        </div>

        {/* Bottom: CTA */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-[hsl(var(--foreground))]/60 group-hover:text-[hsl(var(--foreground))]/80 transition-colors">
          <Globe className="w-3 h-3" />
          <span>Double-click to open</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
