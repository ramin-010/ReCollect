/**
 * Drawing Offline Storage
 * IndexedDB persistence for drawings with sync status tracking
 */

export const DRAWING_DB_NAME = 'RecollectDB_Drawing';
export const DRAWING_STORE_NAME = 'drawings';
export const DRAWING_DB_VERSION = 1;

export interface OfflineDrawing {
  id: string;
  yjsState: string;  // Base64 Yjs state
  name: string;
  thumbnail: string;
  updatedAt: number;              // Local timestamp
  serverUpdatedAt?: number;       // Last known server timestamp
  syncStatus: 'synced' | 'pending';
}

export const drawingOfflineStorage = {
  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DRAWING_DB_NAME, DRAWING_DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(DRAWING_STORE_NAME)) {
          db.createObjectStore(DRAWING_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  async saveDrawing(
    id: string,
    yjsState: string,
    name: string,
    thumbnail: string = '',
    syncStatus: 'synced' | 'pending' = 'pending',
    serverUpdatedAt?: number
  ): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAWING_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DRAWING_STORE_NAME);
      const drawing: OfflineDrawing = {
        id,
        yjsState,
        name,
        thumbnail,
        updatedAt: syncStatus === 'synced' && serverUpdatedAt ? serverUpdatedAt : Date.now(),
        syncStatus,
        serverUpdatedAt,
      };

      const request = store.put(drawing);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async loadDrawing(id: string): Promise<OfflineDrawing | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAWING_STORE_NAME, 'readonly');
      const store = transaction.objectStore(DRAWING_STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },

  async markAsSynced(id: string, serverUpdatedAt?: number): Promise<void> {
    const existing = await this.loadDrawing(id);
    if (!existing) return;
    
    const now = serverUpdatedAt || Date.now();
    await this.saveDrawing(
      id,
      existing.yjsState,
      existing.name,
      existing.thumbnail,
      'synced',
      now
    );
  },

  async deleteDrawing(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAWING_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DRAWING_STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async getAllPendingDrawings(): Promise<OfflineDrawing[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAWING_STORE_NAME, 'readonly');
      const store = transaction.objectStore(DRAWING_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const allDrawings = request.result as OfflineDrawing[];
        const pendingDrawings = allDrawings.filter(d => d.syncStatus === 'pending');
        resolve(pendingDrawings);
      };
    });
  },

  async getAllOfflineDrawings(): Promise<OfflineDrawing[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAWING_STORE_NAME, 'readonly');
      const store = transaction.objectStore(DRAWING_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as OfflineDrawing[]);
      };
    });
  },
};
