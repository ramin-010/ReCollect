'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Presentation, Trash2, Clock, CloudOff, 
  LayoutGrid, List, Search, ArrowUpDown, Sparkles, FileText, ChevronDown, MonitorPlay,
  FlaskConical, LayoutTemplate, Layers, GalleryHorizontal, Images, FileStack,
  GalleryVerticalEnd, Files
} from 'lucide-react';
import { AiTestFeeder } from './ai-test/AiTestFeeder';

import { Button } from '@/components/ui-base/Button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { slideImageStorage } from '@/lib/storage/slideImageStorage';
import { slideOfflineStorage } from '@/lib/storage/slideOfflineStorage';
import { slideApi, ServerSlideDeck } from '@/lib/api/slideApi';
import { useViewStore } from '@/lib/store/viewStore';
import { SlideConflictDialog } from './SlideConflictDialog';
import { SlideEditor } from './editor/SlideEditor';
import {
  SlideDeck,
  serverToLocal,
  persistToIDB,
  useSlidePersistence,
} from './editor/useSlidePersistence';
import { SlideCard } from './SlideCard';
import { SlideListRow } from './SlideListRow';
import { SlideSkeletonGrid } from './SlideCardSkeleton';
import { useSlideStore } from '@/lib/store/slideStore';
import { toast } from 'sonner';

// =====================================================================
// SlidesView — Grid + Editor orchestrator
// =====================================================================
export function SlidesView() {
  const { 
    decks, activeDeck, isLoading, isInitialized, 
    setDecks, updateDeck, addDeck, removeDeck, 
    setActiveDeck, fetchDecks 
  } = useSlideStore();
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [showAiTest, setShowAiTest] = useState(false);
  const isDev = process.env.NODE_ENV === "development"; 


  const setSlideFullscreen = useViewStore((state) => state.setSlideFullscreen);

  // Debounce timeouts for card-level actions
  const pinTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const typeTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const renameTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Persistence hook (save, sync, conflict, revert)
  const persistence = useSlidePersistence();

  // =====================================================================
  // INIT STORE (server-first, matches docs)
  // =====================================================================
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      fetchDecks();
    }
    setSlideFullscreen(false);
    return () => setSlideFullscreen(false);
  }, [fetchDecks, isInitialized, isLoading, setSlideFullscreen]);

  // =====================================================================
  // Create deck (server-first, like docs POST /api/docs)
  // =====================================================================
  const createDeck = useCallback(async () => {
    try {
      const result = await slideApi.createDeck('Untitled Deck');
      if (result.success && result.data) {
        const newDeck = serverToLocal(result.data);
        await persistToIDB(newDeck);
        addDeck(newDeck);
        setActiveDeck(newDeck);
        setSlideFullscreen(true);
        persistence.latestContentRef.current = '';
        persistence.latestNameRef.current = 'Untitled Deck';
      }
    } catch {
      toast.error('Failed to create deck');
    }
  }, [addDeck, setActiveDeck, setSlideFullscreen, persistence.latestContentRef, persistence.latestNameRef]);

  // =====================================================================
  // Delete deck
  // =====================================================================
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
    removeDeck(deckId);
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
      setSlideFullscreen(false);
    }
  }, [activeDeck, decks, removeDeck, setActiveDeck, setSlideFullscreen]);

  // =====================================================================
  // Conflict detection helper
  // =====================================================================
  const getContentSummary = (content: string, name: string) => {
    try {
      const p = JSON.parse(content);
      return { slideCount: p.slides?.length || 0, blockCount: p.blocks?.length || 0, name };
    } catch { return { slideCount: 0, blockCount: 0, name }; }
  };

  // =====================================================================
  // Card-level actions: Debounced PATCH + manual IDB sync after success
  // Pattern: Optimistic Zustand → debounced API PATCH → on success: 
  //          load existing IDB record → re-save with server's updatedAt
  // =====================================================================

  const togglePin = useCallback((deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const newStatus = !deck.isPinned;

    // 1. Optimistic Zustand update
    updateDeck(deckId, { isPinned: newStatus });
    toast.success(newStatus ? 'Pinned' : 'Unpinned');

    // 2. Debounced API PATCH + IDB sync
    const serverId = deck.serverId || deck.id;
    if (pinTimeouts.current[deckId]) clearTimeout(pinTimeouts.current[deckId]);

    pinTimeouts.current[deckId] = setTimeout(async () => {
      try {
        const response = await slideApi.patchDeck(serverId, { isPinned: newStatus });
        if (response.success && response.data) {
          const serverUpdatedAt = new Date(response.data.updatedAt).getTime();
          // Update Zustand with server timestamp
          updateDeck(deckId, { isPinned: newStatus, updatedAt: response.data.updatedAt });
          // Manual IDB sync: load existing → re-save with server timestamp
          const offlineDoc = await slideOfflineStorage.loadDeck(deckId);
          if (offlineDoc) {
            await slideOfflineStorage.saveDeck(
              deckId, offlineDoc.content, offlineDoc.name, 'synced', serverUpdatedAt,
              { serverId: offlineDoc.serverId, cloudImages: offlineDoc.cloudImages, isPinned: newStatus, deckType: offlineDoc.deckType, createdAt: offlineDoc.createdAt, previewContent: offlineDoc.previewContent }
            );
          }
        }
      } catch (err) {
        console.error('[SlidesView] Failed to sync pin status:', err);
        // Revert optimistic update
        updateDeck(deckId, { isPinned: !newStatus });
        toast.error('Failed to update pin status');
      } finally {
        delete pinTimeouts.current[deckId];
      }
    }, 500);
  }, [decks, updateDeck]);

  const changeDeckType = useCallback((deckId: string, type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    // 1. Optimistic Zustand update
    updateDeck(deckId, { deckType: type });
    toast.success(`Deck type changed to ${type}`);

    // 2. Debounced API PATCH + IDB sync
    const serverId = deck.serverId || deck.id;
    if (typeTimeouts.current[deckId]) clearTimeout(typeTimeouts.current[deckId]);

    typeTimeouts.current[deckId] = setTimeout(async () => {
      try {
        const response = await slideApi.patchDeck(serverId, { deckType: type });
        if (response.success && response.data) {
          const serverUpdatedAt = new Date(response.data.updatedAt).getTime();
          updateDeck(deckId, { deckType: type, updatedAt: response.data.updatedAt });
          // Manual IDB sync
          const offlineDoc = await slideOfflineStorage.loadDeck(deckId);
          if (offlineDoc) {
            await slideOfflineStorage.saveDeck(
              deckId, offlineDoc.content, offlineDoc.name, 'synced', serverUpdatedAt,
              { serverId: offlineDoc.serverId, cloudImages: offlineDoc.cloudImages, isPinned: offlineDoc.isPinned, deckType: type, createdAt: offlineDoc.createdAt, previewContent: offlineDoc.previewContent }
            );
          }
        }
      } catch (err) {
        console.error('[SlidesView] Failed to sync deck type:', err);
        toast.error('Failed to change deck type');
      } finally {
        delete typeTimeouts.current[deckId];
      }
    }, 500);
  }, [decks, updateDeck]);

  const handleRenameDeck = useCallback((deckId: string, name: string) => {
    const finalName = name.trim() || 'Untitled Deck';
    
    // 1. Optimistic Zustand update + update refs if this is the active deck
    updateDeck(deckId, { name: finalName });
    if (activeDeck?.id === deckId) {
      persistence.latestNameRef.current = finalName;
    }

    // 2. Debounced API PATCH + IDB sync
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const serverId = deck.serverId || deck.id;
    if (renameTimeouts.current[deckId]) clearTimeout(renameTimeouts.current[deckId]);

    renameTimeouts.current[deckId] = setTimeout(async () => {
      try {
        const response = await slideApi.patchDeck(serverId, { name: finalName });
        if (response.success && response.data) {
          const serverUpdatedAt = new Date(response.data.updatedAt).getTime();
          updateDeck(deckId, { name: finalName, updatedAt: response.data.updatedAt });
          // Manual IDB sync
          const offlineDoc = await slideOfflineStorage.loadDeck(deckId);
          if (offlineDoc) {
            await slideOfflineStorage.saveDeck(
              deckId, offlineDoc.content, finalName, 'synced', serverUpdatedAt,
              { serverId: offlineDoc.serverId, cloudImages: offlineDoc.cloudImages, isPinned: offlineDoc.isPinned, deckType: offlineDoc.deckType, createdAt: offlineDoc.createdAt, previewContent: offlineDoc.previewContent }
            );
          }
        }
      } catch (err) {
        console.error('[SlidesView] Failed to sync deck name:', err);
      } finally {
        delete renameTimeouts.current[deckId];
      }
    }, 500);
  }, [decks, activeDeck, updateDeck, persistence.latestNameRef]);

  // =====================================================================
  // Opening a deck: IDB instant → server background → conflict check
  // =====================================================================
  const handleOpenDeck = useCallback(async (deck: SlideDeck) => {
    const serverId = deck.serverId || deck.id;
    const localContent = deck.content;
    const localTime = new Date(deck.updatedAt).getTime();
    const isLocalDirty = deck.syncStatus === 'pending';

    // 1. Open instantly with whatever we have (could be previewContent or full content)
    setActiveDeck(deck);
    persistence.latestContentRef.current = localContent;
    persistence.latestNameRef.current = deck.name;
    setSlideFullscreen(true);

    // 2. Fetch full content from server in background
    try {
      const serverData = await slideApi.fetchDeck(serverId);
      if (!serverData || !serverData.content) return;

      const serverTime = new Date(serverData.updatedAt).getTime();

      // Case A: Conflict — server changed AND local has unsynced changes
      if (serverTime > localTime && isLocalDirty) {
        persistence.setConflictData({
          deck,
          serverData,
          localSummary: getContentSummary(localContent || '', deck.name),
          serverSummary: getContentSummary(serverData.content, serverData.name),
        });
        persistence.setShowConflict(true);
        return;
      }

      // Case B: Server is newer, local is clean → accept server silently
      // No IDB write here — content will be cached on first edit via debounced handleCanvasChange
      if (serverTime > localTime && !isLocalDirty) {
        const merged = serverToLocal(serverData);
        const finalDeck = { ...deck, ...merged };
        setActiveDeck(finalDeck);
        persistence.latestContentRef.current = merged.content;
        persistence.latestNameRef.current = merged.name;
        updateDeck(deck.id, merged);
        return;
      }

      // Case C: Local is newer and dirty → keep local
      if (localTime > serverTime && isLocalDirty) {
        // Already showing local, just keep it
        return;
      }

      // Case D: Same timestamp or local is synced → always merge server content
      // (needed because list view only has previewContent, server has full content)
      // No IDB write here — content will be cached on first edit via debounced handleCanvasChange
      if (!isLocalDirty) {
        const merged = serverToLocal(serverData);
        const finalDeck = { ...deck, ...merged };
        setActiveDeck(finalDeck);
        persistence.latestContentRef.current = merged.content;
        persistence.latestNameRef.current = merged.name;
        updateDeck(deck.id, merged);
      }
    } catch (error) {
      console.error('[SlidesView] Background fetch failed:', error);
    }
  }, [setActiveDeck, setSlideFullscreen, updateDeck, persistence]);

  // =====================================================================
  // Sorting / Filtering
  // =====================================================================
  const filteredDecks = decks
    .filter((deck) => deck.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.name.localeCompare(b.name);
    });

  const pinnedDecks = filteredDecks.filter(d => d.isPinned);
  const unpinnedDecks = filteredDecks.filter(d => !d.isPinned);
  const allSortedDecks = [...pinnedDecks, ...unpinnedDecks];

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

  // ---- AI Test Feeder ----
  if (showAiTest) {
    return <AiTestFeeder onClose={() => setShowAiTest(false)} />;
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
      />
    );
  }

  // ---- Deck List View ----
  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-10 lg:px-12">
        {/* Header Area */}
        <div className="max-w-[1060px] mx-auto mb-4" >
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            <Files className="h-6 w-6 text-blue-400/50 " />
            Slide Decks
          </h1>
          <p className="text-[0.9rem] text-[hsl(var(--muted-foreground))] mt-1">Create and manage your slide presentations.</p>
        </div>

        {/* View Tabs & Controls */}
        <div className="max-w-[1060px] mx-auto flex items-center justify-between gap-4 py-2 mb-6">
          <div className="flex items-center gap-1 p-1 bg-[hsl(var(--card-bg))] rounded-lg">
             <button onClick={() => setViewMode('gallery')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'gallery' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <LayoutGrid className="w-4 h-4" /> Gallery
             </button>
             <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}>
               <List className="w-4 h-4" /> List
             </button>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
               <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 pl-9 pr-3 py-1.5 rounded-md bg-[hsl(var(--card-bg))] border border-transparent focus:border-[hsl(var(--border))] focus:bg-[hsl(var(--card-bg))]/50 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))]" />
             </div>
             
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card-bg))] transition-colors">
                   <ArrowUpDown className="w-4 h-4" /> Sort
                 </button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-40">
                 <DropdownMenuItem onClick={() => setSortBy('updated')}>
                   <Clock className="w-4 h-4 mr-2" /> Last updated
                   {sortBy === 'updated' && <span className="ml-auto text-amber-500">✓</span>}
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortBy('created')}>
                   <Sparkles className="w-4 h-4 mr-2" /> Date created
                   {sortBy === 'created' && <span className="ml-auto text-amber-500">✓</span>}
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSortBy('title')}>
                   <FileText className="w-4 h-4 mr-2" /> Title
                   {sortBy === 'title' && <span className="ml-auto text-amber-500">✓</span>}
                 </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {isDev &&<button
                onClick={() => setShowAiTest(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card-bg))] transition-colors font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Assist
              </button>}

              <Button onClick={createDeck} className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90 border-0 gap-1.5 shadow-sm" size="sm">
                <Plus className="w-3.5 h-3.5" /> New
              </Button>
          </div>
        </div>

        <div className="max-w-[1060px] mx-auto">

        {/* Deck Cards */}
        {isLoading ? (
           <SlideSkeletonGrid count={4} />
        ) : allSortedDecks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center py-20 border border-dashed border-[hsl(var(--border))] rounded-xl"
          >
            <Files className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]/30" />
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
        ) : viewMode === 'gallery' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
              {allSortedDecks.map((deck, index) => (
                <motion.div key={deck.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}>
                <SlideCard
                  deck={deck}
                  index={index}
                  onOpen={() => handleOpenDeck(deck)}
                  onDelete={deleteDeck}
                  onPresent={(deckToPresent: SlideDeck) => {
                    const serverId = deckToPresent.serverId || deckToPresent.id;
                    slideApi.fetchDeck(serverId).then(serverData => {
                      if (serverData) {
                        const local = serverToLocal(serverData);
                        setActiveDeck(local);
                        persistence.latestContentRef.current = local.content;
                        persistence.latestNameRef.current = local.name;
                        setTimeout(() => setSlideFullscreen(true), 0);
                      }
                    });
                  }}
                  onTogglePin={togglePin}
                  onChangeDeckType={changeDeckType}
                  onRenameDeck={handleRenameDeck}
                />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
               <div className="flex items-center gap-4 px-4 py-2.5 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))] text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                 <span className="w-4" /> 
                 <span className="flex-1">Name</span> 
                 <span className="w-24">Slides</span>
                 <span className="w-28 pl-4">Tag</span> 
                 <span className="w-24 text-right">Updated</span> 
                 <span className="w-20" />
               </div>
               <AnimatePresence>
                 {allSortedDecks.map((deck, index) => (
                   <SlideListRow
                     key={deck.id}
                     deck={deck}
                     index={index}
                     onOpen={() => handleOpenDeck(deck)}
                     onDelete={deleteDeck}
                     onPresent={(deckToPresent: SlideDeck) => {
                        const serverId = deckToPresent.serverId || deckToPresent.id;
                        slideApi.fetchDeck(serverId).then(serverData => {
                          if (serverData) {
                            const local = serverToLocal(serverData);
                            setActiveDeck(local);
                            persistence.latestContentRef.current = local.content;
                            persistence.latestNameRef.current = local.name;
                            setTimeout(() => setSlideFullscreen(true), 0);
                          }
                        });
                     }}
                     onTogglePin={togglePin}
                     onChangeDeckType={changeDeckType}
                     onRenameDeck={handleRenameDeck}
                   />
                 ))}
               </AnimatePresence>
                 <button onClick={createDeck} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[hsl(var(--muted))]/30 cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                   <Plus className="w-4 h-4" /> <span className="text-sm">New deck</span>
                 </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
