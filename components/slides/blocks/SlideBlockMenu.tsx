'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FileText,
  Terminal,
  ImagePlus,
  Link2,
  X,
} from 'lucide-react';
import { SlideBlockData } from '../core/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlideBlockMenuProps {
  onAddBlock: (type: SlideBlockData['type'], x?: number, y?: number) => void;
  onAddImage?: (file: File) => void;
}

const BLOCK_TYPES = [
  { type: 'text' as const,  label: 'Text Note',     icon: FileText,  color: 'text-blue-400' },
  { type: 'code' as const,  label: 'Code Snippet',  icon: Terminal,   color: 'text-emerald-400' },
  { type: 'image' as const, label: 'Image',          icon: ImagePlus,  color: 'text-amber-400' },
  { type: 'embed' as const, label: 'Embed URL',      icon: Link2,      color: 'text-purple-400' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SlideBlockMenu({ onAddBlock, onAddImage }: SlideBlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (type: SlideBlockData['type']) => {
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
    if (!urlValue.trim()) return;
    onAddBlock('embed');
    setUrlValue('');
    setShowUrlInput(false);
    setIsOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddImage?.(file);
      setIsOpen(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-30">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 right-0 bg-[hsl(var(--card-bg))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-2 min-w-[180px]"
          >
            {BLOCK_TYPES.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <Icon className={`w-4 h-4 ${color}`} />
                <span>{label}</span>
              </button>
            ))}

            {/* URL Input for Embeds */}
            <AnimatePresence>
              {showUrlInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-2 pt-2 border-t border-[hsl(var(--border))] mt-1">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={urlValue}
                      onChange={e => setUrlValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                      autoFocus
                      className="flex-1 bg-[hsl(var(--muted))] text-xs rounded-md px-2 py-1.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
                    />
                    <button
                      onClick={() => { setShowUrlInput(false); setUrlValue(''); }}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          setShowUrlInput(false);
        }}
        className="w-10 h-10 rounded-full bg-[hsl(var(--brand-primary))] text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="w-5 h-5" />
        </motion.div>
      </motion.button>
    </div>
  );
}
