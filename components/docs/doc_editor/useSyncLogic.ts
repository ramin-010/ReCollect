'use client';

import { useEffect, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { offlineStorage, OfflineDoc } from '@/lib/utils/offlineStorage';
import { docApi, ServerDoc } from '@/lib/api/docApi';
import { ConflictData } from './types';

interface UseSyncLogicOptions {
  docId: string;
  editor: Editor | null;
  mounted: boolean;
  contentRef: React.MutableRefObject<string>;
  setTitle: (title: string) => void;
  setCoverImage: (cover: string | null) => void;
  getInitialContent: () => any;
}

export function useSyncLogic({
  docId,
  editor,
  mounted,
  contentRef,
  setTitle,
  setCoverImage,
  getInitialContent,
}: UseSyncLogicOptions) {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (mounted && editor && docId) {
      const loadContentWithSync = async () => {
        let localData: OfflineDoc | null = null;
        let serverData: ServerDoc | null = null;

        try {
          localData = await offlineStorage.loadDoc(docId);
          if (localData) {
            editor.commands.setContent(localData.content);
            contentRef.current = JSON.stringify(localData.content);
            setTitle(localData.title);
            if (localData.coverImage) setCoverImage(localData.coverImage);
          }
        } catch (e) {
          console.error("Failed to load offline doc", e);
        }

        setIsSyncing(true);
        try {
          serverData = await docApi.fetchDoc(docId);
        } catch (e) {
          console.error("Failed to fetch from server", e);
        }
        setIsSyncing(false);

        if (localData && serverData) {
          const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
          const localUpdatedAt = localData.updatedAt;

          if (serverUpdatedAt > localUpdatedAt && localData.syncStatus === 'pending') {
            setConflictData({
              localUpdatedAt,
              serverUpdatedAt,
              serverDoc: serverData,
            });
            setShowConflictDialog(true);
          } else if (serverUpdatedAt > localUpdatedAt) {
            editor.commands.setContent(serverData.content);
            contentRef.current = JSON.stringify(serverData.content);
            setTitle(serverData.title);
            setCoverImage(serverData.coverImage);
            
            await offlineStorage.saveDoc(
              docId,
              serverData.content,
              serverData.title,
              serverData.coverImage,
              'synced',
              serverUpdatedAt
            );
          }
        } else if (!localData && serverData) {
          editor.commands.setContent(serverData.content);
          contentRef.current = JSON.stringify(serverData.content);
          setTitle(serverData.title);
          setCoverImage(serverData.coverImage);
          
          await offlineStorage.saveDoc(
            docId,
            serverData.content,
            serverData.title,
            serverData.coverImage,
            'synced',
            new Date(serverData.updatedAt).getTime()
          );
        } else if (!localData && !serverData) {
          const content = getInitialContent();
          if (content) {
            editor.commands.setContent(content, { emitUpdate: false });
          }
        }
      };

      loadContentWithSync();
    }
  }, [mounted, editor, docId]);

  return {
    showConflictDialog,
    setShowConflictDialog,
    conflictData,
    setConflictData,
    isSyncing,
  };
}
