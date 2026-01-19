'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Tag, Plus, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// Preset colors for labels
const LABEL_COLORS = [
  { name: 'red', bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
  { name: 'orange', bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' },
  { name: 'amber', bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500' },
  { name: 'green', bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { name: 'teal', bg: 'bg-teal-500/20', text: 'text-teal-400', dot: 'bg-teal-500' },
  { name: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
  { name: 'indigo', bg: 'bg-indigo-500/20', text: 'text-indigo-400', dot: 'bg-indigo-500' },
  { name: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500' },
  { name: 'pink', bg: 'bg-pink-500/20', text: 'text-pink-400', dot: 'bg-pink-500' },
  { name: 'gray', bg: 'bg-gray-500/20', text: 'text-gray-400', dot: 'bg-gray-500' },
];

const STORAGE_KEY = 'recollect-labels';

export interface Label {
  id: string;
  name: string;
  color: string;
}

// LocalStorage helpers
function getStoredLabels(): Label[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLabelsToStorage(labels: Label[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  } catch {
    // Silent fail
  }
}

interface LabelsModalProps {
  selectedLabels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  onClose: () => void;
}

export function LabelsModal({ 
  selectedLabels, 
  onLabelsChange, 
  onClose
}: LabelsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [storedLabels, setStoredLabels] = useState<Label[]>([]);

  // Load stored labels on mount
  useEffect(() => {
    setStoredLabels(getStoredLabels());
  }, []);

  // Filter labels based on search (show max 3 recent when no search)
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) {
      return storedLabels.slice(0, 3); // Show max 3 recent
    }
    return storedLabels.filter(label => 
      label.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, storedLabels]);

  // Check if search query matches any existing label exactly
  const exactMatch = useMemo(() => {
    return storedLabels.some(
      label => label.name.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [searchQuery, storedLabels]);

  // Toggle label selection
  const toggleLabel = (label: Label) => {
    const isSelected = selectedLabels.some(l => l.id === label.id);
    if (isSelected) {
      onLabelsChange(selectedLabels.filter(l => l.id !== label.id));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
    onClose();
  };

  // Create new label
  const handleCreateLabel = () => {
    if (!searchQuery.trim()) return;
    
    const randomColor = LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)].name;
    const newLabel: Label = {
      id: `label-${Date.now()}`,
      name: searchQuery.trim(),
      color: randomColor,
    };
    
    // Save to localStorage
    const updatedLabels = [newLabel, ...storedLabels];
    saveLabelsToStorage(updatedLabels);
    setStoredLabels(updatedLabels);
    
    // Select the new label
    onLabelsChange([...selectedLabels, newLabel]);
    onClose();
  };

  // Get color config
  const getColorConfig = (colorName: string) => {
    return LABEL_COLORS.find(c => c.name === colorName) || LABEL_COLORS[5];
  };

  return (
    <div className="w-[220px] bg-[#2a2a2a] border border-white/10 rounded-lg shadow-xl overflow-hidden">
      {/* Search Input */}
      <div className="px-2 py-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim() && !exactMatch) {
                handleCreateLabel();
              }
            }}
            placeholder="Search or create..."
            className="w-full bg-transparent pl-7 pr-2 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Recent Labels (max 3) or filtered results */}
      {filteredLabels.length > 0 && (
        <div className="py-1">
          {filteredLabels.map((label) => {
            const isSelected = selectedLabels.some(l => l.id === label.id);
            const colorConfig = getColorConfig(label.color);
            
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
                  isSelected ? "bg-white/5" : "hover:bg-white/5"
                )}
              >
                <Tag className={cn("w-3.5 h-3.5", colorConfig.text)} />
                <span className="flex-1 text-sm text-white/80">{label.name}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Create Label Option */}
      {searchQuery.trim() && !exactMatch && (
        <button
          onClick={handleCreateLabel}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:bg-white/5 border-t border-white/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create label</span>
        </button>
      )}

      {/* Empty state - no labels yet */}
      {storedLabels.length === 0 && !searchQuery.trim() && (
        <div className="px-3 py-3 text-xs text-white/40 text-center">
          Type to create your first label
        </div>
      )}
    </div>
  );
}

// Helper to get color config (exported for use in TaskInput)
export function getLabelColorConfig(colorName: string) {
  return LABEL_COLORS.find(c => c.name === colorName) || LABEL_COLORS[5];
}
