'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { ChevronLeft, Save, ImagePlus, X, CloudOff, RotateCcw, Cloud, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { ImageUploadDialog } from '../ImageUploadDialog';
import { SyncConflictDialog } from '../SyncConflictDialog';
import { TaskSidebar } from './TaskSidebar';
// import { TodoDialog } from '@/components/todo/TodoDialog';
import axiosInstance from '@/lib/utils/axios';
import { useTodoStore } from '@/lib/store/todoStore';
import { toast } from 'sonner';

import { DocEditorProps, ToolbarPosition } from './types';
import { useEditorSetup } from './useEditorSetup';
import { useDocState } from './useDocState';
import { useDocPersistence } from './useDocPersistence';
import { useDocNotifications } from './useDocNotifications';
import { useDocStore } from '@/lib/store/docStore';
import { FloatingToolbar } from './FloatingToolbar';
import { CoverPicker } from './CoverPicker';
import { EditorStyles } from './EditorStyles';
import { offlineStorage } from '@/lib/utils/offlineStorage';

export function DocEditor({ doc, onBack }: DocEditorProps) {
  // 1. Unified State Management
  const { state, actions } = useDocState({ initialDoc: doc });
  
  // UI State (Non-persistent)
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [showTaskSidebar, setShowTaskSidebar] = useState(false);
  const [showQuickTaskDialog, setShowQuickTaskDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const contentRef = useRef<string>('{}');
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 2. Editor Setup
  // We explicitly separate content changes from persistence triggers
  const handleContentChange = (jsonString: string) => {
    contentRef.current = jsonString;
    actions.markDirty(); 
    persistence.debouncedSave();
  };

  const { editor, getInitialContent } = useEditorSetup({
    doc,
    onContentChange: handleContentChange,
  });

  // 3. Persistence Logic
  const persistence = useDocPersistence({
    doc,
    editor,
    contentRef,
    state,
    actions,
    getInitialContent,
    onBack,
  });

  // 4. Real-time listener for collaborator joins (enables instant switch to CollaborativeDocEditor)
  // Pass getEditorContent so unsaved changes are preserved when switching (Case 1 fix)
  useDocNotifications({ 
    docId: doc._id,
    getEditorContent: () => contentRef.current || null
  });

  console.log('DocEditor state:', state.hasUnsavedChanges, state.isSaving);
  // 5. Effects
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editor) {
      // @ts-ignore - Extending storage dynamically
      editor.storage.upload = {
        openImageDialog: () => setShowImageDialog(true)
      };
      // @ts-ignore - Task creation from slash command
      editor.storage.tasks = {
        openTaskDialog: () => setShowQuickTaskDialog(true)
      };
    }
  }, [editor]);

  // Initial Save Trigger removed - rely on useDocPersistence's load logic

  // Toolbar Logic
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

    const editorElement = editor.view.dom;
    editorElement.addEventListener('dragstart', hideToolbar);
    editorElement.addEventListener('drag', hideToolbar);
    
    const scrollContainer = editorElement.closest('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', hideToolbar);
    }
    window.addEventListener('scroll', hideToolbar, true);
    
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        persistence.saveDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [persistence]);


  // Handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setTitle(e.target.value || 'Untitled');
    // Debounced save handled by useDocPersistence logic? 
    // No, useDocPersistence debouncedSave depends on state.title changes? 
    // Let's check useDocPersistence deps.
    // Yes, [doc._id, title, coverImage...] are deps for debouncedSave callback, 
    // BUT we need to trigger it.
    persistence.debouncedSave(); 
  };

  const handleImageDialogUpload = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
  };

  const handleCoverSelect = (url: string | null) => {
    actions.setCoverImage(url);
    persistence.debouncedSave();
  };

  // Get todoStore to add tasks
  const { addTodo } = useTodoStore();

  // Quick task creation from slash command (auto-links to doc)
  const handleQuickTaskSave = async (data: any) => {
    try {
      const response = await axiosInstance.post('/api/todos', {
        text: data.text,
        priority: data.priority || 'medium',
        status: 'pending',
        dueDate: data.dueDate,
        reminderDate: data.reminderDate,
        references: [{
          type: 'doc',
          refId: doc._id,
          title: state.title
        }]
      });
      
      if (response.data.success) {
        addTodo(response.data.data);
        toast.success('Task created and linked to this doc');
      }
      setShowQuickTaskDialog(false);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
      throw error;
    }
  };

  const hasUnsyncedChanges = state.syncStatus === 'unsynced';

  if (!mounted || !editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-[hsl(var(--muted-foreground))]">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))] ">
      {persistence.conflictData && (
        <SyncConflictDialog
          open={persistence.showConflictDialog}
          onClose={() => persistence.setShowConflictDialog(false)}
          localUpdatedAt={persistence.conflictData.localUpdatedAt}
          serverUpdatedAt={persistence.conflictData.serverUpdatedAt}
          localContent={persistence.conflictData.localContent}
          serverContent={persistence.conflictData.serverContent}
          onAcceptServer={persistence.handleAcceptServer}
          onKeepMine={persistence.handleKeepMine}
          onSaveAsNew={persistence.handleSaveAsNew}
        />
      )}

      {editor && (
        <FloatingToolbar
          editor={editor}
          show={showFloatingToolbar}
          position={toolbarPosition}
        />
      )}

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 group/header p-2 -m-2 rounded-lg hover:bg-black/50 hover:backdrop-blur-sm  transition-all duration-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={persistence.handleBack}
            className="text-[hsl(var(--muted-foreground))] pl-2 hover:bg-[hsl(var(--accent))]/10 hover:text-[hsl(var(--foreground))] group-hover/header:text-[hsl(var(--foreground))] mr-4"
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          
          {hasUnsyncedChanges && (
            <>
              <span 
                title="Changes not synced to cloud"
              >
                <CloudOff 
                className="w-4 h-4 text-blue-500/50 hover:text-blue-500 group-hover/header:text-blue-500"
              />
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevertModal(true)}
                className="text-zinc-400/50 hover:text-red-400 hover:bg-red-500/10 group-hover/header:text-zinc-400 h-7 w-7 p-0"
                title="Discard local changes"
              >
                <RotateCcw className="w-4 h-4 text-red-500/50 hover:text-red-500 group-hover/header:text-red-500" />
              </Button>
            </>
          )}
          {!hasUnsyncedChanges && (
            <span 
              title="Changes synced to cloud"
            >
              <Cloud 
              className="w-4 h-4 text-blue-500/50 hover:text-blue-500 group-hover/header:text-blue-500"
            />
            </span>
          )}
        </div>
        
        <div className="flex items-center  gap-3">
          {state.isSyncing && (
            <span className="text-sm text-blue-400/80 animate-pulse">Syncing...</span>
          )}
          {state.hasUnsavedChanges && !state.isSaving && (
            
            <span   
              className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" 
              title="Saving to local storage"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTaskSidebar(true)}
            className="text-[hsl(var(--muted-foreground))] hover:bg-emerald-500/10 hover:text-emerald-600 group-hover/header:text-[hsl(var(--foreground))]"
            leftIcon={<CheckSquare className="w-4 h-4" />}
            title="View linked tasks"
          >
            Tasks
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={persistence.saveDocument}
            disabled={!hasUnsyncedChanges || state.isSaving}
            className="text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]/10 hover:text-[hsl(var(--foreground))] group-hover/header:text-[hsl(var(--foreground))]"
            leftIcon={<Save className="w-4 h-4" />}
          >
            {state.isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {showRevertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Discard Local Changes?</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              This will reset your document to the last saved server version. Any changes made since then will be permanently lost.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevertModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const savedContent = getInitialContent();
                  if (editor && savedContent) {
                    editor.commands.setContent(savedContent, { emitUpdate: false });
                  }
                  await offlineStorage.markAsSynced(doc._id);
                  actions.markSynced(); 
                  
                  // Update global store to reflect discarded changes
                   useDocStore.getState().updateDoc(doc._id, { hasUnsyncedChanges: false });

                  setShowRevertModal(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-0">
        <ImageUploadDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          onImageUpload={handleImageDialogUpload}
        />

        {state.coverImage ? (
          <div className="w-full h-54 md:h-58 relative mb-8 group">
            <img 
              src={state.coverImage} 
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
          currentCover={state.coverImage}
          onSelect={handleCoverSelect}
        />

        <div className={`max-w-6xl mx-auto px-8 ${state.coverImage ? '-mt-28 relative z-10' : ''} py-10 rounded-lg`}>
          <div className="mb-0 ">
            <input
              type="text"
              value={state.title}
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

      <TaskSidebar
        isOpen={showTaskSidebar}
        onClose={() => setShowTaskSidebar(false)}
        docId={doc._id}
        docTitle={state.title}
      />

      {/* Quick Task Dialog from /task slash command */}
      {/* <TodoDialog
        isOpen={showQuickTaskDialog}
        onClose={() => setShowQuickTaskDialog(false)}
        onSave={handleQuickTaskSave}
      /> */}

      <EditorStyles />
    </div>
  );
}

export default DocEditor;

// Re-export collaborative editor
export { CollaborativeDocEditor } from './CollaborativeDocEditor';
