'use client';

import React, { useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ExternalLink, Youtube, Twitter, X, Play, ImageIcon } from 'lucide-react';
import { extractYouTubeId, getHostname } from '@/lib/utils/embedUtils';
import { imageStorage } from '@/lib/storage/imageStorage';
import { MediaItemAttrs } from '@/lib/extensions/MediaItem';

export function MediaItemView({ node, deleteNode, selected, updateAttributes }: NodeViewProps) {
  const attrs = node.attrs as MediaItemAttrs;
  const { itemType, src, url, embedType, imageId } = attrs;
  
  const [hydratedSrc, setHydratedSrc] = useState<string | null>(null);

  // Hydrate images from IndexedDB
  useEffect(() => {
    if (itemType === 'image' && imageId && (!src || src.startsWith('blob:'))) {
      (async () => {
        try {
          const blob = await imageStorage.getImage(imageId);
          if (blob) {
            const blobUrl = imageStorage.createObjectURL(blob);
            setHydratedSrc(blobUrl);
            updateAttributes({ src: blobUrl });
          }
        } catch (err) {
          console.error('[MediaItem] Failed to hydrate image:', err);
        }
      })();
    }
    return () => {
      if (hydratedSrc) imageStorage.revokeObjectURL(hydratedSrc);
    };
  }, [imageId]);

  const displaySrc = hydratedSrc || src;

  // Inline styles for 33% width items with gap (3 items fill 100%)
  const itemStyle: React.CSSProperties = {
    display: 'inline-block',
    width: 'calc(33.333% - 8px)', /* 3 items fill 100% minus gap share */
    minWidth: '150px',
    maxWidth: 'none', /* Remove max-width so it can fill */
    marginRight: '12px',
    marginBottom: '8px',
    verticalAlign: 'top',
  };

  // Base wrapper class
  const wrapperClass = `relative group/item ${selected ? 'ring-2 ring-blue-500' : ''}`;

  // Delete button overlay
  const DeleteButton = (
    <button
      onClick={(e) => { e.stopPropagation(); deleteNode(); }}
      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity z-10"
      contentEditable={false}
    >
      <X className="w-3 h-3 text-white" />
    </button>
  );

  // IMAGE
  if (itemType === 'image') {
    return (
      <NodeViewWrapper as="span" className={wrapperClass} style={itemStyle}>
        {displaySrc ? (
          <img
            src={displaySrc}
            alt=""
            className="w-full h-auto rounded-lg object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-32 bg-zinc-800 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
          </div>
        )}
        {DeleteButton}
      </NodeViewWrapper>
    );
  }

  // YOUTUBE EMBED
  if (itemType === 'embed' && embedType === 'youtube') {
    const videoId = extractYouTubeId(url || '');
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    
    return (
      <NodeViewWrapper as="span" className={wrapperClass} style={itemStyle}>
        <div className="w-full bg-zinc-900 rounded-lg overflow-hidden">
          <div className="aspect-video relative">
            {thumbnailUrl ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={thumbnailUrl} alt="YouTube" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/item:bg-black/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </a>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500">
                <Youtube className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="px-2 py-1.5 flex items-center gap-1.5 bg-zinc-800/50">
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs text-zinc-400 truncate">{getHostname(url || '')}</span>
          </div>
        </div>
        {DeleteButton}
      </NodeViewWrapper>
    );
  }

  // TWITTER EMBED
  if (itemType === 'embed' && embedType === 'twitter') {
    return (
      <NodeViewWrapper as="span" className={wrapperClass} style={itemStyle}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-zinc-900 rounded-lg overflow-hidden border border-white/10 hover:border-white/20"
        >
          <div className="px-3 py-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-sky-500/10">
              <Twitter className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-zinc-300">Twitter / X</div>
              <div className="text-[10px] text-zinc-500 truncate">{url}</div>
            </div>
          </div>
        </a>
        {DeleteButton}
      </NodeViewWrapper>
    );
  }

  // GENERIC LINK
  return (
    <NodeViewWrapper as="span" className={wrapperClass} style={itemStyle}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
      >
        <div className="px-3 py-2 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <span className="text-sm text-zinc-300 truncate">{getHostname(url || '')}</span>
        </div>
      </a>
      {DeleteButton}
    </NodeViewWrapper>
  );
}
