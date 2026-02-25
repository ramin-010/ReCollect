'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Presentation, Trash2, Clock, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { slideImageStorage } from '@/lib/storage/slideImageStorage';
import { slideOfflineStorage } from '@/lib/storage/slideOfflineStorage';
import { slideApi, ServerSlideDeck } from '@/lib/api/slideApi';
import { useViewStore } from '@/lib/store/viewStore';
import { SlideConflictDialog } from './SlideConflictDialog';
import { SlideEditor } from './editor/SlideEditor';
import {
  SlideDeck,
  serverToLocal,
  offlineToLocal,
  persistToIDB,
  useSlidePersistence,
} from './editor/useSlidePersistence';
import { toast } from 'sonner';

// =====================================================================
// SlidesView — Grid + Editor orchestrator
// =====================================================================
export function SlidesView() {
  const [decks, setDecks] = useState<SlideDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<SlideDeck | null>(null);
  const [loaded, setLoaded] = useState(false);

  const setSlideFullscreen = useViewStore((state) => state.setSlideFullscreen);

  // Rename deck (local immediate, server on save)
  const handleRenameDeck = useCallback((deckId: string, name: string) => {
    persistence.latestNameRef.current = name;
    setDecks(prev =>
      prev.map(d =>
        d.id === deckId ? { ...d, name, updatedAt: new Date().toISOString() } : d
      )
    );
    setActiveDeck(prev => prev ? { ...prev, name } : null);
  }, []);

  // Persistence hook (save, sync, conflict, revert)
  const persistence = useSlidePersistence({
    activeDeck,
    setActiveDeck,
    setDecks,
    handleRenameDeck,
  });

  // =====================================================================
  // LOAD DECKS: IndexedDB first (instant), then merge with server
  // =====================================================================
  useEffect(() => {
    const loadDecks = async () => {
      let localDecks: SlideDeck[] = [];
      try {
        const offlineDecks = await slideOfflineStorage.getAllDecks();
        localDecks = offlineDecks.map(offlineToLocal);
        if (localDecks.length > 0) setDecks(localDecks);
      } catch (e) {
        console.error('[SlidesView] Failed to load from IndexedDB:', e);
      }

      try {
        const serverDecks = await slideApi.fetchAllDecks();
        if (serverDecks.length > 0) {
          const localMap = new Map(localDecks.map(d => [d.serverId || d.id, d]));
          const merged = serverDecks.map(sd => {
            const serverDeck = serverToLocal(sd);
            const localDeck = localMap.get(serverDeck.serverId || serverDeck.id);
            if (!localDeck) { persistToIDB(serverDeck); return serverDeck; }
            const serverTime = new Date(serverDeck.updatedAt).getTime();
            const localTime = new Date(localDeck.updatedAt).getTime();
            if (localDeck.syncStatus === 'pending' || localTime > serverTime) return localDeck;
            return { ...localDeck, name: serverDeck.name, updatedAt: serverDeck.updatedAt, serverUpdatedAt: serverDeck.serverUpdatedAt, syncStatus: 'synced' as const };
          });
          const serverIds = new Set(serverDecks.map(sd => sd._id));
          const localOnly = localDecks.filter(ld => !serverIds.has(ld.serverId || ld.id));
          setDecks([...localOnly, ...merged]);
        } else if (localDecks.length === 0) {
          setDecks([]);
        }
      } catch (err) {
        console.warn('[SlidesView] Server fetch failed, using IndexedDB data:', err);
      }
      setLoaded(true);
    };
    loadDecks();
    setSlideFullscreen(false);
    return () => setSlideFullscreen(false);
  }, [setSlideFullscreen]);

  // Persist every deck change to IndexedDB
  useEffect(() => {
    if (!loaded) return;
    decks.forEach(deck => {
      persistToIDB(deck).catch(e => console.error('[SlidesView] Failed to persist deck to IDB:', e));
    });
  }, [decks, loaded]);

  // Create deck
  const createDeck = useCallback(async () => {
    try {
      const result = await slideApi.createDeck('Untitled Deck');
      if (result.success && result.data) {
        const newDeck = serverToLocal(result.data);
        await persistToIDB(newDeck);
        setDecks(prev => [newDeck, ...prev]);
        setActiveDeck(newDeck);
        setSlideFullscreen(true);
        persistence.latestContentRef.current = '';
        persistence.latestNameRef.current = 'Untitled Deck';
      }
    } catch {
      toast.error('Failed to create deck');
    }
  }, [setSlideFullscreen, persistence.latestContentRef, persistence.latestNameRef]);

  // Delete deck
  const deleteDeck = useCallback(async (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (deck?.content) {
      try {
        const parsed = JSON.parse(deck.content);
        const imageIds = (parsed.blocks || []).filter((b: any) => b.type === 'image' && b.imageId).map((b: any) => b.imageId);
        if (imageIds.length > 0) slideImageStorage.deleteImages(imageIds).catch(() => {});
      } catch {}
    }
    try { await slideApi.deleteDeck(deck?.serverId || deckId); } catch {}
    await slideOfflineStorage.deleteDeck(deckId).catch(() => {});
    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
      setSlideFullscreen(false);
    }
  }, [activeDeck, setSlideFullscreen, decks]);

  // Helper for conflict detection
  const getContentSummary = (content: string, name: string) => {
    try {
      const p = JSON.parse(content);
      return { slideCount: p.slides?.length || 0, blockCount: p.blocks?.length || 0, name };
    } catch { return { slideCount: 0, blockCount: 0, name }; }
  };

  // ---- Conflict Dialog (top-level early return) ----
  if (persistence.showConflict && persistence.conflictData) {
    return (
      <SlideConflictDialog
        open={persistence.showConflict}
        onClose={() => { persistence.setShowConflict(false); persistence.setConflictData(null); }}
        localUpdatedAt={new Date(persistence.conflictData.deck.updatedAt).getTime()}
        serverUpdatedAt={new Date(persistence.conflictData.serverData.updatedAt).getTime()}
        localSummary={persistence.conflictData.localSummary}
        serverSummary={persistence.conflictData.serverSummary}
        onKeepMine={persistence.handleConflictKeepLocal}
        onAcceptServer={persistence.handleConflictAcceptServer}
        onSaveAsNew={persistence.handleConflictSaveAsNew}
      />
    );
  }

  // ---- Active deck → Editor view ----
  if (activeDeck) {
    return (
      <SlideEditor
        deck={activeDeck}
        saving={persistence.saving}
        isLocalSaving={persistence.isLocalSaving}
        saveStatus={persistence.saveStatus}
        showRevertModal={persistence.showRevertModal}
        onSetShowRevertModal={persistence.setShowRevertModal}
        onCanvasChange={persistence.handleCanvasChange}
        onSave={persistence.handleSave}
        onClose={persistence.handleCloseDeck}
        onRevert={persistence.handleRevert}
        onRenameDeck={handleRenameDeck}
        onFlushContent={persistence.handleCanvasChange}
      />
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

                    let serverData: ServerSlideDeck | null = null;
                    try { serverData = await slideApi.fetchDeck(serverId); } catch {}

                    if (serverData && serverData.content) {
                      const serverTime = new Date(serverData.updatedAt).getTime();
                      if (serverTime > localTime && isLocalDirty) {
                        persistence.setConflictData({
                          deck,
                          serverData,
                          localSummary: getContentSummary(localContent || '', deck.name),
                          serverSummary: getContentSummary(serverData.content, serverData.name),
                        });
                        persistence.setShowConflict(true);
                        return;
                      } else if (!localContent || localContent.length < 10 || (serverTime >= localTime && !isLocalDirty)) {
                        const merged = serverToLocal(serverData);
                        const finalDeck = { ...deck, ...merged };
                        setActiveDeck(finalDeck);
                        persistence.latestContentRef.current = merged.content;
                        persistence.latestNameRef.current = merged.name;
                        await persistToIDB(finalDeck).catch(() => {});
                        setDecks(prev => prev.map(d => d.id === deck.id ? finalDeck : d));
                      } else {
                        setActiveDeck(deck);
                        persistence.latestContentRef.current = localContent;
                        persistence.latestNameRef.current = deck.name;
                      }
                    } else {
                      setActiveDeck(deck);
                      persistence.latestContentRef.current = localContent;
                      persistence.latestNameRef.current = deck.name;
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
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                    {deck.syncStatus === 'pending' && (
                      <span className="pl-1" title="Changes not synced to cloud">
                        <CloudOff className="w-3 h-3 text-blue-400" />
                      </span>
                    )}
                  </p>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
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
