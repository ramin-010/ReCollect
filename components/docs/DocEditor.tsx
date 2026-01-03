'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import {TextStyle} from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import AutoJoiner from 'tiptap-extension-auto-joiner';
import { SlashCommands } from './SlashCommands';
import { Doc, useDocStore } from '@/lib/store/docStore';
import { toast } from 'sonner';
import { ImageUploadDialog } from './ImageUploadDialog';
import { offlineStorage, OfflineDoc } from '@/lib/utils/offlineStorage';
import { docApi, ServerDoc } from '@/lib/api/docApi';
import { SyncConflictDialog } from './SyncConflictDialog';
import { ResizableImage } from '@/lib/extensions/ResizableImage';
import { 
  ChevronLeft, Save, Bold, Italic, List, ListOrdered, Quote, Code, 
  Heading1, Heading2, Undo, Redo, Link as LinkIcon, Image as ImageIcon,
  Highlighter, CheckSquare, Underline as UnderlineIcon, ImagePlus, X, Type
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';

// Available cover images
const COVER_OPTIONS = [
  
  { id: 'cover1', src: '/cover/cov2.png', name: 'Abstract 1' },
  { id: 'cover2', src: '/cover/cov3.png', name: 'Abstract 2' },
 
  { id: 'cover3', src: '/cover/cov6.png', name: 'Minimal' },
];

const coverUrl = [
  { url : 'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1765275333/Gemini_Generated_Image_fxnzpofxnzpofxnz_PhotoGrid_ic5rhc.webp', name: 'Abstract 1' },
  { url : 'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1765275333/Gemini_Generated_Image_bpqvsrbpqvsrbpqv_ytl1rg.webp', name: 'Abstract 2' },
  { url : 'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1765275333/Gemini_Generated_Image_s2w1wds2w1wds2w1_zvupog.webp', name: 'Minimal' },
]

interface DocEditorProps {
  doc: Doc;
  onBack: () => void;
}

export function DocEditor({ doc, onBack }: DocEditorProps) {
  const { updateDoc, addDoc } = useDocStore();
  const [title, setTitle] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const contentRef = useRef<string>(
    typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content)
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Sync conflict state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<{
    localUpdatedAt: number;
    serverUpdatedAt: number;
    serverDoc: ServerDoc;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const getInitialContent = useCallback(() => {
    try {
      const parsed = JSON.parse(doc.content);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return '';
    } catch {
      return doc.content || '';
    }
  }, [doc.content]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading';
          }
          return "Type '/' for commands...";
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
        includeChildren: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline cursor-pointer hover:text-blue-300',
        },
      }),
      ResizableImage,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextStyle,
      Color,
      // DragHandleExtension is NOT added here - the <DragHandle> React component handles it
      AutoJoiner.configure({
        elementsToJoin: ['bulletList', 'orderedList'],
      }),
      SlashCommands,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      contentRef.current = JSON.stringify(editor.getJSON());
      setHasUnsavedChanges(true);
      debouncedSave();
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[900px]',
      },
      handlePaste: (view, event, slice) => {
        const item = event.clipboardData?.items[0];
        if (item?.type.indexOf('image') === 0) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const { schema } = view.state;
              const node = schema.nodes.image.create({ src: e.target?.result });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.indexOf('image') === 0) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const node = schema.nodes.image.create({ src: e.target?.result });
              const transaction = view.state.tr.insert(coordinates?.pos || 0, node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Initialize from Offline Storage
  useEffect(() => {
    setMounted(true);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Load content when editor is ready - with conflict detection
  useEffect(() => {
    if (mounted && editor && doc._id) {
      const loadContentWithSync = async () => {
        let localData: OfflineDoc | null = null;
        let serverData: ServerDoc | null = null;

        // Step 1: Load from IndexedDB first (instant UI)
        try {
          localData = await offlineStorage.loadDoc(doc._id);
          if (localData) {
            editor.commands.setContent(localData.content);
            contentRef.current = JSON.stringify(localData.content);
            setTitle(localData.title);
            if (localData.coverImage) setCoverImage(localData.coverImage);
          }
        } catch (e) {
          console.error("Failed to load offline doc", e);
        }

        // Step 2: Fetch from server (async)
        setIsSyncing(true);
        try {
          serverData = await docApi.fetchDoc(doc._id);
        } catch (e) {
          console.error("Failed to fetch from server", e);
        }
        setIsSyncing(false);

        // Step 3: Compare timestamps and handle conflicts
        if (localData && serverData) {
          const serverUpdatedAt = new Date(serverData.updatedAt).getTime();
          const localUpdatedAt = localData.updatedAt;

          // REVISED LOGIC: Show conflict when SERVER is newer AND local has pending changes
          // This means another device/user updated the doc, and we have unsaved local changes
          if (serverUpdatedAt > localUpdatedAt && localData.syncStatus === 'pending') {
            // CONFLICT: Server has newer changes but local has unsaved work
            setConflictData({
              localUpdatedAt,
              serverUpdatedAt,
              serverDoc: serverData,
            });
            setShowConflictDialog(true);
          } else if (serverUpdatedAt > localUpdatedAt) {
            // Server is newer, no local pending changes - silently update
            editor.commands.setContent(serverData.content);
            contentRef.current = JSON.stringify(serverData.content);
            setTitle(serverData.title);
            setCoverImage(serverData.coverImage);
            
            // Update IndexedDB with server data
            await offlineStorage.saveDoc(
              doc._id,
              serverData.content,
              serverData.title,
              serverData.coverImage,
              'synced',
              serverUpdatedAt
            );
          }
          // If local > server: User just hasn't saved yet - no warning, keep local
        } else if (!localData && serverData) {
          // No local data, use server
          editor.commands.setContent(serverData.content);
          contentRef.current = JSON.stringify(serverData.content);
          setTitle(serverData.title);
          setCoverImage(serverData.coverImage);
          
          await offlineStorage.saveDoc(
            doc._id,
            serverData.content,
            serverData.title,
            serverData.coverImage,
            'synced',
            new Date(serverData.updatedAt).getTime()
          );
        } else if (!localData && !serverData) {
          // New doc - use initial props
          const content = getInitialContent();
          if (content) {
            editor.commands.setContent(content, { emitUpdate: false });
          }
        }
      };

      loadContentWithSync();
    }
  }, [mounted, editor, doc._id]); // removed getInitialContent dependency

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      if (!doc._id) return;
      
      // Guard: Don't save if contentRef hasn't been populated yet
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
  }, [doc._id, title, coverImage]);

  // Auto-save when coverImage or title changes (not just content)
  useEffect(() => {
    if (mounted && doc._id) {
      debouncedSave();
    }
  }, [coverImage, title, mounted, doc._id, debouncedSave]);


  // Expose dialog opener to editor storage for SlashCommands
  useEffect(() => {
    if (editor) {
      // @ts-ignore - Extending storage dynamically
      editor.storage.upload = {
        openImageDialog: () => setShowImageDialog(true)
      };
    }
  }, [editor]);

  const handleImageDialogUpload = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
  };

  // Floating toolbar - show on text selection
  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      if (hasSelection) {
        // Get the selection coordinates
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        
        // Calculate toolbar position (centered above selection)
        const toolbarWidth = 400; // approximate
        const left = Math.max(10, (start.left + end.left) / 2 - toolbarWidth / 2);
        const top = Math.max(10, start.top - 50);
        
        setToolbarPosition({ top, left });
        setShowFloatingToolbar(true);
      } else {
        setShowFloatingToolbar(false);
      }
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('blur', () => {
      // Small delay to allow clicking toolbar buttons
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          setShowFloatingToolbar(false);
        }
      }, 150);
    });

    return () => {
      editor.off('selectionUpdate', updateToolbar);
    };
  }, [editor]);

  const saveDocument = useCallback(async () => {
    if (!doc._id) return;

    try {
      setIsSaving(true);
      
      const content = JSON.parse(contentRef.current);
      
      // Step 1: Save to IndexedDB first (with 'pending' status)
      await offlineStorage.saveDoc(doc._id, content, title, coverImage, 'pending');
      
      // Step 2: Call server API (it extracts images and uploads to cloud)
      const result = await docApi.saveDoc(doc._id, {
        content,
        title,
        coverImage,
      });
      
      // Step 3: Update with server response (contains cloud URLs instead of data URLs)
      if (result.success && result.data) {
        const serverContent = result.data.content;
        const serverUpdatedAt = new Date(result.updatedAt).getTime();
        
        // Update editor with content that has cloud URLs
        if (editor && serverContent) {
          editor.commands.setContent(serverContent);
          contentRef.current = JSON.stringify(serverContent);
        }
        
        // Save to IndexedDB with 'synced' status and cloud URLs
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
  }, [doc._id, title, coverImage, updateDoc, editor]);

  // Conflict resolution handlers
  const handleKeepMine = useCallback(async () => {
    // User chose to keep their local changes - mark as pending, will overwrite server on next save
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
  }, [doc._id, title, coverImage]);

  const handleAcceptServer = useCallback(async () => {
    if (conflictData?.serverDoc && editor) {
      // User chose server version - load it and update IndexedDB
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
  }, [conflictData, editor, doc._id]);

  const handleSaveAsNew = useCallback(async () => {
    if (doc._id && conflictData?.serverDoc && editor) {
      const localContent = JSON.parse(contentRef.current);
      const localTitle = `${title} (Local Copy)`;
      
      // Generate a local ID (will be used until user saves to server)
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save to IndexedDB only (not pushed to server until user manually saves)
      await offlineStorage.saveDoc(
        localId,
        localContent,
        localTitle,
        coverImage,
        'pending'  // Marked as pending = not yet on server
      );
      
      // Add to the doc store so it appears in the list immediately
        addDoc({
        _id: localId,
        title: localTitle,
        content: JSON.stringify(localContent),
        docType: doc.docType || 'notes', // Ensure docType is carried over
        coverImage: coverImage, 
        isPinned: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      toast.success(`Local copy saved as "${localTitle}". Save it to push to cloud.`);
      
      // Load server version into current doc
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
  }, [doc._id, conflictData, editor, title, coverImage, addDoc]);

  const handleBack = useCallback(async () => {
    // Always save current state to offline storage before going back
    // This ensures the preview on the docs list is up-to-date
    if (doc._id && contentRef.current && contentRef.current !== 'undefined') {
      try {
        // Clear any pending debounced save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        
        // Save to offline storage immediately
        await offlineStorage.saveDoc(
          doc._id, 
          JSON.parse(contentRef.current), 
          title, 
          coverImage, 
          'pending'
        );
        
        // Update the store's content so the preview is correct
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
  }, [doc._id, title, coverImage, updateDoc, onBack]);

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

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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
      {/* Sync Conflict Dialog */}
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
        {/* Cover Image Section */}
        {/* Cover Image Section - Styles matching SharedDocViewer */}
        {coverImage ? (
          <div className="w-full h-54 md:h-60 relative mb-8 group">
            <img 
              src={coverImage} 
              alt="Document cover" 
              className="w-full h-full object-cover object-[0_50%]"
            />
            {/* Gradient Overlay for "Mix Effect" */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(var(--background))] to-transparent" />
            
            {/* Cover Controls - appear on hover */}
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
                onClick={() => { setCoverImage(null); setHasUnsavedChanges(true); }}
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

        {/* Cover Picker Dropdown */}
        {showCoverPicker && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-32" onClick={() => setShowCoverPicker(false)}>
            <div 
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl p-4 w-[400px] max-h-[320px] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">Choose a cover</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCoverPicker(false)}
                  className="h-6 w-6 p-0 text-[hsl(var(--muted-foreground))]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {coverUrl.map((cover, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCoverImage(cover.url);
                      setShowCoverPicker(false);
                      setHasUnsavedChanges(true);
                    }}
                    className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      coverImage === cover.url 
                        ? 'border-amber-500 ring-2 ring-amber-500/30' 
                        : 'border-transparent hover:border-[hsl(var(--border))]'
                    }`}
                  >
                    <img 
                      src={cover.url} 
                      alt={cover.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {coverImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCoverImage(null);
                    setShowCoverPicker(false);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Remove cover
                </Button>
              )}
            </div>
          </div>
        )}

        <div className={`max-w-7xl mx-auto px-8 ${coverImage ? '-mt-28 relative z-10' : ''} py-10 rounded-lg`}>

          {/* Document Title */}
          <div className="mb-6 pl-4">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="New Page"
              className="w-full text-[62px] font-bold bg-transparent border-none outline-none placeholder:text-[hsl(var(--muted-foreground))/50] mb-2  leading-tight"
              style={{ fontFamily: '"Noto Sans", "Roboto", sans-serif' }}
            />
            <div className="w-16 h-1 bg-amber-500 rounded-full" />
          </div>

          {/* Floating Toolbar - appears on text selection */}
          {showFloatingToolbar && editor && (
            <div 
              ref={toolbarRef}
              className="fixed z-50 flex items-center gap-0.5 p-1.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-150"
              style={{ top: toolbarPosition.top, left: toolbarPosition.left }}
            >
              <Button type="button" variant={editor.isActive('bold') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className="h-7 w-7 p-0">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('italic') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className="h-7 w-7 p-0">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('underline') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className="h-7 w-7 p-0">
                <UnderlineIcon className="h-3.5 w-3.5" />
              </Button>
              <div className="relative">
                <Button 
                  type="button" 
                  variant={editor.isActive('highlight') ? 'primary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setShowHighlightPicker(!showHighlightPicker)} 
                  className="h-7 w-7 p-0"
                >
                  <Highlighter className="h-3.5 w-3.5" />
                </Button>
                {showHighlightPicker && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl z-50 min-w-[160px]">
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2 text-center">Highlight Color</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { color: 'rgba(254, 240, 138, 0.25)', name: 'Yellow' },
                        { color: 'rgba(187, 247, 208, 0.25)', name: 'Green' },
                        { color: 'rgba(147, 197, 253, 0.25)', name: 'Blue' },
                        { color: 'rgba(252, 165, 165, 0.25)', name: 'Red' },
                        { color: 'rgba(216, 180, 254, 0.25)', name: 'Purple' },
                        { color: 'rgba(253, 186, 116, 0.25)', name: 'Orange' },
                        { color: 'rgba(251, 207, 232, 0.25)', name: 'Pink' },
                        { color: 'rgba(94, 234, 212, 0.35)', name: 'Teal' },
                        { color: 'rgba(148, 163, 184, 0.4)', name: 'Gray' },
                      ].map((item) => (
                        <button
                          key={item.color}
                          onClick={() => {
                            editor.chain().focus().toggleHighlight({ color: item.color }).run();
                            setShowHighlightPicker(false);
                          }}
                          className="w-10 h-10 rounded-lg border-2 border-[hsl(var(--border))] hover:scale-105 hover:border-white/50 transition-all"
                          style={{ backgroundColor: item.color }}
                          title={item.name}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        editor.chain().focus().unsetHighlight().run();
                        setShowHighlightPicker(false);
                      }}
                      className="w-full mt-3 px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
                    >
                      Remove highlight
                    </button>
                  </div>
                )}
              </div>
              <div className="w-px h-4 bg-[hsl(var(--border))] mx-0.5" />
              <Button type="button" variant={editor.isActive('paragraph') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setParagraph().run()} className="h-7 w-7 p-0" title="Normal text">
                <Type className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('heading', { level: 1 }) ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="h-7 w-7 p-0">
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('heading', { level: 2 }) ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="h-7 w-7 p-0">
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-[hsl(var(--border))] mx-0.5" />
              <Button type="button" variant={editor.isActive('bulletList') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className="h-7 w-7 p-0">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('orderedList') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="h-7 w-7 p-0">
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-[hsl(var(--border))] mx-0.5" />
              <Button type="button" variant={editor.isActive('blockquote') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className="h-7 w-7 p-0">
                <Quote className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('codeBlock') ? 'primary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className="h-7 w-7 p-0">
                <Code className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant={editor.isActive('link') ? 'primary' : 'ghost'} size="sm" onClick={addLink} className="h-7 w-7 p-0">
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Editor with Drag Handle */}
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

      {/* Global Notion-like Styles */}
      <style jsx global>{`
        /* Drag Handle - from Novel */
        /* Drag Handle - Notion Style */
        .drag-handle {
          /* proper box model */
          width: 24px;
          height: 24px;
          z-index: 50;
          cursor: grab;
          color : white;
          
          /* aesthetics */
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E%3C/svg%3E");
          background-size: 20px 20px;
          background-repeat: no-repeat;
          background-position: center;
          
          transition: background-color 0.2s;
          border-radius: 4px;
        }
        .drag-handle:hover {
          background-color: rgba(255, 255, 255, 0.08);
          stroke: #ffffff !important;
        }
        .drag-handle:active {
          cursor: grabbing;
          background-color: rgba(255, 255, 255, 0.15);
        }
        .drag-handle.hide {
          opacity: 0;
          pointer-events: none;
        }

        /* Slash Command Menu */
        .slash-command-menu {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
          padding: 0.5rem;
          width: 280px;
          max-height: 320px;
          overflow-y: auto;
        }
        .slash-command-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.5rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.15s;
          background: transparent;
          border: none;
          text-align: left;
        }
        .slash-command-item:hover, .slash-command-item.is-selected {
          background: hsl(var(--accent));
        }
        .slash-command-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 0.375rem;
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          flex-shrink: 0;
        }
        .slash-command-text {
          display: flex;
          flex-direction: column;
        }
        .slash-command-title {
          font-weight: 500;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
        }
        .slash-command-description {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }


        /* Editor Styles */
        .notion-editor .ProseMirror {
          font-size: 16px;
          line-height: 1.75;
          color: hsl(var(--foreground));
        }
        .notion-editor .ProseMirror > * + * {
          margin-top: 0.75em;
        }
        .notion-editor .ProseMirror p.is-empty::before,
        .notion-editor .ProseMirror h1.is-empty::before,
        .notion-editor .ProseMirror h2.is-empty::before,
        .notion-editor .ProseMirror h3.is-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }
        .notion-editor .ProseMirror h1,
        .notion-editor .ProseMirror h2,
        .notion-editor .ProseMirror h3 {
          color: #FFFFFF;
        }
        .notion-editor .ProseMirror p,
        .notion-editor .ProseMirror li {
          color: #dad7d7ff;
          margin-left: 0;
          padding-left: 0;
        }
        .notion-editor .ProseMirror p {
          margin: 0.5rem 0;
        }
        .notion-editor .ProseMirror h1,
        .notion-editor .ProseMirror h2,
        .notion-editor .ProseMirror h3 {
          margin-left: 0;
          padding-left: 0;
        }
        .notion-editor .ProseMirror h1 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .notion-editor .ProseMirror h2 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        .notion-editor .ProseMirror mark {
          background-color: transparent;
          color: inherit;
          padding: 0;
          margin: 0;
          display: inline;
        }
        .notion-editor .ProseMirror h3 {
          font-size: 1.375rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .notion-editor .ProseMirror ul:not([data-type="taskList"]), 
        .notion-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .notion-editor .ProseMirror ul:not([data-type="taskList"]) {
          list-style-type: disc;
        }
        .notion-editor .ProseMirror ol {
          list-style-type: decimal;
        }
        .notion-editor .ProseMirror ul:not([data-type="taskList"]) li::marker,
        .notion-editor .ProseMirror ol li::marker {
          color: hsl(var(--muted-foreground));
        }
        .notion-editor .ProseMirror li {
          margin: 0.25rem 0;
        }
        .notion-editor .ProseMirror li p {
          margin: 0;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .notion-editor .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
          width: 16px;
          height: 16px;
          min-width: 16px;
          min-height: 16px;
          accent-color: hsl(var(--primary));
          cursor: pointer;
          margin: 0;
        }
        .notion-editor .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .notion-editor .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: ui-monospace, monospace;
        }
        .notion-editor .ProseMirror pre {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
          overflow-x: auto;
          font-family: ui-monospace, monospace;
        }
        .notion-editor .ProseMirror pre code {
          background: none;
          padding: 0;
        }
        .notion-editor .ProseMirror hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 2rem 0;
        }
        .notion-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;

        }
        .notion-editor .ProseMirror mark {
          background-color: transparent;
          color: #efecece5 !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 0 !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
