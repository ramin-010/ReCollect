/**
 * Slide Offline Storage — IndexedDB-backed persistence for slide decks.
 * Mirrors the pattern in offlineStorage.ts (used by Docs).
 * 
 * Each deck is stored with:
 *   - content (JSON string of SlideCanvasData)
 *   - name
 *   - syncStatus ('synced' | 'pending')
 *   - updatedAt (local timestamp ms)
 *   - serverUpdatedAt (last known server timestamp ms)
 */

export const SLIDE_DB_NAME = 'RecollectDB_Slide';
export const SLIDE_STORE_NAME = 'slide_decks';
export const SLIDE_DB_VERSION = 1;

export interface OfflineSlideDeck {
  id: string;             // local UUID or server _id
  serverId?: string;      // MongoDB _id (if synced)
  content: string;        // JSON string of SlideCanvasData
  previewContent?: string; // JSON string of first slide only
  name: string;
  updatedAt: number;      // local timestamp (ms)
  serverUpdatedAt?: number; // last known server timestamp (ms)
  syncStatus: 'synced' | 'pending';
  cloudImages?: Array<{ imageId: string; cloudUrl: string; cloudPublicId: string }>;
  isPinned?: boolean;
  deckType?: string;
  createdAt?: string;
}

export const slideOfflineStorage = {

  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SLIDE_DB_NAME, SLIDE_DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SLIDE_STORE_NAME)) {
          db.createObjectStore(SLIDE_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  /**
   * Save or update a deck in IndexedDB.
   * When syncStatus is 'synced', updatedAt is set to serverUpdatedAt to indicate parity.
   */
  async saveDeck(
    id: string,
    content: string,
    name: string,
    syncStatus: 'synced' | 'pending' = 'pending',
    serverUpdatedAt?: number,
    extra?: Partial<OfflineSlideDeck>
  ): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SLIDE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(SLIDE_STORE_NAME);

      const deck: OfflineSlideDeck = {
        id,
        serverId: extra?.serverId,
        content,
        previewContent: extra?.previewContent,
        name,
        updatedAt: syncStatus === 'synced' && serverUpdatedAt ? serverUpdatedAt : Date.now(),
        serverUpdatedAt,
        syncStatus,
        cloudImages: extra?.cloudImages,
        isPinned: extra?.isPinned,
        deckType: extra?.deckType,
        createdAt: extra?.createdAt,
      };

      const request = store.put(deck);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  /**
   * Load a single deck from IndexedDB by id.
   */
  async loadDeck(id: string): Promise<OfflineSlideDeck | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SLIDE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SLIDE_STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },

  /**
   * Mark a deck as synced and update the server timestamp.
   */
  async markAsSynced(id: string, serverUpdatedAt: number): Promise<void> {
    const existing = await this.loadDeck(id);
    if (!existing) return;

    await this.saveDeck(
      id,
      existing.content,
      existing.name,
      'synced',
      serverUpdatedAt,
      { serverId: existing.serverId, cloudImages: existing.cloudImages, isPinned: existing.isPinned, deckType: existing.deckType, createdAt: existing.createdAt }
    );
  },

  /**
   * Delete a deck from IndexedDB.
   */
  async deleteDeck(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SLIDE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(SLIDE_STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  /**
   * Get all decks from IndexedDB.
   */
  async getAllDecks(): Promise<OfflineSlideDeck[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SLIDE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SLIDE_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as OfflineSlideDeck[]);
    });
  },

  /**
   * Get only pending (unsynced) decks from IndexedDB.
   */
  async getPendingDecks(): Promise<OfflineSlideDeck[]> {
    const all = await this.getAllDecks();
    return all.filter(d => d.syncStatus === 'pending');
  },
};
