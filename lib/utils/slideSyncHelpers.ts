import { SlideDeck } from '@/components/slides/editor/useSlidePersistence';
import { OfflineSlideDeck } from '@/lib/storage/slideOfflineStorage';

/**
 * Merges server slide decks with offline (IDB) decks to determine
 * the most up-to-date state and calculate correct sync status.
 * Mirrors the pattern from docSyncHelpers.ts.
 */
export function mergeSlideDecksWithOffline(
  serverDecks: any[],
  offlineDecks: OfflineSlideDeck[]
): SlideDeck[] {
  const offlineMap = new Map(offlineDecks.map(od => [od.id, od]));

  // 1. Merge server decks with local changes
  const mergedServerDecks: SlideDeck[] = serverDecks.map((serverDeck: any) => {
    const offlineDeck = offlineMap.get(serverDeck._id);

    // No offline data → clean server deck
    if (!offlineDeck) {
      return {
        id: serverDeck._id,
        serverId: serverDeck._id,
        name: serverDeck.name,
        content: serverDeck.content || serverDeck.previewContent || '',
        previewContent: serverDeck.previewContent || '',
        cloudImages: serverDeck.cloudImages,
        createdAt: serverDeck.createdAt,
        updatedAt: serverDeck.updatedAt,
        syncStatus: 'synced' as const,
        isPinned: serverDeck.isPinned,
        deckType: serverDeck.deckType,
        serverUpdatedAt: new Date(serverDeck.updatedAt).getTime(),
        hasUnsyncedChanges: false,
      };
    }

    // Has offline data → compare timestamps and sync status
    const serverUpdatedAt = new Date(serverDeck.updatedAt).getTime();
    const offlineUpdatedAt = offlineDeck.updatedAt || 0;
    const offlineServerUpdatedAt = offlineDeck.serverUpdatedAt || 0;

    // Determine if local has unsynced changes (same logic as docs)
    const hasUnsyncedChanges =
      offlineDeck.syncStatus !== 'synced' ||
      !offlineDeck.serverUpdatedAt ||
      offlineUpdatedAt > offlineServerUpdatedAt;

    if (offlineUpdatedAt > serverUpdatedAt) {
      // IDB is newer → use local content (user has pending changes)
      return {
        id: serverDeck._id,
        serverId: serverDeck._id,
        name: offlineDeck.name, // Use local name if newer
        content: offlineDeck.content,
        previewContent: serverDeck.previewContent || offlineDeck.previewContent || '',
        cloudImages: offlineDeck.cloudImages || serverDeck.cloudImages,
        createdAt: serverDeck.createdAt,
        updatedAt: new Date(offlineUpdatedAt).toISOString(),
        syncStatus: hasUnsyncedChanges ? 'pending' as const : 'synced' as const,
        isPinned: offlineDeck.isPinned ?? serverDeck.isPinned,
        deckType: offlineDeck.deckType || serverDeck.deckType,
        serverUpdatedAt: offlineServerUpdatedAt,
        hasUnsyncedChanges,
      };
    }

    // Server is newer or equal → server data wins for metadata,
    // but keep local content if it exists (since server list only returns previewContent)
    return {
      id: serverDeck._id,
      serverId: serverDeck._id,
      name: serverDeck.name,
      content: offlineDeck.content || serverDeck.content || serverDeck.previewContent || '',
      previewContent: serverDeck.previewContent || '',
      cloudImages: serverDeck.cloudImages,
      createdAt: serverDeck.createdAt,
      updatedAt: serverDeck.updatedAt,
      syncStatus: hasUnsyncedChanges ? 'pending' as const : 'synced' as const,
      isPinned: serverDeck.isPinned,
      deckType: serverDeck.deckType,
      serverUpdatedAt: serverUpdatedAt,
      hasUnsyncedChanges,
    };
  });

  return mergedServerDecks;
}
