import { useState, useCallback } from 'react';
import { Doc } from '@/lib/store/docStore';

export type DocStatus = 'saved' | 'unsaved' | 'saving' | 'syncing';
export type SyncStatus = 'synced' | 'unsynced' | 'offline';

interface UseDocStateOptions {
  initialDoc: Doc;
}

export function useDocState({ initialDoc }: UseDocStateOptions) {
  // Document Data State
  const [title, setTitle] = useState(initialDoc.title || '');
  const [coverImage, setCoverImage] = useState<string | null>(initialDoc.coverImage || null);
  
  // Persistence State
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    initialDoc.hasUnsyncedChanges ? 'unsynced' : 'synced'
  );
  
  // Derived Status
  // status: 'saving' | 'syncing' | 'unsaved' | 'saved'
  const status: DocStatus = isSaving 
    ? 'saving' 
    : isSyncing 
      ? 'syncing' 
      : hasUnsavedChanges 
        ? 'unsaved' 
        : 'saved';

  // Actions
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true); // Dirty local
    setSyncStatus('unsynced');  // Dirty vs Server
  }, []);

  const handleCoverChange = useCallback((newCover: string | null) => {
    setCoverImage(newCover);
    setHasUnsavedChanges(true);
    setSyncStatus('unsynced');
  }, []);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setSyncStatus('unsynced');
  }, []);

  // Mark clean usually means saved to DISK, but not necessarily synced to server
  const markClean = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);
  
  const markSynced = useCallback(() => {
    setSyncStatus('synced');
    setHasUnsavedChanges(false);
  }, []);

  // Hydrate action that doesn't trigger dirty state
  const hydrate = useCallback(({ title, coverImage }: { title?: string, coverImage?: string | null }) => {
    if (title !== undefined) setTitle(title);
    if (coverImage !== undefined) setCoverImage(coverImage);
    // Do NOT set hasUnsavedChanges or syncStatus here
  }, []);

  return {
    state: {
      title,
      coverImage,
      isSaving,
      isSyncing,
      hasUnsavedChanges,
      syncStatus,
      status,
    },
    actions: {
      setTitle: handleTitleChange,
      setCoverImage: handleCoverChange,
      setIsSaving,
      setIsSyncing,
      markDirty,
      markClean,
      markSynced,
      setSyncStatus,
      setHasUnsavedChanges,
      hydrate,
    },
  };
}
