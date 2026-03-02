'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ChevronLeft, Save, Check, Loader2, Minus, Plus, Type, PaintBucket, Cloud, CloudOff, RotateCcw, CheckSquare, ListTodo, ChevronDown, Maximize, Minimize,Share2 } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui-base/Popover';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { SlideCanvas, SlideCanvasHandle } from '../core/SlideCanvas';
import { SelectedBlockInfo } from '../core/types';
import { SlideDeck } from './useSlidePersistence';
import { Play, Radio, Copy } from 'lucide-react';
// import { LiveRoom } from '../live/LiveRoom';
// import { useDataChannel } from '@livekit/components-react';
// import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { SharedTasksPanel, useSharedTasksRefetch } from '@/components/shared/SharedTasksPanel';
import { TaskInput } from '@/components/todo/task_Input';
import { SlideSharePopover } from './SlideSharePopover';

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
  {name : 'Blue-01', value : '#1a2735'},
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
  const [isPresenting, setIsPresenting] = useState(false);
  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [isTaskInputPopoverOpen, setIsTaskInputPopoverOpen] = useState(false);
  const [isTaskInputExpanded, setIsTaskInputExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { refreshKey: taskRefreshKey, refresh: setTaskRefreshKey } = useSharedTasksRefetch();
  
  // Track continuous title sync from the first slide
  const syncedTitleRef = useRef<string | null>(null);
  
  // const [isLiveOpen, setIsLiveOpen] = useState(false);

  // Track the last content we hydrated the canvas with, so we can detect
  // when deck.content changes from a background fetch (preview → full content)
  const lastHydratedContentRef = useRef<string>(deck.content);

  useEffect(() => {
    // If deck.content changed externally (e.g., background server fetch merged new data)
    // AND it's different from what we last hydrated with, force-hydrate the canvas
    if (deck.content && deck.content !== lastHydratedContentRef.current && canvasRef.current) {
      // Only hydrate if the new content is meaningfully different (not just a ref update)
      const oldLen = lastHydratedContentRef.current?.length || 0;
      const newLen = deck.content.length;
      // Significant change = content grew (preview → full) or completely different
      if (newLen > oldLen * 1.2 || oldLen < 20) {
        console.log('[SlideEditor] Background hydration: content changed from', oldLen, 'to', newLen, 'chars');
        canvasRef.current.hydrate(deck.content);
        lastHydratedContentRef.current = deck.content;
      }
    }
  }, [deck.content]);

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

  // Fullscreen effect & handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
      toast.error('Could not toggle fullscreen mode');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // LiveKit Presenter Controls (Admissions & Sync)
  // ---------------------------------------------------------------------------
  // We unconditionally call these hooks so we don't violate React Rules of Hooks,
  // but they only actually connect/do anything if the parent `<LiveKitRoom>` exists
  // (which happens when `isLiveOpen` is true).
  
  // NOTE: This will fail until we actually wrap SlideEditor or its parent in LiveKitRoom, 
  // OR we migrate the DataChannel hook inside LiveRoom and expose callbacks.
  // Actually, since this is a complex feature, let's just create an isolated
  // component that handles Presenter controls inside the LiveRoom wrapper.

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

      {/* Header Bar - Offset Navbar Style */}
      <div className="absolute top-0 left-[140px] right-0 z-50 flex items-center justify-between px-4 h-12 border-b border-[hsl(var(--divider))]/40 bg-[hsl(var(--sidebar-bg))] backdrop-blur-sm pointer-events-auto">
        
        {/* Left Section */}
        <div className="flex items-center gap-3 w-1/3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="group flex items-center gap-1.5 h-8 px-3 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/3 border border-transparent hover:border-[hsl(var(--border))]/40 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-xs font-semibold tracking-wide">Back</span>
          </Button>

          <div className="w-[1px] h-4 bg-[hsl(var(--divider))]" />

          <div className="flex items-center gap-2 max-w-[250px] group">
            <input
              type="text"
              value={deck.name}
              onChange={(e) => onRenameDeck(deck.id, e.target.value)}
              className="bg-transparent text-md font-medium text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--border))]/50 hover:bg-[hsl(var(--foreground))]/3 rounded px-2 py-1 w-full truncate transition-all placeholder:text-[hsl(var(--muted-foreground))]/50"
              placeholder="Untitled Deck"
            />
            
            {/* Cloud Sync Status Icons */}
            <div className="flex items-center shrink-0 ml-2">
              {deck.syncStatus === 'pending' ? (
                <div className="flex items-center gap-2.5" title="Changes not synced to cloud">
                  <span title="Changes not synced to cloud">
                    <CloudOff className="w-4 h-3.5 text-blue-500/70" />
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetShowRevertModal(true)}
                    className="h-6 w-6 p-0 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    title="Discard local changes"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <span title="Synced to cloud">
                  <Cloud className="w-3.5 h-3.5 text-emerald-500/60" />
                </span>
              )}
            </div>
          </div>
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
                      c.name === 'Blue-01' ? '#1a2735' : '',
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
          {/* Action Buttons */}
          <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
            
            {/* Tasks Button with Dropdown Input */}
            <Popover open={isTaskInputPopoverOpen} onOpenChange={(open) => {
              setIsTaskInputPopoverOpen(open);
              if (open) setIsTasksPanelOpen(true); // Open sidebar when popover opens
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-medium hover:text-[hsl(var(--foreground))] hover:bg-white/10 transition-colors"
                  leftIcon={<ListTodo className="h-3.5 w-3.5 text-amber-500" />}
                  title="Add task linked to this deck"
                >
                  Tasks
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                align="end" 
                className="w-110 p-3"
              >
                <TaskInput
                  isExpanded={isTaskInputExpanded}
                  onExpandChange={setIsTaskInputExpanded}
                  isQuickAdd={true}
                  initialReferences={[{ type: 'slide', refId: deck.serverId || deck.id, title: deck.name }]}
                  onSave={() => {
                    setTaskRefreshKey();
                    setIsTaskInputPopoverOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              leftIcon={isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              className="h-8 px-2 text-xs font-medium hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
              title={isFullscreen ? "Exit Fullscreen (F11/Esc)" : "Fullscreen (F11)"}
            >
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info('🚀 Go Live is coming soon!')}
              leftIcon={<Radio className="h-3.5 w-3.5" />}
              className="h-8 px-2 text-xs font-medium hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
              title="Coming Soon"
            >
              Go Live
             
            </Button>

            <SlideSharePopover deck={deck} />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPresenting(true)}
              leftIcon={<Play className="h-3.5 w-3.5" />}
              className="h-8 px-2 text-xs font-medium hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
            >
              Present
            </Button>

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
              leftIcon={<Save className="h-3.5 w-3.5" />}
              className={cn(
                "h-8 text-xs font-medium transition-colors",
                deck.syncStatus === 'pending'
                  ? "text-[hsl(var(--muted-foreground)))] hover:bg-[hsl(var(--brand-primary))]/10"
                  : "text-[hsl(var(--muted-foreground))]++ opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative">
        <SlideCanvas
          ref={canvasRef}
          initialContent={deck.content}
          onChange={onCanvasChange}
          onSelectionChange={handleSelectionChange}
          isPresenting={isPresenting}
          onClosePresentation={() => setIsPresenting(false)}
          deckId={deck.serverId || deck.id}
          isTasksPanelOpen={isTasksPanelOpen}
          onFirstSlideTitleChange={(newTitle) => {
            const currentName = deck.name?.trim();
            const newTitleTrimmed = newTitle.trim() || 'Untitled Deck';
            
            // Allow sync if deck has no name, is "Untitled Deck", OR we are already actively syncing it
            if (!currentName || currentName === 'Untitled Deck' || currentName === syncedTitleRef.current) {
              syncedTitleRef.current = newTitleTrimmed;
              onRenameDeck(deck.id, newTitleTrimmed);
            }
          }}
        />
        
        {/* LiveKit Floating Video Room Container */}
        {/*
        {isLiveOpen && (
          <div className="absolute right-4 top-4 w-80 h-[500px] z-[200] shadow-2xl rounded-xl overflow-hidden pointer-events-auto resize-y">
            <LiveRoom 
               deckId={deck.serverId || deck.id} 
               onLeave={() => setIsLiveOpen(false)} 
               isOwner={true}
            />
          </div>
        )}
        */}
      </div>

      {/* Task Sidebar */}
      <SharedTasksPanel
        key={taskRefreshKey}
        isOpen={isTasksPanelOpen}
        onClose={() => setIsTasksPanelOpen(false)}
        refId={deck.serverId || deck.id}
        refTitle={deck.name}
        refType="slide"
      />
    </div>
  );
}
