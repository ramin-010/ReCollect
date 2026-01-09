'use client';

import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ExternalLink, Youtube, Twitter, X, Play } from 'lucide-react';
import { extractYouTubeId, getHostname, EmbedType } from '@/lib/utils/embedUtils';

interface EmbedNodeAttrs {
  url: string;
  embedType: EmbedType;
  width: string;
}

export function EmbedNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { url, embedType, width: initialWidth } = node.attrs as EmbedNodeAttrs;
  
  const [width, setWidth] = useState<string | number>(initialWidth || '100%');
  const [resizing, setResizing] = useState(false);
  
  const resizeRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setWidth(node.attrs.width || '100%');
  }, [node.attrs.width]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizing(true);
    startX.current = e.clientX;
    
    if (resizeRef.current) {
      startWidth.current = resizeRef.current.offsetWidth;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizeRef.current) return;
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    rafRef.current = requestAnimationFrame(() => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(200, startWidth.current + diff);
      if (resizeRef.current) {
        resizeRef.current.style.width = `${newWidth}px`;
      }
    });
  };

  const onMouseUp = () => {
    setResizing(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    if (resizeRef.current) {
      const finalWidth = resizeRef.current.style.width;
      setWidth(finalWidth);
      updateAttributes({ width: finalWidth });
    }
  };

  const isSelectedOrResizing = selected || resizing;

  // YouTube Embed - use thumbnail during resize for smooth performance
  if (embedType === 'youtube') {
    const videoId = extractYouTubeId(url);
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    
    return (
      <NodeViewWrapper className="flex justify-start my-4 relative group" style={{ overflow: 'visible', lineHeight: 0 }}>
        <div 
          ref={resizeRef}
          className={`relative flex ${isSelectedOrResizing ? 'ring-2 ring-blue-500/50' : ''}`}
          style={{ width, maxWidth: '100%', height: 'auto' }}
        >
          <div className="w-full bg-zinc-900 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-800/50 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                <span className="text-xs text-zinc-400 truncate max-w-[200px]">{getHostname(url)}</span>
              </div>
              <div className="flex items-center gap-1">
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-white/10 rounded"
                  contentEditable={false}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
                <button 
                  onClick={deleteNode}
                  className="p-1 hover:bg-red-500/20 rounded"
                  contentEditable={false}
                >
                  <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                </button>
              </div>
            </div>
            
            {/* Video or Thumbnail */}
            <div className="aspect-video relative">
              {resizing && thumbnailUrl ? (
                // During resize: show static thumbnail (smooth!)
                <div className="w-full h-full relative">
                  <img 
                    src={thumbnailUrl} 
                    alt="Video thumbnail"
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
              ) : videoId ? (
                // Normal: show iframe
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="border-0"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                  Invalid YouTube URL
                </div>
              )}
            </div>
          </div>
          
          {/* Resize handles */}
          <div className={`absolute inset-0 pointer-events-none ${isSelectedOrResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <div
              onMouseDown={onMouseDown}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-12 bg-white rounded-full shadow-md border border-gray-200 cursor-ew-resize pointer-events-auto hover:scale-110 flex items-center justify-center z-50"
            >
              <div className="w-1 h-4 bg-gray-300 rounded-full" />
            </div>
            <div
              onMouseDown={onMouseDown}
              className="absolute -right-3 -bottom-3 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 cursor-nwse-resize pointer-events-auto hover:scale-110 z-50 flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Twitter/X Embed
  if (embedType === 'twitter') {
    return (
      <NodeViewWrapper className="flex justify-start my-4 relative group" style={{ overflow: 'visible', lineHeight: 0 }}>
        <div
          ref={resizeRef}
          className={`relative flex ${isSelectedOrResizing ? 'ring-2 ring-blue-500/50' : ''}`}
          style={{ width, maxWidth: '100%', height: 'auto' }}
        >
          <div className="w-full bg-zinc-900 rounded-xl overflow-hidden border border-white/10 hover:border-white/20">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:bg-zinc-800/80"
              contentEditable={false}
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-sky-500/10">
                    <Twitter className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Twitter / X Post</div>
                    <div className="text-xs text-zinc-500 truncate max-w-[300px]">{url}</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500" />
              </div>
            </a>
            <button 
              onClick={deleteNode}
              className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100"
              contentEditable={false}
            >
              <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
            </button>
          </div>
          
          {/* Resize handles */}
          <div className={`absolute inset-0 pointer-events-none ${isSelectedOrResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <div
              onMouseDown={onMouseDown}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-12 bg-white rounded-full shadow-md border border-gray-200 cursor-ew-resize pointer-events-auto hover:scale-110 flex items-center justify-center z-50"
            >
              <div className="w-1 h-4 bg-gray-300 rounded-full" />
            </div>
            <div
              onMouseDown={onMouseDown}
              className="absolute -right-3 -bottom-3 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 cursor-nwse-resize pointer-events-auto hover:scale-110 z-50 flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Generic Link - Compact Notion-style bookmark
  return (
    <NodeViewWrapper className="my-0.5 relative group" style={{ lineHeight: 'normal' }}>
      <a
        ref={resizeRef as any}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-2.5 py-1 bg-zinc-800/50 hover:bg-zinc-700/50 rounded border border-white/5 hover:border-white/10 transition-colors ${
          selected ? 'ring-1 ring-blue-500/50' : ''
        }`}
        contentEditable={false}
      >
        <ExternalLink className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
        <span className="text-sm text-zinc-300 truncate max-w-[300px]">{getHostname(url)}</span>
      </a>
    </NodeViewWrapper>
  );
}
