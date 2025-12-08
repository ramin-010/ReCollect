export const DB_NAME = 'RecollectDB_Doc';
export const STORE_NAME = 'docs';
export const DB_VERSION = 1;

interface OfflineDoc {
  id: string;
  content: any;
  title: string;
  coverImage: string | null;
  updatedAt: number;
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

  async saveDoc(id: string, content: any, title: string, coverImage: string | null): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const doc: OfflineDoc = {
        id,
        content,
        title,
        coverImage,
        updatedAt: Date.now(),
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
};
