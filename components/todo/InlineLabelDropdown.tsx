'use client';

import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useDebounce } from '@/lib/hooks/useDebounce';


const DEFAULT_LABEL_COLOR = 'blue';

export interface Label {
  id: string;
  name: string;
  color: string;
}

interface InlineLabelDropdownProps {
  isOpen: boolean;
  searchQuery: string;
  onSelectLabel: (label: Label) => void;
  onCreateLabel: (label: Label) => void;
  onClose: () => void;
}

export interface InlineLabelDropdownHandle {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
}

export const InlineLabelDropdown = forwardRef<InlineLabelDropdownHandle, InlineLabelDropdownProps>(
  ({ isOpen, searchQuery, onSelectLabel, onCreateLabel, onClose }, ref) => {
    const [fetchedLabels, setFetchedLabels] = useState<Label[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const debouncedSearch = useDebounce(searchQuery, 300);

    // Fetch tags from API and map to Labels
    useEffect(() => {
        if (!isOpen) return;
        
        const fetchTags = async () => {
             // If empty query, maybe show recent or common tags? Or nothing.
             // For now, if empty, we can show nothing or keep previous results.
             if (!debouncedSearch.trim()) {
                 setFetchedLabels([]);
                 return;
             }
            
            setIsLoading(true);
            try {
                const res = await axiosInstance.get(`/api/tagQuery/search?q=${encodeURIComponent(debouncedSearch)}`);
                if (res.data.success) {
                    // Map tags strings/objects to Label interface
                    // Backend returns { name: string, ... } or just strings?
                    // TagQuery usually returns objects or strings. Let's assume object { name }
                    // Actually, content.controller returns tags as { checked: boolean, name: string }? 
                    // No, `tagQuery.controller` usually returns array of objects { name: string, count: number }
                    
                    const tags = res.data.data || [];
                    const labels: Label[] = tags.map((t: any) => ({
                        id: t._id || `tag-${t.name}`,
                        name: t.name,
                        color: DEFAULT_LABEL_COLOR
                    }));
                    setFetchedLabels(labels);
                }
            } catch (err) {
                console.error("Failed to search tags", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTags();
    }, [debouncedSearch, isOpen]);

    // Check if exact match exists
    const exactMatch = useMemo(() => {
      // Use locally fetched labels to check for exact match
      return fetchedLabels.some(
        label => label.name.toLowerCase() === searchQuery.trim().toLowerCase()
      );
    }, [searchQuery, fetchedLabels]);

    // Has create option?
    const hasCreateOption = searchQuery.trim().length > 0 && !exactMatch;
    
    // Display options are simply the fetched labels
    const displayOptions = fetchedLabels;
    const totalOptions = displayOptions.length + (hasCreateOption ? 1 : 0);

    // Reset highlighted index
    useEffect(() => {
      setHighlightedIndex(0);
    }, [displayOptions.length, hasCreateOption]);

    // Select existing label
    const handleSelectLabel = (label: Label) => {
      onSelectLabel(label);
      onClose();
    };

    // Create new label (Just creates a label object to pass back, backend handles actual creation on save)
    const handleCreateLabel = () => {
      if (!searchQuery.trim()) return;
      
      const newLabel: Label = {
        id: `new-${Date.now()}`, // Temporary ID
        name: searchQuery.trim(),
        color: DEFAULT_LABEL_COLOR,
      };
      
      onCreateLabel(newLabel);
      onClose();
    };

    // Expose keyboard handler to parent
    useImperativeHandle(ref, () => ({
      handleKeyDown: (e: React.KeyboardEvent): boolean => {
        if (!isOpen) return false;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev + 1) % totalOptions);
          return true;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev - 1 + totalOptions) % totalOptions);
          return true;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          
          if (highlightedIndex < displayOptions.length) {
              handleSelectLabel(displayOptions[highlightedIndex]);
          } else if (hasCreateOption) {
              handleCreateLabel();
          }
          return true;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return true;
        }
        return false;
      }
    }));

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-full mt-2 z-50 min-w-[220px] bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden shadow-2xl backdrop-blur-md"
          >

            {/* Fetched labels */}
            {displayOptions.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                  Suggestions
                </div>
                {displayOptions.map((label, index) => {
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={label.id}
                      onClick={() => handleSelectLabel(label)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                        isHighlighted ? "bg-indigo-500/20 text-indigo-100" : "text-white/70 hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 opacity-40" />
                        <span>{label.name}</span>
                      </div>
                      {isHighlighted && <CornerDownLeft className="w-3 h-3 opacity-40" />}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Create new label option */}
            {hasCreateOption && (
              <div className={cn("py-1", displayOptions.length > 0 && "border-t border-white/5")}>
                {!displayOptions.length && (
                   <div className="px-3 py-1 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                     No matches found
                   </div>
                )}
                <button
                  onClick={handleCreateLabel}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                    highlightedIndex === displayOptions.length ? "bg-indigo-500/20 text-indigo-100" : "text-white/70 hover:bg-white/5"
                  )}
                >
                  <div className="flex flex-col">
                      <span className="text-xs opacity-50">Create new tag</span>
                      <span className="font-medium text-indigo-300">@{searchQuery.trim()}</span>
                  </div>
                  {(highlightedIndex === displayOptions.length || !displayOptions.length) && (
                    <CornerDownLeft className="w-3 h-3 opacity-40" />
                  )}
                </button>
              </div>
            )}
            
            {/* Loading state */}
            {isLoading && (
                 <div className="px-3 py-3 flex items-center gap-2 text-xs text-white/40 border-t border-white/5">
                    <div className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    Searching tags...
                 </div>
            )}
            {!isLoading && displayOptions.length === 0 && !hasCreateOption && (
              <div className="px-3 py-4 text-center text-xs text-white/30 italic">
                Type to find tags
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

InlineLabelDropdown.displayName = 'InlineLabelDropdown';

// Re-export getLabelColorConfig for use elsewhere
export function getLabelColorConfig(_colorName: string) {
  return { name: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' };
}
