'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { slideOfflineStorage } from '@/lib/storage/slideOfflineStorage';
import { slideImageStorage } from '@/lib/storage/slideImageStorage';
import { slideApi, ServerSlideDeck } from '@/lib/api/slideApi';
import { toast } from 'sonner';
import { useViewStore } from '@/lib/store/viewStore';
import { useSlideStore } from '@/lib/store/slideStore';

// Re-export so SlidesView doesn't need separate imports for these
export interface SlideDeck {
  id: string;
  serverId?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  previewContent?: string;
  syncStatus: 'synced' | 'pending';
  serverUpdatedAt?: number;
  cloudImages?: Array<{ imageId: string; cloudUrl: string; cloudPublicId: string }>;
  isPinned?: boolean;
  deckType?: string;
  hasUnsyncedChanges?: boolean;
}

/** Convert server API response to local SlideDeck */
export function serverToLocal(s: ServerSlideDeck): SlideDeck {
  return {
    id: s._id,
    serverId: s._id,
    name: s.name,
    content: s.content || s.previewContent || '',
    previewContent: s.previewContent || '',
    cloudImages: s.cloudImages,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    syncStatus: 'synced',
    isPinned: s.isPinned,
    deckType: s.deckType,
    serverUpdatedAt: new Date(s.updatedAt).getTime(),
    hasUnsyncedChanges: false,
  };
}

/** Convert IndexedDB record to local SlideDeck */
export function offlineToLocal(o: any): SlideDeck {
  return {
    id: o.id,
    serverId: o.serverId,
    name: o.name,
    content: o.content,
    previewContent: o.previewContent,
    cloudImages: o.cloudImages,
    createdAt: o.createdAt || new Date(o.updatedAt).toISOString(),
    updatedAt: new Date(o.updatedAt).toISOString(),
    syncStatus: o.syncStatus,
    isPinned: o.isPinned,
    deckType: o.deckType,
    serverUpdatedAt: o.serverUpdatedAt,
    hasUnsyncedChanges: o.syncStatus !== 'synced',
  };
}

/** Save a SlideDeck to IndexedDB — sanitizes blob URLs to 'IDB_IMAGE' */
export async function persistToIDB(deck: SlideDeck): Promise<void> {
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
    { serverId: deck.serverId, cloudImages: deck.cloudImages, isPinned: deck.isPinned, deckType: deck.deckType, createdAt: deck.createdAt, previewContent: deck.previewContent }
  );
}

// ---------------------------------------------------------------------------
// Conflict data shape
// ---------------------------------------------------------------------------
export interface ConflictData {
  deck: SlideDeck;
  serverData: ServerSlideDeck;
  localSummary: { slideCount: number; blockCount: number; name: string };
  serverSummary: { slideCount: number; blockCount: number; name: string };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSlidePersistence() {
  const { activeDeck, setActiveDeck, updateDeck, setDecks, addDeck } = useSlideStore();
  const setSlideFullscreen = useViewStore((state) => state.setSlideFullscreen);

  const [saving, setSaving] = useState(false);
  const [isLocalSaving, setIsLocalSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const latestContentRef = useRef<string>('');
  const latestNameRef = useRef<string>('');
  const activeDeckRef = useRef<SlideDeck | null>(null);
  const canvasDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state
  useEffect(() => { activeDeckRef.current = activeDeck; }, [activeDeck]);

  // ----- Canvas content change (debounced IDB save) -----
  const handleCanvasChange = useCallback((content: string) => {
    const deckId = activeDeckRef.current?.id;
    if (!deckId) return;

    // Immediately update the content ref so handleSave always reads fresh data
    latestContentRef.current = content;

    // Auto-rename if still "Untitled Deck" or synced to first slide title
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
      if ((isDefaultName || isStillAutoSyncing) && newFirstSlideTitle && newFirstSlideTitle.trim() !== '') {
        latestNameRef.current = newFirstSlideTitle;
        updateDeck(deckId, { name: newFirstSlideTitle });
      }
    } catch {}

    // Instantly set sync status to pending to update the icon immediately
    if (activeDeckRef.current?.syncStatus === 'synced') {
      const now = new Date().toISOString();
      updateDeck(deckId, { syncStatus: 'pending' as const, updatedAt: now, hasUnsyncedChanges: true });
    }

    if (canvasDebounceRef.current) clearTimeout(canvasDebounceRef.current);
    
    // Quick debounce for saving to IDB (700ms like Docs)
    // isLocalSaving indicator only shows after debounce settles (matches block movement behavior)
    canvasDebounceRef.current = setTimeout(() => {
      setIsLocalSaving(true);
      const currentDeck = activeDeckRef.current;

      updateDeck(deckId, { content, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const, hasUnsyncedChanges: true });

      // Sanitize blob URLs before IDB save
      if (currentDeck) {
        let contentForIDB = content;
        try {
          const parsed = JSON.parse(content);
          if (parsed.blocks) {
            parsed.blocks = parsed.blocks.map((b: any) => {
              if (b.type === 'image' && b.url?.startsWith('blob:')) {
                return { ...b, url: 'IDB_IMAGE' };
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
    }, 700);
  }, [updateDeck]);

  // ----- Save to server -----
  const handleSave = useCallback(async () => {
    if (!activeDeck || saving) return null;
    const serverId = activeDeck.serverId || activeDeck.id;
    const content = latestContentRef.current || activeDeck.content;
    const name = latestNameRef.current || activeDeck.name;

    setSaving(true);
    setSaveStatus('saving');

    try {
      let allImageIds: string[] = [];
      let pendingImageIds: string[] = [];
      let parsed: any = null;

      if (content) {
        try {
          parsed = JSON.parse(content);
          const imageBlocks = (parsed.blocks || []).filter((b: any) => b.type === 'image' && b.imageId);
          allImageIds = imageBlocks.map((b: any) => b.imageId);
          pendingImageIds = imageBlocks
            .filter((b: any) => !b.isUploaded)
            .map((b: any) => b.imageId);
        } catch {}
      }

      // Sanitize for server
      let contentForServer = content;
      if (parsed) {
        const serverBlocks = (parsed.blocks || []).map((b: any) => {
          if (b.type === 'image') {
            const cleaned = { ...b };
            if (cleaned.url?.startsWith('blob:')) cleaned.url = 'PENDING_UPLOAD';
            return cleaned;
          }
          return b;
        });
        contentForServer = JSON.stringify({ ...parsed, blocks: serverBlocks });
      }

      const result = await slideApi.saveDeck(serverId, { content: contentForServer, name }, pendingImageIds, allImageIds);

      if (result.success) {
        const serverUpdatedAtStr = result.data?.updatedAt || new Date().toISOString();
        const serverUpdatedAtMs = new Date(serverUpdatedAtStr).getTime();

        const syncUpdates: Partial<SlideDeck> = {
          updatedAt: serverUpdatedAtStr,
          syncStatus: 'synced' as const,
          serverUpdatedAt: serverUpdatedAtMs,
          hasUnsyncedChanges: false,
        };
        if (result.data?.cloudImages) syncUpdates.cloudImages = result.data.cloudImages;

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

        updateDeck(activeDeck.id, syncUpdates);

        await slideOfflineStorage.saveDeck(
          activeDeck.id, finalContent, name, 'synced', serverUpdatedAtMs,
          { serverId: activeDeck.serverId, cloudImages: syncUpdates.cloudImages || activeDeck.cloudImages, createdAt: activeDeck.createdAt }
        ).catch(() => {});

        setSaveStatus('saved');
        toast.success('Deck saved!');
        setTimeout(() => setSaveStatus('idle'), 2000);

        return finalContent;
      }
    } catch (err) {
      console.error('[SlidesView] Save failed:', err);
      toast.error('Failed to save deck');
      setSaveStatus('idle');
    } finally {
      setSaving(false);
    }
    return null;
  }, [activeDeck, saving, updateDeck]);

  // ----- Close deck -----
  const handleCloseDeck = useCallback(() => {
    setActiveDeck(null);
    setSlideFullscreen(false);
    setSaveStatus('idle');
  }, [setSlideFullscreen, setActiveDeck]);

  // ----- Conflict handlers -----
  const handleConflictKeepLocal = useCallback(async () => {
    if (!conflictData) return;
    const { deck } = conflictData;
    setActiveDeck(deck);
    latestContentRef.current = deck.content;
    latestNameRef.current = deck.name;
    setSlideFullscreen(true);
    setShowConflict(false);
    setConflictData(null);
    toast.success('Keeping your local changes. Save to sync to cloud.');
  }, [conflictData, setSlideFullscreen, setActiveDeck]);

  const handleConflictAcceptServer = useCallback(async () => {
    if (!conflictData) return;
    const { deck, serverData } = conflictData;
    const merged = serverToLocal(serverData);
    const finalDeck = { ...deck, ...merged };
    setActiveDeck(finalDeck);
    latestContentRef.current = merged.content;
    latestNameRef.current = merged.name;
    await persistToIDB(finalDeck).catch(() => {});
    updateDeck(deck.id, merged);
    setSlideFullscreen(true);
    setShowConflict(false);
    setConflictData(null);
    toast.success('Server version loaded');
  }, [conflictData, setSlideFullscreen, setActiveDeck, updateDeck]);

  const handleConflictSaveAsNew = useCallback(async () => {
    if (!conflictData) return;
    const { deck, serverData } = conflictData;
    try {
      const result = await slideApi.createDeck(`${deck.name} (Local Copy)`);
      if (result.success && result.data) {
        const newDeck = serverToLocal(result.data);
        newDeck.content = deck.content;
        newDeck.syncStatus = 'pending';
        newDeck.hasUnsyncedChanges = true;
        await persistToIDB(newDeck);
        addDeck(newDeck);
        toast.success(`Local copy saved as "${newDeck.name}"`);
      }
    } catch { toast.error('Failed to save local copy'); }
    const merged = serverToLocal(serverData);
    const finalDeck = { ...deck, ...merged };
    setActiveDeck(finalDeck);
    latestContentRef.current = merged.content;
    latestNameRef.current = merged.name;
    await persistToIDB(finalDeck).catch(() => {});
    updateDeck(deck.id, merged);
    setSlideFullscreen(true);
    setShowConflict(false);
    setConflictData(null);
  }, [conflictData, setSlideFullscreen, setActiveDeck, updateDeck, addDeck]);

  const handleRevert = useCallback(async () => {
    if (!activeDeck) return null;
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
        updateDeck(activeDeck.id, merged);
        toast.success('Reverted to server version');
        setShowRevertModal(false);
        return finalDeck.content;
      } else {
        toast.error('No server version available');
      }
    } catch {
      toast.error('Failed to fetch server version');
    }
    setShowRevertModal(false);
    return null;
  }, [activeDeck, setActiveDeck, updateDeck]);

  return {
    // State
    saving,
    isLocalSaving,
    saveStatus,
    showRevertModal,
    setShowRevertModal,
    showConflict,
    setShowConflict,
    conflictData,
    setConflictData,
    latestContentRef,
    latestNameRef,

    // Handlers
    handleCanvasChange,
    handleSave,
    handleCloseDeck,
    handleConflictKeepLocal,
    handleConflictAcceptServer,
    handleConflictSaveAsNew,
    handleRevert,
  };
}
