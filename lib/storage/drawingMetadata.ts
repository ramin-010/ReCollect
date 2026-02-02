/**
 * Drawing Metadata Storage
 * 
 * Stores drawing metadata (name, thumbnail, timestamps) separately from Yjs state.
 * Uses idb-keyval for simple key-value storage.
 */

import { get, set, del, keys } from 'idb-keyval';

export interface DrawingMetadata {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isCloudSynced?: boolean;
}

const METADATA_PREFIX = 'drawing_meta_';

/**
 * Save or update drawing metadata
 */
export async function saveDrawingMetadata(metadata: DrawingMetadata): Promise<void> {
  const key = `${METADATA_PREFIX}${metadata.id}`;
  await set(key, {
    ...metadata,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get metadata for a single drawing
 */
export async function getDrawingMetadata(id: string): Promise<DrawingMetadata | null> {
  const key = `${METADATA_PREFIX}${id}`;
  return (await get(key)) || null;
}

/**
 * Get all drawing metadata
 */
export async function getAllDrawingMetadata(): Promise<DrawingMetadata[]> {
  const allKeys = await keys();
  const metadataKeys = allKeys.filter(
    (key) => typeof key === 'string' && key.startsWith(METADATA_PREFIX)
  );
  
  const metadata: DrawingMetadata[] = [];
  for (const key of metadataKeys) {
    const data = await get(key);
    if (data) {
      metadata.push(data as DrawingMetadata);
    }
  }
  
  // Sort by updatedAt descending
  return metadata.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Delete drawing metadata
 */
export async function deleteDrawingMetadata(id: string): Promise<void> {
  const key = `${METADATA_PREFIX}${id}`;
  await del(key);
}

/**
 * Create new drawing metadata
 */
export function createDrawingMetadata(id: string, name: string): DrawingMetadata {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    isCloudSynced: false,
  };
}
