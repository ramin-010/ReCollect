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
  const { hasContent } = getDocPreview(doc.previewState || doc.yjsState);
  const isLocal = doc._id.startsWith('local_');
  const isCollab = doc.collaborators && doc.collaborators.length > 0; // Collab docs always stay synced
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
    // Disable inline title editing for collab docs - edit inside the editor instead
    if (isOwner && !isCollab) {
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
    <div className="relative group h-[280px]" onClick={() => onOpen(doc)}>
      {/* Hover Lift & Container */}
      <div
        className="cursor-pointer h-full
                   bg-[hsl(var(--card))] 
                   rounded-2xl border border-[hsl(var(--border))]/40
                   shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]
                   group-hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.1)]
                   group-hover:-translate-y-0
                   group-hover:border-[hsl(var(--border))]/80
                   transition-all duration-300 ease-out flex flex-col overflow-hidden relative"
      >
        
         {/* Pinned Indicator - Top Left */}
         {doc.isPinned && (
          <div className="absolute top-3 left-3 z-20">
              <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 p-1.5 rounded-full shadow-sm">
                 <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </div>
          </div>
        )}

        {/* Action Menu - Top Right (Visible on Hover) */}
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
           <div className="flex items-center gap-1">
             {isOwner && (
               <button
                  onClick={(e) => onTogglePin(doc, e)}
                  className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-colors shadow-sm ring-1 ring-black/5"
                  title={doc.isPinned ? 'Unpin' : 'Pin'}
               >
                 {doc.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5 " />}
               </button>
             )}
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <button
                   className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-colors shadow-sm ring-1 ring-black/5"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <MoreHorizontal className="w-3.5 h-3.5" />
                 </button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-40 p-1">
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
                     <span className="flex items-center"><Trash2 className="w-4 h-4 mr-2" /> Delete</span>
                   ) : (
                     <span className="flex items-center"><LogOut className="w-4 h-4 mr-2" /> Leave</span>
                   )}
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
        </div>

        {/* Cover Section (Image or Gradient) */}
        <div className="h-[35%] relative w-full overflow-hidden bg-[hsl(var(--muted))]">
          {doc.coverImage ? (
            <img 
              src={doc.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
            />
          ) : (
             <div className={`w-full h-full bg-gradient-to-br ${
               doc.docType === 'meeting' ? 'from-purple-500/10 to-blue-500/5' :
               doc.docType === 'project' ? 'from-emerald-500/10 to-teal-500/5' :
               doc.docType === 'personal' ? 'from-amber-500/10 to-orange-500/5' :
               'from-blue-500/10 to-indigo-500/5' // Notes default
             }`}>
                {/* Fallback Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                   <FileText className="w-16 h-16" />
                </div>
             </div>
          )}
          {/* Overlay Gradient for Text Contrast if needed, mostly for bottom edge */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[hsl(var(--card))] to-transparent opacity-50" />
        </div>

        {/* Content Section */}
        <div className="flex-1 px-4 pt-1 pb-2 flex flex-col justify-between relative bg-gradient-to-b from-[hsl(var(--sidebar-bg))] to-[hsl(var(--card))]">
           
           <div className="flex flex-col gap-1.5">
             {/* Title */}
             <div className="h-7 flex items-center" onClick={(e) => e.stopPropagation()}>
               {isEditing ? (
                  <input 
                    autoFocus
                    type="text"
                    value={title}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full text-lg font-bold bg-transparent border-b-2 border-primary focus:outline-none px-0 py-0 leading-tight"
                  />
               ) : (
                  <h3 
                    onDoubleClick={isOwner ? handleStartEdit : undefined}
                    title={isOwner ? "Double click to edit" : doc.title || 'Untitled'}
                    className={`font-bold text-[18px] leading-tight truncate w-full ${isOwner ? 'cursor-text  p-1 pl-0 hover:text-primary transition-colors' : ''}
                              ${doc.title ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}
                  >
                    <span className={`${isOwner ? 'hover:bg-[hsl(var(--card-bg))] rounded-sm p-0.5 pr-4' : ''} `}>{doc.title || 'Untitled'}</span>
                  </h3>
               )}
             </div>

             {/* Dynamic Preview Fragment */}
             <div className="relative h-[5rem] overflow-hidden text-sm text-[hsl(var(--muted-foreground))] leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                {hasContent ? (
                  <div className="text-[13px] line-clamp-3 font-normal">
                     <MiniDocRenderer previewState={doc.previewState} yjsState={doc.yjsState} />
                  </div>
                ) : (
                  <span className="italic text-xs opacity-50">Empty document...</span>
                )}
             </div>
           </div>

           {/* Footer Meta */}
           <div className="flex items-center justify-between pt-3 mt-1 border-t border-[hsl(var(--border))]/100">
              <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                {format(new Date(doc.updatedAt), 'MMM d')}
                
                {/* Unsync indicator */}
                {!isCollab && (isLocal || doc.hasUnsyncedChanges) && (
                  <span className="pl-1" title={isLocal ? "Not saved to cloud" : "Changes not synced to cloud"}>
                    <CloudOff className="w-3 h-3 text-rose-600 dark:text-blue-400" />
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                
                {/* Live Activity Indicator */}
            

                {/* Shared Avatar Stack */}
                {doc.collaborators && doc.collaborators.length > 0 && (
                   <div className="flex -space-x-1.5 items-center mr-1">
                      {doc.collaborators.slice(0, 3).map((collab, i) => (
                        <div key={i} className="w-5 h-5 rounded-full ring-2 ring-[hsl(var(--card))] bg-[hsl(var(--muted))] flex items-center justify-center text-[8px] font-bold overflow-hidden" title={typeof collab.user === 'object' ? collab.user.name : 'User'}>
                            {typeof collab.user === 'object' && collab.user.avatar ? (
                               <img src={collab.user.avatar} className="w-full h-full object-cover" />
                            ) : (
                               <span>{(typeof collab.user === 'object' ? collab.user.name : '?').charAt(0)}</span>
                            )}
                        </div>
                      ))}
                      {doc.collaborators.length > 3 && (
                        <div className="w-5 h-5 rounded-full ring-2 ring-[hsl(var(--card))] bg-[hsl(var(--muted))] flex items-center justify-center text-[8px] font-bold">
                           +{doc.collaborators.length - 3}
                        </div>
                      )}
                   </div>
                )}
                   {isOwner && doc.collaborators && doc.collaborators.length > 0 && (
                   <div className="relative flex items-center justify-center h-3 w-3 mr-1" title="Broadcasting">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                   </div>
                )}

                
                {/* Doc Type Badge */}
                {isOwner ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-opacity-10 backdrop-blur-sm cursor-pointer hover:bg-opacity-20 transition-all
                          ${doc.docType === 'meeting' ? 'bg-violet-500 border-violet-500/20 text-violet-600 dark:text-white' :
                            doc.docType === 'project' ? 'bg-emerald-500 border-emerald-500/20 text-emerald-600 dark:text-white' :
                            doc.docType === 'personal' ? 'bg-amber-500 border-amber-500/20 text-amber-600 dark:text-white' :
                            'bg-blue-500 border-blue-500/20 text-blue-600 dark:text-white'
                          }`}>
                        {tag?.label || 'Notes'}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={(e) => onChangeType(doc, 'notes', e)}>
                        <FileText className="w-3.5 h-3.5 mr-2 text-blue-500" /> Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => onChangeType(doc, 'meeting', e)}>
                        <FileText className="w-3.5 h-3.5 mr-2 text-violet-500" /> Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => onChangeType(doc, 'project', e)}>
                        <FileText className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => onChangeType(doc, 'personal', e)}>
                        <FileText className="w-3.5 h-3.5 mr-2 text-amber-500" /> Personal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-opacity-10 backdrop-blur-sm cursor-default ${tag?.color || ''}`}>
                     {tag?.label || 'Shared'}
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
