'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Palette, Clock, Pin, Copy, Edit2, Trash2, PinOff, PenTool
} from 'lucide-react';
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
  
  const formattedDate = new Date(drawing.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (variant === 'workbench') {
    return (
      <motion.div
        layoutId={drawing.id}
        className="group relative h-48 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-indigo-500/30 hover:bg-white/[0.04]"
        onClick={() => onOpen(drawing)}
      >
        {/* Thumbnail Background */}
        <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500">
          {drawing.thumbnail ? (
            <img
              src={drawing.thumbnail}
              alt={drawing.name}
              className="w-full h-full object-cover grayscale opacity-50 mix-blend-screen"
            />
          ) : (
             <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />
        </div>

        {/* Top Actions */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all backdrop-blur-md border border-white/5"
            onClick={(e) => onPin(drawing.id, e)}
            title="Unpin from Workbench"
          >
            <PinOff className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all backdrop-blur-md border border-white/5"
            onClick={(e) => onDelete(drawing.id, e)}
            title="Delete Drawing"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info */}
        <div className="absolute bottom-4 left-5 right-5 z-20">
          <h3 className="text-xl font-medium tracking-tight text-white/90 mb-1.5 font-serif group-hover:text-indigo-400 transition-colors">{drawing.name}</h3>
          <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium uppercase tracking-wider">
            <Clock className="w-3 h-3 opacity-70" />
            <span>Updated {formattedDate}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className="group relative aspect-[1.4] bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-white/10 hover:bg-white/[0.03] select-none"
      onClick={() => onOpen(drawing)}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0 z-0 bg-white/[0.01] group-hover:bg-white/[0.02] transition-colors duration-500">
        {drawing.thumbnail ? (
          <img
            src={drawing.thumbnail}
            alt={drawing.name}
            className="w-full h-full object-cover grayscale opacity-30 mix-blend-screen group-hover:opacity-50 transition-all duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
            <PenTool className="w-6 h-6 mb-2 text-white" />
          </div>
        )}
        
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#121212] via-[#121212]/90 to-transparent" />
      </div>

      {/* Active Badge */}
      {isRecent && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm">
            Active
          </div>
        </div>
      )}

      {/* Metadata & Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex flex-col justify-end h-full">
          <div className="w-full pr-2 mb-2">
            <h4 className="text-white/80 font-serif text-lg leading-tight truncate group-hover:text-white transition-colors">
              {drawing.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 opacity-40 group-hover:opacity-60 transition-opacity">
              <span className="text-[9px] font-medium text-white uppercase tracking-wider line-clamp-1">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Floating Tools Row */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
            <button
              className={cn(
                "p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5 transition-all",
                drawing.isPinned && "text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
              )}
              onClick={(e) => onPin(drawing.id, e)}
              title="Pin to Workbench"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            
            <button
              className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5 transition-all"
              onClick={(e) => onDuplicate(drawing, e)}
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/5 transition-all"
              onClick={(e) => onRename(drawing, e)}
              title="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"
              onClick={(e) => onDelete(drawing.id, e)}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
