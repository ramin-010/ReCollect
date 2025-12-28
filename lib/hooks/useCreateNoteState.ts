// ReCollect - Custom Hook for Managing Create Note Dialog State
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Block as BlockType } from '@/components/content/contentCanvas';
// #change1: Import imageStorage for IndexedDB operations
import { imageStorage } from '@/lib/storage/imageStorage';


interface DialogState {
  title: string;
  description: string;
  canvasBlocks: any; // Can be BlockType[] (legacy) OR { blocks: BlockType[], connections: Connection[] } (new)
  selectedTags: string[];
  visibility: 'Public' | 'Private';
  reminderData: {
    reminderDate: string;
    message?: string;
  } | null;
  links: string[]
}
// description-03: we need to add the description in the state
const DEFAULT_STATE: DialogState = {
  title: '',
  description: '',
  canvasBlocks: { blocks: [], connections: [] }, // New default structure
  selectedTags: [],
  visibility: 'Public', // Changed default to Public
  reminderData: null,
  links: []
};

const STORAGE_KEY = 'recollect_note_draft_';

export function useCreateNoteState(dashboardId: string) {
  const [state, setState] = useState<DialogState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to extract blocks array from canvasBlocks (handles both formats)
  const getBlocksArray = (canvasBlocks: any): BlockType[] => {
    if (Array.isArray(canvasBlocks)) return canvasBlocks;
    if (canvasBlocks && typeof canvasBlocks === 'object' && Array.isArray(canvasBlocks.blocks)) {
      return canvasBlocks.blocks;
    }
    return [];
  };

  // #change2: Load state from localStorage AND reconstruct blob URLs from IndexedDB
  useEffect(() => {
    const loadState = async () => {
      try {
        const storageKey = STORAGE_KEY + dashboardId;
        const savedState = localStorage.getItem(storageKey);

        if (savedState) {
          const parsedState = JSON.parse(savedState);

          // Extract blocks for image rehydration (handle both formats)
          const rawCanvasBlocks = parsedState.canvasBlocks;
          let blocks: BlockType[] = [];
          let connections: any[] = [];

          if (Array.isArray(rawCanvasBlocks)) {
            blocks = rawCanvasBlocks;
          } else if (rawCanvasBlocks && typeof rawCanvasBlocks === 'object') {
            blocks = rawCanvasBlocks.blocks || [];
            connections = rawCanvasBlocks.connections || [];
          }

          // Rehydrate images from IndexedDB
          const blocksWithUrls = await Promise.all(
            blocks.map(async (block: BlockType) => {
              if (block.type === 'image' && block.imageId && !block.isUploaded && !block.url?.startsWith('blob:')) {
                // Load from IndexedDB and create object URL
                const blob = await imageStorage.getImage(block.imageId);
                if (blob) {
                  return {
                    ...block,
                    url: imageStorage.createObjectURL(blob)
                  };
                }
              }
              return block;
            })
          );

          // Reconstruct canvasBlocks in the same format it was saved
          let hydratedCanvasBlocks: any;
          if (Array.isArray(rawCanvasBlocks)) {
            hydratedCanvasBlocks = blocksWithUrls;
          } else {
            hydratedCanvasBlocks = { blocks: blocksWithUrls, connections };
          }

          setState({
            ...parsedState,
            canvasBlocks: hydratedCanvasBlocks
          });
        } else {
          setState(DEFAULT_STATE);
        }
      } catch (error) {
        console.error('Failed to load note state:', error);
        setState(DEFAULT_STATE);
      }
      setIsLoaded(true);
    };

    loadState();

    // #change3: Cleanup blob URLs on unmount
    return () => {
      const blocks = getBlocksArray(state.canvasBlocks);
      blocks.forEach(block => {
        if (block.type === 'image' && block.url?.startsWith('blob:')) {
          imageStorage.revokeObjectURL(block.url);
        }
      });
    };
  }, [dashboardId]);

  // #change4: Save state to localStorage (blocks with imageId references only)
  useEffect(() => {
    if (!isLoaded) return;

    const saveToLocalStorage = () => {
      try {
        const storageKey = STORAGE_KEY + dashboardId;
        
        // Handle both formats when saving
        let canvasBlocksToSave: any;
        if (Array.isArray(state.canvasBlocks)) {
          // Legacy array format
          canvasBlocksToSave = state.canvasBlocks.map((block: any) => {
            if (block.type === 'image' && block.url?.startsWith('blob:')) {
              return { ...block, url: undefined };
            }
            return block;
          });
        } else if (state.canvasBlocks && typeof state.canvasBlocks === 'object') {
          // New object format { blocks, connections }
          const blocks = (state.canvasBlocks.blocks || []).map((block: any) => {
            if (block.type === 'image' && block.url?.startsWith('blob:')) {
              return { ...block, url: undefined };
            }
            return block;
          });
          canvasBlocksToSave = {
            blocks,
            connections: state.canvasBlocks.connections || []
          };
        } else {
          canvasBlocksToSave = { blocks: [], connections: [] };
        }

        const stateToSave = {
          ...state,
          canvasBlocks: canvasBlocksToSave
        };
        
        // Only save if state has actually changed
        const previousState = localStorage.getItem(storageKey);
        if (previousState !== JSON.stringify(stateToSave)) {
          localStorage.setItem(storageKey, JSON.stringify(stateToSave));
        }
      } catch (error) {
        console.error('Failed to save note state:', error);
      }
    };

    const timer = setTimeout(saveToLocalStorage, 1500); // Increased debounce to 1.5s for performance
    return () => clearTimeout(timer);
  }, [state, dashboardId, isLoaded]); // Keep these dependencies

  type UpdateArg = Partial<DialogState> | ((prev: DialogState) => Partial<DialogState>);

  const updateState = useCallback((updates: UpdateArg) => {
    setState(prev => {
      const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...resolvedUpdates };
    });
  }, []);

  // #change5: Clear state AND cleanup IndexedDB images
  const clearState = useCallback(async () => {
    try {
      const storageKey = STORAGE_KEY + dashboardId;
      localStorage.removeItem(storageKey);

      // NEW CODE: Cleanup IndexedDB images and blob URLs
      const blocks = getBlocksArray(state.canvasBlocks);
      for (const block of blocks) {
        if (block.type === 'image') {
          if (block.imageId && !block.isUploaded) {
            await imageStorage.deleteImage(block.imageId);
          }
          if (block.url?.startsWith('blob:')) {
            imageStorage.revokeObjectURL(block.url);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clear note state:', error);
    }
    setState(DEFAULT_STATE);
  }, [dashboardId, state.canvasBlocks]);

  return {
    state,
    updateState,
    clearState,
    isLoaded,
  };
}