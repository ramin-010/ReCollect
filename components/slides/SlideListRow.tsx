'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Presentation, Trash2, Pin, PinOff, Play, Layers, MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { SlideDeck } from './editor/useSlidePersistence';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';

export const DECK_TYPES = {
  presentation: { label: 'Presentation', color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
  meeting: { label: 'Meeting', color: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20' },
  project: { label: 'Project', color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' },
  personal: { label: 'Personal', color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' },
};

export interface SlideListRowProps {
  deck: SlideDeck;
  index: number;
  onOpen: (deck: SlideDeck) => void;
  onTogglePin: (deckId: string, e: React.MouseEvent) => void;
  onDelete: (deckId: string) => void;
  onPresent: (deck: SlideDeck) => void;
  onChangeDeckType: (deckId: string, type: string, e: React.MouseEvent) => void;
  onRenameDeck?: (deckId: string, name: string) => void;
}

export const SlideListRow = React.memo(({ 
  deck, 
  index, 
  onOpen, 
  onTogglePin, 
  onDelete, 
  onPresent, 
  onChangeDeckType,
  onRenameDeck
}: SlideListRowProps) => {
  const deckTypeKey = (deck.deckType || 'presentation') as keyof typeof DECK_TYPES;
  const currentTag = DECK_TYPES[deckTypeKey] || DECK_TYPES.presentation;

  const getSlideCount = (content: string) => {
    try {
      const p = JSON.parse(content);
      return p.slides?.length || 0;
    } catch { return 0; }
  };
  const slideCount = getSlideCount(deck.content);

  // ---- Inline Editing Logic ----
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(deck.name || 'Untitled Presentation');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isEditingTitle) {
      setTitleInput(deck.name || 'Untitled Presentation');
    }
  }, [deck.name, isEditingTitle]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleTitleSubmit = () => {
    if (titleInput.trim() !== deck.name && onRenameDeck) {
      onRenameDeck(deck.id, titleInput.trim());
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
      className="group flex items-center gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))/50] 
                 border-b border-[hsl(var(--border))]/50 transition-colors"
    >
      <div 
        className="flex items-center gap-4 shrink-0 cursor-pointer"
        onClick={() => onOpen(deck)}
      >
        <Presentation className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      </div>
      
      <div className="flex-1 min-w-0 pr-4">
        {!isEditingTitle ? (
          <h3 
            className="font-medium text-[hsl(var(--foreground))] truncate group-hover:text-amber-500 transition-colors cursor-text"
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit(e);
            }}
            title="Click to edit"
          >
            {deck.name || 'Untitled Presentation'}
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
             className="font-medium bg-transparent border-b border-amber-500 focus:outline-none w-full text-[hsl(var(--foreground))]"
             autoFocus
          />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 w-24">
        <Layers className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
        <span className="text-xs text-[hsl(var(--muted-foreground))]">{slideCount}</span>
      </div>

      <div className="flex items-center gap-2 w-28 shrink-0 relative">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={`text-[10px] font-medium px-2 py-0.5 rounded cursor-pointer transition-colors ${currentTag.color}`}
            >
              {currentTag.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[140px] z-50">
            {Object.entries(DECK_TYPES).map(([key, type]) => (
              <DropdownMenuItem 
                key={key}
                onClick={(e) => onChangeDeckType(deck.id, key, e as any)}
                className="text-xs flex items-center gap-2 cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full ${type.color.split(' ')[0]}`} />
                {type.label}
                {deck.deckType === key && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 w-24 text-right">
        {format(new Date(deck.updatedAt), 'MMM d, yyyy')}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          className="p-1.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
          onClick={(e) => { e.stopPropagation(); onPresent(deck); }}
          title="Present"
        >
          <Play className="w-3.5 h-3.5 text-amber-500" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
          onClick={(e) => onTogglePin(deck.id, e)}
        >
          {deck.isPinned ? (
            <PinOff className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          ) : (
            <Pin className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          )}
        </button>
        <button
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }}
          title="Delete Deck"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>
    </motion.div>
  );
});

SlideListRow.displayName = 'SlideListRow';
