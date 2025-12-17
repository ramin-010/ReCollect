'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, FileText, Search, Loader2, MoreHorizontal, 
  Trash2, Pin, PinOff, Clock, CloudOff, LayoutGrid, List,
  Filter, ArrowUpDown, ChevronDown, Star, Sparkles, File, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { useDocStore, Doc } from '@/lib/store/docStore';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { DocEditor } from './DocEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui-base/DropdownMenu';
import { offlineStorage } from '@/lib/utils/offlineStorage';

type ViewMode = 'gallery' | 'list';
type SortOption = 'updated' | 'created' | 'title';

// Utility to extract preview text from TipTap JSON - Robust version
const getDocPreview = (contentStr: string | object | null | undefined): { text: string; hasContent: boolean } => {
  try {
    // Handle null/undefined/empty
    if (!contentStr) {
      return { text: '', hasContent: false };
    }

    let content: any;
    
    // Parse if string
    if (typeof contentStr === 'string') {
      // Handle empty string
      if (contentStr.trim() === '') {
        return { text: '', hasContent: false };
      }   
      try {
        content = JSON.parse(contentStr);
      } catch (parseError) {
        // If it's not valid JSON, treat the string itself as content
        return { text: contentStr.substring(0, 300), hasContent: true };
      }
    } else {
      content = contentStr;
    }

    // Validate TipTap structure
    if (!content || typeof content !== 'object') {
      return { text: '', hasContent: false };
    }

    // TipTap content is usually { type: 'doc', content: [...] }
    const nodes = content.content || (Array.isArray(content) ? content : []);
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return { text: '', hasContent: false };
    }

    // Block-level node types that should have line breaks after them
    const blockTypes = ['paragraph', 'heading', 'listItem', 'taskItem', 'blockquote', 'codeBlock'];

    // Recursive text extractor that handles all node types
    const extractText = (node: any): string => {
      if (!node) return '';
      
      // Direct text node
      if (typeof node === 'string') return node;
      if (node.text) return node.text;
      
      // Handle different node types
      const nodeType = node.type;
      let result = '';
      
      // Process child content recursively
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          result += extractText(child);
        }
      }
      
      // Handle specific node types that might have text in attrs
      if (nodeType === 'image' && node.attrs?.alt) {
        result += `[Image: ${node.attrs.alt}]`;
      }
      
      if (nodeType === 'codeBlock') {
        result += '[Code]';
      }
      
      return result;
    };

    // Extract text from all nodes with proper line breaks
    const lines: string[] = [];
    for (const node of nodes) {
      const text = extractText(node).trim();
      if (text) {
        lines.push(text);
      }
      // Stop if we have enough content
      if (lines.join('\n').length > 400) break;
    }

    // Join with newlines and limit length
    let fullText = lines.join('\n').substring(0, 350);

    return { 
      text: fullText, 
      hasContent: fullText.length > 0 
    };
  } catch (e) {
    console.error('Error extracting doc preview:', e);
    return { text: '', hasContent: false };
  }
};

const MiniDocRenderer = ({ content }: { content: any }) => {
  if (!content) return null;

  let nodes = [];
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content;
    nodes = json.content || [];
  } catch (e) {
    // Fallback for plain text
    return (
      <p className="text-[14px] leading-[1.5] text-[rgba(55,53,47,0.65)] dark:text-[rgba(255,255,255,0.65)] line-clamp-4 font-[ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]">
        {typeof content === 'string' ? content.substring(0, 150) : ''}
      </p>
    );
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
                {node.content?.slice(0, 3).map((li: any, j: number) => (
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
            return (
              <div 
                key={i} 
                className="h-[150px] w-full bg-[rgba(242,241,238,0.6)] dark:bg-[rgba(47,52,55,0.6)] rounded-[3px] overflow-hidden relative my-[6px] border border-[rgba(55,53,47,0.09)] dark:border-[rgba(255,255,255,0.09)]"
              >
                {node.attrs?.src ? (
                  <img 
                    src={node.attrs.src} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[rgba(55,53,47,0.4)] dark:text-[rgba(255,255,255,0.4)] text-[12px] gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                      <polyline points="21 15 16 10 5 21" strokeWidth="2"/>
                    </svg>
                    <span>Image</span>
                  </div>
                )}
              </div>
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
            // Default text rendering for any other node type
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

// Get a random accent color for the left border
const getAccentColor = (id: string): string => {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
  ];
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get tag based on doc properties
const getDocTag = (doc: Doc): { label: string; color: string } | null => {
  if (doc._id.startsWith('local_')) {
    return { label: 'Draft', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  }
  if (doc.isPinned) {
    return { label: 'Pinned', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  }
  return null;
};

export function DocsView() {
  const { docs, currentDoc, isLoading, setDocs, addDoc, removeDoc, setCurrentDoc, setLoading, updateDoc } = useDocStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [sortBy, setSortBy] = useState<SortOption>('updated');

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/docs');
      const serverDocs = response.data.success ? response.data.data : [];
      
      // Get all docs from offline storage (both pending and synced)
      const allOfflineDocs = await offlineStorage.getAllOfflineDocs();
      const offlineContentMap = new Map(
        allOfflineDocs.map(od => [od.id, od])
      );
      
      // Get pending local-only docs (not yet synced to server)
      const pendingDocs = allOfflineDocs.filter(pd => pd.id.startsWith('local_'));
      const localDocs = pendingDocs.map(pd => ({
        _id: pd.id,
        title: pd.title || 'Untitled',
        content: typeof pd.content === 'string' ? pd.content : JSON.stringify(pd.content),
        isPinned: false,
        isArchived: false,
        createdAt: new Date(pd.updatedAt).toISOString(),
        updatedAt: new Date(pd.updatedAt).toISOString(),
      }));
      
      // Merge server docs with offline content for preview
      const mergedServerDocs = serverDocs.map((serverDoc: any) => {
        const offlineDoc = offlineContentMap.get(serverDoc._id);
        if (offlineDoc && offlineDoc.content) {
          // Use offline content for preview if available
          return {
            ...serverDoc,
            content: typeof offlineDoc.content === 'string' 
              ? offlineDoc.content 
              : JSON.stringify(offlineDoc.content),
          };
        }
        return serverDoc;
      });
      
      setDocs([...localDocs, ...mergedServerDocs]);
    } catch (error) {
      console.error('Failed to fetch docs:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [setDocs, setLoading]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleCreateDoc = async () => {
    try {
      setIsCreating(true);
      const response = await axiosInstance.post('/api/docs', { title: '' });
      if (response.data.success) {
        addDoc(response.data.data);
        setCurrentDoc(response.data.data);
        toast.success('Document created');
      }
    } catch (error) {
      console.error('Failed to create doc:', error);
      toast.error('Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDoc = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (doc._id.startsWith('local_')) {
        await offlineStorage.deleteDoc(doc._id);
        removeDoc(doc._id);
        toast.success('Document deleted');
        return;
      }
      const response = await axiosInstance.delete(`/api/docs/${doc._id}`);
      if (response.data.success) {
        removeDoc(doc._id);
        toast.success('Document deleted');
      }
    } catch (error) {
      console.error('Failed to delete doc:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleTogglePin = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc._id.startsWith('local_')) {
      toast.info('Save the document first to pin it');
      return;
    }
    try {
      const response = await axiosInstance.patch(`/api/docs/${doc._id}`, { isPinned: !doc.isPinned });
      if (response.data.success) {
        updateDoc(doc._id, { isPinned: !doc.isPinned });
        toast.success(doc.isPinned ? 'Unpinned' : 'Pinned');
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  // Filter and sort docs
  const filteredDocs = docs
    .filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

  const pinnedDocs = filteredDocs.filter(d => d.isPinned);
  const unpinnedDocs = filteredDocs.filter(d => !d.isPinned);
  const allSortedDocs = [...pinnedDocs, ...unpinnedDocs];

  if (currentDoc) {
    return <DocEditor doc={currentDoc} onBack={() => setCurrentDoc(null)} />;
  }

  // Gallery Card Component (Notion-inspired - Bottom Title Design)
  const GalleryCard = ({ doc, index }: { doc: Doc; index: number }) => {
    const { hasContent } = getDocPreview(doc.content);
    const isLocal = doc._id.startsWith('local_');
    
    // Determine tag based on doc state
    const getTag = () => {
      if (doc.isPinned) return { label: 'Pinned', color: 'bg-blue-500/90 text-white' };
      return { label: 'Document', color: 'bg-emerald-600/90 text-white' };
    };
    const tag = getTag();
    
    return (
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15, delay: index * 0.02 }}
        onClick={() => setCurrentDoc(doc)}
        className="group relative cursor-pointer
                   bg-[hsl(var(--background))] 
                   border border-[hsl(var(--background))]/50 rounded-xl
                   hover:border-[hsl(var(--muted-foreground))]/40
                   hover:shadow-sm
                   transition-all duration-200 overflow-hidden flex flex-col h-[300px]"
      >
        {/* Top Section: Content Preview (The "Inside" Paper) */}
        <div className="flex-1 p-3  relative overflow-hidden bg-[hsl(var(--card-bg))]">
          {/* Hover Actions - Top Right */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-fit">
            <button
              className="p-1.5 rounded-md bg-[hsl(var(--background))]/80 hover:bg-[hsl(var(--muted))] transition-colors border border-[hsl(var(--border))]/50"
              onClick={(e) => handleTogglePin(doc, e)}
              title={doc.isPinned ? 'Unpin' : 'Pin'}
            >
              {doc.isPinned ? (
                <PinOff className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md bg-[hsl(var(--background))]/80 hover:bg-[hsl(var(--muted))] transition-colors border border-[hsl(var(--border))]/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem 
                  className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/20" 
                  onClick={(e) => handleDeleteDoc(doc, e)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Preview Text */}
          <div className="relative h-full">
            {hasContent ? (
               <MiniDocRenderer content={doc.content} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]/40">
                <FileText className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs italic">Empty page</p>
              </div>
            )}
            
            {/* Fade gradient at bottom of preview */}
            {/* <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[hsl(var(--background))] to-transparent pointer-events-none" /> */}
          </div>
        </div>
        
        {/* Bottom Section: Footer with Title & Meta (Distinct Background) */}
        <div className="bg-[hsl(var(--muted))]/30  border-[hsl(var(--background))] p-3 flex flex-col gap-1">
          {/* Title Row */}
          <div className="flex items-start gap-2">
             <h3 className={`font-semibold text-md leading-snug line-clamp-1
                           ${doc.title ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}>
              {doc.title || 'Untitled'}
            </h3>
          </div>

          {/* Meta Row: Date & Tags */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
              {format(new Date(doc.createdAt), 'MMM d, yyyy')}
            </span>
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
               {/* Not Saved / Local indicator */}
              {isLocal && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20" title="Not saved to cloud">
                  <CloudOff className="w-2.5 h-2.5" />
                </span>
              )}
              {/* Main Tag */}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${tag.color}`}>
                {tag.label}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // List Row Component
  const ListRow = ({ doc, index }: { doc: Doc; index: number }) => {
    const tag = getDocTag(doc);
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1, delay: index * 0.02 }}
        onClick={() => setCurrentDoc(doc)}
        className="group flex items-center gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))/50] 
                   cursor-pointer border-b border-[hsl(var(--border))]/50 transition-colors"
      >
        <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
        
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${doc.title ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}>
            {doc.title || 'Untitled'}
          </span>
        </div>
        
        {tag && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${tag.color}`}>
            {tag.label}
          </span>
        )}
        
        <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 w-24 text-right">
          {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
        </span>
        
        {/* Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            className="p-1.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
            onClick={(e) => handleTogglePin(doc, e)}
          >
            {doc.isPinned ? (
              <PinOff className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            ) : (
              <Pin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            )}
          </button>
          <button
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={(e) => handleDeleteDoc(doc, e)}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </motion.div>
    );
  };

  // New Page Card (Notion-style)
  const NewPageCard = () => (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={handleCreateDoc}
      disabled={isCreating}
      className="group flex items-center justify-center gap-2 p-4 min-h-[180px]  bg-[hsl(var(--card-bg))]
                 border border-dashed border-[hsl(var(--border))] rounded-lg
                 hover:border-[hsl(var(--muted-foreground))]/50 hover:bg-[hsl(var(--card-bg))]
                 transition-all duration-200 text-[hsl(var(--muted-foreground))]
                 hover:text-[hsl(var(--foreground))]"
    >
      {isCreating ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">New page</span>
        </>
      )}
    </motion.button>
  );

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      {/* Header Section - Notion Style */}
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* Title with Icon */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center">
              <FileText className="w-5 h-5  text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                Docs
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Organize and keep track of documents shared across your team.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs and Controls - Notion Style */}
      <div className="shrink-0 px-8 pb-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* View Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[hsl(var(--card-bg))] rounded-lg">
            <button
              onClick={() => setViewMode('gallery')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                         ${viewMode === 'gallery' 
                           ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' 
                           : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              Gallery View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                         ${viewMode === 'list' 
                           ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' 
                           : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
            >
              <List className="w-4 h-4" />
              All Docs
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-9 pr-3 py-1.5 rounded-md bg-[hsl(var(--card-bg))] 
                           border border-transparent focus:border-[hsl(var(--border))] 
                           focus:bg-[hsl(var(--card-bg))]/50 text-sm outline-none 
                           transition-all placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm 
                                 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card-bg))]
                                 transition-colors">
                  <ArrowUpDown className="w-4 h-4" />
                  Sort
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setSortBy('updated')}>
                  <Clock className="w-4 h-4 mr-2" /> Last updated
                  {sortBy === 'updated' && <span className="ml-auto text-amber-500">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created')}>
                  <Sparkles className="w-4 h-4 mr-2" /> Date created
                  {sortBy === 'created' && <span className="ml-auto text-amber-500">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('title')}>
                  <FileText className="w-4 h-4 mr-2" /> Title
                  {sortBy === 'title' && <span className="ml-auto text-amber-500">✓</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* New Button */}
            <Button
              onClick={handleCreateDoc}
              disabled={isCreating}
              className="bg-amber-600/70 text-white hover:bg-amber-600/80 border-0 gap-1.5"
              size="sm"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  New
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading documents...</p>
            </div>
          ) : allSortedDocs.length === 0 && !searchQuery ? (
            // Empty State
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
                <File className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No documents yet</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
                Get started by creating your first document. Add notes, track information, and collaborate with your team.
              </p>
              <Button
                onClick={handleCreateDoc}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </div>
          ) : viewMode === 'gallery' ? (
            // Gallery View
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {allSortedDocs.map((doc, i) => (
                  <GalleryCard 
                    key={doc._id} 
                    doc={doc} 
                    index={i} 
                  />
                ))}
              </AnimatePresence>
              {/* New Page Card at the end */}
              <NewPageCard />
            </div>
          ) : (
            // List View
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
              {/* List Header */}
              <div className="flex items-center gap-4 px-4 py-2.5 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))] text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                <span className="w-4" /> {/* Icon spacer */}
                <span className="flex-1">Name</span>
                <span className="w-16">Tag</span>
                <span className="w-24 text-right">Updated</span>
                <span className="w-16" /> {/* Actions spacer */}
              </div>
              
              <AnimatePresence>
                {allSortedDocs.map((doc, i) => (
                  <ListRow key={doc._id} doc={doc} index={i} />
                ))}
              </AnimatePresence>
              
              {/* New Page Row */}
              <button
                onClick={handleCreateDoc}
                disabled={isCreating}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))]/30 
                           cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]
                           transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New page</span>
              </button>
            </div>
          )}

          {/* No results message */}
          {searchQuery && allSortedDocs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No documents found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
