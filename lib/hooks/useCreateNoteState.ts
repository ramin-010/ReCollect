// ReCollect - Custom Hook for Managing Create Note Dialog State
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Block as BlockType } from '@/components/content/contentCanvas';
// #change1: Import imageStorage for IndexedDB operations
import { imageStorage } from '@/lib/storage/imageStorage';


interface DialogState {
  title: string;
  canvasBlocks: BlockType[];
  selectedTags: string[];
  visibility: 'Public' | 'Private';
  reminderData: any;
  links : string[]
}

const DEFAULT_STATE: DialogState = {
  title: '',
  canvasBlocks: [],
  selectedTags: [],
  visibility: 'Public', // Changed default to Public
  reminderData: null,
  links : []
};

const STORAGE_KEY = 'recollect_note_draft_';

export function useCreateNoteState(dashboardId: string) {
  const [state, setState] = useState<DialogState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // #change2: Load state from localStorage AND reconstruct blob URLs from IndexedDB
  useEffect(() => {
    const loadState = async () => {
      try {
        const storageKey = STORAGE_KEY + dashboardId;
        const savedState = localStorage.getItem(storageKey); 
        
        if (savedState) {
          const parsedState = JSON.parse(savedState);
        
          const blocksWithUrls = await Promise.all(
            parsedState.canvasBlocks.map(async (block: BlockType) => {
              if (block.type === 'image' && block.imageId && !block.isUploaded) {
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
          
          setState({
            ...parsedState,
            canvasBlocks: blocksWithUrls
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
      state.canvasBlocks.forEach(block => {
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
      const stateToSave = {
        ...state,
        canvasBlocks: state.canvasBlocks.map(block => {
          if (block.type === 'image' && block.url?.startsWith('blob:')) {
            return {
              ...block,
              url: undefined
            };
          }
          return block;
        })
      };
      //console.log('state to save', stateToSave)
      // Only save if state has actually changed
      const previousState = localStorage.getItem(storageKey);
      if (previousState !== JSON.stringify(stateToSave)) {
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      }
    } catch (error) {
      console.error('Failed to save note state:', error);
    }
  };

  const timer = setTimeout(saveToLocalStorage, 1000);
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
      for (const block of state.canvasBlocks) {
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