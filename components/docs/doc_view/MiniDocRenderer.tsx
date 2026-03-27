'use client';

import React, { useState, useEffect } from 'react';
import { imageStorage } from '@/lib/storage/imageStorage';
import { yjsStateToJson } from '@/lib/utils/yjsConverter';

// Hydrating image component for previews with pending uploads
const HydratingImage = ({ src, imageId }: { src?: string; imageId?: string }) => {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  
  useEffect(() => {
    // If we have an imageId and src is blob (stale), hydrate from IndexedDB
    if (imageId && (!src || src.startsWith('blob:'))) {
      (async () => {
        try {
          const blob = await imageStorage.getImage(imageId);
          if (blob) {
            const blobUrl = imageStorage.createObjectURL(blob);
            setDisplaySrc(blobUrl);
          }
        } catch (err) {
          console.error(`[HydratingImage] Failed to hydrate ${imageId}:`, err);
        }
      })();
    } else if (src) {
      setDisplaySrc(src);
    }
    
    return () => {
      if (displaySrc && displaySrc.startsWith('blob:')) {
        imageStorage.revokeObjectURL(displaySrc);
      }
    };
  }, [imageId, src]);

  return (
    <div className="h-[150px] w-full bg-[var(--surface-elevated)]/60 rounded-[3px] overflow-hidden relative my-[6px] border border-[var(--border-subtle)]">
      {displaySrc ? (
        <img src={displaySrc} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-[hsl(var(--muted-foreground))]/40 text-[12px] gap-2">
          <span className="animate-pulse">Loading...</span>
        </div>
      )}
    </div>
  );
};

interface MiniDocRendererProps {
  previewState?: string;
  yjsState?: string;
  content?: any;
}

export const MiniDocRenderer = ({ previewState, yjsState, content }: MiniDocRendererProps) => {
  let nodes: any[] = [];
  
  try {
    let json: any = null;
    
    // Prefer yjsState (local, may have recent changes) over previewState (server snapshot)
    if (yjsState) {
      json = yjsStateToJson(yjsState);
    } else if (previewState) {
      json = typeof previewState === 'string' ? JSON.parse(previewState) : previewState;
    } else if (content) {
      json = typeof content === 'string' ? JSON.parse(content) : content;
    }
    
    if (!json) return null;
    nodes = json.content || [];
  } catch (e) {
    return null;
  }

  if (!Array.isArray(nodes) || !nodes.length) {
    return null;
  }

  const getText = (n: any): string => {
    if (!n) return '';
    if (typeof n === 'string') return n;
    if (n.text) return n.text;
    if (n.content && Array.isArray(n.content)) return n.content.map(getText).join('');
    return '';
  };

  const nodesToShow = nodes.slice(0, 8);
  const totalNodes = nodesToShow.filter((n: any) => {
    const text = getText(n);
    return text || n.type === 'image' || n.type === 'codeBlock';
  }).length;

  return (
    <div className="space-y-0.5 bg-transparent select-none font-sans">
      {nodesToShow.map((node: any, i: number) => {
        if (!node) return null;

        const text = getText(node);
        if (!text && node.type !== 'image' && node.type !== 'codeBlock') return null;

        switch (node.type) {
          case 'heading':
            const level = node.attrs?.level || 1;
            const baseHeading = "font-semibold tracking-tight text-[hsl(var(--foreground))]";
            let headingClass = '';
            
            if (level === 1) headingClass = `${baseHeading} text-[14px] pt-0 `;
            else if (level === 2) headingClass = `${baseHeading} text-[13px] pt-0 pb-0`;
            else headingClass = `${baseHeading} text-[12px] pt-0`;
            
            return (
              <h4 key={i} className={`${headingClass} line-clamp-1`}>
                {text}
              </h4>
            );

          case 'paragraph':
            const paragraphClamp =  'line-clamp-3' ;
            return (
              <p 
                key={i} 
                className={`text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))] ${paragraphClamp}`}
              >
                {text}
              </p>
            );

          case 'bulletList':
          case 'orderedList':
            const isOrdered = node.type === 'orderedList';
            return (
              <div key={i} className="my-1 space-y-0.5">
                {node.content?.slice(0, 5).map((li: any, j: number) => (
                  <div key={j} className="flex gap-2 items-start text-[12px] text-[hsl(var(--muted-foreground))]">
                    <span className="opacity-50 min-w-[12px] text-[10px] mt-0.5">
                      {isOrdered ? `${j + 1}.` : '•'}
                    </span>
                    <span className="line-clamp-1 flex-1 leading-relaxed">
                      {getText(li)}
                    </span>
                  </div>
                ))}
              </div>
            );

          case 'taskList':
            return (
              <div key={i} className="my-1 space-y-0.5">
                {node.content?.slice(0, 3).map((li: any, j: number) => {
                  const isChecked = li.attrs?.checked;
                  return (
                    <div key={j} className="flex gap-2 items-center text-[12px]">
                      <div 
                        className={`
                          w-3 h-3 rounded-[3px] border flex-shrink-0 flex items-center justify-center
                          ${isChecked 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-[hsl(var(--border))]'
                          }
                        `}
                      >
                        {isChecked && (
                           <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
                             <path d="M5.5 7.5L7 9L10.5 5.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                        )}
                      </div>
                      <span 
                        className={`
                          line-clamp-1 flex-1 leading-relaxed
                          ${isChecked 
                            ? 'line-through text-[hsl(var(--muted-foreground))] opacity-60' 
                            : 'text-[hsl(var(--muted-foreground))]'
                          }
                        `}
                      >
                        {getText(li)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );

          case 'codeBlock':
            return (
              <div 
                key={i} 
                className="bg-[var(--surface-elevated)] px-3 py-2 rounded-md text-[11px] font-mono text-[hsl(var(--foreground))] line-clamp-2 my-1 border border-[var(--border-subtle)]"
              >
                {text || <span className="opacity-50 italic">Empty code block</span>}
              </div>
            );

          case 'image':
          case 'resizableImage':
            return (
              <HydratingImage 
                key={i} 
                src={node.attrs?.src} 
                imageId={node.attrs?.imageId}
              />
            );

          case 'blockquote':
            return (
              <div 
                key={i} 
                className="border-l-2 border-[hsl(var(--border))] pl-3 py-1 my-1.5 text-[12px] italic text-[hsl(var(--muted-foreground))] line-clamp-3"
              >
                {text}
              </div>
            );

          case 'horizontalRule':
            return (
              <hr 
                key={i} 
                className="border-t border-[hsl(var(--border))] my-2"
              />
            );

          default:
            return (
              <p 
                key={i} 
                className="text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))] line-clamp-1"
              >
                {text}
              </p>
            );
        }
      })}
    </div>
  );
};

export default MiniDocRenderer;
