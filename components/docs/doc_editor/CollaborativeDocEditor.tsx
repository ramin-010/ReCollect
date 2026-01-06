'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { ChevronLeft, Save, Users, User, Wifi, WifiOff, Loader2, X, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Doc } from '@/lib/store/docStore';
import { useAuthStore } from '@/lib/store/authStore';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import axios from '@/lib/utils/axios';

import { useCollaboration, CollaboratorInfo } from './useCollaboration';
import { useCollaborativeEditor } from './useCollaborativeEditor';
import { EditorStyles } from './EditorStyles';
import { CoverPicker } from './CoverPicker';
import { FloatingToolbar } from './FloatingToolbar';
import { ImageUploadDialog } from '../ImageUploadDialog';

interface CollaborativeDocEditorProps {
  doc: Doc;
  onBack: () => void;
}

interface CollaborativeEditorContentProps {
  ydoc: Y.Doc; 
  provider: HocuspocusProvider;
  user: { name: string; color: string; id: string };
  doc: Doc;
  onBack: () => void;
  collaborators: CollaboratorInfo[];
}

// Inner component that renders the full editor UI once connected
function CollaborativeEditorContent({ 
  ydoc, 
  provider, 
  user,
  doc,
  onBack,
  collaborators
}: CollaborativeEditorContentProps) {
  const { editor } = useCollaborativeEditor({
    ydoc,
    provider,
    user: { name: user.name, color: user.color },
    docId: doc._id,
  });

  // UI State matching DocEditor
  const [title, setTitle] = useState(doc.title);
  const [coverImage, setCoverImage] = useState<string | null>(doc.coverImage || null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Check if current user is the owner
  const isOwner = doc.role === 'owner' || 
    (typeof doc.user === 'object' && doc.user._id === user.id) ||
    (typeof doc.user === 'string' && doc.user === user.id);

  // Debounced save for Title/Cover (Metadata) - only for owners
  useEffect(() => {
    // Non-owners shouldn't save metadata
    if (!isOwner) return;
    
    const timer = setTimeout(async () => {
      if (title !== doc.title || coverImage !== doc.coverImage) {
        setIsSavingMetadata(true);
        try {
         
          await axios.patch(`/api/docs/${doc._id}`, {
            title,
            coverImage
          });
        } catch (err: any) {
          // Silently handle permission errors - non-owners can't edit metadata
          if (err?.response?.status !== 403) {
            console.error('Failed to save metadata:', err);
          }
        } finally {
          setIsSavingMetadata(false);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, coverImage, doc._id, doc.title, doc.coverImage, isOwner]);

  // Floating Toolbar Logic
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

    return () => {
      editor.off('selectionUpdate', updateToolbar);
    };
  }, [editor]);

  // Image Upload Logic
  useEffect(() => {
    if (editor) {
      // @ts-ignore
      editor.storage.upload = {
        openImageDialog: () => setShowImageDialog(true)
      };
    }
  }, [editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleCoverSelect = (url: string | null) => {
    setCoverImage(url);
  };

  const handleImageDialogUpload = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))]">
       {/* Floating Toolbar */}
       {editor && (
        <FloatingToolbar
          editor={editor}
          show={showFloatingToolbar}
          position={toolbarPosition}
        />
      )}

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
           {/* Collaboration Status Indicators */}
           <div className="flex items-center gap-2 mr-2">
             {provider.isSynced ? (
                <div 
                  className="flex items-center justify-center w-5 h-5" 
                  title="Live Collaboration Active"
                >
                  <div className="relative flex items-center justify-center h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.8),0_0_12px_rgba(16,185,129,0.4)]"></span>
                  </div>
                </div>
             ) : (
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1.5" />
             )}
             <span className="text-xs text-[hsl(var(--muted-foreground))]">
               {provider.isSynced ? 'Live' : 'Connecting...'}
             </span>
           </div>
           
           {/* Collaborators List */}
           {collaborators.length > 0 && (
             <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
               <Users className="w-3 h-3 text-[hsl(var(--muted-foreground))] ml-2 mr-1" />
               <div className="flex -space-x-2">
                 {collaborators.map((collab) => (
                   <div 
                    key={collab.clientId} 
                    className="relative w-6 h-6 rounded-full border border-[hsl(var(--background))] flex items-center justify-center text-[10px] text-white font-medium"
                    style={{ backgroundColor: collab.color }}
                    title={collab.name}
                   >
                     {collab.avatar ? (
                       <img src={collab.avatar} alt={collab.name} className="w-full h-full rounded-full object-cover" />
                     ) : collab.isCurrentUser ? (
                       <User className="w-3.5 h-3.5" />
                     ) : (
                       collab.name.charAt(0).toUpperCase()
                     )}
                   </div>
                 ))}
               </div>
               <span className="text-xs text-[hsl(var(--muted-foreground))] px-2">
                 {collaborators.length === 1 ? collaborators[0].name : `${collaborators.length} online`}
               </span>
             </div>
           )}
           
           {isSavingMetadata && (
            <span className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">Saving info...</span>
           )}
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
        <span className="flex items-center justify-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${provider.isSynced ? 'bg-green-500' : 'bg-amber-500'}`} />
           {provider.isSynced ? 'All changes saved & live' : 'Offline'}
        </span>
      </div>

      <EditorStyles />
    </div>
  );
}

/**
 * Collaborative document editor for shared docs.
 * Uses Yjs + HocusPocus for real-time sync.
 */
export function CollaborativeDocEditor({ doc, onBack }: CollaborativeDocEditorProps) {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string>('');
  
  useEffect(() => {
    // Get token from cookies
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
    if (tokenCookie) {
      setToken(tokenCookie.split('=')[1]);
    }
    setMounted(true);
  }, []);

  const getUserColor = (userId: string): string => {
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const {
    ydoc,
    provider,
    status,
    collaborators,
    connect,
    disconnect,
  } = useCollaboration({
    documentName: `doc_${doc._id}`,
    token, // Empty string is fine, backend checks cookie
    user: {
      id: user?._id || 'unknown',
      name: user?.name || 'Anonymous',
      color: getUserColor(user?._id || 'unknown'),
      avatar: user?.avatar,
    },
  });

  // Connect once when mounted
  const hasConnectedRef = useRef(false);
  
  useEffect(() => {
    if (mounted && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }
  }, [mounted, connect]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const handleBack = useCallback(() => {
    disconnect();
    onBack();
  }, [disconnect, onBack]);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <>
      {ydoc && provider ? (
        <CollaborativeEditorContent 
          ydoc={ydoc} 
          provider={provider}
          user={{
            id: user?._id || 'unknown',
            name: user?.name || 'Anonymous',
            color: getUserColor(user?._id || 'unknown'),
          }}
          doc={doc}
          onBack={handleBack}
          collaborators={collaborators}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
           <div className="flex flex-col items-center gap-2">
             <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
             <span className="text-sm text-[hsl(var(--muted-foreground))]">Connecting to collaboration server...</span>
           </div>
        </div>
      )}
    </>
  );
}

export default CollaborativeDocEditor;
