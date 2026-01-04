'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, FileText, Search, Loader2, MoreHorizontal, 
  Trash2, Pin, PinOff, Clock, CloudOff, LayoutGrid, List,
  Filter, ArrowUpDown, ChevronDown, Star, Sparkles, File, Image as ImageIcon, Share2, Users, LogOut
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui-base/Button';
import { useDocStore, Doc, DocType } from '@/lib/store/docStore';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { DocEditor } from './doc_editor';
// import { DocEditor } from './DocEditor';
import { SharedDocViewer } from './SharedDocViewer';
import { ShareDialog } from './ShareDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  useDropdownMenu,
} from '@/components/ui-base/DropdownMenu';
import { offlineStorage } from '@/lib/utils/offlineStorage';

type ViewMode = 'gallery' | 'list' | 'shared-by-me';
type SortOption = 'updated' | 'created' | 'title';
type OwnershipFilter = 'all' | 'mine' | 'shared';


const getDocPreview = (contentStr: string | object | null | undefined): { text: string; hasContent: boolean } => {
  try {
    
    if (!contentStr) {
      return { text: '', hasContent: false };
    }

    let content: any;
    
    
    if (typeof contentStr === 'string') {
      
      if (contentStr.trim() === '') {
        return { text: '', hasContent: false };
      }   
      try {
        content = JSON.parse(contentStr);
      } catch (parseError) {
        
        return { text: contentStr.substring(0, 300), hasContent: true };
      }
    } else {
      content = contentStr;
    }

    
    if (!content || typeof content !== 'object') {
      return { text: '', hasContent: false };
    }

    
    const nodes = content.content || (Array.isArray(content) ? content : []);
    
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return { text: '', hasContent: false };
    }

    
    const blockTypes = ['paragraph', 'heading', 'listItem', 'taskItem', 'blockquote', 'codeBlock'];

    
    const extractText = (node: any): string => {
      if (!node) return '';
      
      
      if (typeof node === 'string') return node;
      if (node.text) return node.text;
      
      
      const nodeType = node.type;
      let result = '';
      
      
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          result += extractText(child);
        }
      }
      
      
      if (nodeType === 'image' && node.attrs?.alt) {
        result += `[Image: ${node.attrs.alt}]`;
      }
      
      if (nodeType === 'codeBlock') {
        result += '[Code]';
      }
      
      return result;
    };

    
    const lines: string[] = [];
    for (const node of nodes) {
      const text = extractText(node).trim();
      if (text) {
        lines.push(text);
      }
      
      if (lines.join('\n').length > 400) break;
    }

    
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


const getAccentColor = (id: string): string => {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};


const getDocTag = (doc: Doc): { label: string; color: string } => {
  const docTypeColors: Record<DocType, { label: string; color: string }> = {
    notes: { label: 'Notes', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400' },
    meeting: { label: 'Meeting', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    project: { label: 'Project', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    personal: { label: 'Personal', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };
  return docTypeColors[doc.docType] || docTypeColors.notes;
};


const getStatusBadge = (doc: Doc): { label: string; color: string } | null => {
  if (doc._id.startsWith('local_')) {
    return { label: 'Draft', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
  }
  if (doc.isPinned) {
    return { label: 'Pinned', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  }
  return null;
};



interface DocItemProps {
  doc: Doc;
  index: number;
  currentUserId?: string;
  onOpen: (doc: Doc) => void;
  onTogglePin: (doc: Doc, e: React.MouseEvent) => void;
  onShare: (doc: Doc, e: React.MouseEvent) => Promise<void>;
  onDelete: (doc: Doc, e: React.MouseEvent) => void;
  onChangeType: (doc: Doc, type: DocType, e: React.MouseEvent) => void;
  onRename: (doc: Doc, newTitle: string) => Promise<void>;
}


const ShareMenuItem = ({ doc, onShare }: { doc: Doc, onShare: (doc: Doc, e: React.MouseEvent) => Promise<void> }) => {
  const { setIsOpen } = useDropdownMenu();
  const [isSharing, setIsSharing] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    setIsSharing(true);
    await onShare(doc, e);
    setIsSharing(false);
    setIsOpen(false); 
  };

  return (
    <DropdownMenuItem 
        onClick={handleClick}
        disabled={isSharing}
    >
       {isSharing ? (
         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
       ) : (
         <Share2 className="w-4 h-4 mr-2" />
       )}
       Share
    </DropdownMenuItem>
  );
};


const getTags = (doc: Doc) => {
    switch (doc.docType) {
      case 'meeting': return { label: 'Meeting', color: 'bg-violet-600/90 text-white' };
      case 'project': return { label: 'Project', color: 'bg-emerald-600/90 text-white' };
      case 'personal': return { label: 'Personal', color: 'bg-amber-600/90 text-white' };
      case 'notes': default: return { label: 'Notes', color: 'bg-blue-600/90 text-white' };
    }
};

const GalleryCard = React.memo(({ doc, index, currentUserId, onOpen, onTogglePin, onShare, onDelete, onChangeType, onRename }: DocItemProps) => {
  const { hasContent } = getDocPreview(doc.content);
  const isLocal = doc._id.startsWith('local_');
  const tag = getTags(doc);
  
  
  const isOwner = !doc.user || (typeof doc.user === 'object' && 'email' in doc.user ? doc.user._id === currentUserId : doc.user === currentUserId);
  const ownerName = typeof doc.user === 'object' && 'name' in doc.user ? doc.user.name : 'Unknown';

  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(doc.title || '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  
  useEffect(() => {
    if (!isEditing) setTitle(doc.title || '');
  }, [doc.title, isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOwner) {
      setIsEditing(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
        onRename(doc, val);
    }, 800);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onRename(doc, title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onRename(doc, title);
      setIsEditing(false);
    }
  };

  return (
    <div className="relative group h-[300px]" onClick={() => onOpen(doc)}>
      {/* Pinned Indicator - Sparkles Overlay (Hanging) */}
      {doc.isPinned && (
        <div className="absolute -top-2 -left-2 z-20 drop-shadow-md">
            <Sparkles className="h-6 w-6 text-amber-500 " />
        </div>
      )}

      <div
        className="cursor-pointer h-full
                   bg-[hsl(var(--background))] 
                   border border-[hsl(var(--background))]/50 rounded-xl
                   group-hover:border-[hsl(var(--muted-foreground))]/40
                   group-hover:shadow-sm
                   transition-all duration-200 overflow-hidden flex flex-col"
      >
       
      {/* Top Section: Content Preview (The "Inside" Paper) */}
      <div className="flex-1 p-3  relative overflow-hidden bg-[hsl(var(--card-bg))]">
        {/* Hover Actions - Top Right */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-fit">
          {isOwner && (
            <button
               onClick={(e) => {
                 onTogglePin(doc, e);
               }}
               className="p-1.5 rounded-md bg-[hsl(var(--background))]/80 hover:bg-[hsl(var(--muted))] transition-colors border border-[hsl(var(--border))]/50"
               title={doc.isPinned ? 'Unpin' : 'Pin'}
            >
              {doc.isPinned ? (
                <PinOff className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              )}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-md bg-[hsl(var(--background))]/80 hover:bg-[hsl(var(--muted))] transition-colors border border-[hsl(var(--border))]/50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {isOwner && (
                <>
                  <ShareMenuItem doc={doc} onShare={onShare} />
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/20" 
                onClick={(e) => onDelete(doc, e)}
              >
                {isOwner ? (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" /> Leave Collab
                  </>
                )}
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
        </div>
      </div>
      
      {/* Bottom Section: Footer with Title & Meta (Distinct Background) */}
      <div className="bg-[hsl(var(--muted))]/30  border-[hsl(var(--background))] p-3 flex flex-col gap-1">
        {/* Title Row */}
        <div className="flex items-start gap-2 h-6" onClick={(e) => e.stopPropagation()}>
           {isEditing ? (
              <input 
                autoFocus
                type="text"
                value={title}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-full text-md font-semibold bg-transparent border-b border-blue-500 focus:outline-none px-0 py-0 leading-snug"
              />
           ) : (
              <h3 
                onDoubleClick={isOwner ? handleStartEdit : undefined}
                title={isOwner ? "Double click to edit" : doc.title || 'Untitled'}
                className={`font-semibold text-md leading-snug line-clamp-1 ${isOwner ? 'cursor-text hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -ml-1 transition-colors' : ''}
                          ${doc.title ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}
              >
                {doc.title || 'Untitled'}
              </h3>
           )}
        </div>

        {/* Meta Row: Date & Tags */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
            {format(new Date(doc.createdAt), 'MMM d, yyyy')}
          </span>
          
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
             {/* Not Saved / Local indicator */}
            {isLocal && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20" title="Not saved to cloud">
                <CloudOff className="w-2.5 h-2.5" />
              </span>
            )}
            {/* Shared Badge - For docs shared WITH ME */}
            {!isOwner && (
              <div className="flex items-center gap-1.5 " title={`Shared by ${ownerName}`}>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-medium border border-blue-500/25">
                  <Share2 className="w-2.5 h-2.5" />
                  {ownerName?.split(' ')[0] || 'Shared'}
                </div>
              </div>
            )}
            {/* Owner Shared - Broadcasting Pulse Indicator */}
            {isOwner && doc.collaborators && doc.collaborators.length > 0 && (
              <div 
  className="flex items-center justify-center mt-1 mr-1 w-5 h-5" 
  title={`Broadcasting to ${doc.collaborators.length} people`}
>
  <div className="relative flex items-center justify-center h-3 w-3">
    {/* Outer pulse ring */}
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60"></span>
    
    {/* Middle pulse ring - slightly delayed */}
    {/* <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400/40"></span> */}
    
    {/* Core dot with enhanced glow */}
    <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.8),0_0_12px_rgba(16,185,129,0.4)]"></span>
  </div>
</div>
            )}
            {/* Type Selector Dropdown */}
            {isOwner ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`text-[10px] font-medium px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${tag?.color || ''}`}>
                      {tag?.label || 'Notes'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={(e) => onChangeType(doc, 'notes', e)}>
                      <FileText className="w-3.5 h-3.5 mr-2 text-blue-500" /> Notes
                      {doc.docType === 'notes' && <span className="ml-auto text-blue-500">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => onChangeType(doc, 'meeting', e)}>
                      <FileText className="w-3.5 h-3.5 mr-2 text-violet-500" /> Meeting
                      {doc.docType === 'meeting' && <span className="ml-auto text-violet-500">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => onChangeType(doc, 'project', e)}>
                      <FileText className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Project
                      {doc.docType === 'project' && <span className="ml-auto text-emerald-500">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => onChangeType(doc, 'personal', e)}>
                      <FileText className="w-3.5 h-3.5 mr-2 text-amber-500" /> Personal
                      {doc.docType === 'personal' && <span className="ml-auto text-amber-500">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded cursor-default ${tag?.color || ''}`}>
                  {tag?.label || 'Notes'}
                </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
});

const ListRow = React.memo(({ doc, index, currentUserId, onOpen, onTogglePin, onShare, onDelete, onChangeType, onRename }: DocItemProps) => {
  const tag = getDocTag(doc);
  const statusBadge = getStatusBadge(doc);
  
  
  const isOwner = !doc.user || (typeof doc.user === 'object' && 'email' in doc.user ? doc.user._id === currentUserId : doc.user === currentUserId);
  const ownerName = typeof doc.user === 'object' && 'name' in doc.user ? doc.user.name : 'Unknown';

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleInput(doc.title || '');
    }
  }, [doc.title, isEditingTitle]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOwner) {
      setIsEditingTitle(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleTitleSubmit = async () => {
    if (titleInput.trim() !== doc.title) {
      await onRename(doc, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur(); 
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1, delay: index * 0.02 }}
      onClick={() => onOpen(doc)}
      className="group flex items-center gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))/50] 
                 cursor-pointer border-b border-[hsl(var(--border))]/50 transition-colors"
    >
      <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          {!isEditingTitle ? (
            <h3 
              className={`font-medium text-[hsl(var(--foreground))] truncate ${isOwner ? 'group-hover:text-amber-500 transition-colors cursor-text' : ''}`}
              onDoubleClick={isOwner ? handleStartEdit : undefined}
              title={isOwner ? "Double click to edit" : doc.title || 'Untitled'}
            >
              {doc.title || 'Untitled'}
            </h3>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="font-medium bg-transparent border-b border-amber-500 focus:outline-none w-full"
              autoFocus
            />
          )}
          {!isOwner && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-medium rounded-full border border-blue-500/25 shrink-0">
               <Share2 className="w-3 h-3" />
               <span className="hidden sm:inline">Shared</span>
            </div>
          )}
          {isOwner && doc.collaborators && doc.collaborators.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium rounded-full border border-emerald-500/25 shrink-0">
               <Users className="w-3 h-3" />
               <span className="hidden sm:inline">Broadcasting</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 w-24 shrink-0">
        {tag && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${tag.color}`}>
            {tag.label}
          </span>
        )}
        {statusBadge && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${statusBadge.color}`}>
            {statusBadge.label}
          </span>
        )}
      </div>
      <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 w-24 text-right">
        {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {isOwner && (
          <button
            className="p-1.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
            onClick={(e) => onTogglePin(doc, e)}
          >
            {doc.isPinned ? (
              <PinOff className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            ) : (
              <Pin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            )}
          </button>
        )}
        <button
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onClick={(e) => onDelete(doc, e)}
          title={isOwner ? "Delete document" : "Leave document"}
        >
          {isOwner ? (
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <LogOut className="w-3.5 h-3.5 text-red-500" />
          )}
        </button>
      </div>
    </motion.div>
  );
});



const NewPageCard = ({ onClick, disabled }: { onClick: () => void, disabled: boolean }) => (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center justify-center gap-2 p-4 min-h-[180px]  bg-[hsl(var(--card-bg))]
                 border border-dashed border-[hsl(var(--border))] rounded-lg
                 hover:border-[hsl(var(--muted-foreground))]/50 hover:bg-[hsl(var(--card-bg))]
                 transition-all duration-200 text-[hsl(var(--muted-foreground))]
                 hover:text-[hsl(var(--foreground))]"
    >
      {disabled ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-medium">New Page</span>
        </>
      )}
    </motion.button>
);


interface SharedByMeSectionProps {
  sharedByMeDocs: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const SharedByMeSection = ({ sharedByMeDocs, isLoading, onRefresh }: SharedByMeSectionProps) => {
  const [updatingRole, setUpdatingRole] = useState<{docId: string; userId: string} | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<{url: string; name: string} | null>(null);

  const handleUpdateRole = async (docId: string, collaboratorId: string, newRole: 'editor' | 'viewer') => {
    try {
      setUpdatingRole({ docId, userId: collaboratorId });
      await axiosInstance.patch(`/api/docs/${docId}/collaborators/${collaboratorId}`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      onRefresh();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveCollaborator = async (docId: string, collaboratorId: string) => {
    try {
      await axiosInstance.delete(`/api/docs/${docId}/collaborators/${collaboratorId}`);
      toast.success('Collaborator removed');
      onRefresh();
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading shared docs...</p>
      </div>
    );
  }

  if (sharedByMeDocs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
          <Share2 className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No shared documents</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
          Documents you share with others will appear here. Share a doc to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Documents You've Shared</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage access permissions for your shared documents
          </p>
        </div>
        <span className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]/50 px-3 py-1 rounded-full">
          {sharedByMeDocs.length} document{sharedByMeDocs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {sharedByMeDocs.map((doc) => (
        <motion.div 
          key={doc._id} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm"
        >
          {/* Doc Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[hsl(var(--muted))]/30 to-transparent border-b border-[hsl(var(--border))]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">{doc.title || 'Untitled'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                      {doc.docType || 'notes'}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <span className="text-sm font-medium">
                  {doc.collaborators?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Collaborators Table */}
          <div className="px-5 py-3">
            <div className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-1">
              Collaborators
            </div>
            <div className="space-y-1">
              {doc.collaborators?.map((collab: any) => {
                const collabUser = collab.user;
                const userId = typeof collabUser === 'object' ? collabUser._id : collabUser;
                const userName = typeof collabUser === 'object' ? collabUser.name : 'Unknown';
                const userEmail = typeof collabUser === 'object' ? collabUser.email : '';
                const userAvatar = typeof collabUser === 'object' ? collabUser.avatar : '';
                const isUpdating = updatingRole?.docId === doc._id && updatingRole?.userId === userId;

                return (
                  <div 
                    key={userId} 
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[hsl(var(--muted))]/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt={userName} 
                          className="w-9 h-9 rounded-full object-cover shrink-0 cursor-zoom-in hover:ring-2 hover:ring-blue-500/50 transition-all"
                          onDoubleClick={() => setAvatarPreview({ url: userAvatar, name: userName })}
                          title="Double-click to enlarge"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {userName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{userName}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            disabled={isUpdating} 
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${
                              collab.role === 'editor' 
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/25' 
                                : 'bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/25'
                            } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                {collab.role === 'editor' ? 'Can Edit' : 'View Only'}
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => handleUpdateRole(doc._id, userId, 'editor')}>
                            <Star className="w-4 h-4 mr-2 text-amber-500" /> Can Edit
                            {collab.role === 'editor' && <span className="ml-auto text-amber-500">✓</span>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(doc._id, userId, 'viewer')}>
                            <FileText className="w-4 h-4 mr-2 text-blue-500" /> View Only
                            {collab.role === 'viewer' && <span className="ml-auto text-amber-500">✓</span>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <button 
                        onClick={() => handleRemoveCollaborator(doc._id, userId)}
                        className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-100 group-hover:opacity-100"
                        title="Remove access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Avatar Preview Modal */}
      <AnimatePresence>
        {avatarPreview && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setAvatarPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={avatarPreview.url} 
                alt={avatarPreview.name} 
                className="w-64 h-64 md:w-80 md:h-80 rounded-2xl object-cover shadow-2xl border-4 border-white/10"
              />
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center">
                <p className="text-white font-medium text-lg">{avatarPreview.name}</p>
                <p className="text-white/60 text-sm">Click anywhere to close</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function DocsView() {
  const { docs, currentDoc, isLoading, isInitialized, setDocs, addDoc, removeDoc, setCurrentDoc, setLoading, updateDoc } = useDocStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [shareDialog, setShareDialog] = useState({ open: false, docId: '', docTitle: '' });
  const [currentDocRole, setCurrentDocRole] = useState<'owner' | 'editor' | 'viewer'>('owner');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  
  
  const [sharedByMeDocs, setSharedByMeDocs] = useState<any[]>([]);
  const [isLoadingSharedByMe, setIsLoadingSharedByMe] = useState(false);

  
  const pinTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const fetchDocs = useCallback(async () => {
    
    if (isInitialized) return;

    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/docs');
      const serverDocs = response.data.success ? response.data.data : [];
      
      
      const allOfflineDocs = await offlineStorage.getAllOfflineDocs();
      const offlineContentMap = new Map(
        allOfflineDocs.map(od => [od.id, od])
      );
      
      
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
      
      
      const mergedServerDocs = serverDocs.map((serverDoc: any) => {
        const offlineDoc = offlineContentMap.get(serverDoc._id);
        if (offlineDoc && offlineDoc.content) {
          
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
      setLoading(false);
    }
  }, [isInitialized, setDocs, setLoading]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  
  const fetchSharedByMe = useCallback(async () => {
    try {
      setIsLoadingSharedByMe(true);
      const response = await axiosInstance.get('/api/docs/shared-by-me');
      if (response.data.success) {
        setSharedByMeDocs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch shared docs:', error);
      toast.error('Failed to load shared docs');
    } finally {
      setIsLoadingSharedByMe(false);
    }
  }, []);

  
  useEffect(() => {
    if (viewMode === 'shared-by-me' && sharedByMeDocs.length === 0) {
      fetchSharedByMe();
    }
  }, [viewMode, sharedByMeDocs.length, fetchSharedByMe]);

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
    
    
    const newStatus = !doc.isPinned;
    updateDoc(doc._id, { isPinned: newStatus });
    
    
    if (doc._id.startsWith('local_')) {
      toast.success(newStatus ? 'Pinned (local)' : 'Unpinned (local)');
      return;
    }

    
    if (pinTimeouts.current[doc._id]) {
      clearTimeout(pinTimeouts.current[doc._id]);
    }

    
    pinTimeouts.current[doc._id] = setTimeout(async () => {
      try {
        const response = await axiosInstance.patch(`/api/docs/${doc._id}`, { isPinned: newStatus });
        if (!response.data.success) {
           throw new Error('Failed to update on server');
        }
        
        
        const updatedDoc = response.data.data;
        updateDoc(doc._id, { isPinned: newStatus, updatedAt: updatedDoc.updatedAt });
        
        
        const offlineDoc = await offlineStorage.loadDoc(doc._id);
        if (offlineDoc) {
          await offlineStorage.saveDoc(
            doc._id,
            offlineDoc.content,
            offlineDoc.title,
            offlineDoc.coverImage,
            'synced',
            new Date(updatedDoc.updatedAt).getTime()
          );
        }
      } catch (error) {
        
        console.error('Failed to toggle pin:', error);
        updateDoc(doc._id, { isPinned: !newStatus }); 
        toast.error('Failed to update pin status');
      } finally {
        delete pinTimeouts.current[doc._id];
      }
    }, 500); 
  };

  
  const handleRenameDoc = useCallback(async (doc: Doc, newTitle: string) => {
      
      
      try {
        if (doc._id.startsWith('local_')) {
          await offlineStorage.saveDoc(doc._id, doc.content, newTitle, doc.coverImage || null, 'pending');
          updateDoc(doc._id, { title: newTitle });
        } else {
          const response = await axiosInstance.patch(`/api/docs/${doc._id}`, { title: newTitle });
          if (response.data.success) {
            const updatedDoc = response.data.data;
            updateDoc(doc._id, { title: newTitle, updatedAt: updatedDoc.updatedAt });
            
            
            const offlineDoc = await offlineStorage.loadDoc(doc._id);
            if (offlineDoc) {
              await offlineStorage.saveDoc(
                doc._id,
                offlineDoc.content,
                newTitle,
                offlineDoc.coverImage,
                'synced',
                new Date(updatedDoc.updatedAt).getTime()
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to save title:', error);
        toast.error('Failed to save title');
      }
  }, [updateDoc]);

  const handleChangeDocType = async (doc: Doc, newType: DocType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc._id.startsWith('local_')) {
      toast.info('Save the document first to change its type');
      return;
    }
    try {
      const response = await axiosInstance.patch(`/api/docs/${doc._id}`, { docType: newType });
      if (response.data.success) {
        const updatedDoc = response.data.data;
        updateDoc(doc._id, { docType: newType, updatedAt: updatedDoc.updatedAt });
        
        
        const offlineDoc = await offlineStorage.loadDoc(doc._id);
        if (offlineDoc) {
          await offlineStorage.saveDoc(
            doc._id,
            offlineDoc.content,
            offlineDoc.title,
            offlineDoc.coverImage,
            'synced',
            new Date(updatedDoc.updatedAt).getTime()
          );
        }
        
        toast.success(`Changed to ${newType.charAt(0).toUpperCase() + newType.slice(1)}`);
      }
    } catch (error) {
      console.error('Failed to change doc type:', error);
      toast.error('Failed to change document type');
    }
  };

  const handleShareDoc = async (doc: Doc, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc._id.startsWith('local_')) {
      toast.info('Save the document first to share it');
      return;
    }
    setShareDialog({ open: true, docId: doc._id, docTitle: doc.title || 'Untitled' });
  };

  
  const filteredDocs = docs
    .filter((doc) => {
      
      const docRole = doc.role || 'owner';
      if (ownershipFilter === 'mine' && docRole !== 'owner') return false;
      if (ownershipFilter === 'shared' && docRole === 'owner') return false;
      
      return doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

  const pinnedDocs = filteredDocs.filter(d => d.isPinned);
  const unpinnedDocs = filteredDocs.filter(d => !d.isPinned);
  const allSortedDocs = [...pinnedDocs, ...unpinnedDocs];

  
  const handleOpenDoc = useCallback((doc: Doc) => {
    
    const role = doc._id.startsWith('local_') ? 'owner' : (doc.role || 'owner');
    setCurrentDocRole(role);
    setCurrentDoc(doc);
  }, [setCurrentDoc]);

  const handleCloseDoc = useCallback(() => {
    setCurrentDoc(null);
    setCurrentDocRole('owner');
  }, [setCurrentDoc]);

  if (currentDoc) {
    
    if (currentDocRole === 'viewer') {
      return (
        <SharedDocViewer 
          doc={{
            _id: currentDoc._id,
            title: currentDoc.title,
            content: currentDoc.content,
            coverImage: currentDoc.coverImage,
            updatedAt: currentDoc.updatedAt,
          }}
          mode="viewer"
          onBack={handleCloseDoc}
        />
      );
    }
    
    return <DocEditor doc={currentDoc} onBack={handleCloseDoc} />;
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      {/* Header Section */}
      <div className="shrink-0 px-8 pt-8 pb-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 mb-1">
             <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center">
               <FileText className="w-5 h-5 text-amber-500" />
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Docs</h1>
               <p className="text-sm text-[hsl(var(--muted-foreground))]">Organize and keep track of documents shared across your team.</p>
             </div>
        </div>
      </div>

      {/* View Tabs & Controls */}
      <div className="shrink-0 px-8 pb-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[hsl(var(--card-bg))] rounded-lg">
             <button onClick={() => setViewMode('gallery')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'gallery' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <LayoutGrid className="w-4 h-4" /> Gallery
             </button>
             <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <List className="w-4 h-4" /> List
             </button>
             <button onClick={() => setViewMode('shared-by-me')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'shared-by-me' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <Share2 className="w-4 h-4" /> Shared by Me
             </button>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
               <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 pl-9 pr-3 py-1.5 rounded-md bg-[hsl(var(--card-bg))] border border-transparent focus:border-[hsl(var(--border))] focus:bg-[hsl(var(--card-bg))]/50 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))]" />
             </div>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card-bg))] transition-colors">
                   <ArrowUpDown className="w-4 h-4" /> Sort
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card-bg))] transition-colors">
                    <Filter className="w-4 h-4" /> {ownershipFilter === 'all' ? 'All' : ownershipFilter === 'mine' ? 'My Docs' : 'Shared'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setOwnershipFilter('all')}>
                    <FileText className="w-4 h-4 mr-2" /> All Docs
                    {ownershipFilter === 'all' && <span className="ml-auto text-amber-500">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOwnershipFilter('mine')}>
                    <Star className="w-4 h-4 mr-2" /> My Docs
                    {ownershipFilter === 'mine' && <span className="ml-auto text-amber-500">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setOwnershipFilter('shared')}>
                    <Users className="w-4 h-4 mr-2" /> Shared with Me
                    {ownershipFilter === 'shared' && <span className="ml-auto text-amber-500">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
             <Button onClick={handleCreateDoc} disabled={isCreating} className="bg-amber-600/70 text-white hover:bg-amber-600/80 border-0 gap-1.5" size="sm">
               {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> New <ChevronDown className="w-3.5 h-3.5" /></>}
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
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-4">
                <File className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No documents yet</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">Get started by creating your first document.</p>
              <Button onClick={handleCreateDoc} className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Create Document
              </Button>
            </div>
          ) : viewMode === 'gallery' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allSortedDocs.map((doc, i) => (
                <motion.div key={doc._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }}>
                  <GalleryCard 
                    doc={doc} 
                    index={i} 
                    currentUserId={user?._id}
                    onOpen={handleOpenDoc}
                    onTogglePin={handleTogglePin}
                    onShare={handleShareDoc}
                    onDelete={handleDeleteDoc}
                    onChangeType={handleChangeDocType}
                    onRename={handleRenameDoc}
                  />
                </motion.div>
              ))}
              <NewPageCard onClick={handleCreateDoc} disabled={isCreating} />
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
               <div className="flex items-center gap-4 px-4 py-2.5 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))] text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                 <span className="w-4" /> <span className="flex-1">Name</span> <span className="w-20">Tag</span> <span className="w-24 text-right">Updated</span> <span className="w-16" />
               </div>
               <AnimatePresence>
                 {allSortedDocs.map((doc, i) => (
                   <ListRow 
                     key={doc._id} 
                     doc={doc} 
                     index={i} 
                     currentUserId={user?._id}
                     onOpen={handleOpenDoc} 
                     onTogglePin={handleTogglePin} 
                     onDelete={handleDeleteDoc}
                     onShare={handleShareDoc}
                     onChangeType={handleChangeDocType}
                     onRename={handleRenameDoc}
                   />
                 ))}
               </AnimatePresence>
               <button onClick={handleCreateDoc} disabled={isCreating} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))]/30 cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                 <Plus className="w-4 h-4" /> <span className="text-sm">New page</span>
               </button>
            </div>
          ) : (
           
            <SharedByMeSection 
              sharedByMeDocs={sharedByMeDocs}
              isLoading={isLoadingSharedByMe}
              onRefresh={fetchSharedByMe}
            />
          )}
          {searchQuery && allSortedDocs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">No documents found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
      
      <ShareDialog 
        open={shareDialog.open} 
        onOpenChange={(open) => setShareDialog(prev => ({ ...prev, open }))}
        docId={shareDialog.docId}
        docTitle={shareDialog.docTitle}
      />
    </div>
  );
}
