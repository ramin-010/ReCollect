'use client';

import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';


const STORAGE_KEY = 'recollect-labels';
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

// Helper to get stored labels
function getStoredLabels(): Label[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper to save labels
function saveLabelsToStorage(labels: Label[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  } catch {}
}

export const InlineLabelDropdown = forwardRef<InlineLabelDropdownHandle, InlineLabelDropdownProps>(
  ({ isOpen, searchQuery, onSelectLabel, onCreateLabel, onClose }, ref) => {
    const [storedLabels, setStoredLabels] = useState<Label[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load stored labels on mount
    useEffect(() => {
      setStoredLabels(getStoredLabels());
    }, []);

    // Reload labels when dropdown opens
    useEffect(() => {
      if (isOpen) {
        setStoredLabels(getStoredLabels());
        setHighlightedIndex(0);
      }
    }, [isOpen]);

    // Filtered labels based on search
    const filteredLabels = useMemo(() => {
      if (!searchQuery.trim()) {
        return storedLabels.slice(0, 5);
      }
      return storedLabels.filter(label =>
        label.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [searchQuery, storedLabels]);

    // Check if exact match exists
    const exactMatch = useMemo(() => {
      return storedLabels.some(
        label => label.name.toLowerCase() === searchQuery.toLowerCase()
      );
    }, [searchQuery, storedLabels]);

    // Reset highlighted index when filtered labels change
    useEffect(() => {
      setHighlightedIndex(0);
    }, [filteredLabels.length, searchQuery]);

    // Has create option?
    const hasCreateOption = searchQuery.trim() && !exactMatch;
    const totalOptions = filteredLabels.length + (hasCreateOption ? 1 : 0);

    // Select existing label
    const handleSelectLabel = (label: Label) => {
      onSelectLabel(label);
    };

    // Create new label
    const handleCreateLabel = () => {
      if (!searchQuery.trim()) return;
      
      const newLabel: Label = {
        id: `label-${Date.now()}`,
        name: searchQuery.trim(),
        color: DEFAULT_LABEL_COLOR,
      };
      
      // Save to localStorage
      const updatedLabels = [newLabel, ...storedLabels];
      saveLabelsToStorage(updatedLabels);
      setStoredLabels(updatedLabels);
      
      onCreateLabel(newLabel);
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
          if (hasCreateOption && highlightedIndex >= filteredLabels.length) {
            handleCreateLabel();
          } else if (filteredLabels[highlightedIndex]) {
            handleSelectLabel(filteredLabels[highlightedIndex]);
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
            className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden shadow-xl"
          >
            {/* Existing labels */}
            {filteredLabels.map((label, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <button
                  key={label.id}
                  onClick={() => handleSelectLabel(label)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    isHighlighted ? "bg-white/10" : "hover:bg-white/5"
                  )}
                >
                  <span className="text-white/80">{label.name}</span>
                </button>
              );
            })}
            
            {/* Create new label option */}
            {hasCreateOption && (
              <button
                onClick={handleCreateLabel}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  filteredLabels.length > 0 && "border-t border-white/5",
                  highlightedIndex >= filteredLabels.length ? "bg-white/10" : "hover:bg-white/5"
                )}
              >
                <span className="text-white/50">Label not found.</span>
                <span className="text-white/80 font-medium">Create {searchQuery}</span>
              </button>
            )}
            
            {/* Empty state */}
            {filteredLabels.length === 0 && !searchQuery.trim() && (
              <div className="px-3 py-2 text-xs text-white/40">
                Type to search or create a label
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
