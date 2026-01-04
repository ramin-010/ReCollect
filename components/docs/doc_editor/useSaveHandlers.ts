'use client';

import { useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { offlineStorage } from '@/lib/utils/offlineStorage';
import { docApi } from '@/lib/api/docApi';
import { toast } from 'sonner';
import { Doc, useDocStore } from '@/lib/store/docStore';
import { ConflictData } from './types';

interface UseSaveHandlersOptions {
  doc: Doc;
  editor: Editor | null;
  title: string;
  coverImage: string | null;
  contentRef: React.MutableRefObject<string>;
  setTitle: (title: string) => void;
  setCoverImage: (cover: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
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
        await offlineStorage.saveDoc(doc._id, JSON.parse(contentRef.current), title, coverImage);
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
      
      await offlineStorage.saveDoc(doc._id, content, title, coverImage, 'pending');
      
      const result = await docApi.saveDoc(doc._id, {
        content,
        title,
        coverImage,
      });
      
      if (result.success && result.data) {
        const serverContent = result.data.content;
        const serverUpdatedAt = new Date(result.updatedAt).getTime();
        
        if (editor && serverContent) {
          editor.commands.setContent(serverContent);
          contentRef.current = JSON.stringify(serverContent);
        }
        
        await offlineStorage.saveDoc(doc._id, serverContent || content, title, coverImage, 'synced', serverUpdatedAt);
        updateDoc(doc._id, { content: contentRef.current, title });
        setHasUnsavedChanges(false);
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
      await offlineStorage.saveDoc(
        doc._id,
        JSON.parse(contentRef.current),
        title,
        coverImage,
        'pending'
      );
      setHasUnsavedChanges(true);
      toast.success('Keeping your changes. Save to sync to cloud.');
    }
    setShowConflictDialog(false);
    setConflictData(null);
  }, [doc._id, title, coverImage, contentRef, setHasUnsavedChanges, setShowConflictDialog, setConflictData]);

  const handleAcceptServer = useCallback(async () => {
    if (conflictData?.serverDoc && editor) {
      const server = conflictData.serverDoc;
      
      editor.commands.setContent(server.content);
      contentRef.current = JSON.stringify(server.content);
      setTitle(server.title);
      setCoverImage(server.coverImage);
      
      await offlineStorage.saveDoc(
        doc._id,
        server.content,
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
      const localTitle = `${title} (Local Copy)`;
      
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await offlineStorage.saveDoc(
        localId,
        localContent,
        localTitle,
        coverImage,
        'pending'
      );
      
      addDoc({
        _id: localId,
        title: localTitle,
        content: JSON.stringify(localContent),
        docType: doc.docType || 'notes',
        coverImage: coverImage,
        isPinned: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      toast.success(`Local copy saved as "${localTitle}". Save it to push to cloud.`);
      
      const server = conflictData.serverDoc;
      editor.commands.setContent(server.content);
      contentRef.current = JSON.stringify(server.content);
      setTitle(server.title);
      setCoverImage(server.coverImage);
      
      await offlineStorage.saveDoc(
        doc._id,
        server.content,
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
        
        await offlineStorage.saveDoc(
          doc._id, 
          JSON.parse(contentRef.current), 
          title, 
          coverImage, 
          'pending'
        );
        
        updateDoc(doc._id, { 
          content: contentRef.current, 
          title,
          updatedAt: new Date().toISOString()
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
