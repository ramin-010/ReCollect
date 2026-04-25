'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, LayoutTemplate, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todoApi } from '@/lib/api/todoApi';
import { useDebounce } from '@/lib/hooks/useDebounce';

export interface ReferenceItem {
  type: 'doc' | 'slide';
  refId: string;
  title: string;
}

interface InlineReferenceDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  onSelectReference: (ref: ReferenceItem) => void;
  onClose: () => void;
  caretPosition?: { top: number; left: number; height: number } | null;
}

export interface InlineReferenceDropdownHandle {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

export const InlineReferenceDropdown = forwardRef<InlineReferenceDropdownHandle, InlineReferenceDropdownProps>(
  ({ isOpen, searchQuery, onSelectReference, onClose, caretPosition }, ref) => {
    const [results, setResults] = useState<ReferenceItem[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(searchQuery, 500);

    // Fetch from real API
    useEffect(() => {
      if (!isOpen) return;

      const fetchResults = async () => {
        setIsLoading(true);
        try {
          const data = await todoApi.searchReferences(debouncedQuery.trim());
          setResults(data);
        } catch (err) {
          console.error('[InlineReferenceDropdown] Search failed:', err);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchResults();
    }, [debouncedQuery, isOpen]);

    // Reset highlight when results change
    useEffect(() => {
      setHighlightedIndex(0);
    }, [results.length]);

    const selectHighlighted = () => {
      if (results.length > 0 && highlightedIndex < results.length) {
        onSelectReference(results[highlightedIndex]);
      }
    };

    useImperativeHandle(ref, () => ({
      handleKeyDown: (e: React.KeyboardEvent) => {
        if (!isOpen) return false;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightedIndex(prev => Math.min(prev + 1, results.length - 1));
            return true;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
            return true;
          case 'Enter':
            e.preventDefault();
            e.stopPropagation();
            selectHighlighted();
            return true;
          case 'Escape':
            e.preventDefault();
            onClose();
            return true;
          default:
            return false;
        }
      }
    }));

    // Auto-scroll
    useEffect(() => {
      if (isOpen && dropdownRef.current) {
        const el = dropdownRef.current.children[highlightedIndex] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
      }
    }, [highlightedIndex, isOpen]);

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute w-72 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{
              top: caretPosition ? caretPosition.top + caretPosition.height + 4 : '100%',
              left: caretPosition ? caretPosition.left : 0,
              marginTop: caretPosition ? 0 : '0.5rem'
            }}
          >
            {/* Header */}
            <div className="p-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 backdrop-blur-md flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Link to Doc or Slide
              </span>
            </div>

            {/* Results */}
            <div
              ref={dropdownRef}
              className="max-h-56 overflow-y-auto custom-scrollbar p-1"
            >
              {isLoading && (
                <div className="flex items-center justify-center p-3 text-[hsl(var(--muted-foreground))]/60 text-xs gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching...
                </div>
              )}

              {!isLoading && results.length === 0 && (
                <div className="p-3 text-center text-[hsl(var(--muted-foreground))]/60 text-xs">
                  {searchQuery.length > 0 ? 'No docs or slides found' : 'Type to search your docs & slides'}
                </div>
              )}

              {!isLoading && results.map((item, idx) => {
                const isDoc = item.type === 'doc';
                const isSelected = highlightedIndex === idx;
                const Icon = isDoc ? FileText : LayoutTemplate;
                const typeLabel = isDoc ? 'Doc' : 'Slide';
                const accentColor = 'text-emerald-400';
                const accentBg = 'bg-emerald-5  00/15';

                return (
                  <button
                    key={`${item.type}-${item.refId}`}
                    onClick={() => onSelectReference(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2 py-2 text-left rounded-lg transition-all",
                      isSelected ? "bg-[hsl(var(--muted))]/20 text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]/70 hover:bg-[hsl(var(--muted))]/10"
                    )}
                  >
                    <div className={cn("w-7 h-7 shrink-0 rounded-md flex items-center justify-center", accentBg)}>
                      <Icon className={cn("w-3.5 h-3.5", accentColor)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide shrink-0", accentColor)}>
                          {typeLabel}
                        </span>
                        <span className="text-[hsl(var(--muted-foreground))]/40">—</span>
                        <p className="text-sm truncate leading-snug font-medium">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

InlineReferenceDropdown.displayName = 'InlineReferenceDropdown';
