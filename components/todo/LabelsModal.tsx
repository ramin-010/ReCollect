'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Tag, Plus, Check, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useDebounce } from '@/lib/hooks/useDebounce';

// Default label style (Simplification)
const DEFAULT_LABEL_COLOR = { name: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' };

export interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelsModalProps {
  selectedLabels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  onClose: () => void;
  initialSearchQuery?: string;
}

export function LabelsModal({ 
  selectedLabels, 
  onLabelsChange, 
  onClose,
  initialSearchQuery = ''
}: LabelsModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [fetchedLabels, setFetchedLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 600);

  // Sync with parent's search query
  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Fetch labels from API
  useEffect(() => {
    const fetchTags = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get(`/api/tagQuery/search?q=${encodeURIComponent(debouncedSearch)}`);
            if (res.data.success) {
                const tags = res.data.data || [];
                const labels: Label[] = tags.map((t: any) => ({
                    id: t._id || `tag-${t.name}`,
                    name: t.name,
                    color: DEFAULT_LABEL_COLOR.name
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
  }, [debouncedSearch]);

  // Check if search query matches any existing label exactly
  const exactMatch = useMemo(() => {
    return fetchedLabels.some(
      label => label.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );
  }, [searchQuery, fetchedLabels]);

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
    
    const newLabel: Label = {
      id: `label-${Date.now()}`,
      name: searchQuery.trim(),
      color: DEFAULT_LABEL_COLOR.name,
    };
    
    // Select the new label
    onLabelsChange([...selectedLabels, newLabel]);
    onClose();
  };

  // Get color config
  const getColorConfig = (_colorName: string) => {
    return DEFAULT_LABEL_COLOR;
  };

  return (
    <div className="w-[220px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-xl overflow-hidden">
      {/* Search Input */}
      <div className="px-2 py-2 border-b border-[hsl(var(--border))]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim() && !exactMatch) {
                e.stopPropagation();
                handleCreateLabel();
              }
            }}
            placeholder="Search or create..."
            className="w-full bg-transparent pl-7 pr-2 py-1 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Loading state or results */}
      <div className="py-1 max-h-[200px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 text-[hsl(var(--muted-foreground))]/50 animate-spin" />
          </div>
        ) : (() => {
            const lowerQuery = searchQuery.trim().toLowerCase();
            const localMatches = selectedLabels.filter(sl => sl.name.toLowerCase().includes(lowerQuery));
            const mergedLabels = [...localMatches, ...fetchedLabels.filter(fl => !localMatches.some(lm => lm.id === fl.id))];

            if (mergedLabels.length > 0) {
              return mergedLabels.map((label) => {
                const isSelected = selectedLabels.some(l => l.id === label.id);
                const colorConfig = getColorConfig(label.color);
            
            return (
              <button
                key={label.id}
                onClick={() => toggleLabel(label)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
                  isSelected ? "bg-[hsl(var(--muted))]/20" : "hover:bg-[hsl(var(--muted))]/10"
                )}
              >
                <Tag className={cn("w-3.5 h-3.5", colorConfig.text)} />
                <span className="flex-1 text-sm text-[hsl(var(--foreground))]/80">{label.name}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>
            );
          });
        }
        
        return !searchQuery.trim() ? (
          <div className="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))] text-center">
            Type to search or create your first label
          </div>
        ) : null;
      })()}
      </div>

      {/* Create Label Option */}
      {!isLoading && searchQuery.trim() && !exactMatch && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCreateLabel();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--foreground))]/60 hover:bg-[hsl(var(--muted))]/10 border-t border-[hsl(var(--border))] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="truncate">Create "{searchQuery.trim()}"</span>
        </button>
      )}
    </div>
  );
}

export function getLabelColorConfig(_colorName: string) {
  return DEFAULT_LABEL_COLOR;
}
