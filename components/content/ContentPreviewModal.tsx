'use client';

import { Content } from '@/lib/utils/types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Archive, Globe, Lock, Clock, Link as LinkIcon, FileText, Eye, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui-base/Badge';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface ContentPreviewModalProps {
  content: Content | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ContentPreviewModal({ content, isOpen, onClose }: ContentPreviewModalProps) {
  const safeBody = useMemo(() => {
    if (!content?.body || !Array.isArray(content.body)) return [];
    return content.body.filter(b => typeof b === 'object' && b !== null && 'type' in b);
  }, [content?.body]);

  const safeTags = useMemo(() => {
    if (!content?.tags || !Array.isArray(content.tags)) return [];
    return content.tags.filter(t => typeof t === 'object' && t !== null && 'name' in t);
  }, [content?.tags]);

  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Calculate canvas bounds
  const canvasBounds = useMemo(() => {
    if (safeBody.length === 0) return { minX: 0, minY: 0, maxX: 500, maxY: 300, width: 500, height: 300 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    safeBody.forEach((block) => {
      const x = typeof block.x === 'number' ? block.x : parseFloat(block.x as string) || 0;
      const y = typeof block.y === 'number' ? block.y : parseFloat(block.y as string) || 0;
      const w = typeof block.width === 'number' ? block.width : parseFloat(block.width as string) || 100;
      const h = typeof block.height === 'number' ? block.height : parseFloat(block.height as string) || 50;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    // Add some padding
    const padding = 40;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }, [safeBody]);

  if (!content) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="w-full max-w-[85vw] max-h-[95vh] bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))]/20 flex flex-col overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Minimal Header */}
              <div className="flex items-center justify-between p-3 px-5 border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--card))]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {content.isPinned && <Heart className="h-4 w-4 text-[hsl(var(--brand-primary))] fill-current shrink-0" />}
                  {content.isArchived && <Archive className="h-4 w-4 text-amber-500 shrink-0" />}
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))] truncate">{content.title}</h2>
                  
                  {/* Inline badges */}
                  <div className="hidden sm:flex items-center gap-2 ml-4">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      content.visibility === 'Public'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {content.visibility === 'Public' ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                      {content.visibility}
                    </span>
                    {safeTags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5">
                        #{tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] hidden sm:block">
                    Press <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[9px]">Esc</kbd> to close
                  </span>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg bg-[hsl(var(--muted))]/50 hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Canvas Area - THE MAIN FOCUS */}
              <div className="flex-1 overflow-auto bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800" style={{ minHeight: '70vh' }}>
                {safeBody.length > 0 ? (
                  <div 
                    className="relative"
                    style={{
                      minWidth: `${canvasBounds.width}px`,
                      minHeight: `${Math.max(canvasBounds.height, 500)}px`,
                    }}
                  >
                    {/* Subtle grid pattern */}
                    <div
                      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, #888 1px, transparent 1px),
                          linear-gradient(to bottom, #888 1px, transparent 1px)
                        `,
                        backgroundSize: '24px 24px'
                      }}
                    />
                    {/* Render blocks at their EXACT positions */}
                    {safeBody.map((block, index) => {
                      const x = typeof block.x === 'number' ? block.x : parseFloat(block.x as string) || 0;
                      const y = typeof block.y === 'number' ? block.y : parseFloat(block.y as string) || 0;
                      const width = typeof block.width === 'number' ? block.width : parseFloat(block.width as string) || 100;
                      const height = typeof block.height === 'number' ? block.height : parseFloat(block.height as string) || 50;
                      const fontSize = typeof block.fontSize === 'number' ? block.fontSize : parseFloat(block.fontSize as any) || 20;
                      
                      if (block.type === 'text') {
                        return (
                          <div
                            key={block._id || block.blockId || index}
                            className="absolute"
                            style={{
                              left: `${x}px`,
                              top: `${y}px`,
                              width: `${width}px`,
                              minHeight: `${height}px`,
                            }}
                          >
                            <div 
                              className="text-[hsl(var(--foreground))] whitespace-pre-wrap break-words"
                              style={{
                                fontSize: `${fontSize}px`,
                                fontWeight: 500,
                                lineHeight: 1.1,
                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              }}
                            >
                              {stripHtml(block.content || '')}
                            </div>
                          </div>
                        );
                      }

                      if (block.type === 'image' && block.url) {
                        return (
                          <div
                            key={block._id || block.blockId || index}
                            className="absolute overflow-hidden rounded-lg shadow-lg"
                            style={{
                              left: `${x}px`,
                              top: `${y}px`,
                              width: `${width}px`,
                              height: `${height}px`,
                            }}
                          >
                            <img
                              src={block.url}
                              alt="Canvas content"
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))]/20 flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-[hsl(var(--muted-foreground))]/30" />
                    </div>
                    <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]/40 uppercase tracking-widest">Empty Canvas</span>
                  </div>
                )}
              </div>
              
              {/* Minimal Footer */}
              {(content.description || (content.links && content.links.length > 0)) && (
                <div className="p-3 px-5 border-t border-[hsl(var(--border))]/30 bg-[hsl(var(--card))] flex items-center justify-between gap-4">
                  {content.description && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate flex-1">{content.description}</p>
                  )}
                  {content.links && content.links.length > 0 && (
                    <div className="flex items-center gap-2">
                      {content.links.slice(0, 2).map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-[hsl(var(--brand-primary))] hover:underline"
                        >
                          <LinkIcon className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[100px]">{new URL(link).hostname}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
