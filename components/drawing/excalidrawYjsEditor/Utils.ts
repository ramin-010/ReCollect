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
  appState: any,
  prevStateSizeRef: React.MutableRefObject<number>
): { addedCount: number; updatedCount: number; deletedCount: number; deltaSize: number } {
  const yElements = ydoc.getArray<Y.Map<any>>('elements');
  const yAppState = ydoc.getMap<any>('appState');
  
  const activeElements = elements.filter(el => !el.isDeleted);
  
  const yElementMap = new Map<string, { index: number; yMap: Y.Map<any>; version: number }>();
  yElements.forEach((yMap, index) => {
    const id = yMap.get('id');
    const version = yMap.get('version') || 0;
    if (id) {
      yElementMap.set(id, { index, yMap, version });
    }
  });
  
  let addedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  const processedIds = new Set<string>();
  
  ydoc.transact(() => {
    activeElements.forEach(element => {
      processedIds.add(element.id);
      const existing = yElementMap.get(element.id);
      
      if (!existing) {
        const yMap = new Y.Map();
        for (const [key, value] of Object.entries(element)) {
          yMap.set(key, value);
        }
        yElements.push([yMap]);
        addedCount++;
      } else if (existing.version !== element.version) {
        for (const [key, value] of Object.entries(element)) {
          if (existing.yMap.get(key) !== value) {
            existing.yMap.set(key, value);
          }
        }
        updatedCount++;
      }
    });
    
    const indicesToDelete: number[] = [];
    yElementMap.forEach(({ index }, id) => {
      if (!processedIds.has(id)) {
        indicesToDelete.push(index);
        deletedCount++;
      }
    });
    
    indicesToDelete.sort((a, b) => b - a);
    indicesToDelete.forEach(index => {
      yElements.delete(index, 1);
    });
    
    const persistableState = {
      viewBackgroundColor: appState.viewBackgroundColor,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
      theme: appState.theme,
      gridSize: appState.gridSize,
    };
    
    for (const [key, value] of Object.entries(persistableState)) {
      if (yAppState.get(key) !== value) {
        yAppState.set(key, value);
      }
    }
  });
  
  const newStateSize = Y.encodeStateAsUpdate(ydoc).byteLength;
  const deltaSize = Math.abs(newStateSize - prevStateSizeRef.current);
  prevStateSizeRef.current = newStateSize;
  
  return { addedCount, updatedCount, deletedCount, deltaSize };
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