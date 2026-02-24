'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Presentation, Trash2, ArrowLeft, Clock, Save, Check, Loader2, Minus, Type } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { SlideCanvas, SlideCanvasHandle } from './core/SlideCanvas';
import { SelectedBlockInfo } from './core/types';
import { slideImageStorage } from '@/lib/storage/slideImageStorage';
import { slideApi, ServerSlideDeck } from '@/lib/api/slideApi';
import { useViewStore } from '@/lib/store/viewStore';
import { toast } from 'sonner';

interface SlideDeck {
  id: string;
  serverId?: string;   // MongoDB _id
  name: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  cloudImages?: Array<{ imageId: string; cloudUrl: string; cloudPublicId: string }>;
}

const STORAGE_KEY = 'recollect_slide_decks';

function loadDecksLocal(): SlideDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SlideDeck[];
  } catch {
    return [];
  }
}

function saveDecksLocal(decks: SlideDeck[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

function serverToLocal(s: ServerSlideDeck): SlideDeck {
  return {
    id: s._id,
    serverId: s._id,
    name: s.name,
    content: s.content || '',
    cloudImages: s.cloudImages,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function SlidesView() {
  const [decks, setDecks] = useState<SlideDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<SlideDeck | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const latestContentRef = useRef<string>('');
  const latestNameRef = useRef<string>('');
  const activeDeckRef = useRef<SlideDeck | null>(null);

  // Keep ref in sync with state
  useEffect(() => { activeDeckRef.current = activeDeck; }, [activeDeck]);

  const setSlideFullscreen = useViewStore((state) => state.setSlideFullscreen);

  // Load decks from API (fallback to localStorage)
  useEffect(() => {
    const loadDecks = async () => {
      try {
        const serverDecks = await slideApi.fetchAllDecks();
        if (serverDecks.length > 0) {
          const mapped = serverDecks.map(serverToLocal);
          setDecks(mapped);
          saveDecksLocal(mapped);
        } else {
          // Fallback: check localStorage for decks not yet synced
          const localDecks = loadDecksLocal();
          setDecks(localDecks);
        }
      } catch (err) {
        console.warn('[SlidesView] Failed to fetch from API, using localStorage:', err);
        setDecks(loadDecksLocal());
      }
      setLoaded(true);
    };

    loadDecks();
    setSlideFullscreen(false);
    return () => setSlideFullscreen(false);
  }, [setSlideFullscreen]);

  // Persist to localStorage whenever decks change
  useEffect(() => {
    if (!loaded) return;
    console.log('[SlidesView] Persisting', decks.length, 'decks to localStorage');
    saveDecksLocal(decks);
  }, [decks, loaded]);

  // Create deck (API-backed)
  const createDeck = useCallback(async () => {
    const tempName = 'Untitled Deck';
    try {
      const result = await slideApi.createDeck(tempName);
      if (result.success && result.data) {
        const newDeck = serverToLocal(result.data);
        setDecks(prev => [newDeck, ...prev]);
        setActiveDeck(newDeck);
        setSlideFullscreen(true);
        latestContentRef.current = '';
        latestNameRef.current = tempName;
      }
    } catch (err) {
      console.error('[SlidesView] Failed to create deck on server:', err);
      toast.error('Failed to create deck');
    }
  }, [setSlideFullscreen]);

  // Delete deck (API + local + IndexedDB + cloud cleanup via API)
  const deleteDeck = useCallback(async (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);

    // Cleanup local IndexedDB images
    if (deck?.content) {
      try {
        const parsed = JSON.parse(deck.content);
        const imageIds = (parsed.blocks || [])
          .filter((b: any) => b.type === 'image' && b.imageId)
          .map((b: any) => b.imageId);
        if (imageIds.length > 0) {
          slideImageStorage.deleteImages(imageIds).catch(() => {});
        }
      } catch {}
    }

    // Delete from server (handles cloud cleanup)
    const serverId = deck?.serverId || deckId;
    try {
      await slideApi.deleteDeck(serverId);
    } catch (err) {
      console.error('[SlidesView] Server delete failed:', err);
    }

    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
      setSlideFullscreen(false);
    }
  }, [activeDeck, setSlideFullscreen, decks]);

  // Canvas content change — debounced local update (matches docs pattern)
  const canvasDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleCanvasChange = useCallback((content: string) => {
    const deckId = activeDeckRef.current?.id;
    if (!deckId) return;
    // Always update ref immediately (for save handler)
    latestContentRef.current = content;
    // Debounce the state update to prevent per-keystroke re-renders
    if (canvasDebounceRef.current) clearTimeout(canvasDebounceRef.current);
    canvasDebounceRef.current = setTimeout(() => {
      setDecks(prev =>
        prev.map(d =>
          d.id === deckId
            ? { ...d, content, updatedAt: new Date().toISOString() }
            : d
        )
      );
    }, 2000);
  }, []);

  // Rename deck (local immediate, server on save)
  const handleRenameDeck = useCallback((deckId: string, name: string) => {
    latestNameRef.current = name;
    setDecks(prev =>
      prev.map(d =>
        d.id === deckId ? { ...d, name, updatedAt: new Date().toISOString() } : d
      )
    );
    setActiveDeck(prev => prev ? { ...prev, name } : null);
  }, []);

  // Save to server (Ctrl+S or button)
  const handleSave = useCallback(async () => {
    if (!activeDeck || saving) return;
    const serverId = activeDeck.serverId || activeDeck.id;
    const content = latestContentRef.current || activeDeck.content;
    const name = latestNameRef.current || activeDeck.name;

    setSaving(true);
    setSaveStatus('saving');

    try {
      // Parse content to find image blocks
      let allImageIds: string[] = [];
      let pendingImageIds: string[] = [];
      let parsed: any = null;

      if (content) {
        try {
          parsed = JSON.parse(content);
          const imageBlocks = (parsed.blocks || []).filter((b: any) => b.type === 'image' && b.imageId);
          allImageIds = imageBlocks.map((b: any) => b.imageId);

          // Pending = images not yet uploaded to cloud (isUploaded !== true)
          pendingImageIds = imageBlocks
            .filter((b: any) => !b.isUploaded)
            .map((b: any) => b.imageId);
        } catch {}
      }

      // Sanitize content for server: strip blob URLs, replace with PENDING_UPLOAD
      let contentForServer = content;
      if (parsed) {
        const serverBlocks = (parsed.blocks || []).map((b: any) => {
          if (b.type === 'image') {
            const cleaned = { ...b };
            if (cleaned.url?.startsWith('blob:')) {
              cleaned.url = 'PENDING_UPLOAD';
            }
            return cleaned;
          }
          return b;
        });
        contentForServer = JSON.stringify({ ...parsed, blocks: serverBlocks });
      }

      const result = await slideApi.saveDeck(
        serverId,
        { content: contentForServer, name },
        pendingImageIds,
        allImageIds
      );

      if (result.success) {
        // Update cloud images in local deck after successful save
        if (result.data?.cloudImages) {
          setDecks(prev => prev.map(d =>
            d.id === activeDeck.id
              ? { ...d, cloudImages: result.data!.cloudImages, updatedAt: result.data!.updatedAt }
              : d
          ));
          setActiveDeck(prev => prev ? {
            ...prev,
            cloudImages: result.data!.cloudImages,
            updatedAt: result.data!.updatedAt,
          } : null);
        }

        // If images were uploaded, update blocks with cloud URLs
        if (result.imageUrlMap && Object.keys(result.imageUrlMap).length > 0 && parsed) {
          let updated = false;
          for (const block of (parsed.blocks || [])) {
            if (block.type === 'image' && block.imageId && result.imageUrlMap[block.imageId]) {
              block.url = result.imageUrlMap[block.imageId].url;
              block.isUploaded = true;
              updated = true;
              // Clean local IndexedDB since image is now in cloud
              slideImageStorage.deleteImage(block.imageId).catch(() => {});
            }
          }
          if (updated) {
            const newContent = JSON.stringify(parsed);
            latestContentRef.current = newContent;
            setDecks(prev => prev.map(d =>
              d.id === activeDeck.id ? { ...d, content: newContent } : d
            ));
          }
        }

        setSaveStatus('saved');
        toast.success('Deck saved!');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('[SlidesView] Save failed:', err);
      toast.error('Failed to save deck');
      setSaveStatus('idle');
    } finally {
      setSaving(false);
    }
  }, [activeDeck, saving]);

  // Ctrl+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleCloseDeck = useCallback(() => {
    setActiveDeck(null);
    setSlideFullscreen(false);
    setSaveStatus('idle');
    setSelectedBlock(null);
  }, [setSlideFullscreen]);

  // Block selection tracking (for navbar controls)
  const canvasRef = useRef<SlideCanvasHandle>(null);
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlockInfo | null>(null);

  // Theme-specific text color presets moved to floating toolbar
  const handleSelectionChange = useCallback((block: SelectedBlockInfo | null) => {
    setSelectedBlock(block);
  }, []);

  const handleFontSizeChange = useCallback((delta: number) => {
    if (!selectedBlock || !canvasRef.current) return;
    const current = selectedBlock.fontSize || 18;
    const next = Math.max(8, Math.min(72, current + delta));
    canvasRef.current.updateSelectedBlock({ fontSize: next });
  }, [selectedBlock]);


  const isBlockSelected = !!selectedBlock;

  // Keyboard shortcuts for font size (Ctrl+= to increase, Ctrl+- to decrease)
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

  // ---- Active deck view ----
  if (activeDeck) {
    return (
      <div className="flex flex-col h-full w-full">
        {/* Header Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--divider))] bg-[hsl(var(--card-bg))]/50 backdrop-blur-sm shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseDeck}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={activeDeck.name}
              onChange={(e) => handleRenameDeck(activeDeck.id, e.target.value)}
              className="bg-transparent text-lg font-semibold text-[hsl(var(--foreground))] focus:outline-none w-full truncate"
              placeholder="Deck name..."
            />
          </div>

          {/* ---- Block Controls (Font Size + Text Color) ---- */}
          {/* onMouseDown preventDefault keeps focus in TipTap editor when clicking these controls */}
          <div
            className={`flex items-center gap-1 border-l border-r border-[hsl(var(--divider))] px-3 transition-opacity duration-200 ${isBlockSelected ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}
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


          </div>

          {/* Save Status + Button */}
          <div className="flex items-center gap-2">
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
              onClick={handleSave}
              disabled={saving}
              leftIcon={<Save className="h-4 w-4" />}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              Save
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <SlideCanvas
            ref={canvasRef}
            initialContent={activeDeck.content}
            onChange={handleCanvasChange}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </div>
    );
  }

  // ---- Deck List View ----
  return (
    <div className="p-4 lg:p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Presentation className="h-8 w-8 text-orange-500" />
              Slide Decks
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mt-2">
              Create and manage your slide presentations
            </p>
          </div>
          <Button
            variant="primary"
            onClick={createDeck}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Deck
          </Button>
        </motion.div>

        {/* Deck Cards */}
        {decks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center py-20 border border-dashed border-[hsl(var(--border))] rounded-xl"
          >
            <Presentation className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]/30" />
            <h3 className="text-lg font-semibold mb-2">No slide decks yet</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-sm mx-auto">
              Create your first slide deck to start building presentations with blocks, connections, and more.
            </p>
            <Button
              variant="primary"
              onClick={createDeck}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Deck
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {decks.map((deck, index) => (
                <motion.div
                  key={deck.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative bg-[hsl(var(--card-bg))] border border-[hsl(var(--border))] rounded-xl p-5 cursor-pointer hover:border-orange-500/40 hover:shadow-lg transition-all duration-200"
                  onClick={async () => {
                    // Use local deck data first (has autosaved content)
                    // Only fetch from server if local content is empty
                    if (deck.content && deck.content.length > 10) {
                      console.log('[SlidesView] Opening deck from LOCAL state | content length:', deck.content.length);
                      setActiveDeck(deck);
                      latestContentRef.current = deck.content;
                      latestNameRef.current = deck.name;
                    } else {
                      // Local content empty — try fetching from server
                      const serverId = deck.serverId || deck.id;
                      try {
                        const fullDeck = await slideApi.fetchDeck(serverId);
                        if (fullDeck && fullDeck.content) {
                          console.log('[SlidesView] Opening deck from SERVER | content length:', fullDeck.content.length);
                          const localDeck = serverToLocal(fullDeck);
                          setActiveDeck(localDeck);
                          latestContentRef.current = localDeck.content;
                          latestNameRef.current = localDeck.name;
                        } else {
                          console.log('[SlidesView] Opening deck | no server content, using local');
                          setActiveDeck(deck);
                          latestContentRef.current = deck.content;
                          latestNameRef.current = deck.name;
                        }
                      } catch {
                        // Fallback to local
                        setActiveDeck(deck);
                        latestContentRef.current = deck.content;
                        latestNameRef.current = deck.name;
                      }
                    }
                    setSlideFullscreen(true);
                  }}
                >
                  {/* Deck Icon */}
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                    <Presentation className="h-5 w-5 text-orange-500" />
                  </div>

                  {/* Deck Info */}
                  <h3 className="font-semibold text-[hsl(var(--foreground))] mb-1 truncate">
                    {deck.name || 'Untitled Deck'}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(deck.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDeck(deck.id);
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
