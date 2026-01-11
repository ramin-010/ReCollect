'use client';

import { useEffect, useRef, useCallback } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { useDocStore } from '@/lib/store/docStore';
import { docApi } from '@/lib/api/docApi';

interface UseDocNotificationsOptions {
  docId: string;
  enabled?: boolean;
}

/**
 * Lightweight hook that connects to WebSocket just for stateless events.
 * Used by DocEditor to detect when a collaborator joins so it can 
 * switch to CollaborativeDocEditor in real-time.
 */
export function useDocNotifications({ docId, enabled = true }: UseDocNotificationsOptions) {
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const { updateDoc } = useDocStore();

  const handleStatelessMessage = useCallback(async (payload: { payload: string }) => {
    try {
      const message = JSON.parse(payload.payload);
      
      if (message.type === 'COLLABORATOR_JOINED') {
        console.log('[DocNotifications] Received COLLABORATOR_JOINED event');
        
        // Fetch fresh doc data to get the new collaborator info
        const freshDoc = await docApi.fetchDoc(docId);
        if (freshDoc?.collaborators && freshDoc.collaborators.length > 0) {
          updateDoc(docId, {
            collaborators: freshDoc.collaborators,
            role: freshDoc.role || 'owner'
          });
          // Store update will cause parent to switch to CollaborativeDocEditor
        }
      }
    } catch (err) {
      console.error('[DocNotifications] Failed to parse stateless message:', err);
    }
  }, [docId, updateDoc]);

  useEffect(() => {
    if (!enabled || !docId) return;

    // Create a dummy Y.Doc just for the connection
    const dummyDoc = new Y.Doc();
    ydocRef.current = dummyDoc;

    const wsUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:1234';
    
    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: `doc_${docId}`,
      document: dummyDoc,
      onStateless: handleStatelessMessage,
      onConnect: () => {
        console.log('[DocNotifications] Connected for notifications');
      },
      onDisconnect: () => {
        console.log('[DocNotifications] Disconnected');
      },
    });

    providerRef.current = provider;

    return () => {
      provider.destroy();
      dummyDoc.destroy();
      providerRef.current = null;
      ydocRef.current = null;
    };
  }, [docId, enabled, handleStatelessMessage]);

  return null;
}

export default useDocNotifications;
