'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, FileText, Loader2, Trash2, Pin, PinOff, 
  Share2, Users, LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { Doc, DocType } from '@/lib/store/docStore';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useDropdownMenu,
} from '@/components/ui-base/DropdownMenu';
import { DocItemProps, getDocTag, getStatusBadge } from './types';

// ShareMenuItem component
export const ShareMenuItem = ({ doc, onShare }: { doc: Doc, onShare: (doc: Doc, e: React.MouseEvent) => Promise<void> }) => {
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

// NewPageCard component
export const NewPageCard = ({ onClick, disabled }: { onClick: () => void, disabled: boolean }) => (
  <motion.button
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    onClick={onClick}
    disabled={disabled}
    className="group flex items-center justify-center gap-2 p-4 min-h-[180px] bg-[hsl(var(--card-bg))]
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

// ListRow component
export const ListRow = React.memo(({ doc, index, currentUserId, onOpen, onTogglePin, onShare, onDelete, onChangeType, onRename }: DocItemProps) => {
  const tag = getDocTag(doc);
  const statusBadge = getStatusBadge(doc);
  
  const isOwner = !doc.user || (typeof doc.user === 'object' && 'email' in doc.user ? doc.user._id === currentUserId : doc.user === currentUserId);
  const ownerName = typeof doc.user === 'object' && 'name' in doc.user ? doc.user.name : 'Unknown';

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(doc.title || '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
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

ListRow.displayName = 'ListRow';
