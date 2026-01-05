export const DB_NAME = 'RecollectDB_Doc';
export const STORE_NAME = 'docs';
export const DB_VERSION = 3; // Bumped for yjsState migration

export interface OfflineDoc {
  id: string;
  yjsState: string; // Base64 Yjs state - single source of truth
  title: string;
  coverImage: string | null;
  updatedAt: number;             // Local timestamp
  serverUpdatedAt?: number;      // Last known server timestamp
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export const offlineStorage = {
  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  },

  async saveDoc(
    id: string, 
    yjsState: string, 
    title: string, 
    coverImage: string | null,
    syncStatus: 'synced' | 'pending' | 'conflict' = 'pending',
    serverUpdatedAt?: number
  ): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const doc: OfflineDoc = {
        id,
        yjsState,
        title,
        coverImage,
        updatedAt: Date.now(),
        syncStatus,
        serverUpdatedAt,
      };

      const request = store.put(doc);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async loadDoc(id: string): Promise<OfflineDoc | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  },

  async deleteDoc(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async getAllPendingDocs(): Promise<OfflineDoc[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const allDocs = request.result as OfflineDoc[];
        const pendingDocs = allDocs.filter(doc => doc.syncStatus === 'pending');
        resolve(pendingDocs);
      };
    });
  },

  async getAllOfflineDocs(): Promise<OfflineDoc[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as OfflineDoc[]);
      };
    });
  },
};
