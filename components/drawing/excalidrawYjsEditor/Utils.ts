import * as Y from 'yjs';

export function getYjsStateBase64(ydoc: Y.Doc | null): string | null {
  if (!ydoc) return null;
  const state = Y.encodeStateAsUpdate(ydoc);
  const CHUNK_SIZE = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < state.length; i += CHUNK_SIZE) {
    const chunk = state.subarray(i, Math.min(i + CHUNK_SIZE, state.length));
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  return btoa(chunks.join(''));
}

export function applyYjsStateFromBase64(ydoc: Y.Doc | null, base64: string): boolean {
  if (!ydoc || !base64) return false;
  try {
    const binary = atob(base64);
    const state = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      state[i] = binary.charCodeAt(i);
    }
    Y.applyUpdate(ydoc, state);
    return true;
  } catch (err) {
    console.error('[Utils] Failed to apply Yjs state from base64:', err);
    return false;
  }
}

export function syncElementsToYjs(
  ydoc: Y.Doc,
  elements: readonly any[],
  appState: any
): { addedCount: number; updatedCount: number; deletedCount: number } {
  const yElements = ydoc.getArray<Y.Map<any>>('elements');
  const yAppState = ydoc.getMap<any>('appState');
  
  const activeElements = elements.filter(el => !el.isDeleted);
  
  // SINGLE-PASS optimization: Build yElementMap once, used for both change detection AND transact
  const yElementMap = new Map<string, { index: number; yMap: Y.Map<any>; version: number }>();
  
  // Efficient iterator (O(N))
  let index = 0;
  for (const yMap of yElements) {
    const id = yMap.get('id');
    const version = yMap.get('version') || 0;
    if (id) {
      yElementMap.set(id, { index, yMap, version });
    }
    index++;
  }
  
  // Single-pass: detect changes AND collect work items simultaneously
  const newElements: any[] = [];
  const updatedElements: { element: any; yMap: Y.Map<any> }[] = [];
  const processedIds = new Set<string>();
  
  for (const el of activeElements) {
    processedIds.add(el.id);
    const existing = yElementMap.get(el.id);
    
    if (!existing) {
      newElements.push(el);
    } else if (el.version > existing.version) {
      updatedElements.push({ element: el, yMap: existing.yMap });
    }
  }
  
  // Collect deletions
  const indicesToDelete: number[] = [];
  yElementMap.forEach(({ index }, id) => {
    if (!processedIds.has(id)) {
      indicesToDelete.push(index);
    }
  });
  
  const addedCount = newElements.length;
  const updatedCount = updatedElements.length;
  const deletedCount = indicesToDelete.length;

  // Check appState changes
  const persistableState = {
    viewBackgroundColor: appState.viewBackgroundColor,
    theme: appState.theme,
  };
  
  let appStateChanged = false;
  for (const [key, value] of Object.entries(persistableState)) {
    if (yAppState.get(key) !== value) {
      appStateChanged = true;
      break;
    }
  }
  
  // Skip transact entirely if nothing changed
  if (addedCount === 0 && updatedCount === 0 && deletedCount === 0 && !appStateChanged) {
    return { addedCount: 0, updatedCount: 0, deletedCount: 0 };
  }
  
  // Single transact with pre-computed work — no redundant iteration
  ydoc.transact(() => {
    // Add new elements
    for (const element of newElements) {
      const yMap = new Y.Map();
      for (const [key, value] of Object.entries(element)) {
        yMap.set(key, value);
      }
      yElements.push([yMap]);
    }
    
    // Update changed elements
    for (const { element, yMap } of updatedElements) {
      for (const [key, value] of Object.entries(element)) {
        if (yMap.get(key) !== value) {
          yMap.set(key, value);
        }
      }
    }
    
    // Delete removed elements (reverse order to preserve indices)
    indicesToDelete.sort((a, b) => b - a);
    for (const index of indicesToDelete) {
      yElements.delete(index, 1);
    }
    
    // Sync appState
    for (const [key, value] of Object.entries(persistableState)) {
      if (yAppState.get(key) !== value) {
        yAppState.set(key, value);
      }
    }
  });
  
  return { addedCount, updatedCount, deletedCount };
}

export function extractUsedFiles(elements: readonly any[], files: Record<string, any>): {
  usedFileIds: string[];
  pendingFiles: any[];
} {
  const usedFileIds = new Set<string>();
  for (const element of elements) {
    if (element.type === 'image' && element.fileId && !element.isDeleted) {
      usedFileIds.add(element.fileId);
    }
  }
  
  const pendingFiles: any[] = [];
  
  // Iterate Set directly instead of converting to array first
  for (const fileId of usedFileIds) {
    const fileData = files[fileId];
    if (fileData && 
        fileData.dataURL && 
        fileData.dataURL.startsWith('data:') && 
        !fileData.isCloudUploaded) {
      pendingFiles.push({ ...fileData, id: fileId });
    }
  }
  
  return { usedFileIds: Array.from(usedFileIds), pendingFiles };
}