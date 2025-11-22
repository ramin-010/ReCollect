// #change1: NEW FILE - IndexedDB storage layer for images
// This replaces base64 encoding/decoding for better performance

class ImageStorage {
  private dbName = 'ReCollectImagesDB';
  private storeName = 'images';
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  // Store original File/Blob
  async storeImage(id: string, file: File | Blob): Promise<string> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(file, id);
      
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // Retrieve original File/Blob
  async getImage(id: string): Promise<Blob | null> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete image
  async deleteImage(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Create temporary object URL for display
  createObjectURL(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  // Cleanup object URL
  revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export const imageStorage = new ImageStorage();