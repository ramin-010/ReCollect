import { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { offlineStorage, OfflineDoc } from '@/lib/utils/offlineStorage';
import { docApi, ServerDoc } from '@/lib/api/docApi';
import { toast } from 'sonner';
import { Doc, useDocStore } from '@/lib/store/docStore';
import { jsonToYjsState, yjsStateToJson } from '@/lib/utils/yjsConverter';
import { ConflictData } from './types';

interface UseDocPersistenceOptions {
  doc: Doc;
  editor: Editor | null;
  contentRef: React.MutableRefObject<string>;
  state: {
    title: string;
    coverImage: string | null;
  };
  actions: {
    setTitle: (title: string) => void;
    setCoverImage: (cover: string | null) => void;
    setIsSaving: (value: boolean) => void;
    setIsSyncing: (value: boolean) => void;
    markClean: () => void;
    markDirty: () => void;
    markSynced: () => void;
    setSyncStatus: (status: 'synced' | 'unsynced' | 'offline') => void;
    hydrate: (data: { title?: string; coverImage?: string | null }) => void;
  };
  getInitialContent: () => any;
  onBack: () => void;
}

export function useDocPersistence({
  doc,
  editor,
  contentRef,
  state: { title, coverImage },
  actions,
  getInitialContent,
  onBack,
}: UseDocPersistenceOptions) {
  const { updateDoc, addDoc } = useDocStore();
  const [mounted, setMounted] = useState(false);
  
  // Conflict State
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);

  // 1. Initial Load & Sync Logic
  useEffect(() => {
    setMounted(true);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (mounted && editor && doc._id) {
      const loadContentWithSync = async () => {
        let localData: OfflineDoc | null = null;
        let serverData: ServerDoc | null = null;

        actions.setIsSyncing(true);

        try {
          localData = await offlineStorage.loadDoc(doc._id);
          // Load local data immediately if available
          if (localData && localData.yjsState) {
            const content = yjsStateToJson(localData.yjsState);
            editor.commands.setContent(content, { emitUpdate: false });
            contentRef.current = JSON.stringify(content);
            
            // USE HYDRATE instead of setTitle/setCoverImage
            actions.hydrate({
              title: localData.title,
              coverImage: localData.coverImage
            });
            
            // Set sync status from local data
            if (localData.syncStatus === 'pending') {
               actions.setSyncStatus('unsynced');
            } else {
               actions.setSyncStatus('synced');
            }
          }
        } catch (e) {
          console.error("Failed to load offline doc", e);
        }

        try {
          serverData = await docApi.fetchDoc(doc._id);
        } catch (e) {
          console.error("Failed to fetch from server", e);
        }
        
        actions.setIsSyncing(false);

        // Sync Logic: Compare Local vs Server
        if (localData && serverData) {
          const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
          const localUpdatedAt = localData.updatedAt;

          // Check if local is dirty (pending or undefined/legacy)
          const isLocalDirty = localData.syncStatus !== 'synced';

          if (serverUpdatedAt > localUpdatedAt && isLocalDirty) {
            console.log('[SyncDebug] Conflict detected - local dirty & server newer');
            // Conflict: Server is newer BUT we have unsynced local changes
            // Show conflict dialog FIRST, let user decide before switching to collab
            setConflictData({
              localUpdatedAt,
              serverUpdatedAt,
              serverDoc: serverData,
              localContent: localData.yjsState,
              serverContent: serverData.yjsState,
            });
            setShowConflictDialog(true);
            return; // Wait for user to resolve conflict
          } else if (serverUpdatedAt > localUpdatedAt) {
            console.log('[SyncDebug] Server newer, accepting server');
            // Server is newer and clean local state -> Update local from server
            if (serverData.yjsState) {
              const content = yjsStateToJson(serverData.yjsState);
              editor.commands.setContent(content, { emitUpdate: false });
              contentRef.current = JSON.stringify(content);
            }
            actions.hydrate({
              title: serverData.title,
              coverImage: serverData.coverImage
            });
            
            await offlineStorage.saveDoc(
              doc._id,
              serverData.yjsState || '',
              serverData.title,
              serverData.coverImage,
              'synced',
              serverUpdatedAt
            );
            actions.setSyncStatus('synced');
          } else if (localUpdatedAt > serverUpdatedAt && isLocalDirty) {
            console.log('[SyncDebug] Local newer and dirty');
            actions.markDirty();
          } else {
            console.log('[SyncDebug] Same timestamp or local synced');
            actions.setSyncStatus('synced');
          }
        }
        
        // After sync logic, check if server has collaborators and switch to collab mode
        // (only reached if no conflict dialog was shown)
        if (serverData?.collaborators && serverData.collaborators.length > 0) {
          const localHasCollabs = doc.collaborators && doc.collaborators.length > 0;
          if (!localHasCollabs) {
            console.log('[DocPersistence] No conflict, detected collaborators - switching to collab mode');
            updateDoc(doc._id, { 
              collaborators: serverData.collaborators,
              role: serverData.role || 'owner'
            });
            // Store update will cause DocsView to switch to CollaborativeDocEditor
            return;
          }
        } else if (!localData && serverData) {
            // Only server data exists -> hydrate local
          if (serverData.yjsState) {
            const content = yjsStateToJson(serverData.yjsState);
            editor.commands.setContent(content, { emitUpdate: false });
            contentRef.current = JSON.stringify(content);
          }
          actions.hydrate({
            title: serverData.title,
            coverImage: serverData.coverImage
          });
          
          await offlineStorage.saveDoc(
            doc._id,
            serverData.yjsState || '',
            serverData.title,
            serverData.coverImage,
            'synced',
            new Date(serverData.updatedAt).getTime()
          );
          actions.markSynced();
        } else if (!localData && !serverData) {
          // New doc
          const content = getInitialContent();
          if (content) {
            editor.commands.setContent(content, { emitUpdate: false });
          }
          // New docs start as synced (empty) until edited
          actions.markSynced();
        }
      };

      loadContentWithSync();
    }
  }, [mounted, editor, doc._id]);


  // 2. Saving Logic
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!doc._id) return;
      
      if (!contentRef.current || contentRef.current === 'undefined') {
        return;
      }
      
      console.log("Auto-saving to offline storage...");
      try {
        const content = JSON.parse(contentRef.current);
        const yjsState = jsonToYjsState(content);
        
        // Load existing to preserve serverUpdatedAt
        const existingOfflineDoc = await offlineStorage.loadDoc(doc._id);
        const serverUpdatedAt = existingOfflineDoc?.serverUpdatedAt;
        
        await offlineStorage.saveDoc(doc._id, yjsState, title, coverImage, 'pending', serverUpdatedAt);
        
        // Update global store so UI reflects the change immediately
        updateDoc(doc._id, {
          title, 
          coverImage,
          yjsState,
          hasUnsyncedChanges: true
        });
        
        actions.markClean(); // "Clean" means saved locally
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 700); 
  }, [doc._id, title, coverImage, contentRef, actions]);


  const saveDocument = useCallback(async () => {
    if (!doc._id) return;

    try {
      actions.setIsSaving(true);
      
      const content = JSON.parse(contentRef.current);
      const yjsState = jsonToYjsState(content);
      
      // 1. Save locally first
      await offlineStorage.saveDoc(doc._id, yjsState, title, coverImage, 'pending');
      
      // 2. Send to backend
      const result = await docApi.saveDoc(doc._id, {
        content,
        title,
        coverImage,
      });
      
      if (result.success && result.data) {
        const serverYjsState = result.data.yjsState;
        const serverUpdatedAt = new Date(result.updatedAt).getTime();
        
        // Update Editor if needed (optional, typically we trust our local state unless server transformed it)
         if (editor && serverYjsState) {
          const serverContent = yjsStateToJson(serverYjsState);
          editor.commands.setContent(serverContent, { emitUpdate: false });
          contentRef.current = JSON.stringify(serverContent);
        }
        
        // Mark as synced locally
        await offlineStorage.saveDoc(doc._id, serverYjsState || yjsState, title, coverImage, 'synced', serverUpdatedAt);
        
        // Update global store
        updateDoc(doc._id, { yjsState: serverYjsState || yjsState, title, hasUnsyncedChanges: false });
        
        actions.markSynced(); // Mark as fully synced
        
        toast.success('Saved to cloud');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save to cloud');
    } finally {
      actions.setIsSaving(false);
    }
  }, [doc._id, title, coverImage, updateDoc, editor, contentRef, actions]);


  // 3. Conflict Resolution Handlers
  const handleKeepMine = useCallback(async () => {
    if (doc._id) {
      const content = JSON.parse(contentRef.current);
      const yjsState = jsonToYjsState(content);
      
      // Save locally as pending
      await offlineStorage.saveDoc(doc._id, yjsState, title, coverImage, 'pending');
      actions.markDirty();
      
      // If doc has collaborators, switch to collab mode with pending content
      const serverCollabs = conflictData?.serverDoc?.collaborators;
      if (serverCollabs && serverCollabs.length > 0) {
        updateDoc(doc._id, { 
          collaborators: serverCollabs,
          role: conflictData?.serverDoc?.role || 'owner',
          pendingLocalContent: contentRef.current // Pass JSON content to inject after connect
        });
        toast.success('Switching to collaborative mode with your changes...');
      } else {
        toast.success('Keeping your changes. Save to sync to cloud.');
      }
    }
    setShowConflictDialog(false);
    setConflictData(null);
  }, [doc._id, title, coverImage, contentRef, actions, conflictData, updateDoc]);

  const handleAcceptServer = useCallback(async () => {
    if (conflictData?.serverDoc && editor) {
      const server = conflictData.serverDoc;
      
      if (server.yjsState) {
        const serverContent = yjsStateToJson(server.yjsState);
        editor.commands.setContent(serverContent, { emitUpdate: false });
        contentRef.current = JSON.stringify(serverContent);
      }
      actions.hydrate({
        title: server.title,
        coverImage: server.coverImage
      });
      
      await offlineStorage.saveDoc(
        doc._id,
        server.yjsState || '',
        server.title,
        server.coverImage,
        'synced',
        conflictData.serverUpdatedAt
      );
      
      actions.markClean();
      toast.success('Server version loaded');
      
      // If doc has collaborators, trigger switch to CollaborativeDocEditor
      if (server.collaborators && server.collaborators.length > 0) {
        updateDoc(doc._id, { 
          collaborators: server.collaborators,
          role: server.role || 'owner'
        });
      }
    }
    setShowConflictDialog(false);
    setConflictData(null);
  }, [conflictData, editor, doc._id, contentRef, actions, updateDoc]);

  const handleSaveAsNew = useCallback(async () => {
    if (doc._id && conflictData?.serverDoc && editor) {
      // 1. Create copy of local
      const localContent = JSON.parse(contentRef.current);
      const localYjsState = jsonToYjsState(localContent);
      const localTitle = `${title} (Local Copy)`;
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await offlineStorage.saveDoc(localId, localYjsState, localTitle, coverImage, 'pending');
      
      addDoc({
        _id: localId,
        title: localTitle,
        yjsState: localYjsState,
        docType: doc.docType || 'notes',
        coverImage: coverImage,
        isPinned: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      toast.success(`Local copy saved as "${localTitle}".`);
      
      // 2. Revert current doc to server version
      const server = conflictData.serverDoc;
      if (server.yjsState) {
        const serverContent = yjsStateToJson(server.yjsState);
        editor.commands.setContent(serverContent, { emitUpdate: false });
        contentRef.current = JSON.stringify(serverContent);
      }
      actions.hydrate({
        title: server.title,
        coverImage: server.coverImage
      });
      
      await offlineStorage.saveDoc(
        doc._id,
        server.yjsState || '',
        server.title,
        server.coverImage,
        'synced',
        conflictData.serverUpdatedAt
      );
      
      actions.markClean();
    }
    setShowConflictDialog(false);
    setConflictData(null);
  }, [doc._id, conflictData, editor, title, coverImage, addDoc, contentRef, actions]);

  const handleBack = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    onBack();
  }, [onBack]);

  return {
    debouncedSave,
    saveDocument,
    handleKeepMine,
    handleAcceptServer,
    handleSaveAsNew,
    handleBack,
    showConflictDialog,
    setShowConflictDialog,
    conflictData,
  };
}
