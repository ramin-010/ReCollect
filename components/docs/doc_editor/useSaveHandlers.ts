'use client';

import { useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { offlineStorage } from '@/lib/utils/offlineStorage';
import { docApi } from '@/lib/api/docApi';
import { toast } from 'sonner';
import { Doc, useDocStore } from '@/lib/store/docStore';
import { ConflictData } from './types';
import { jsonToYjsState, yjsStateToJson } from '@/lib/utils/yjsConverter';

interface UseSaveHandlersOptions {
  doc: Doc;
  editor: Editor | null;
  title: string;
  coverImage: string | null;
  contentRef: React.MutableRefObject<string>; // Still stores JSON string for editor
  setTitle: (title: string) => void;
  setCoverImage: (cover: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setHasUnsyncedChanges: (value: boolean) => void;  // For server sync tracking
  setIsSaving: (value: boolean) => void;
  conflictData: ConflictData | null;
  setShowConflictDialog: (value: boolean) => void;
  setConflictData: (value: ConflictData | null) => void;
  onBack: () => void;
}

export function useSaveHandlers({
  doc,
  editor,
  title,
  coverImage,
  contentRef,
  setTitle,
  setCoverImage,
  setHasUnsavedChanges,
  setHasUnsyncedChanges,
  setIsSaving,
  conflictData,
  setShowConflictDialog,
  setConflictData,
  onBack,
}: UseSaveHandlersOptions) {
  const { updateDoc, addDoc } = useDocStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!doc._id) return;
      
      if (!contentRef.current || contentRef.current === 'undefined') {
        console.log("Skipping auto-save: no content yet");
        return;
      }
      
      console.log("Auto-saving to offline storage...");
      try {
        const content = JSON.parse(contentRef.current);
        const yjsState = jsonToYjsState(content);
        
        // Load existing offline doc to preserve serverUpdatedAt
        const existingOfflineDoc = await offlineStorage.loadDoc(doc._id);
        const serverUpdatedAt = existingOfflineDoc?.serverUpdatedAt;
        
        await offlineStorage.saveDoc(doc._id, yjsState, title, coverImage, 'pending', serverUpdatedAt);
        setHasUnsavedChanges(false);
      } catch (e) {
        console.error("Auto-save failed", e);
      }
    }, 2000);
  }, [doc._id, title, coverImage, contentRef, setHasUnsavedChanges]);

  const saveDocument = useCallback(async () => {
    if (!doc._id) return;

    try {
      setIsSaving(true);
      
      const content = JSON.parse(contentRef.current);
      
      // Save to offline storage (needs yjsState format)
      const yjsState = jsonToYjsState(content);
      await offlineStorage.saveDoc(doc._id, yjsState, title, coverImage, 'pending');
      
      // Send to backend (always sends JSON content - backend handles conversion)
      const result = await docApi.saveDoc(doc._id, {
        content,
        title,
        coverImage,
      });
      
      if (result.success && result.data) {
        const serverYjsState = result.data.yjsState;
        const serverUpdatedAt = new Date(result.updatedAt).getTime();
        
        if (editor && serverYjsState) {
          const serverContent = yjsStateToJson(serverYjsState);
          editor.commands.setContent(serverContent);
          contentRef.current = JSON.stringify(serverContent);
        }
        
        await offlineStorage.saveDoc(doc._id, serverYjsState || yjsState, title, coverImage, 'synced', serverUpdatedAt);
        updateDoc(doc._id, { yjsState: serverYjsState || yjsState, title, hasUnsyncedChanges: false });
        setHasUnsavedChanges(false);
        setHasUnsyncedChanges(false); // Reset unsync state after successful save
        toast.success('Saved to cloud');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save to cloud');
    } finally {
      setIsSaving(false);
    }
  }, [doc._id, title, coverImage, updateDoc, editor, contentRef, setHasUnsavedChanges, setIsSaving]);

  const handleKeepMine = useCallback(async () => {
    if (doc._id) {
      const content = JSON.parse(contentRef.current);
      const yjsState = jsonToYjsState(content);
      await offlineStorage.saveDoc(doc._id, yjsState, title, coverImage, 'pending');
      setHasUnsavedChanges(true);
      toast.success('Keeping your changes. Save to sync to cloud.');
    }
    setShowConflictDialog(false);
    setConflictData(null);
  }, [doc._id, title, coverImage, contentRef, setHasUnsavedChanges, setShowConflictDialog, setConflictData]);

  const handleAcceptServer = useCallback(async () => {
    if (conflictData?.serverDoc && editor) {
      const server = conflictData.serverDoc;
      
      if (server.yjsState) {
        const serverContent = yjsStateToJson(server.yjsState);
        editor.commands.setContent(serverContent);
        contentRef.current = JSON.stringify(serverContent);
      }
      setTitle(server.title);
      setCoverImage(server.coverImage);
      
      await offlineStorage.saveDoc(
        doc._id,
        server.yjsState || '',
        server.title,
        server.coverImage,
        'synced',
        conflictData.serverUpdatedAt
      );
      
      setHasUnsavedChanges(false);
      toast.success('Server version loaded');
    }
    setShowConflictDialog(false);
    setConflictData(null);
  }, [conflictData, editor, doc._id, contentRef, setTitle, setCoverImage, setHasUnsavedChanges, setShowConflictDialog, setConflictData]);

  const handleSaveAsNew = useCallback(async () => {
    if (doc._id && conflictData?.serverDoc && editor) {
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
      
      toast.success(`Local copy saved as "${localTitle}". Save it to push to cloud.`);
      
      const server = conflictData.serverDoc;
      if (server.yjsState) {
        const serverContent = yjsStateToJson(server.yjsState);
        editor.commands.setContent(serverContent);
        contentRef.current = JSON.stringify(serverContent);
      }
      setTitle(server.title);
      setCoverImage(server.coverImage);
      
      await offlineStorage.saveDoc(
        doc._id,
        server.yjsState || '',
        server.title,
        server.coverImage,
        'synced',
        conflictData.serverUpdatedAt
      );
      
      setHasUnsavedChanges(false);
    }
    setShowConflictDialog(false);
    setConflictData(null);
  }, [doc._id, conflictData, editor, title, coverImage, addDoc, contentRef, setTitle, setCoverImage, setHasUnsavedChanges, setShowConflictDialog, setConflictData]);

  const handleBack = useCallback(async () => {
    if (doc._id && contentRef.current && contentRef.current !== 'undefined') {
      try {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        
        const content = JSON.parse(contentRef.current);
        const yjsState = jsonToYjsState(content);
        
        // Load existing offline doc to check sync status BEFORE we save
        const existingOfflineDoc = await offlineStorage.loadDoc(doc._id);
        const serverUpdatedAt = existingOfflineDoc?.serverUpdatedAt;
        const existingUpdatedAt = existingOfflineDoc?.updatedAt || 0;
        
        // Check if there were unsynced changes BEFORE this save
        // If serverUpdatedAt exists and existingUpdatedAt <= serverUpdatedAt, doc was synced
        const wasAlreadySynced = serverUpdatedAt && existingUpdatedAt <= serverUpdatedAt;
        const hasUnsyncedChanges = !wasAlreadySynced;
        
        // Save to IndexedDB, preserving serverUpdatedAt
        await offlineStorage.saveDoc(doc._id, yjsState, title, coverImage, 'pending', serverUpdatedAt);
        
        updateDoc(doc._id, { 
          yjsState,
          title,
          updatedAt: new Date().toISOString(),
          hasUnsyncedChanges,
        });
      } catch (e) {
        console.error('Failed to save before navigating back:', e);
      }
    }
    onBack();
  }, [doc._id, title, coverImage, updateDoc, onBack, contentRef]);

  const clearSaveTimeout = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, []);

  return {
    debouncedSave,
    saveDocument,
    handleKeepMine,
    handleAcceptServer,
    handleSaveAsNew,
    handleBack,
    clearSaveTimeout,
  };
}
