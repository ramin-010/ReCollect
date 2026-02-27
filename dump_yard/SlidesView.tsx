'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Presentation, Trash2, ArrowLeft, Clock, Save, Check, Loader2, Minus, Type, PaintBucket, Cloud, CloudOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { cn } from '@/lib/utils';
import { SlideCanvas, SlideCanvasHandle } from './core/SlideCanvas';
import { SelectedBlockInfo } from './core/types';
import { slideImageStorage } from '@/lib/storage/slideImageStorage';
import { slideOfflineStorage, OfflineSlideDeck } from '@/lib/storage/slideOfflineStorage';
import { slideApi, ServerSlideDeck } from '@/lib/api/slideApi';
import { useViewStore } from '@/lib/store/viewStore';
import { SlideConflictDialog } from './SlideConflictDialog';
import { toast } from 'sonner';

interface SlideDeck {
  id: string;
  serverId?: string;   // MongoDB _id
  name: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  syncStatus: 'synced' | 'pending';
  serverUpdatedAt?: number;  // ms timestamp of last known server state
  cloudImages?: Array<{ imageId: string; cloudUrl: string; cloudPublicId: string }>;
}

/** Convert server API response to local SlideDeck */
function serverToLocal(s: ServerSlideDeck): SlideDeck {
  return {
    id: s._id,
    serverId: s._id,
    name: s.name,
    content: s.content || '',
    cloudImages: s.cloudImages,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    syncStatus: 'synced',
    serverUpdatedAt: new Date(s.updatedAt).getTime(),
  };
}

/** Convert IndexedDB record to local SlideDeck */
function offlineToLocal(o: OfflineSlideDeck): SlideDeck {
  return {
    id: o.id,
    serverId: o.serverId,
    name: o.name,
    content: o.content,
    cloudImages: o.cloudImages,
    createdAt: o.createdAt || new Date(o.updatedAt).toISOString(),
    updatedAt: new Date(o.updatedAt).toISOString(),
    syncStatus: o.syncStatus,
    serverUpdatedAt: o.serverUpdatedAt,
  };
}

/** Save a SlideDeck to IndexedDB — sanitizes blob URLs to 'IDB_IMAGE' */
async function persistToIDB(deck: SlideDeck): Promise<void> {
  // Sanitize blob URLs before persisting — they're session-specific and die on reload
  let contentForIDB = deck.content;
  try {
    const parsed = JSON.parse(deck.content);
    if (parsed.blocks) {
      let changed = false;
      parsed.blocks = parsed.blocks.map((b: any) => {
        if (b.type === 'image' && b.url?.startsWith('blob:')) {
          changed = true;
          return { ...b, url: 'IDB_IMAGE' };
        }
        return b;
      });
      if (changed) contentForIDB = JSON.stringify(parsed);
    }
  } catch {}

  await slideOfflineStorage.saveDeck(
    deck.id,
    contentForIDB,
    deck.name,
    deck.syncStatus,
    deck.serverUpdatedAt,
    { serverId: deck.serverId, cloudImages: deck.cloudImages, createdAt: deck.createdAt }
  );
}

export function SlidesView() {
  const [decks, setDecks] = useState<SlideDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<SlideDeck | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showConflict, setShowConflict] = useState(false);
  const [conflictData, setConflictData] = useState<{
    deck: SlideDeck;
    serverData: ServerSlideDeck;
    localSummary: { slideCount: number; blockCount: number; name: string };
    serverSummary: { slideCount: number; blockCount: number; name: string };
  } | null>(null);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const latestContentRef = useRef<string>('');
  const latestNameRef = useRef<string>('');
  const activeDeckRef = useRef<SlideDeck | null>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);

  // Keep ref in sync with state
  useEffect(() => { activeDeckRef.current = activeDeck; }, [activeDeck]);

  const setSlideFullscreen = useViewStore((state) => state.setSlideFullscreen);

  // =====================================================================
  // LOAD DECKS: IndexedDB first (instant), then merge with server (background)
  // Mirrors the Docs pattern: load offline → fetch server → merge by timestamp
  // =====================================================================
  useEffect(() => {
    const loadDecks = async () => {
      // 1. Load from IndexedDB immediately (instant render)
      let localDecks: SlideDeck[] = [];
      try {
        const offlineDecks = await slideOfflineStorage.getAllDecks();
        localDecks = offlineDecks.map(offlineToLocal);
        if (localDecks.length > 0) {
          setDecks(localDecks);
        }
      } catch (e) {
        console.error('[SlidesView] Failed to load from IndexedDB:', e);
      }

      // 2. Fetch server metadata (no content) in background
      try {
        const serverDecks = await slideApi.fetchAllDecks();
        if (serverDecks.length > 0) {
          const localMap = new Map(localDecks.map(d => [d.serverId || d.id, d]));

          const merged = serverDecks.map(sd => {
            const serverDeck = serverToLocal(sd);
            const localDeck = localMap.get(serverDeck.serverId || serverDeck.id);

            if (!localDeck) {
              // New deck from server — save to IndexedDB
              persistToIDB(serverDeck);
              return serverDeck;
            }

            const serverTime = new Date(serverDeck.updatedAt).getTime();
            const localTime = new Date(localDeck.updatedAt).getTime();
            const isLocalDirty = localDeck.syncStatus === 'pending';

            if (isLocalDirty || localTime > serverTime) {
              // Local has pending changes or is newer — keep local
              return localDeck;
            }

            // Server is newer or same + local is clean — keep server metadata
            // (full content will be fetched when deck is opened)
            return {
              ...localDeck,
              name: serverDeck.name,
              updatedAt: serverDeck.updatedAt,
              serverUpdatedAt: serverDeck.serverUpdatedAt,
              syncStatus: 'synced' as const,
            };
          });

          // Also include any local decks not on the server (e.g., newly created offline)
          const serverIds = new Set(serverDecks.map(sd => sd._id));
          const localOnly = localDecks.filter(ld => !serverIds.has(ld.serverId || ld.id));

          setDecks([...localOnly, ...merged]);
        } else if (localDecks.length === 0) {
          setDecks([]);
        }
      } catch (err) {
        console.warn('[SlidesView] Server fetch failed, using IndexedDB data:', err);
        // localDecks already set above
      }

      setLoaded(true);
    };

    loadDecks();
    setSlideFullscreen(false);
    return () => setSlideFullscreen(false);
  }, [setSlideFullscreen]);

  // Persist every deck change to IndexedDB (replaces localStorage effect)
  useEffect(() => {
    if (!loaded) return;
    decks.forEach(deck => {
      persistToIDB(deck).catch(e => console.error('[SlidesView] Failed to persist deck to IDB:', e));
    });
  }, [decks, loaded]);

  // Create deck (API → IndexedDB)
  const createDeck = useCallback(async () => {
    const tempName = 'Untitled Deck';
    try {
      const result = await slideApi.createDeck(tempName);
      if (result.success && result.data) {
        const newDeck = serverToLocal(result.data);
        await persistToIDB(newDeck);
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

  // Delete deck (API + IndexedDB + image cleanup)
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

    // Delete from IndexedDB
    await slideOfflineStorage.deleteDeck(deckId).catch(() => {});

    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
      setSlideFullscreen(false);
    }
  }, [activeDeck, setSlideFullscreen, decks]);

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

  // Canvas content change — debounced local update (matches docs pattern)
  const canvasDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const handleCanvasChange = useCallback((content: string) => {
    const deckId = activeDeckRef.current?.id;
    if (!deckId) return;
    
    // Auto-rename presentation if it's currently "Untitled Deck" or perfectly matches the old slide title
    try {
      let oldFirstSlideTitle = '';
      if (latestContentRef.current) {
        const oldParsed = JSON.parse(latestContentRef.current);
        const oldFirstSlide = oldParsed.slides?.find((s: any) => s.order === 0) || oldParsed.slides?.[0];
        oldFirstSlideTitle = oldFirstSlide?.title || '';
      }

      const currentName = activeDeckRef.current?.name || '';
      const lastName = latestNameRef.current || currentName;
      
      const parsed = JSON.parse(content);
      const firstSlide = parsed.slides?.find((s: any) => s.order === 0) || parsed.slides?.[0];
      const newFirstSlideTitle = firstSlide?.title || '';

      const isDefaultName = lastName === 'Untitled Deck';
      const isStillAutoSyncing = oldFirstSlideTitle && lastName === oldFirstSlideTitle;

      if (isDefaultName || isStillAutoSyncing) {
        if (newFirstSlideTitle && newFirstSlideTitle.trim() !== '') {
          handleRenameDeck(deckId, newFirstSlideTitle);
        }
      }
    } catch (e) {
      // Ignore parse errors during auto-rename check
    }

    // Always update ref immediately (for save handler)
    latestContentRef.current = content;
    setIsLocalSaving(true);

    // Debounce the state update & IndexedDB save
    if (canvasDebounceRef.current) clearTimeout(canvasDebounceRef.current);
    canvasDebounceRef.current = setTimeout(() => {
      const now = new Date().toISOString();
      setDecks(prev =>
        prev.map(d =>
          d.id === deckId
            ? { ...d, content, updatedAt: now, syncStatus: 'pending' as const }
            : d
        )
      );
      // Save to IndexedDB — but sanitize blob URLs first!
      // Blob URLs are session-specific and die on reload. Replace with 'IDB_IMAGE'
      // so useSlideState can hydrate from slideImageStorage using imageId.
      const currentDeck = activeDeckRef.current;
      if (currentDeck) {
        let contentForIDB = content;
        try {
          const parsed = JSON.parse(content);
          if (parsed.blocks) {
            parsed.blocks = parsed.blocks.map((b: any) => {
              if (b.type === 'image' && b.url?.startsWith('blob:')) {
                return { ...b, url: 'IDB_IMAGE' }; // Will be rehydrated from slideImageStorage
              }
              return b;
            });
            contentForIDB = JSON.stringify(parsed);
          }
        } catch {}
        slideOfflineStorage.saveDeck(
          deckId,
          contentForIDB,
          latestNameRef.current || currentDeck.name,
          'pending',
          currentDeck.serverUpdatedAt,
          { serverId: currentDeck.serverId, cloudImages: currentDeck.cloudImages, createdAt: currentDeck.createdAt }
        ).catch(e => console.error('[SlidesView] IDB save failed:', e));
      }
      setTimeout(() => setIsLocalSaving(false), 500);
    }, 2000);
  }, [handleRenameDeck]);



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
        const serverUpdatedAtStr = result.data?.updatedAt || new Date().toISOString();
        const serverUpdatedAtMs = new Date(serverUpdatedAtStr).getTime();
        
        // Update cloud images + mark synced
        const syncUpdates: Partial<SlideDeck> = {
          updatedAt: serverUpdatedAtStr,
          syncStatus: 'synced' as const,
          serverUpdatedAt: serverUpdatedAtMs,
        };
        if (result.data?.cloudImages) {
          syncUpdates.cloudImages = result.data.cloudImages;
        }

        // If images were uploaded, update blocks with cloud URLs
        let finalContent = content;
        if (result.imageUrlMap && Object.keys(result.imageUrlMap).length > 0 && parsed) {
          let updated = false;
          for (const block of (parsed.blocks || [])) {
            if (block.type === 'image' && block.imageId && result.imageUrlMap[block.imageId]) {
              block.url = result.imageUrlMap[block.imageId].url;
              block.isUploaded = true;
              updated = true;
              slideImageStorage.deleteImage(block.imageId).catch(() => {});
            }
          }
          if (updated) {
            finalContent = JSON.stringify(parsed);
            latestContentRef.current = finalContent;
            syncUpdates.content = finalContent;
          }
        }

        setDecks(prev => prev.map(d =>
          d.id === activeDeck.id ? { ...d, ...syncUpdates } : d
        ));
        setActiveDeck(prev => prev ? { ...prev, ...syncUpdates } : null);

        // Write final content (with cloud URLs) to IndexedDB as synced
        await slideOfflineStorage.saveDeck(
          activeDeck.id,
          finalContent,
          name,
          'synced',
          serverUpdatedAtMs,
          { serverId: activeDeck.serverId, cloudImages: syncUpdates.cloudImages || activeDeck.cloudImages, createdAt: activeDeck.createdAt }
        ).catch(() => {});

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

  const handleUpdateColor = useCallback((color: string) => {
    if (!selectedBlock || !canvasRef.current) return;
    canvasRef.current.updateSelectedBlock({ color });
    setShowColorPalette(false);
  }, [selectedBlock]);

  const COLORS = [
    { name: 'Default', value: '' }, // Default (Transparent)
    { name: 'Blue', value: 'bg-blue-500/10 border-blue-500/20' },
    { name: 'Green', value: 'bg-green-500/10 border-green-500/20' },
    { name: 'Amber', value: 'bg-amber-500/10 border-amber-500/20' },
    { name: 'Red', value: 'bg-red-500/10 border-red-500/20' },
    { name: 'Violet', value: 'bg-violet-500/10 border-violet-500/20' },
  ];

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

  // ---- Conflict handlers (Docs pattern) ----
  const handleConflictKeepLocal = useCallback(async () => {
    if (!conflictData) return;
    const { deck } = conflictData;
    // Open deck with local content, mark dirty
    setActiveDeck(deck);
    latestContentRef.current = deck.content;
    latestNameRef.current = deck.name;
    setSlideFullscreen(true);
    setShowConflict(false);
    setConflictData(null);
    toast.success('Keeping your local changes. Save to sync to cloud.');
  }, [conflictData, setSlideFullscreen]);

  const handleConflictAcceptServer = useCallback(async () => {
    if (!conflictData) return;
    const { deck, serverData } = conflictData;
    const merged = serverToLocal(serverData);
    const finalDeck = { ...deck, ...merged };
    setActiveDeck(finalDeck);
    latestContentRef.current = merged.content;
    latestNameRef.current = merged.name;
    await persistToIDB(finalDeck).catch(() => {});
    setDecks(prev => prev.map(d => d.id === deck.id ? finalDeck : d));
    setSlideFullscreen(true);
    setShowConflict(false);
    setConflictData(null);
    toast.success('Server version loaded');
  }, [conflictData, setSlideFullscreen]);

  const handleConflictSaveAsNew = useCallback(async () => {
    if (!conflictData) return;
    const { deck, serverData } = conflictData;
    // Save local version as a new deck
    try {
      const result = await slideApi.createDeck(`${deck.name} (Local Copy)`);
      if (result.success && result.data) {
        const newDeck = serverToLocal(result.data);
        newDeck.content = deck.content; // inject local content
        newDeck.syncStatus = 'pending';
        await persistToIDB(newDeck);
        setDecks(prev => [newDeck, ...prev]);
        toast.success(`Local copy saved as "${newDeck.name}"`);
      }
    } catch { toast.error('Failed to save local copy'); }
    // Accept server version for current deck
    const merged = serverToLocal(serverData);
    const finalDeck = { ...deck, ...merged };
    setActiveDeck(finalDeck);
    latestContentRef.current = merged.content;
    latestNameRef.current = merged.name;
    await persistToIDB(finalDeck).catch(() => {});
    setDecks(prev => prev.map(d => d.id === deck.id ? finalDeck : d));
    setSlideFullscreen(true);
    setShowConflict(false);
    setConflictData(null);
  }, [conflictData, setSlideFullscreen]);

  const handleRevert = useCallback(async () => {
    if (!activeDeck) return;
    const serverId = activeDeck.serverId || activeDeck.id;
    try {
      const serverData = await slideApi.fetchDeck(serverId);
      if (serverData && serverData.content) {
        const merged = serverToLocal(serverData);
        const finalDeck = { ...activeDeck, ...merged };
        setActiveDeck(finalDeck);
        latestContentRef.current = merged.content;
        latestNameRef.current = merged.name;
        await persistToIDB(finalDeck).catch(() => {});
        setDecks(prev => prev.map(d => d.id === activeDeck.id ? finalDeck : d));
        toast.success('Reverted to server version');
      } else {
        toast.error('No server version available');
      }
    } catch {
      toast.error('Failed to fetch server version');
    }
    setShowRevertModal(false);
  }, [activeDeck]);

  // ---- Conflict Dialog (rendered at top level, not inside activeDeck) ----
  // This is critical: conflict is detected from the grid view when activeDeck is null,
  // so the dialog must render outside the `if (activeDeck)` block.
  if (showConflict && conflictData) {
    return (
      <>
        <SlideConflictDialog
          open={showConflict}
          onClose={() => { setShowConflict(false); setConflictData(null); }}
          localUpdatedAt={new Date(conflictData.deck.updatedAt).getTime()}
          serverUpdatedAt={new Date(conflictData.serverData.updatedAt).getTime()}
          localSummary={conflictData.localSummary}
          serverSummary={conflictData.serverSummary}
          onKeepMine={handleConflictKeepLocal}
          onAcceptServer={handleConflictAcceptServer}
          onSaveAsNew={handleConflictSaveAsNew}
        />
      </>
    );
  }

  // ---- Active deck view ----
  if (activeDeck) {
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
                <Button variant="ghost" size="sm" onClick={() => setShowRevertModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRevert}
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
            onClick={handleCloseDeck}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          {/* Cloud Sync Status Icons (Docs pattern) */}
          {activeDeck.syncStatus === 'pending' ? (
            <>
              <span title="Changes not synced to cloud">
                <CloudOff className="w-4 h-4 text-blue-500/60 hover:text-blue-500" />
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevertModal(true)}
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
              value={activeDeck.name}
              onChange={(e) => handleRenameDeck(activeDeck.id, e.target.value)}
              className="bg-transparent text-lg font-semibold text-[hsl(var(--foreground))] focus:outline-none w-full truncate"
              placeholder="Deck name..."
            />
          </div>

          {/* ---- Block Controls (Font Size + Text Color) ---- */}
          {/* onMouseDown preventDefault keeps focus in TipTap editor when clicking these controls */}
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
              onClick={handleSave}
              disabled={saving || activeDeck.syncStatus !== 'pending'}
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
                    const serverId = deck.serverId || deck.id;
                    const localContent = deck.content;
                    const localTime = new Date(deck.updatedAt).getTime();
                    const isLocalDirty = deck.syncStatus === 'pending';

                    // Always try to fetch full deck from server for comparison
                    let serverData: ServerSlideDeck | null = null;
                    try {
                      serverData = await slideApi.fetchDeck(serverId);
                    } catch {
                      // Offline — just use local
                    }

                    if (serverData && serverData.content) {
                      const serverTime = new Date(serverData.updatedAt).getTime();

                      if (serverTime > localTime && isLocalDirty) {
                        // CONFLICT: Server newer AND local dirty → show conflict dialog
                        const getContentSummary = (content: string, name: string) => {
                          try {
                            const p = JSON.parse(content);
                            return { slideCount: p.slides?.length || 0, blockCount: p.blocks?.length || 0, name };
                          } catch { return { slideCount: 0, blockCount: 0, name }; }
                        };
                        setConflictData({
                          deck,
                          serverData,
                          localSummary: getContentSummary(localContent || '', deck.name),
                          serverSummary: getContentSummary(serverData.content, serverData.name),
                        });
                        setShowConflict(true);
                        return; // Don't open — wait for user resolution
                      } else if (!localContent || localContent.length < 10 || (serverTime >= localTime && !isLocalDirty)) {
                        // Server is newer/same + local clean, OR local empty → accept server
                        const merged = serverToLocal(serverData);
                        const finalDeck = { ...deck, ...merged };
                        setActiveDeck(finalDeck);
                        latestContentRef.current = merged.content;
                        latestNameRef.current = merged.name;
                        await persistToIDB(finalDeck).catch(() => {});
                        setDecks(prev => prev.map(d =>
                          d.id === deck.id ? finalDeck : d
                        ));
                      } else {
                        // Local is dirty or newer → keep local
                        setActiveDeck(deck);
                        latestContentRef.current = localContent;
                        latestNameRef.current = deck.name;
                      }
                    } else {
                      // No server content → use local
                      setActiveDeck(deck);
                      latestContentRef.current = localContent;
                      latestNameRef.current = deck.name;
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
                    {deck.syncStatus === 'pending' && (
                      <span className="pl-1" title="Changes not synced to cloud">
                        <CloudOff className="w-3 h-3 text-blue-400" />
                      </span>
                    )}
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
