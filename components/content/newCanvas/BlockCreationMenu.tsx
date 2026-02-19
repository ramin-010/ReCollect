'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, FileText, Terminal, ImagePlus, Link2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-base/Button';

interface BlockCreationMenuProps {
  onAddBlock: (type: 'text' | 'code' | 'image' | 'embed', x?: number, y?: number) => void;
  onImageUpload?: () => void;
}

const BLOCK_TYPES = [
  { 
    type: 'text' as const, 
    label: 'Text Note', 
    description: 'Rich text with formatting',
    icon: FileText, 
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-500/20'
  },
  { 
    type: 'code' as const, 
    label: 'Code Snippet', 
    description: 'Syntax highlighted code',
    icon: Terminal, 
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    border: 'border-purple-500/20'
  },
  { 
    type: 'image' as const, 
    label: 'Image', 
    description: 'Upload or paste image',
    icon: ImagePlus, 
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/20'
  },
  { 
    type: 'embed' as const, 
    label: 'Embed URL', 
    description: 'YouTube, links, embeds',
    icon: Link2, 
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/20'
  },
];

export function BlockCreationMenu({ onAddBlock, onImageUpload }: BlockCreationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowUrlInput(false);
        setUrlInput('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  const handleSelect = (type: 'text' | 'code' | 'image' | 'embed') => {
    if (type === 'image') {
      fileInputRef.current?.click();
      return;
    }
    if (type === 'embed') {
      setShowUrlInput(true);
      return;
    }
    onAddBlock(type);
    setIsOpen(false);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onAddBlock('embed');
      setUrlInput('');
      setShowUrlInput(false);
      setIsOpen(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddBlock('image');
      setIsOpen(false);
    }
    // Reset the input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={menuRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-16 right-0 w-56 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/30">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Add to Canvas
              </span>
            </div>
            
            {showUrlInput ? (
              <div className="p-3 space-y-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); if (e.key === 'Escape') { setShowUrlInput(false); setUrlInput(''); } }}
                  placeholder="Paste URL..."
                  className="w-full px-3 py-2 text-sm bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] rounded-lg outline-none focus:ring-1 focus:ring-[hsl(var(--brand-primary))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowUrlInput(false); setUrlInput(''); }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUrlSubmit}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[hsl(var(--brand-primary))] text-white hover:bg-[hsl(var(--brand-primary))]/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {BLOCK_TYPES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={(e) => { e.stopPropagation(); handleSelect(item.type); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                        item.bg
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border",
                        item.border, item.color
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</div>
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <Button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={cn(
          "rounded-full h-14 w-14 shadow-xl p-0 flex items-center justify-center transition-all duration-200",
          isOpen
            ? "bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 rotate-45"
            : "bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 hover:scale-110 active:scale-95",
          "text-white"
        )}
      >
        <Plus className="w-6 h-6 transition-transform" />
      </Button>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />
    </div>
  );
}
