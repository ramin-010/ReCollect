'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import {
  ChevronLeft, Users, User, Loader2, X, ImagePlus,
  UserMinus, LogOut, Eye, ListTodo, ChevronDown, Maximize, Minimize,
} from 'lucide-react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';

import { Button } from '@/components/ui-base/Button';
import { Doc, useDocStore } from '@/lib/store/docStore';
import { useAuthStore } from '@/lib/store/authStore';
import { offlineStorage } from '@/lib/utils/offlineStorage';
import axiosInstance from '@/lib/utils/axios';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui-base/Popover';
import { useViewStore } from '@/lib/store/viewStore';

import { useCollaboration, CollaboratorInfo } from './useCollaboration';
import { useCollaborativeEditor } from './useCollaborativeEditor';
import { EditorStyles } from './EditorStyles';
import { CoverPicker } from './CoverPicker';
import { FloatingToolbar } from './FloatingToolbar';
import { ImageUploadDialog } from '../ImageUploadDialog';
import { SharedTasksPanel, useSharedTasksRefetch } from '@/components/shared/SharedTasksPanel';
import { TaskInput } from '@/components/todo/task_Input';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CollaborativeDocEditorProps {
  doc: Doc;
  onBack: () => void;
  readOnly?: boolean;
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

interface MergedCollaborator {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
  isOnline: boolean;
  color?: string;
  clientId?: number;
  isCurrentUser?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
];

const INDEXEDDB_SYNC_DEBOUNCE_MS = 2000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function getTokenFromCookies(): string {
  const tokenCookie = document.cookie
    .split(';')
    .find(c => c.trim().startsWith('token='));
  return tokenCookie ? tokenCookie.split('=')[1] : '';
}

function isDocOwner(doc: Doc, userId?: string): boolean {
  return (
    doc.role === 'owner' ||
    (typeof doc.user === 'object' && doc.user._id === userId) ||
    (typeof doc.user === 'string' && doc.user === userId)
  );
}

function encodeYDocToBase64(ydoc: Y.Doc): string {
  return Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString('base64');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pulsing green dot shown when provider is synced. */
function LiveIndicator() {
  return (
    <div className="relative flex items-center justify-center h-3 w-3" title="Live Collaboration Active">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.8),0_0_12px_rgba(16,185,129,0.4)]" />
    </div>
  );
}

/** Thin amber dot shown while connecting. */
function ConnectingIndicator() {
  return <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1.5" />;
}

/** Read-only badge shown in the header for viewer-role users. */
function ReadOnlyBadge() {
  return (
    <div className="group flex items-center gap-2 pl-1 pr-2 py-1 rounded-full mr-auto bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)] transition-all hover:bg-black/10 dark:hover:bg-white/10 select-none">
      <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-tr from-amber-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 shadow-inner">
        <Eye className="w-[11px] h-[11px] text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))]" />
      </div>
      <span className="text-[11px] text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))] font-medium tracking-wide">
        Read Only
      </span>
    </div>
  );
}

/** Avatar circle used in the collaborators pill. */
function CollaboratorAvatar({ collab }: { collab: CollaboratorInfo }) {
  return (
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
  );
}

/** Single row inside the "All Collaborators" dropdown. */
function CollaboratorRow({
  collab,
  isOwner,
  onRemove,
  onLeave,
}: {
  collab: MergedCollaborator;
  isOwner: boolean;
  onRemove: (id: string, name: string) => void;
  onLeave: (id: string, name: string) => void;
}) {
  const canRemove = isOwner && !collab.isCurrentUser && !!collab.id && collab.id !== 'unknown';
  const canLeave = !isOwner && collab.isCurrentUser;

  return (
    <DropdownMenuItem
      key={collab.id || collab.clientId}
      className={`flex items-center justify-between p-2 ${!collab.isOnline ? 'opacity-60' : ''}`}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-2 overflow-hidden">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] text-white font-medium shrink-0 relative"
          style={{ backgroundColor: collab.isOnline ? collab.color : '#6b7280' }}
        >
          {collab.avatar ? (
            <img
              src={collab.avatar}
              alt={collab.name}
              className={`w-full h-full rounded-full object-cover ${!collab.isOnline && 'grayscale opacity-70'}`}
            />
          ) : collab.isCurrentUser ? (
            <User className="w-3.5 h-3.5" />
          ) : (
            (collab.name || '?').charAt(0).toUpperCase()
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[hsl(var(--popover))] ${
              collab.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate flex items-center gap-1">
            {collab.name} {collab.isCurrentUser && '(You)'}
            {!collab.isOnline && (
              <span className="text-[10px] text-muted-foreground font-normal ml-1">(Offline)</span>
            )}
          </span>
        </div>
      </div>

      {/* Remove / Leave action */}
      {canRemove && (
        <ActionIconButton
          title="Remove User"
          hoverClass="hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/40"
          onClick={() => onRemove(collab.id, collab.name)}
          icon={<UserMinus className="w-3.5 h-3.5" />}
        />
      )}
      {canLeave && (
        <ActionIconButton
          title="Leave Document"
          hoverClass="hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/40"
          onClick={() => onLeave(collab.id, collab.name)}
          icon={<LogOut className="w-3.5 h-3.5" />}
        />
      )}
    </DropdownMenuItem>
  );
}

/** Tiny square icon button used for remove/leave actions. */
function ActionIconButton({
  title,
  hoverClass,
  onClick,
  icon,
}: {
  title: string;
  hoverClass: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={title}
      className={`h-6 mr-2 w-6 flex items-center justify-center rounded-md cursor-pointer transition-colors ${hoverClass}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
    >
      {icon}
    </div>
  );
}

// ─── Inner editor component ───────────────────────────────────────────────────

function CollaborativeEditorContent({
  ydoc,
  provider,
  user,
  doc,
  onBack,
  collaborators,
  readOnly = false,
}: CollaborativeEditorContentProps) {
  const { editor } = useCollaborativeEditor({
    ydoc,
    provider,
    user: { name: user.name, color: user.color },
    docId: doc._id,
    editable: !readOnly,
  });

  const { updateDoc, removeDoc } = useDocStore();
  const metadataMap = ydoc.getMap('metadata');
  const ownerForContent = isDocOwner(doc, user.id);

  // ── UI State ──────────────────────────────────────────────────────────────

  const [title, setTitle] = useState<string>(() => {
    const v = metadataMap.get('title');
    return typeof v === 'string' ? v : doc.title;
  });
  const [coverImage, setCoverImage] = useState<string | null>(() => {
    const v = metadataMap.get('coverImage');
    return v !== undefined ? (v as string | null) : (doc.coverImage || null);
  });

  const [showCoverPicker, setShowCoverPicker]         = useState(false);
  const [showImageDialog, setShowImageDialog]         = useState(false);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition]         = useState({ top: 0, left: 0 });
  const [isTasksPanelOpen, setIsTasksPanelOpen]       = useState(false);
  const [isTaskInputPopoverOpen, setIsTaskInputPopoverOpen] = useState(false);
  const [isTaskInputExpanded, setIsTaskInputExpanded] = useState(true);
  const [isFullscreen, setIsFullscreen]               = useState(false);

  const toolbarRef     = useRef<HTMLDivElement>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout>(null);
  const pendingContentApplied = useRef(false);

  const { refreshKey: taskRefreshKey, refresh: setTaskRefreshKey } = useSharedTasksRefetch();

  // ── Merged collaborator list ───────────────────────────────────────────────

  const mergedCollaborators = React.useMemo<MergedCollaborator[]>(() => {
    const map = new Map<string, MergedCollaborator>();

    const add = (id: string, name: string, role: string, avatar?: string, email?: string) => {
      if (!map.has(id)) map.set(id, { id, name, role, avatar, email, isOnline: false });
    };

    if (doc.user) {
      const u = typeof doc.user === 'string' ? { _id: doc.user, name: 'Owner' } : doc.user;
      add(u._id, u.name, 'owner', undefined, (u as any).email);
    }

    (doc.collaborators || []).forEach(c => {
      const u = typeof c.user === 'string' ? { _id: c.user, name: 'Unknown' } : c.user;
      add(u._id, u.name || (u as any).email || 'Unknown', c.role, (u as any).avatar, (u as any).email);
    });

    collaborators.forEach(active => {
      const existing = map.get(active.id);
      if (existing) {
        Object.assign(existing, {
          isOnline: true,
          color: active.color,
          avatar: active.avatar || existing.avatar,
          clientId: active.clientId,
          isCurrentUser: active.isCurrentUser,
        });
      } else {
        map.set(active.id, {
          id: active.id,
          name: active.name,
          role: 'viewer',
          color: active.color,
          avatar: active.avatar,
          isOnline: true,
          clientId: active.clientId,
          isCurrentUser: active.isCurrentUser,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
  }, [doc.user, doc.collaborators, collaborators]);

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (ownerForContent) metadataMap.set('title', e.target.value);
  }, [ownerForContent, metadataMap]);

  const handleCoverSelect = useCallback((url: string | null) => {
    setCoverImage(url);
    if (ownerForContent) metadataMap.set('coverImage', url);
  }, [ownerForContent, metadataMap]);

  const handleBackWithSync = useCallback(async () => {
    try {
      const yjsStateBase64 = encodeYDocToBase64(ydoc);
      const now = Date.now();

      await offlineStorage.saveDoc(doc._id, yjsStateBase64, title, coverImage, 'synced', now);
      updateDoc(doc._id, {
        yjsState: yjsStateBase64,
        title,
        coverImage,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[CollabEditor] Failed to sync on back:', err);
    }
    onBack();
  }, [ydoc, doc._id, title, coverImage, updateDoc, onBack]);

  const handleRemoveCollaborator = async (collaboratorId: string, collaboratorName: string) => {
    if (!collaboratorId || collaboratorId === 'unknown') {
      toast.error('Cannot remove user: Invalid ID');
      return;
    }

    const isSelf = collaboratorId === user.id;

    try {
      const { data } = await axiosInstance.delete(
        `/api/docs/${doc._id}/collaborators/${collaboratorId}`,
      );

      if (!isSelf) toast.success(`${collaboratorName} removed`);

      const remaining = (doc.collaborators || []).filter(c => {
        const uid = typeof c.user === 'string' ? c.user : c.user._id;
        return uid !== collaboratorId;
      });

      const updates: Partial<Doc> = { collaborators: remaining };

      if (data.remainingCount === 0 && ownerForContent) {
        try {
          updates.yjsState = encodeYDocToBase64(ydoc);
          updates.updatedAt = new Date().toISOString();
          toast.success('Switched to personal document');
        } catch (e) {
          console.error('[CollabEditor] Failed to convert to personal doc:', e);
        }
      }

      updateDoc(doc._id, updates);
    } catch (error: any) {
      const status = error.response?.status;
      if (isSelf && (status === 404 || status === 403 || error.message?.includes('not found'))) {
        toast.info('You have left the document');
        removeDoc(doc._id);
        onBack();
        return;
      }
      console.error('[CollabEditor] Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
      toast.error('Could not toggle fullscreen mode');
    }
  }, []);

  const handleImageDialogUpload = (url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  // Ctrl+K — open task input + sidebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsTaskInputPopoverOpen(true);
        setIsTasksPanelOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  // Apply pending local content once provider is synced
  useEffect(() => {
    if (!editor || !doc.pendingLocalContent || pendingContentApplied.current) return;

    const apply = () => {
      if (pendingContentApplied.current) return;
      pendingContentApplied.current = true;
      try {
        const { content } = JSON.parse(doc.pendingLocalContent!);
        editor.chain().selectAll().deleteSelection().insertContent(content || []).run();
        updateDoc(doc._id, { pendingLocalContent: undefined });
      } catch (err) {
        console.error('[CollabEditor] Failed to apply pending content:', err);
      }
    };

    if (provider.isSynced) {
      apply();
    } else {
      const onSync = () => { apply(); provider.off('synced', onSync); };
      provider.on('synced', onSync);
      return () => { provider.off('synced', onSync); };
    }
  }, [editor, doc._id, doc.pendingLocalContent, updateDoc, provider]);

  // Initialize Y.Map from doc props (owner only, once)
  useEffect(() => {
    if (ownerForContent && metadataMap.size === 0) {
      ydoc.transact(() => {
        metadataMap.set('title', doc.title || '');
        metadataMap.set('coverImage', doc.coverImage || null);
      });
    }
  }, [ownerForContent, metadataMap, doc.title, doc.coverImage, ydoc]);

  // Subscribe to Y.Map changes for real-time metadata sync
  useEffect(() => {
    const observer = () => {
      const t = metadataMap.get('title');
      const c = metadataMap.get('coverImage');
      if (typeof t === 'string') setTitle(t);
      if (c !== undefined) setCoverImage(c as string | null);
    };
    metadataMap.observe(observer);
    return () => metadataMap.unobserve(observer);
  }, [metadataMap]);

  // Debounced IndexedDB sync on ydoc updates
  useEffect(() => {
    const syncToIndexedDB = () => {
      try {
        offlineStorage.saveDoc(
          doc._id,
          encodeYDocToBase64(ydoc),
          title,
          coverImage,
          'synced',
          Date.now(),
        ).catch(err => console.error('[CollabEditor] IndexedDB sync failed:', err));
      } catch (err) {
        console.error('[CollabEditor] Failed to serialize ydoc:', err);
      }
    };

    const onUpdate = () => {
      clearTimeout(syncTimeoutRef.current!);
      syncTimeoutRef.current = setTimeout(syncToIndexedDB, INDEXEDDB_SYNC_DEBOUNCE_MS);
    };

    ydoc.on('update', onUpdate);
    return () => {
      ydoc.off('update', onUpdate);
      clearTimeout(syncTimeoutRef.current!);
    };
  }, [ydoc, doc._id, title, coverImage]);

  // Floating toolbar position tracking
  useEffect(() => {
    if (!editor) return;

    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) { setShowFloatingToolbar(false); return; }

      const start = editor.view.coordsAtPos(from);
      const end   = editor.view.coordsAtPos(to);
      setToolbarPosition({
        top:  Math.max(10, start.top - 50),
        left: Math.max(10, (start.left + end.left) / 2 - 200),
      });
      setShowFloatingToolbar(true);
    };

    const onBlur = () => {
      setTimeout(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) {
          setShowFloatingToolbar(false);
        }
      }, 150);
    };

    editor.on('selectionUpdate', onSelectionUpdate);
    editor.on('blur', onBlur);
    return () => {
      editor.off('selectionUpdate', onSelectionUpdate);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // Fullscreen change listener
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Expose image upload trigger to editor storage
  useEffect(() => {
    if (editor) {
      // @ts-ignore
      editor.storage.upload = { openImageDialog: () => setShowImageDialog(true) };
    }
  }, [editor]);

  // ── Early return ───────────────────────────────────────────────────────────

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--background))]">

      {/* Floating selection toolbar */}
      {!readOnly && (
        <FloatingToolbar editor={editor} show={showFloatingToolbar} position={toolbarPosition} />
      )}

      {/* ── Header ── */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 group/header p-2 -m-2 rounded-lg hover:bg-black/50 hover:backdrop-blur-sm transition-all duration-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackWithSync}
          className="text-[hsl(var(--muted-foreground))] pl-2 hover:bg-[hsl(var(--accent))]/10 hover:text-[hsl(var(--foreground))] group-hover/header:text-[hsl(var(--foreground))] mr-4"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Back
        </Button>

        {readOnly && <ReadOnlyBadge />}

        <div className="flex items-center gap-3 ml-auto">
          {/* Sync status */}
          <div className="flex items-center gap-2 mr-2">
            <div className="flex items-center justify-center w-5 h-5">
              {provider.isSynced ? <LiveIndicator /> : <ConnectingIndicator />}
            </div>
            <span className="text-xs text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))]">
              {provider.isSynced ? 'Live' : 'Connecting...'}
            </span>
          </div>

          {/* Fullscreen toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="mr-2 h-8 px-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen (F11/Esc)' : 'Fullscreen (F11)'}
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </Button>

          {/* Tasks popover */}
          <Popover
            open={isTaskInputPopoverOpen}
            onOpenChange={(open) => {
              setIsTaskInputPopoverOpen(open);
              if (open) setIsTasksPanelOpen(true);
            }}
          >
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
            <PopoverContent align="end" className="w-110 p-3">
              <TaskInput
                isExpanded={isTaskInputExpanded}
                onExpandChange={setIsTaskInputExpanded}
                isQuickAdd
                initialReferences={[{ type: 'doc', refId: doc._id, title }]}
                onSave={() => {
                  setTaskRefreshKey();
                  setIsTaskInputPopoverOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Collaborators dropdown */}
          {mergedCollaborators.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-[hsl(var(--muted-foreground))] group-hover/header:border-[hsl(var(--foreground))] cursor-pointer hover:bg-white/10 transition-colors">
                  <Users className="w-3 h-3 text-[hsl(var(--muted-foreground))] group-hover/header:text-[hsl(var(--foreground))] ml-2 mr-1" />
                  <div className="flex -space-x-2">
                    {collaborators.slice(0, 5).map(c => (
                      <CollaboratorAvatar key={c.clientId} collab={c} />
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
                  <CollaboratorRow
                    key={collab.id || collab.clientId || idx}
                    collab={collab}
                    isOwner={ownerForContent}
                    onRemove={handleRemoveCollaborator}
                    onLeave={handleRemoveCollaborator}
                  />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ImageUploadDialog
          open={showImageDialog}
          onOpenChange={setShowImageDialog}
          onImageUpload={handleImageDialogUpload}
        />

        {/* Cover image */}
        {coverImage ? (
          <div className="w-full h-54 md:h-58 relative mb-8 group">
            <img src={coverImage} alt="Document cover" className="w-full h-full object-cover object-[0_50%]" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(var(--background))] to-transparent" />
            <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Button
                variant="ghost" size="sm"
                onClick={() => setShowCoverPicker(true)}
                className="bg-black/50 hover:bg-black/70 text-white text-xs backdrop-blur-sm"
              >
                Change cover
              </Button>
              <Button
                variant="ghost" size="sm"
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
              variant="ghost" size="sm"
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

        {/* Editor area */}
        <div className={`max-w-6xl mx-auto px-8 ${coverImage ? '-mt-28 relative z-10' : ''} py-10 rounded-lg`}>
          <div className="mb-0">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="New Page"
              readOnly={readOnly}
              className={`w-full text-[62px] font-bold bg-transparent border-none outline-none placeholder:text-[hsl(var(--muted-foreground))/50] mb-2 leading-tight ${readOnly ? 'cursor-default' : ''}`}
              style={{ fontFamily: '"Noto Sans", "Roboto", sans-serif' }}
            />
            <div className="w-16 h-1 bg-amber-500 rounded-full" />
          </div>

          <div className="notion-editor relative">
            {!readOnly && (
              <DragHandle editor={editor}>
                <div className="drag-handle-icon cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <circle cx="9"  cy="12" r="1" /><circle cx="9"  cy="5"  r="1" /><circle cx="9"  cy="19" r="1" />
                    <circle cx="15" cy="12" r="1" /><circle cx="15" cy="5"  r="1" /><circle cx="15" cy="19" r="1" />
                  </svg>
                </div>
              </DragHandle>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* ── Footer status bar ── */}
      <div className="px-6 py-2 text-xs text-[hsl(var(--muted-foreground))/50] text-center shrink-0">
        <span className="flex items-center justify-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${provider.isSynced ? 'bg-green-500' : 'bg-amber-500'}`} />
          {provider.isSynced ? 'All changes saved & live' : 'Offline'}
        </span>
      </div>

      <EditorStyles />

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

// ─── Modals ───────────────────────────────────────────────────────────────────

function AccessRevokedModal({ onBack }: { onBack: () => void }) {
  return (
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
          onClick={onBack}
          className="w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

function NoCollaboratorsModal({
  onStay,
  onSwitch,
}: {
  onStay: () => void;
  onSwitch: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-6 max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">No Collaborators Left</h2>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          All collaborators have left this document. Would you like to switch to a personal document to save resources?
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onStay}>Stay in Collab Mode</Button>
          <Button variant="primary" size="sm" onClick={onSwitch} className="bg-amber-600 hover:bg-amber-700">
            Switch to Personal
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Outer component ──────────────────────────────────────────────────────────

/**
 * Collaborative document editor for shared docs.
 * Handles connection lifecycle, removal/leave events, and renders
 * `CollaborativeEditorContent` once the Yjs provider is ready.
 */
export function CollaborativeDocEditor({ doc, onBack, readOnly = false }: CollaborativeDocEditorProps) {
  const { user } = useAuthStore();
  const { updateDoc, removeDoc } = useDocStore();

  const [mounted, setMounted] = useState(false);
  const [token, setToken]     = useState('');
  const [showNoCollaboratorsModal, setShowNoCollaboratorsModal] = useState(false);

  const hasConnectedRef = useRef(false);
  const currentUser     = user?._id || 'unknown';
  const owner           = isDocOwner(doc, user?._id);

  const collaborationUser = {
    id:     currentUser,
    name:   user?.name   || 'Anonymous',
    color:  getUserColor(currentUser),
    avatar: user?.avatar,
  };

  const {
    ydoc, provider, collaborators,
    connect, disconnect,
    wasRemovedByOwner, leftVoluntarily, collaboratorLeftEvent,
  } = useCollaboration({
    documentName: `doc_${doc._id}`,
    token,
    user: collaborationUser,
  });

  // ── Initialise ──────────────────────────────────────────────────────────────

  const setSidebarCollapsed = useViewStore((state) => state.setSidebarCollapsed);

  useEffect(() => {
    const t = getTokenFromCookies();
    setToken(t);
    setMounted(true);
    setSidebarCollapsed(true);
    
    return () => setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    if (mounted && !hasConnectedRef.current && !wasRemovedByOwner) {
      hasConnectedRef.current = true;
      connect();
    }
  }, [mounted, connect, wasRemovedByOwner]);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  // ── Collaboration events ────────────────────────────────────────────────────

  // Collaborator left — update store; show modal if last one and we're owner
  useEffect(() => {
    if (!collaboratorLeftEvent) return;

    const remaining = (doc.collaborators || []).filter(c => {
      const uid = typeof c.user === 'string' ? c.user : c.user._id;
      return uid !== collaboratorLeftEvent.userId;
    });

    if (remaining.length !== (doc.collaborators || []).length) {
      updateDoc(doc._id, { collaborators: remaining });
    }

    if (owner && collaboratorLeftEvent.remainingCount === 0) {
      setShowNoCollaboratorsModal(true);
    }
  }, [collaboratorLeftEvent, owner, doc.collaborators, updateDoc, doc._id]);

  // Left voluntarily — clean up and navigate back
  useEffect(() => {
    if (!leftVoluntarily) return;
    removeDoc(doc._id);
    toast.success('You have left the document');
    onBack();
  }, [leftVoluntarily, removeDoc, doc._id, onBack]);

  // ── Action handlers ─────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    disconnect();
    if (wasRemovedByOwner) removeDoc(doc._id);
    onBack();
  }, [disconnect, onBack, wasRemovedByOwner, removeDoc, doc._id]);

  const handleSwitchToPersonal = useCallback(() => {
    if (!ydoc) return;
    try {
      updateDoc(doc._id, {
        collaborators: [],
        yjsState: encodeYDocToBase64(ydoc),
        updatedAt: new Date().toISOString(),
      });
      setShowNoCollaboratorsModal(false);
      toast.success('Switched to personal document');
    } catch (e) {
      console.error('[Collab] Error switching to personal:', e);
      toast.error('Failed to switch to personal document');
    }
  }, [ydoc, doc._id, updateDoc]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className={`h-full transition-all duration-500 ${wasRemovedByOwner ? 'pointer-events-none select-none' : ''}`}>
        {ydoc && provider ? (
          <CollaborativeEditorContent
            ydoc={ydoc}
            provider={provider}
            user={{ id: currentUser, name: user?.name || 'Anonymous', color: getUserColor(currentUser) }}
            doc={doc}
            onBack={handleBack}
            collaborators={collaborators}
            readOnly={readOnly}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                Connecting to collaboration server...
              </span>
            </div>
          </div>
        )}
      </div>

      {wasRemovedByOwner && <AccessRevokedModal onBack={handleBack} />}

      {showNoCollaboratorsModal && (
        <NoCollaboratorsModal
          onStay={() => setShowNoCollaboratorsModal(false)}
          onSwitch={handleSwitchToPersonal}
        />
      )}
    </div>
  );
}

export default CollaborativeDocEditor;