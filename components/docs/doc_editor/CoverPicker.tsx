'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { coverUrl } from './constants';

interface CoverPickerProps {
  show: boolean;
  onClose: () => void;
  currentCover: string | null;
  onSelect: (url: string | null) => void;
}

export function CoverPicker({ show, onClose, currentCover, onSelect }: CoverPickerProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-32" 
      onClick={onClose}
    >
      <div 
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-4 w-[400px] max-h-[320px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">Choose a cover</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-[hsl(var(--muted-foreground))]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {coverUrl.map((cover, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect(cover.url);
                onClose();
              }}
              className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                currentCover === cover.url 
                  ? 'border-amber-500 ring-2 ring-amber-500/30' 
                  : 'border-transparent hover:border-[hsl(var(--border))]'
              }`}
            >
              <img 
                src={cover.url} 
                alt={cover.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
        {currentCover && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="w-full mt-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            Remove cover
          </Button>
        )}
      </div>
    </div>
  );
}
