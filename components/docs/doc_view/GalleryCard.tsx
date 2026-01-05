'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, MoreHorizontal, Trash2, Pin, PinOff, 
  CloudOff, Sparkles, Share2, Users, LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { DocType } from '@/lib/store/docStore';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui-base/DropdownMenu';
import { DocItemProps, getDocPreview, getTags } from './types';
import { MiniDocRenderer } from './MiniDocRenderer';
import { ShareMenuItem } from './CardComponents';

export const GalleryCard = React.memo(({ doc, index, currentUserId, onOpen, onTogglePin, onShare, onDelete, onChangeType, onRename }: DocItemProps) => {
  const { hasContent } = getDocPreview(doc.yjsState);
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
      {/* Pinned Indicator */}
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
       
      {/* Top Section: Content Preview */}
      <div className="flex-1 p-3 relative overflow-hidden bg-[hsl(var(--card-bg))]">
        {/* Hover Actions */}
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
             <MiniDocRenderer yjsState={doc.yjsState} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]/40">
              <FileText className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs italic">Empty page</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Section: Footer */}
      <div className="bg-[hsl(var(--muted))]/30 border-[hsl(var(--background))] p-3 flex flex-col gap-1">
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

        {/* Meta Row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
            {format(new Date(doc.createdAt), 'MMM d, yyyy')}
          </span>
          
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Local indicator */}
            {isLocal && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20" title="Not saved to cloud">
                <CloudOff className="w-2.5 h-2.5" />
              </span>
            )}
            {/* Shared Badge */}
            {!isOwner && (
              <div className="flex items-center gap-1.5 " title={`Shared by ${ownerName}`}>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-medium border border-blue-500/25">
                  <Share2 className="w-2.5 h-2.5" />
                  {ownerName?.split(' ')[0] || 'Shared'}
                </div>
              </div>
            )}
            {/* Broadcasting Indicator */}
            {isOwner && doc.collaborators && doc.collaborators.length > 0 && (
              <div 
                className="flex items-center justify-center mt-1 mr-1 w-5 h-5" 
                title={`Broadcasting to ${doc.collaborators.length} people`}
              >
                <div className="relative flex items-center justify-center h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.8),0_0_12px_rgba(16,185,129,0.4)]"></span>
                </div>
              </div>
            )}
            {/* Type Selector */}
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

GalleryCard.displayName = 'GalleryCard';

export default GalleryCard;
