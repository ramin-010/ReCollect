// ReCollect - Custom Tag Selector Component
'use client';

import { useState, useEffect } from 'react';
import { X, Hash, Plus } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { Card } from '@/components/ui-base/Card';
import { tagsApi } from '@/lib/api/tags';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export function   TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Fetch available tags from the API
    const fetchTags = async () => {
      try {
        const response = await tagsApi.getAll();
        if (response.success && response.data) {
          setAvailableTags(response.data.map((tag: any) => tag.name));
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };

    fetchTags();
  }, []);

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
    setShowDropdown(false);
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleCreateTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !selectedTags.includes(trimmedValue)) {
      onChange([...selectedTags, trimmedValue]);
      if (!availableTags.includes(trimmedValue)) {
        setAvailableTags([...availableTags, trimmedValue]);
      }
    }
    setInputValue('');
    setShowDropdown(false);
  };

  const filteredTags = availableTags.filter(
    (tag) =>
      !selectedTags.includes(tag) &&
      tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Tag Input */}
      <div className="relative">
        <Input
          placeholder="Search or create tags..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          leftIcon={<Hash className="w-4 h-4" />}
          rightIcon={
            inputValue.trim() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCreateTag}
                className="h-6 px-2"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )
          }
        />

        {/* Dropdown */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            <Card 
              variant="elevated" 
              padding="sm" 
              className="absolute top-full left-0 right-0 mt-1 z-20 max-h-48 overflow-y-auto tag-dropdown backdrop-blur-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]/50 shadow-2xl"
            >
              {filteredTags.length === 0 && !inputValue.trim() ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))] py-2">Start typing to search or create tags...</p>
              ) : filteredTags.length === 0 ? (
                <div className="py-2">
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">No tags found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={handleCreateTag}
                    leftIcon={<Plus className="w-3 h-3" />}
                  >
                    Create "{inputValue.trim()}"
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-[hsl(var(--accent))] rounded-md transition-colors"
                    >
                      <Hash className="w-3 h-3 inline mr-2" />
                      {tag}
                    </button>
                  ))}
                  {inputValue.trim() && !filteredTags.includes(inputValue.trim()) && (
                    <button
                      onClick={handleCreateTag}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-[hsl(var(--accent))] rounded-md transition-colors border-t border-[hsl(var(--border))] mt-2 pt-2"
                    >
                      <Plus className="w-3 h-3 inline mr-2" />
                      Create "{inputValue.trim()}"
                    </button>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] rounded-md text-sm font-medium"
            >
              <Hash className="w-3 h-3" />
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:bg-[hsl(var(--brand-primary))]/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
