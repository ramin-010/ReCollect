'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui-base/Card';
import { cn } from '@/lib/utils';
import { 
  Palette,
  Clock,
  Pin,
  Copy,
  Edit2,
  Trash2,
  PinOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Drawing } from '@/lib/store/whiteboardStore';

interface DrawingCardProps {
  drawing: Drawing;
  isRecent: boolean;
  onOpen: (drawing: Drawing) => void;
  onPin: (id: string, e: React.MouseEvent) => void;
  onDuplicate: (drawing: Drawing, e: React.MouseEvent) => void;
  onRename: (drawing: Drawing, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  variant?: 'default' | 'workbench';
}

export function DrawingCard({
  drawing,
  isRecent,
  onOpen,
  onPin,
  onDuplicate,
  onRename,
  onDelete,
  variant = 'default'
}: DrawingCardProps) {
  
  if (variant === 'workbench') {
    return (
      <motion.div
        layoutId={drawing.id}
        className="group relative aspect-[1.8] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
        onClick={() => onOpen(drawing)}
      >
        {/* Workbench Sheet Content */}
        <div className="absolute inset-0 z-0 bg-[hsl(var(--muted))]/10">
          {drawing.thumbnail && (
            <img
              src={drawing.thumbnail}
              alt={drawing.name}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))] via-transparent to-transparent opacity-80" />
        </div>

        {/* Top Actions - Unpin and Delete */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            className="p-2 rounded-full bg-red-500/80 text-white shadow-lg shadow-red-500/20 hover:scale-110 hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100"
            onClick={(e) => onDelete(drawing.id, e)}
            title="Delete Drawing"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-2 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-110 transition-transform"
            onClick={(e) => onPin(drawing.id, e)}
            title="Unpin from Workbench"
          >
            <PinOff className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Workbench Info */}
        <div className="absolute bottom-6 left-6 right-6 z-20">
          <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">{drawing.name}</h3>
          <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] font-medium">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[hsl(var(--background))]/50 border border-[hsl(var(--border))] backdrop-blur-md">
              <Clock className="w-3.5 h-3.5" />
              Last edited {new Date(drawing.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <Card
      variant="default"
      padding="none"
      className="group relative aspect-[1.4] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 select-none"
      onClick={() => onOpen(drawing)}
    >
      {/* Sheet Content (Thumbnail) */}
      <div className="absolute inset-0 z-0 bg-[hsl(var(--muted))]/10 group-hover:bg-[hsl(var(--background))] transition-colors duration-500">
        {drawing.thumbnail ? (
          <img
            src={drawing.thumbnail}
            alt={drawing.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Palette className="w-12 h-12 text-[hsl(var(--muted-foreground))]/10" />
          </div>
        )}
        
        {/* Gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[hsl(var(--card))] via-[hsl(var(--card))]/90 to-transparent" />
      </div>

      {/* Badges: Recent */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
        {isRecent && (
          <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
            Active
          </div>
        )}
      </div>

      {/* Sheet Metadata */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <div className="flex items-end justify-between">
          <div className="min-w-0 flex-1 mr-4">
            <h4 className="text-[hsl(var(--foreground))] font-semibold text-base leading-tight truncate group-hover:text-indigo-500 transition-colors">
              {drawing.name}
            </h4>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                <Clock className="w-3 h-3" />
                {new Date(drawing.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Floating Tools */}
          <div className="flex items-center gap-0.5 bg-[hsl(var(--foreground))]/5 backdrop-blur-md border border-[hsl(var(--border))]/50 rounded-lg p-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
            <button
              className={cn(
                "p-1.5 rounded-md transition-all hover:bg-[hsl(var(--background))]",
                drawing.isPinned
                    ? "text-indigo-500 bg-indigo-500/10"
                    : "text-[hsl(var(--muted-foreground))] hover:text-indigo-500"
              )}
              onClick={(e) => onPin(drawing.id, e)}
              title="Pin to Workbench"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-[hsl(var(--border))]/50 mx-0.5" />
            
            <button
              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-all"
              onClick={(e) => onDuplicate(drawing, e)}
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-all"
              onClick={(e) => onRename(drawing, e)}
              title="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-500/10 transition-all"
              onClick={(e) => onDelete(drawing.id, e)}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
