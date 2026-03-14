'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { ChevronLeft, Save, Users, User, Wifi, WifiOff, Loader2, X, ImagePlus, UserMinus, LogOut, Eye, ListTodo, ChevronDown, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Doc, useDocStore } from '@/lib/store/docStore';
import { useAuthStore } from '@/lib/store/authStore';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { offlineStorage } from '@/lib/utils/offlineStorage';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';

import { useCollaboration, CollaboratorInfo } from './useCollaboration';
import { useCollaborativeEditor } from './useCollaborativeEditor';
import { EditorStyles } from './EditorStyles';
import { CoverPicker } from './CoverPicker';
import { FloatingToolbar } from './FloatingToolbar';
import { ImageUploadDialog } from '../ImageUploadDialog';
import { SharedTasksPanel, useSharedTasksRefetch } from '@/components/shared/SharedTasksPanel';
import { TaskInput } from '@/components/todo/task_Input';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui-base/Popover';

interface CollaborativeDocEditorProps {
  doc: Doc;
  onBack: () => void;
  readOnly?: boolean; // true for viewer role
}

interface CollaborativeEditorContentProps {
  ydoc: Y.Doc; 
  provider: HocuspocusProvider;
  user: { name: string; color: string; id: string };
  doc: Doc;
  onBack: () => void;
  collaborators: CollaboratorInfo[];
  readOnly?: boolean;
}

// Inner component that renders the full editor UI once connected
function CollaborativeEditorContent({ 
  ydoc, 
  provider, 
  user,
  doc,
  onBack,
  collaborators,
  readOnly = false
}: CollaborativeEditorContentProps) {
  const { editor } = useCollaborativeEditor({
    ydoc,
    provider,
    user: { name: user.name, color: user.color },
    docId: doc._id,
    editable: !readOnly,
  });

  // Get updateDoc from Zustand store to sync preview
  const { updateDoc, removeDoc } = useDocStore();

  // Get or create the metadata Y.Map
  const metadataMap = ydoc.getMap('metadata');

  // UI State for metadata - synced via Y.Map
  const [title, setTitle] = useState(() => {
    const mapTitle = metadataMap.get('title');
    return typeof mapTitle === 'string' ? mapTitle : doc.title;
  });
  const [coverImage, setCoverImage] = useState<string | null>(() => {
    const mapCover = metadataMap.get('coverImage');
    return mapCover !== undefined ? (mapCover as string | null) : (doc.coverImage || null);
  });
  
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [isTaskInputPopoverOpen, setIsTaskInputPopoverOpen] = useState(false);
  const [isTaskInputExpanded, setIsTaskInputExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { refreshKey: taskRefreshKey, refresh: setTaskRefreshKey } = useSharedTasksRefetch();

  // Ctrl+K shortcut - opens task input popover + sidebar (overrides global QuickTaskAdd on this page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsTaskInputPopoverOpen(true);
        setIsTasksPanelOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept before global handler
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Check if current user is the owner
  const isOwner = doc.role === 'owner' || 
    (typeof doc.user === 'object' && doc.user._id === user.id) ||
    (typeof doc.user === 'string' && doc.user === user.id);

  // Merge DB collaborators with active sessions
  const mergedCollaborators = React.useMemo(() => {
    const uniqueUsers = new Map<string, any>();
    
    // Helper to add user to map
    const addUser = (id: string, name: string, role: string, avatar?: string, email?: string) => {
      if (!uniqueUsers.has(id)) {
        uniqueUsers.set(id, { id, name, role, avatar, email, isOnline: false });
      }
    };

    // 1. Add Owner
    if (doc.user) {
      const u = typeof doc.user === 'string' ? { _id: doc.user, name: 'Owner' } : doc.user;
      addUser(u._id, u.name, 'owner', undefined, (u as any).email);
    }

    // 2. Add DB Collaborators
    (doc.collaborators || []).forEach(c => {
      const u = typeof c.user === 'string' ? { _id: c.user, name: 'Unknown' } : c.user;
      const displayName = u.name || (u as any).email || 'Unknown';
      addUser(u._id, displayName, c.role, (u as any).avatar, (u as any).email); 
    });

    // 3. Merge with Active Sessions
    collaborators.forEach(active => {
      const existing = uniqueUsers.get(active.id);
      if (existing) {
        existing.isOnline = true;
        existing.color = active.color;
        existing.avatar = active.avatar || existing.avatar;
        existing.clientId = active.clientId;
        existing.isCurrentUser = active.isCurrentUser;
        uniqueUsers.set(active.id, existing);
      } else {
        uniqueUsers.set(active.id, {
          id: active.id,
          name: active.name,
          role: 'viewer', 
          color: active.color,
          avatar: active.avatar,
          isOnline: true,
          clientId: active.clientId,
          isCurrentUser: active.isCurrentUser
        });
      }
    });

    // Sort: online users first, offline users last
    return Array.from(uniqueUsers.values()).sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });
  }, [doc.user, doc.collaborators, collaborators]);

  const handleRemoveCollaborator = async (collaboratorId: string, collaboratorName: string) => {
    if (!collaboratorId || collaboratorId === 'unknown') {
      toast.error('Cannot remove user: Invalid ID');
      return;
    }
    
    let isLeavingSelf = false;

    try {
      // Detect if user is leaving themselves (vs owner removing someone else)
      isLeavingSelf = collaboratorId === user.id;
      
      const response = await axiosInstance.delete(`/api/docs/${doc._id}/collaborators/${collaboratorId}`);
      const remainingCountFromServer = response.data.remainingCount;
      
      // Only show "removed" toast when owner removes someone else
      // (Leaving user will see "You have left" from the onClose handler)
      if (!isLeavingSelf) {
        toast.success(`${collaboratorName} removed`);
      }
      
      // Update local doc state locally to reflect removal immediately (optimistic UI mostly, but we sync with server count)
      const remaining = (doc.collaborators || []).filter(c => {
         const uid = typeof c.user === 'string' ? c.user : c.user._id;
         return uid !== collaboratorId;
      });

      const updates: Partial<Doc> = { collaborators: remaining };

      // If no collaborators left AND user is owner, prepare to switch to Personal Mode
      // We check remainingCountFromServer to be sure (source of truth)
      if (remainingCountFromServer === 0 && isOwner) {
         try {
             // Capture latest state before switching editor
             const state = Y.encodeStateAsUpdate(ydoc);
             updates.yjsState = Buffer.from(state).toString('base64');
             updates.updatedAt = new Date().toISOString();
             toast.success('Switched to personal document');
         } catch (e) {
             console.error('Failed to convert to personal doc:', e);
         }
      }
      
      // Update store immediately
      updateDoc(doc._id, updates);

    } catch (error: any) {
      // Gracefully handle race condition: User removed by owner right before leaving
      // If doc/collaborator not found (404) or Forbidden (403), assume already removed.
      if (error.response?.status === 404 || error.response?.status === 403 || error.message?.includes('not found')) {
        if (isLeavingSelf) {
           toast.info('You have left the document');
           removeDoc(doc._id);
           onBack();
           return;
        }
      }

      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };



  // Apply pending local content if present (from "Keep my changes" conflict resolution)
  // Must wait for sync to complete before overwriting
  const pendingContentApplied = useRef(false);
  useEffect(() => {
    if (editor && doc.pendingLocalContent && !pendingContentApplied.current) {
      const applyContent = () => {
        if (pendingContentApplied.current) return;
        pendingContentApplied.current = true;
        
        try {
          const content = JSON.parse(doc.pendingLocalContent!);
          console.log('[CollabEditor] Provider synced, applying pending local content...');
          
          // Now that we're synced, our changes will be the "latest"
          editor.chain()
            .selectAll()
            .deleteSelection()
            .insertContent(content.content || [])
            .run();
          
          // Clear pendingLocalContent from store
          updateDoc(doc._id, { pendingLocalContent: undefined });
          console.log('[CollabEditor] Pending local content applied and cleared');
        } catch (err) {
          console.error('[CollabEditor] Failed to apply pending content:', err);
        }
      };
      
      // Wait for provider to be synced before applying
      if (provider.isSynced) {
        // Already synced, apply now
        applyContent();
      } else {
        // Wait for sync
        const onSync = () => {
          applyContent();
          provider.off('synced', onSync);
        };
        provider.on('synced', onSync);
        
        return () => {
          provider.off('synced', onSync);
        };
      }
    }
  }, [editor, doc._id, doc.pendingLocalContent, updateDoc, provider]);

  // Initialize Y.Map with doc values if empty (only owner should do this)
  useEffect(() => {
    if (isOwner && metadataMap.size === 0) {
      // Initialize metadata in Y.Map from doc props
      ydoc.transact(() => {
        metadataMap.set('title', doc.title || '');
        metadataMap.set('coverImage', doc.coverImage || null);
      });
    }
  }, [isOwner, metadataMap, doc.title, doc.coverImage, ydoc]);

  // Subscribe to Y.Map changes for real-time sync
  useEffect(() => {
    const observer = () => {
      const newTitle = metadataMap.get('title');
      const newCover = metadataMap.get('coverImage');
      
      if (typeof newTitle === 'string') {
        setTitle(newTitle);
      }
      if (newCover !== undefined) {
        setCoverImage(newCover as string | null);
      }
    };

    metadataMap.observe(observer);
    return () => metadataMap.unobserve(observer);
  }, [metadataMap]);

  
  const syncTimeoutRef = useRef<NodeJS.Timeout>(null);
  
  useEffect(() => {
    const syncToIndexedDB = () => {
      try {
        const yjsState = Y.encodeStateAsUpdate(ydoc);
        const yjsStateBase64 = Buffer.from(yjsState).toString('base64');
        const now = Date.now();
        
        // Save to IndexedDB - 'synced' because Hocuspocus handles server persistence
        offlineStorage.saveDoc(
          doc._id,
          yjsStateBase64,
          title,
          coverImage,
          'synced',
          now
        ).catch(err => console.error('[CollabEditor] Debounced sync failed:', err));
      } catch (err) {
        console.error('[CollabEditor] Failed to serialize ydoc:', err);
      }
    };

    // Listen for ydoc updates and debounce the IndexedDB sync
    const handleUpdate = () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(syncToIndexedDB, 2000); // 2 second debounce
    };

    ydoc.on('update', handleUpdate);
    
    return () => {
      ydoc.off('update', handleUpdate);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [ydoc, doc._id, title, coverImage]);

  // Update Y.Map when owner changes title (instead of REST API)
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (isOwner) {
      metadataMap.set('title', newTitle);
    }
  }, [isOwner, metadataMap]);

  // Update Y.Map when owner changes cover
  const handleCoverSelect = useCallback((url: string | null) => {
    setCoverImage(url);
    
    if (isOwner) {
      metadataMap.set('coverImage', url);
    }
  }, [isOwner, metadataMap]);

  // Update Zustand store AND IndexedDB before navigating back
  // This ensures local storage is synced for when doc becomes personal
  const handleBackWithSync = useCallback(async () => {
    try {
      const yjsState = Y.encodeStateAsUpdate(ydoc);
      const yjsStateBase64 = Buffer.from(yjsState).toString('base64');
      const now = Date.now();

      // Save to IndexedDB - marks as synced since Hocuspocus already saved to server
      await offlineStorage.saveDoc(
        doc._id,
        yjsStateBase64,
        title,
        coverImage,
        'synced',
        now // serverUpdatedAt = now since Hocuspocus syncs in real-time
      );

      // Update Zustand store for immediate UI update
      updateDoc(doc._id, { 
        yjsState: yjsStateBase64,
        title,
        coverImage,
        updatedAt: new Date().toISOString()
      });

      console.log('[CollabEditor] Synced to IndexedDB and store');
    } catch (err) {
      console.error('[CollabEditor] Failed to sync:', err);
    }
    onBack();
  }, [ydoc, doc._id, title, coverImage, updateDoc, onBack]);

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

  // Fullscreen effect & handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
      toast.error('Could not toggle fullscreen mode');
    }
  }, []);

  // Image Upload Logic
  useEffect(() => {
    if (editor) {
      // @ts-ignore
      editor.storage.upload = {
        openImageDialog: () => setShowImageDialog(true)
      };
    }
  }, [editor]);

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
    <div className="h-full flex flex-col  bg-[hsl(var(--background))]">
       {/* Floating Toolbar - only show when editable */}
       {editor && !readOnly && (
        <FloatingToolbar
          editor={editor}
          show={showFloatingToolbar}
          position={toolbarPosition}
        />
      )}

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 group/header p-2 -m-2 rounded-lg hover:bg-black/50 hover:backdrop-blur-sm  transition-all duration-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackWithSync}
            className="text-[hsl(var(--muted-foreground))] pl-2 hover:bg-[hsl(var(--accent))]/10  hover:text-[hsl(var(--foreground))] group-hover/header:text-[hsl(var(--foreground))] mr-4"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Back
        </Button>

        {/* Premium Reader View Badge */}
        {readOnly && (
           <div className="group flex items-center gap-2 pl-1 pr-2 py-1 rounded-full mr-auto bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)] transition-all hover:bg-black/10 dark:hover:bg-white/10 select-none ">
             <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-tr from-amber-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shadow-inner ">
                <Eye className="w-[11px] h-[11px] text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))]" />
             </div>
             <span className="text-[11px] text-[hsl(var(--muted-foreground))]  group-hover/header:text-[hsl(var(--foreground))] group-hover/header:text-[hsl(var(--foreground))] font-medium tracking-wide">Read Only</span>
           </div>
        )}

        <div className="flex items-center gap-3 ml-auto">
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
             <span className="text-xs text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))]">
               {provider.isSynced ? 'Live' : 'Connecting...'}
             </span>
           </div>

           {/* Fullscreen Toggle */}
           <Button
             variant="ghost"
             size="sm"
             onClick={toggleFullscreen}
             className="mr-2 h-8 px-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
             title={isFullscreen ? "Exit Fullscreen (F11/Esc)" : "Fullscreen (F11)"}
           >
             {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
           </Button>
           
           {/* Tasks Button with Dropdown Input */}
           <Popover open={isTaskInputPopoverOpen} onOpenChange={(open) => {
             setIsTaskInputPopoverOpen(open);
             if (open) setIsTasksPanelOpen(true); // Open sidebar when popover opens
           }}>
             <PopoverTrigger asChild>
               <button
                 className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-[hsl(var(--muted-foreground))]/30 group-hover/header:border-[hsl(var(--foreground))]/50 hover:bg-white/10 transition-colors"
                 title="Add task linked to this doc"
               >
                 <ListTodo className="w-3.5 h-3.5 text-amber-500" />
                 <span className="text-xs text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))]">Tasks</span>
                 <ChevronDown className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
               </button>
             </PopoverTrigger>
             <PopoverContent 
               align="end" 
               className="w-110 p-3 "
             >
               <TaskInput
                 isExpanded={isTaskInputExpanded}
                 onExpandChange={setIsTaskInputExpanded}
                 isQuickAdd={true}
                 initialReferences={[{ type: 'doc', refId: doc._id, title: title }]}
                 onSave={() => {
                   setTaskRefreshKey();
                   setIsTaskInputPopoverOpen(false);
                 }}
               />
             </PopoverContent>
           </Popover>
           
           {/* Collaborators List */}
           {mergedCollaborators.length > 0 && (
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-[hsl(var(--muted-foreground))] group-hover/header:border-[hsl(var(--foreground))] cursor-pointer hover:bg-white/10 transition-colors">
                   <Users className="w-3 h-3 text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))] ml-2 mr-1" />
                   <div className="flex -space-x-2">
                     {collaborators.slice(0, 5).map((collab) => (
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
                   <span className="text-xs text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))] px-2">
                     {collaborators.length === 1 ? collaborators[0].name : `${collaborators.length} online`}
                   </span>
                 </div>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                 <div className="px-2 py-2 text-xs font-semibold text-muted-foreground">
                   All Collaborators ({mergedCollaborators.length})
                 </div>
                 {mergedCollaborators.map((collab, idx) => (
                   <DropdownMenuItem 
                      key={collab.id || collab.clientId || idx} 
                      className={`flex items-center justify-between p-2 ${!collab.isOnline ? 'opacity-60' : ''}`}
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                       <div 
                         className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] text-white font-medium shrink-0 relative"
                         style={{ backgroundColor: collab.isOnline ? collab.color : '#6b7280' }}
                       >
                         {/* Avatar Content */}
                         {collab.avatar ? (
                           <img src={collab.avatar} alt={collab.name} className={`w-full h-full rounded-full object-cover ${!collab.isOnline && 'grayscale opacity-70'}`} />
                         ) : collab.isCurrentUser ? (
                           <User className="w-3.5 h-3.5" />
                         ) : (
                           (collab.name || '?').charAt(0).toUpperCase()
                         )}
                         
                         {/* Online/Offline Status Dot */}
                         <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[hsl(var(--popover))] ${collab.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                       </div>
                       
                       <div className="flex flex-col min-w-0">
                         <span className="text-sm font-medium truncate flex items-center gap-1">
                           {collab.name} {collab.isCurrentUser && '(You)'}
                           {!collab.isOnline && <span className="text-[10px] text-muted-foreground font-normal ml-1">(Offline)</span>}
                         </span>
                       </div>
                     </div>
                     
                     {isOwner && !collab.isCurrentUser && collab.id && collab.id !== 'unknown' && (
                       <div
                         role="button"
                         tabIndex={0}
                         title="Remove User"
                         className="h-6 mr-2 w-6 flex items-center justify-center rounded-md hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/40 cursor-pointer transition-colors"
                         onClick={(e) => {
                           e.preventDefault(); 
                           e.stopPropagation();
                           handleRemoveCollaborator(collab.id, collab.name);
                         }}
                       >
                         <UserMinus className="w-3.5 h-3.5" />
                       </div>
                     )}
                     
                     {/* Leave button for non-owner current user */}
                     {!isOwner && collab.isCurrentUser && (
                       <div
                         role="button"
                         tabIndex={0}
                         title="Leave Document"
                         className="h-6 mr-2 w-6 flex items-center justify-center rounded-md hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/40 cursor-pointer transition-colors"
                         onClick={(e) => {
                           e.preventDefault(); 
                           e.stopPropagation();
                           handleRemoveCollaborator(collab.id, collab.name);
                         }}
                       >
                         <LogOut className="w-3.5 h-3.5" />
                       </div>
                     )}
                   </DropdownMenuItem>
                 ))}
               </DropdownMenuContent>
             </DropdownMenu>
           )}

            {/* {isSavingMetadata && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">Saving info...</span>
            )} */}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar ">
        <ImageUploadDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          onImageUpload={handleImageDialogUpload}
        />

        {coverImage ? (
          <div className="w-full h-54 md:h-58 relative mb-8 group">
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
        ) : !readOnly ? (
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
        ) : (
          <div className="h-16" />
        )}

        <CoverPicker
          show={showCoverPicker}
          onClose={() => setShowCoverPicker(false)}
          currentCover={coverImage}
          onSelect={handleCoverSelect}
        />

        <div className={`max-w-6xl mx-auto px-8 ${coverImage ? '-mt-28 relative z-10' : ''} py-10 rounded-lg`}>
          <div className="mb-0 ">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="New Page"
              readOnly={readOnly}
              className={`w-full  text-[62px] font-bold bg-transparent border-none outline-none placeholder:text-[hsl(var(--muted-foreground))/50] mb-2 leading-tight ${readOnly ? 'cursor-default' : ''}`}
              style={{ fontFamily: '"Noto Sans", "Roboto", sans-serif' }}
            />
            <div className="w-16  h-1 bg-amber-500 rounded-full" />
          </div>

          <div className="notion-editor relative">
            {/* Drag Handle - only show when editable */}
            {!readOnly && (
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
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      
      <div className="px-6 py-2 text-xs text-[hsl(var(--muted-foreground))/50]  text-center shrink-0">
        <span className="flex items-center justify-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${provider.isSynced ? 'bg-green-500' : 'bg-amber-500'}`} />
           {provider.isSynced ? 'All changes saved & live' : 'Offline'}
        </span>
      </div>

      <EditorStyles />
      
      {/* Doc Tasks Panel */}
      <SharedTasksPanel
        key={taskRefreshKey}
        isOpen={isTasksPanelOpen}
        onClose={() => setIsTasksPanelOpen(false)}
        refId={doc._id}
        refTitle={title}
        refType="doc"
      />
    </div>
  );
}

/**
 * Collaborative document editor for shared docs.
 * Uses Yjs + HocusPocus for real-time sync.
 */
export function CollaborativeDocEditor({ doc, onBack, readOnly = false }: CollaborativeDocEditorProps) {
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
    wasRemovedByOwner,
    leftVoluntarily,
    collaboratorLeftEvent,
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

  // Check if current user is the owner (for outer component)
  const isDocOwner = doc.role === 'owner' || 
    (typeof doc.user === 'object' && doc.user._id === user?._id) ||
    (typeof doc.user === 'string' && doc.user === user?._id);

  // Modal state for "no collaborators left" prompt
  const [showNoCollaboratorsModal, setShowNoCollaboratorsModal] = useState(false);
  const { updateDoc, removeDoc } = useDocStore();

  // Show modal when last collaborator leaves (for owner only)
  // Handle other collaborators leaving - update store and show modal if needed
  useEffect(() => {
    if (collaboratorLeftEvent) {
      // 1. Remove the user from local doc.collaborators list so they don't show as "Offline"
      const leftUserId = collaboratorLeftEvent.userId;
      const currentCollaborators = doc.collaborators || [];
      
      const updatedCollaborators = currentCollaborators.filter(c => {
         const uid = typeof c.user === 'string' ? c.user : c.user._id;
         return uid !== leftUserId;
      });
      
      // Only update if changes detected
      if (updatedCollaborators.length !== currentCollaborators.length) {
         console.log('[Collab] Removing left user from store:', leftUserId);
         updateDoc(doc._id, { collaborators: updatedCollaborators });
      }

      // 2. Show modal when last collaborator leaves (for owner only)
      if (isDocOwner && collaboratorLeftEvent.remainingCount === 0) {
        console.log('[Collab] Last collaborator left, showing modal to owner');
        setShowNoCollaboratorsModal(true);
      }
    }
  }, [collaboratorLeftEvent, isDocOwner, doc.collaborators, updateDoc, doc._id]);

  // Handle voluntary leave - cleanup and navigate back
  useEffect(() => {
    if (leftVoluntarily) {
      console.log('[Collab] Left voluntarily, cleaning up and navigating back');
      // Remove doc from store since user is no longer a collaborator
      removeDoc(doc._id);
      // Navigate back to dashboard
      toast.success('You have left the document');
      onBack();
    }
  }, [leftVoluntarily, removeDoc, doc._id, onBack]);

  // Handler for switching to personal document
  const handleSwitchToPersonal = useCallback(() => {
    if (!ydoc) return;
    
    try {
      // Capture current YJS state
      const state = Y.encodeStateAsUpdate(ydoc);
      const yjsState = Buffer.from(state).toString('base64');
      
      // Update store to trigger switch to Personal Editor
      updateDoc(doc._id, { 
        collaborators: [], 
        yjsState,
        updatedAt: new Date().toISOString()
      });
      
      setShowNoCollaboratorsModal(false);
      toast.success('Switched to personal document');
    } catch (e) {
      console.error('[Collab] Error switching to personal:', e);
      toast.error('Failed to switch to personal document');
    }
  }, [ydoc, doc._id, updateDoc]);

  console.log('collaborators', collaborators);
  // Connect once when mounted
  const hasConnectedRef = useRef(false);
  
  useEffect(() => {
    if (mounted && !hasConnectedRef.current && !wasRemovedByOwner) {
      hasConnectedRef.current = true;
      connect();
    }
  }, [mounted, connect, wasRemovedByOwner]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);


  const handleBack = useCallback(() => {
    disconnect();
    if (wasRemovedByOwner) {
      removeDoc(doc._id);
    }
    onBack();
  }, [disconnect, onBack, wasRemovedByOwner, removeDoc, doc._id]);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }


  return (
    <div className="relative  h-full">
      <div className={`h-full transition-all duration-500 ${wasRemovedByOwner ? 'pointer-events-none select-none' : ''}`}>
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
            readOnly={readOnly}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
             <div className="flex flex-col items-center gap-2">
               <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
               <span className="text-sm text-[hsl(var(--muted-foreground))]">Connecting to collaboration server...</span>
             </div>
          </div>
        )}
      </div>

      {wasRemovedByOwner && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl rounded-xl p-8 text-center max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Access Revoked</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              You have been removed from this document by the owner. You no longer have access to view or edit this content.
            </p>
            <button 
              onClick={handleBack}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* No Collaborators Modal */}
      {showNoCollaboratorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                No Collaborators Left
              </h2>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              All collaborators have left this document. Would you like to switch to a personal document to save resources?
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNoCollaboratorsModal(false)}
              >
                Stay in Collab Mode
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSwitchToPersonal}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Switch to Personal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollaborativeDocEditor;
