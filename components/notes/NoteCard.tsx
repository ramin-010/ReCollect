// ReCollect - Professional Note Card Component
import React, { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui-base/Card';
import { Button } from '@/components/ui-base/Button';
import { 
  MoreVertical, 
  Pin, 
  Share2, 
  Edit3, 
  Trash2, 
  Clock,
  Link as LinkIcon,
  Hash,
  Lock,
  Globe,
  Bell,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tag {
  _id: string;
  name: string;
  color?: string;
}

interface NoteCardProps {
  note: {
    _id: string;
    title: string;
    body?: string;
    tags?: Tag[];
    links?: string[];
    isPinned?: boolean;
    isArchived?: boolean;
    visibility?: 'Public' | 'Private';
    createdAt: string;
    updatedAt: string;
  };
  onPin?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onRemind?: () => void;
  onArchive?: () => void;
  onToggleVisibility?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onPin,
  onEdit,
  onDelete,
  onShare,
  onRemind,
  onArchive,
  onToggleVisibility
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Extract plain text from HTML body
  const getPlainText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const plainBody = note.body ? getPlainText(note.body) : '';

  return (
    <Card 
      variant="interactive"
      className={cn(
        "relative group transition-all duration-300",
        note.isPinned && "ring-2 ring-brand-primary",
        note.isArchived && "opacity-75"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin Indicator */}
      {note.isPinned && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center shadow-md">
          <Pin className="w-4 h-4 text-white fill-white" />
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] truncate mb-1">
            {note.title}
          </h3>
          
          {/* Privacy Badge */}
          <div className="flex items-center gap-2">
            {note.visibility === 'Private' ? (
              <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                <Lock className="w-3 h-3" />
                Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <Globe className="w-3 h-3" />
                Public
              </span>
            )}
            {note.isArchived && (
              <span className="inline-flex items-center gap-1 text-xs text-warning">
                <Archive className="w-3 h-3" />
                Archived
              </span>
            )}
          </div>
        </div>

        {/* Menu Button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity",
              showMenu && "opacity-100"
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onPin?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] flex items-center gap-2"
                  >
                    <Pin className="w-4 h-4" />
                    {note.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  
                  <button
                    onClick={() => {
                      onRemind?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Set Reminder
                  </button>

                  <button
                    onClick={() => {
                      onEdit?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      onShare?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>

                  <button
                    onClick={() => {
                      onToggleVisibility?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] flex items-center gap-2"
                  >
                    {note.visibility === 'Private' ? (
                      <>
                        <Globe className="w-4 h-4" />
                        Make Public
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Make Private
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onArchive?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    {note.isArchived ? 'Unarchive' : 'Archive'}
                  </button>

                  <hr className="my-1 border-[hsl(var(--border))]" />

                  <button
                    onClick={() => {
                      onDelete?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card Body */}
      {plainBody && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-3 mb-4">
          {plainBody}
        </p>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <Hash className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
          {note.tags.slice(0, 3).map(tag => (
            <span
              key={tag._id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary"
            >
              {tag.name}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              +{note.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Card Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
        <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </span>
          
          {note.links && note.links.length > 0 && (
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              {note.links.length} link{note.links.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isHovered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-xs"
          >
            Quick Edit
          </Button>
        )}
      </div>
    </Card>
  );
};
