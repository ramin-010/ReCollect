'use client';

import React, { useState, useEffect } from 'react';
import { imageStorage } from '@/lib/storage/imageStorage';

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
    <div className="h-[150px] w-full bg-[rgba(242,241,238,0.6)] dark:bg-[rgba(47,52,55,0.6)] rounded-[3px] overflow-hidden relative my-[6px] border border-[rgba(55,53,47,0.09)] dark:border-[rgba(255,255,255,0.09)]">
      {displaySrc ? (
        <img src={displaySrc} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-[rgba(55,53,47,0.4)] dark:text-[rgba(255,255,255,0.4)] text-[12px] gap-2">
          <span className="animate-pulse">Loading...</span>
        </div>
      )}
    </div>
  );
};

interface MiniDocRendererProps {
  yjsState?: string;
  content?: any;
}

export const MiniDocRenderer = ({ yjsState, content }: MiniDocRendererProps) => {
  let nodes: any[] = [];
  
  try {
    let json: any = null;
    
    // Prefer yjsState if provided
    if (yjsState) {
      const { yjsStateToJson } = require('@/lib/utils/yjsConverter');
      json = yjsStateToJson(yjsState);
    } else if (content) {
      // Fallback to content (for backward compat)
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
    <div className="space-y-[2px] select-none font-[ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] -mt-1">
      {nodesToShow.map((node: any, i: number) => {
        if (!node) return null;

        const text = getText(node);
        if (!text && node.type !== 'image' && node.type !== 'codeBlock') return null;

        switch (node.type) {
          case 'heading':
            const level = node.attrs?.level || 1;
            let headingClass = '';
            
            if (level === 1) {
              headingClass = 'text-[1.55em] leading-[1.2] font-bold mt-[2px] mb-[1px] text-[rgb(55,53,47)] dark:text-[hsl(var(--foreground))]';
            } else if (level === 2) {
              headingClass = 'text-[1.45em] leading-[1.3] font-semibold mt-[2px] mb-[1px] text-[rgb(55,53,47)] dark:text-[hsl(var(--foreground))]';
            } else if (level === 3) {
              headingClass = 'text-[1.25em] leading-[1.3] font-semibold mt-[1px] text-[rgb(55,53,47)] dark:text-[hsl(var(--foreground))]';
            } else {
              headingClass = 'text-[1.125em] leading-[1.4] font-semibold mt-[1px] text-[rgb(55,53,47)] dark:text-[hsl(var(--foreground))]';
            }
            
            return (
              <h4 key={i} className={`${headingClass} line-clamp-1 tracking-[-0.003em] pb-1`}>
                {text}
              </h4>
            );

          case 'paragraph':
            const paragraphClamp = totalNodes <= 2 ? 'line-clamp-6' : totalNodes <= 4 ? 'line-clamp-4' : 'line-clamp-2';
            return (
              <p 
                key={i} 
                className={`text-[12px] leading-[1.5] text-[rgba(55,53,47,0.65)] dark:text-[rgba(255,255,255,0.65)] ${paragraphClamp} tracking-[-0.003em]`}
              >
                {text}
              </p>
            );

          case 'bulletList':
          case 'orderedList':
            const isOrdered = node.type === 'orderedList';
            return (
              <div key={i} className="space-y-[1px] my-[2px]">
                {node.content?.slice(0, 10).map((li: any, j: number) => (
                  <div key={j} className="flex gap-[6px] items-start">
                    <span className="text-[rgba(55,53,47,0.4)] dark:text-[rgba(255,255,255,0.4)] text-[14px] leading-[1.5] mt-[1px] min-w-[16px]">
                      {isOrdered ? `${j + 1}.` : '•'}
                    </span>
                    <span className="text-[14px] leading-[1.5] text-[rgba(55,53,47,0.65)] dark:text-[rgba(255,255,255,0.65)] line-clamp-1 flex-1 tracking-[-0.003em]">
                      {getText(li)}
                    </span>
                  </div>
                ))}
              </div>
            );

          case 'taskList':
            return (
              <div key={i} className="space-y-[2px] my-[2px]">
                {node.content?.slice(0, 3).map((li: any, j: number) => {
                  const isChecked = li.attrs?.checked;
                  return (
                    <div key={j} className="flex gap-[8px] items-center">
                      <div 
                        className={`
                          w-[16px] h-[16px] rounded-[3px] border flex-shrink-0
                          ${isChecked 
                            ? 'bg-[rgb(46,170,220)] border-[rgb(46,170,220)] dark:bg-[rgb(46,170,220)] dark:border-[rgb(46,170,220)]' 
                            : 'border-[rgba(55,53,47,0.16)] dark:border-[rgba(255,255,255,0.16)]'
                          }
                        `}
                      >
                        {isChecked && (
                          <svg className="w-full h-full p-[2px]" viewBox="0 0 14 14" fill="none">
                            <path d="M5.5 7.5L7 9L10.5 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span 
                        className={`
                          text-[14px] leading-[1.5] line-clamp-1 flex-1 tracking-[-0.003em]
                          ${isChecked 
                            ? 'line-through text-[rgba(55,53,47,0.375)] dark:text-[rgba(255,255,255,0.375)]' 
                            : 'text-[rgba(55,53,47,0.65)] dark:text-[rgba(255,255,255,0.65)]'
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
                className="bg-[rgba(242,241,238,0.6)] dark:bg-[rgba(47,52,55,0.6)] px-[12px] py-[9px] rounded-[3px] text-[85%] font-mono text-[rgb(235,87,87)] dark:text-[rgb(255,142,114)] line-clamp-2 my-[4px] border border-[rgba(55,53,47,0.09)] dark:border-[rgba(255,255,255,0.09)]"
              >
                {text || <span className="italic opacity-40 text-[rgba(55,53,47,0.4)] dark:text-[rgba(255,255,255,0.4)]">Empty code block</span>}
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
                className="border-l-[3px] border-[rgb(55,53,47)] dark:border-[rgb(255,255,255)] pl-[14px] my-[4px] text-[14px] leading-[1.5] text-[rgba(55,53,47,0.65)] dark:text-[rgba(255,255,255,0.65)] tracking-[-0.003em]"
              >
                {text}
              </div>
            );

          case 'horizontalRule':
            return (
              <hr 
                key={i} 
                className="border-t border-[rgba(55,53,47,0.09)] dark:border-[rgba(255,255,255,0.09)] my-[6px]"
              />
            );

          default:
            return (
              <p 
                key={i} 
                className="text-[14px] leading-[1.5] text-[rgba(55,53,47,0.65)] dark:text-[rgba(255,255,255,0.65)] line-clamp-1 tracking-[-0.003em]"
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
