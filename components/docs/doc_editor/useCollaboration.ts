'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CollaboratorInfo {
  clientId: number;
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isCurrentUser: boolean;
}

export interface UseCollaborationOptions {
  documentName: string;
  token: string;
  user: {
    id: string;
    name: string;
    color?: string;
    avatar?: string;
  };
  onStatusChange?: (status: ConnectionStatus) => void;
  onClose?: (code: number, reason: string) => void;
  onStateless?: (payload: any) => void;
}

export interface UseCollaborationReturn {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  status: ConnectionStatus;
  collaborators: CollaboratorInfo[];
  connect: () => void;
  disconnect: () => void;
  wasRemovedByOwner: boolean;
  leftVoluntarily: boolean;
  collaboratorLeftEvent: CollaboratorLeftEvent | null;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface CollaboratorLeftEvent {
  userId: string;
  name: string;
  remainingCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOSE_CODE_REMOVED_BY_OWNER = 4001;
const CLOSE_CODE_LEFT_VOLUNTARILY = 4002;

const USER_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function buildAwarenessUser(user: UseCollaborationOptions['user']) {
  return {
    id: user?.id || 'unknown',
    name: user?.name || 'Anonymous',
    color: user?.color || getUserColor(user?.id || 'unknown'),
    avatar: user?.avatar,
  };
}

function parseCollaboratorsFromStates(
  states: Map<number, any>,
  localClientId: number | undefined,
): CollaboratorInfo[] {
  const uniqueUsers = new Map<string, CollaboratorInfo>();

  states.forEach((state: any, clientId: number) => {
    const { user } = state;
    if (!user?.id) return;

    const isMe = clientId === localClientId;
    const userId: string = user.id;

    if (!uniqueUsers.has(userId)) {
      uniqueUsers.set(userId, {
        clientId,
        id: userId,
        name: isMe ? 'You' : (user.name || 'Anonymous'),
        color: user.color || getUserColor(userId),
        avatar: user.avatar,
        isCurrentUser: isMe,
      });
    } else if (isMe) {
      const existing = uniqueUsers.get(userId)!;
      existing.clientId = clientId;
      existing.isCurrentUser = true;
      existing.name = 'You';
    }
  });

  return Array.from(uniqueUsers.values());
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCollaboration({
  documentName,
  token,
  user,
  onStatusChange,
}: UseCollaborationOptions): UseCollaborationReturn {

  // State
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [wasRemovedByOwner, setWasRemovedByOwner] = useState(false);
  const [leftVoluntarily, setLeftVoluntarily] = useState(false);
  const [collaboratorLeftEvent, setCollaboratorLeftEvent] = useState<CollaboratorLeftEvent | null>(null);

  // Refs — used inside stable callbacks to avoid stale closures
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const isConnectedRef = useRef(false);
  const documentNameRef = useRef(documentName);
  const tokenRef = useRef(token);
  const userRef = useRef(user);
  const onStatusChangeRef = useRef(onStatusChange);

  // Keep refs in sync with latest props
  useEffect(() => {
    documentNameRef.current = documentName;
    tokenRef.current = token;
    onStatusChangeRef.current = onStatusChange;
  });

  // Sync awareness when user info changes while connected
  useEffect(() => {
    if (!providerRef.current || status !== 'connected') return;
    providerRef.current.setAwarenessField('user', buildAwarenessUser(user));
    userRef.current = user;
  }, [user, status]);

  // Also sync when individual user fields change (catches cases where the object
  // reference stays the same but a nested value has changed)
  useEffect(() => {
    if (!providerRef.current) return;
    providerRef.current.setAwarenessField('user', buildAwarenessUser(user));
  }, [user.id, user.name, user.avatar, user.color]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAwarenessUpdate = useCallback(() => {
    const states = providerRef.current?.awareness?.getStates() ?? new Map();
    const localClientId = providerRef.current?.awareness?.clientID;
    const users = parseCollaboratorsFromStates(states, localClientId);

    setCollaborators(prev =>
      JSON.stringify(prev) === JSON.stringify(users) ? prev : users,
    );
  }, []);

  const handleClose = useCallback((data: any) => {
    const code = data?.event?.code;
    if (code === CLOSE_CODE_REMOVED_BY_OWNER) {
      console.log('[Collab] Removed by owner:', data.event.reason);
      setWasRemovedByOwner(true);
    }
    if (code === CLOSE_CODE_LEFT_VOLUNTARILY) {
      console.log('[Collab] Left voluntarily:', data.event.reason);
      setLeftVoluntarily(true);
    }
  }, []);

  const handleStateless = useCallback(({ payload }: { payload: string }) => {
    let data: any;
    try {
      data = JSON.parse(payload);
    } catch (e) {
      console.error('[Collab] Failed to parse stateless message:', e);
      return;
    }

    if (data.type === 'COLLABORATOR_LEFT') {
      console.log('[Collab] Collaborator left voluntarily:', data);
      if (data.userId !== userRef.current.id) {
        toast.info(`${data.name} left the document`);
        setCollaboratorLeftEvent({
          userId: data.userId,
          name: data.name,
          remainingCount: data.remainingCount,
        });
      }
    }

    if (data.type === 'COLLABORATOR_REMOVED') {
      console.log('[Collab] Collaborator removed by owner:', data);
      if (data.userId === userRef.current.id) {
        setWasRemovedByOwner(true);
      } else if (data.removedBy !== userRef.current.id) {
        toast.info(`${data.name} was removed by the owner`);
      }
    }
  }, []);

  // ─── Connect / Disconnect ────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (isConnectedRef.current || providerRef.current) return;
    isConnectedRef.current = true;

    const doc = new Y.Doc();
    ydocRef.current = doc;
    setYdoc(doc);

    const wsUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:1234';

    const hocusProvider = new HocuspocusProvider({
      url: wsUrl,
      name: documentNameRef.current,
      document: doc,
      token: tokenRef.current,
      onConnect: () => {
        setStatus('connected');
        onStatusChangeRef.current?.('connected');
        console.log('[Collab] Connected to', documentNameRef.current);
      },
      onDisconnect: () => {
        setStatus('disconnected');
        onStatusChangeRef.current?.('disconnected');
        console.log('[Collab] Disconnected from', documentNameRef.current);
      },
      onStatus: ({ status: s }) => {
        if (s === 'connecting') {
          setStatus('connecting');
          onStatusChangeRef.current?.('connecting');
        }
      },
      onAwarenessUpdate: handleAwarenessUpdate,
      onClose: handleClose,
      onStateless: handleStateless,
    });

    hocusProvider.setAwarenessField('user', buildAwarenessUser(userRef.current));

    providerRef.current = hocusProvider;
    setProvider(hocusProvider);
    setStatus('connecting');

    // Populate collaborators from any states already present at connect time
    const initialStates = hocusProvider.awareness?.getStates() ?? new Map();
    const localClientId = hocusProvider.awareness?.clientID;
    setCollaborators(parseCollaboratorsFromStates(initialStates, localClientId));
  }, [handleAwarenessUpdate, handleClose, handleStateless]);

  const disconnect = useCallback(() => {
    providerRef.current?.destroy();
    providerRef.current = null;
    setProvider(null);

    ydocRef.current?.destroy();
    ydocRef.current = null;
    setYdoc(null);

    isConnectedRef.current = false;
    setStatus('disconnected');
    setCollaborators([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      providerRef.current = null;
      ydocRef.current?.destroy();
      ydocRef.current = null;
    };
  }, []);

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    ydoc,
    provider,
    status,
    collaborators,
    connect,
    disconnect,
    wasRemovedByOwner,
    leftVoluntarily,
    collaboratorLeftEvent,
  };
}

export default useCollaboration;