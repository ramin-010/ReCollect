'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { ChevronLeft, Save, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { ImageUploadDialog } from '../ImageUploadDialog';
import { SyncConflictDialog } from '../SyncConflictDialog';

import { DocEditorProps, ToolbarPosition } from './types';
import { useEditorSetup } from './useEditorSetup';
import { useSyncLogic } from './useSyncLogic';
import { useSaveHandlers } from './useSaveHandlers';
import { FloatingToolbar } from './FloatingToolbar';
import { CoverPicker } from './CoverPicker';
import { EditorStyles } from './EditorStyles';

export function DocEditor({ doc, onBack }: DocEditorProps) {
  const [title, setTitle] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  
  const contentRef = useRef<string>('{}');
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleContentChange = (jsonString: string) => {
    contentRef.current = jsonString;
    setHasUnsavedChanges(true);
    debouncedSave();
  };

  const { editor, getInitialContent } = useEditorSetup({
    doc,
    onContentChange: handleContentChange,
  });

  const {
    showConflictDialog,
    setShowConflictDialog,
    conflictData,
    setConflictData,
    isSyncing,
  } = useSyncLogic({
    docId: doc._id,
    editor,
    mounted,
    contentRef,
    setTitle,
    setCoverImage,
    getInitialContent,
  });

  const {
    debouncedSave,
    saveDocument,
    handleKeepMine,
    handleAcceptServer,
    handleSaveAsNew,
    handleBack,
    clearSaveTimeout,
  } = useSaveHandlers({
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
  });

  useEffect(() => {
    setMounted(true);
    return () => {
      clearSaveTimeout();
    };
  }, [clearSaveTimeout]);

  useEffect(() => {
    if (editor) {
      // @ts-ignore - Extending storage dynamically
      editor.storage.upload = {
        openImageDialog: () => setShowImageDialog(true)
      };
    }
  }, [editor]);

  useEffect(() => {
    if (mounted && doc._id) {
      debouncedSave();
    }
  }, [coverImage, title, mounted, doc._id, debouncedSave]);

  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      if (hasSelection) {
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        
        const toolbarWidth = 400;
        const left = Math.max(10, (start.left + end.left) / 2 - toolbarWidth / 2);
        const top = Math.max(10, start.top - 50);
        
        setToolbarPosition({ top, left });
        setShowFloatingToolbar(true);
      } else {
        setShowFloatingToolbar(false);
      }
    };

    const hideToolbar = () => {
      setShowFloatingToolbar(false);
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('blur', () => {
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          setShowFloatingToolbar(false);
        }
      }, 150);
    });

    // Hide toolbar during drag operations
    const editorElement = editor.view.dom;
    editorElement.addEventListener('dragstart', hideToolbar);
    editorElement.addEventListener('drag', hideToolbar);
    
    // Hide toolbar on scroll
    const scrollContainer = editorElement.closest('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', hideToolbar);
    }
    window.addEventListener('scroll', hideToolbar, true);
    
    // Hide on mousedown on drag handle
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.drag-handle') || target.closest('.drag-handle-icon')) {
        hideToolbar();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editorElement.removeEventListener('dragstart', hideToolbar);
      editorElement.removeEventListener('drag', hideToolbar);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', hideToolbar);
      }
      window.removeEventListener('scroll', hideToolbar, true);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value || 'Untitled';
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const handleImageDialogUpload = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
  };

  const handleCoverSelect = (url: string | null) => {
    setCoverImage(url);
    setHasUnsavedChanges(true);
  };

  if (!mounted || !editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[hsl(var(--muted-foreground))]">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))]">
      {conflictData && (
        <SyncConflictDialog
          open={showConflictDialog}
          onClose={() => setShowConflictDialog(false)}
          localUpdatedAt={conflictData.localUpdatedAt}
          serverUpdatedAt={conflictData.serverUpdatedAt}
          onAcceptServer={handleAcceptServer}
          onKeepMine={handleKeepMine}
          onSaveAsNew={handleSaveAsNew}
        />
      )}

      {/* Floating Toolbar - rendered at root level for proper z-index stacking */}
      {editor && (
        <FloatingToolbar
          editor={editor}
          show={showFloatingToolbar}
          position={toolbarPosition}
        />
      )}

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <span className="text-xs text-blue-400/80 animate-pulse">Syncing...</span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400/80">Unsaved changes</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={saveDocument}
            disabled={!hasUnsavedChanges || isSaving}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-16">
        <ImageUploadDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          onImageUpload={handleImageDialogUpload}
        />

        {coverImage ? (
          <div className="w-full h-54 md:h-60 relative mb-8 group">
            <img 
              src={coverImage} 
              alt="Document cover" 
              className="w-full h-full object-cover object-[0_50%]"
            />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(var(--background))] to-transparent" />
            
            <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCoverPicker(true)}
                className="bg-black/50 hover:bg-black/70 text-white text-xs backdrop-blur-sm"
              >
                Change cover
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCoverSelect(null)}
                className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-24 flex items-end justify-center pb-4"> 
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCoverPicker(true)}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] text-sm opacity-60 hover:opacity-100 transition-opacity"
              leftIcon={<ImagePlus className="h-4 w-4" />}
            >
              Add cover
            </Button>
          </div>
        )}

        <CoverPicker
          show={showCoverPicker}
          onClose={() => setShowCoverPicker(false)}
          currentCover={coverImage}
          onSelect={handleCoverSelect}
        />

        <div className={`max-w-7xl mx-auto px-8 ${coverImage ? '-mt-28 relative z-10' : ''} py-10 rounded-lg`}>
          <div className="mb-6 pl-4">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="New Page"
              className="w-full text-[62px] font-bold bg-transparent border-none outline-none placeholder:text-[hsl(var(--muted-foreground))/50] mb-2 leading-tight"
              style={{ fontFamily: '"Noto Sans", "Roboto", sans-serif' }}
            />
            <div className="w-16 h-1 bg-amber-500 rounded-full" />
          </div>

          <div className="notion-editor relative">
            <DragHandle editor={editor}>
              <div className="drag-handle-icon cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="9" cy="12" r="1"/>
                  <circle cx="9" cy="5" r="1"/>
                  <circle cx="9" cy="19" r="1"/>
                  <circle cx="15" cy="12" r="1"/>
                  <circle cx="15" cy="5" r="1"/>
                  <circle cx="15" cy="19" r="1"/>
                </svg>
              </div>
            </DragHandle>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="px-6 py-2 text-xs text-[hsl(var(--muted-foreground))/50] text-center shrink-0">
        <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[10px]">Ctrl+S</kbd> to save
        <span className="mx-2">•</span>
        <span>Type <kbd className="px-1 py-0.5 rounded bg-[hsl(var(--muted))] font-mono text-[10px]">/</kbd> for commands</span>
      </div>

      <EditorStyles />
    </div>
  );
}

export default DocEditor;

// Re-export collaborative editor
export { CollaborativeDocEditor } from './CollaborativeDocEditor';
