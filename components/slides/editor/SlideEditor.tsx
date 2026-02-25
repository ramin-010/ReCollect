'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ArrowLeft, Save, Check, Loader2, Minus, Plus, Type, PaintBucket, Cloud, CloudOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { cn } from '@/lib/utils';
import { SlideCanvas, SlideCanvasHandle } from '../core/SlideCanvas';
import { SelectedBlockInfo } from '../core/types';
import { SlideDeck } from './useSlidePersistence';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface SlideEditorProps {
  deck: SlideDeck;
  saving: boolean;
  isLocalSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  showRevertModal: boolean;
  onSetShowRevertModal: (v: boolean) => void;
  onCanvasChange: (content: string) => void;
  onSave: () => Promise<string | null | void>;
  onClose: () => void;
  onRevert: () => Promise<string | null> | void | null;
  onRenameDeck: (deckId: string, name: string) => void;
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------
const COLORS = [
  { name: 'Default', value: '' },
  { name: 'Blue', value: 'bg-blue-500/10 border-blue-500/20' },
  { name: 'Green', value: 'bg-green-500/10 border-green-500/20' },
  { name: 'Amber', value: 'bg-amber-500/10 border-amber-500/20' },
  { name: 'Red', value: 'bg-red-500/10 border-red-500/20' },
  { name: 'Violet', value: 'bg-violet-500/10 border-violet-500/20' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SlideEditor({
  deck,
  saving,
  isLocalSaving,
  saveStatus,
  showRevertModal,
  onSetShowRevertModal,
  onCanvasChange,
  onSave,
  onClose,
  onRevert,
  onRenameDeck,
}: SlideEditorProps) {
  const canvasRef = useRef<SlideCanvasHandle>(null);
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlockInfo | null>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);

  const handleSelectionChange = useCallback((block: SelectedBlockInfo | null) => {
    setSelectedBlock(block);
  }, []);

  const handleUpdateColor = useCallback((color: string) => {
    if (!selectedBlock || !canvasRef.current) return;
    canvasRef.current.updateSelectedBlock({ color });
    setShowColorPalette(false);
  }, [selectedBlock]);

  const handleFontSizeChange = useCallback((delta: number) => {
    if (!selectedBlock || !canvasRef.current) return;
    const current = selectedBlock.fontSize || 18;
    const next = Math.max(8, Math.min(72, current + delta));
    canvasRef.current.updateSelectedBlock({ fontSize: next });
  }, [selectedBlock]);

  const isBlockSelected = !!selectedBlock;

  // Keyboard shortcuts for font size
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedBlock || !canvasRef.current) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleFontSizeChange(1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleFontSizeChange(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlock, handleFontSizeChange]);

  // Ctrl+S save handler
  useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [onSave]);

  return (
    <div className="flex flex-col h-full w-full">

      {/* Revert Modal */}
      {showRevertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Discard Local Changes?</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              This will reset your deck to the last saved server version. Any changes made since then will be permanently lost.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => onSetShowRevertModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const revertedContent = await onRevert();
                  // Force canvas to immediately hydrate the reverted content
                  if (revertedContent && typeof revertedContent === 'string' && canvasRef.current) {
                    canvasRef.current.hydrate(revertedContent);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="relative z-50 flex items-center gap-3 px-4 py-1.5 border-b border-[hsl(var(--divider))] bg-[hsl(var(--card-bg))]/50 backdrop-blur-sm shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>

        {/* Cloud Sync Status Icons */}
        {deck.syncStatus === 'pending' ? (
          <>
            <span title="Changes not synced to cloud">
              <CloudOff className="w-4 h-4 text-blue-500/60 hover:text-blue-500" />
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetShowRevertModal(true)}
              className="h-7 w-7 p-0 text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10"
              title="Discard local changes"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-500/50 hover:text-red-500" />
            </Button>
          </>
        ) : (
          <span title="Synced to cloud">
            <Cloud className="w-4 h-4 text-blue-500/60 hover:text-blue-500" />
          </span>
        )}

        <div className="flex-1 min-w-0 flex items-center pr-4">
          <input
            type="text"
            value={deck.name}
            onChange={(e) => onRenameDeck(deck.id, e.target.value)}
            className="bg-transparent text-lg font-semibold text-[hsl(var(--foreground))] focus:outline-none w-full truncate"
            placeholder="Deck name..."
          />
        </div>

        {/* ---- Block Controls (Font Size + Background Color) ---- */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[hsl(var(--card-bg))]/50 px-3 py-1 rounded-md transition-opacity duration-200 z-[100] ${isBlockSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Font Size */}
          <div className="flex items-center gap-0.5">
            <Type className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] mr-1" />
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              onClick={() => handleFontSizeChange(-1)}
              title="Decrease font size (Ctrl −)"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs font-mono text-[hsl(var(--foreground))] w-6 text-center tabular-nums">
              {selectedBlock?.fontSize || 14}
            </span>
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              onClick={() => handleFontSizeChange(1)}
              title="Increase font size (Ctrl +)"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <span className="text-[9px] text-[hsl(var(--muted-foreground))]/50 ml-0.5 hidden sm:inline">Ctrl ±</span>
          </div>

          {/* Background Color Picker */}
          <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-[hsl(var(--divider))] relative">
            <Button
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                showColorPalette && "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
              )}
              onClick={() => setShowColorPalette(!showColorPalette)}
              title="Change Background Color"
            >
              <PaintBucket className="h-3.5 w-3.5" />
            </Button>
            
            {showColorPalette && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-[hsl(var(--popover))] backdrop-blur-md rounded-full border border-[hsl(var(--border))] shadow-md animate-in fade-in zoom-in-95 z-[999] pointer-events-auto">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    className={cn(
                      "w-4 h-4 rounded-full border border-transparent transition-all hover:scale-110 z-999",
                      "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]",
                      c.name === 'Default' ? 'bg-[hsl(var(--muted-foreground))]/20' : '',
                      c.name === 'Blue' ? 'bg-blue-400' : '',
                      c.name === 'Green' ? 'bg-green-400' : '',
                      c.name === 'Amber' ? 'bg-amber-400' : '',
                      c.name === 'Red' ? 'bg-red-400' : '',
                      c.name === 'Violet' ? 'bg-violet-400' : '',
                      selectedBlock?.color === c.value && "ring-2 ring-[hsl(var(--foreground))] ring-offset-1 ring-offset-[hsl(var(--popover))]"
                    )}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateColor(c.value);
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Status + Button */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {isLocalSaving && saveStatus !== 'saving' && (
            <span   
              className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" 
              title="Saving to local storage"
            />
          )}
          
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-500">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const resultingContent = await onSave();
              if (resultingContent && typeof resultingContent === 'string' && canvasRef.current) {
                canvasRef.current.hydrate(resultingContent);
              }
            }}
            disabled={saving || deck.syncStatus !== 'pending'}
            leftIcon={<Save className="h-4 w-4" />}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <SlideCanvas
          ref={canvasRef}
          initialContent={deck.content}
          onChange={onCanvasChange}
          onSelectionChange={handleSelectionChange}
        />
      </div>
    </div>
  );
}
