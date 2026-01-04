'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

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
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

export interface UseCollaborationReturn {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  status: 'connecting' | 'connected' | 'disconnected';
  collaborators: CollaboratorInfo[];
  connect: () => void;
  disconnect: () => void;
}

export function useCollaboration({
  documentName,
  token,
  user,
  onStatusChange,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  
  // Use refs to avoid re-creating callbacks
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const isConnectedRef = useRef(false);
  
  // Store latest values in refs so callbacks don't need them as deps
  const documentNameRef = useRef(documentName);
  const tokenRef = useRef(token);
  const userRef = useRef(user);
  const onStatusChangeRef = useRef(onStatusChange);
  
  // Update refs when props change
  useEffect(() => {
    documentNameRef.current = documentName;
    tokenRef.current = token;
    userRef.current = user;
    onStatusChangeRef.current = onStatusChange;
  });

  const getUserColor = (userId: string): string => {
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722',
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Stable connect function - no dependencies that change
  const connect = useCallback(() => {
    if (isConnectedRef.current || providerRef.current) return;
    isConnectedRef.current = true;

    const doc = new Y.Doc();
    ydocRef.current = doc;
    setYdoc(doc);

    const wsUrl = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:1234';
    const currentUser = userRef.current;

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
      onAwarenessUpdate: () => {
        const states = providerRef.current?.awareness?.getStates() || new Map();
        const users: CollaboratorInfo[] = [];
        const localClientId = providerRef.current?.awareness?.clientID;
        
        states.forEach((state: any, clientId: number) => {
          if (state.user) {
            const isMe = clientId === localClientId;
            users.push({
              clientId,
              id: state.user.id,
              name: isMe ? 'You' : (state.user.name || 'Anonymous'),
              color: state.user.color || getUserColor(state.user.id),
              avatar: state.user.avatar,
              isCurrentUser: isMe,
            });
          }
        });
        setCollaborators(users);
      },
    });

    const userData = userRef.current;
    hocusProvider.setAwarenessField('user', {
      id: userData.id,
      name: userData.name,
      color: userData.color || getUserColor(userData.id),
      avatar: userData.avatar,
    });

    providerRef.current = hocusProvider;
    setProvider(hocusProvider);
    setStatus('connecting');
    
    // Force immediate update
    const initialStates = hocusProvider.awareness?.getStates() || new Map();
    const initialUsers: CollaboratorInfo[] = [];
    const localClientIdInitial = hocusProvider.awareness?.clientID;
    
    initialStates.forEach((state: any, clientId: number) => {
       if (state.user) {
            const isMe = clientId === localClientIdInitial;
            initialUsers.push({
              clientId,
              id: state.user.id,
              name: isMe ? 'You' : (state.user.name || 'Anonymous'),
              color: state.user.color || getUserColor(state.user.id),
              avatar: state.user.avatar,
              isCurrentUser: isMe,
            });
       }
    });
    setCollaborators(initialUsers);

  }, []); // No dependencies - uses refs

  // Stable disconnect function
  const disconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
      setProvider(null);
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
      setYdoc(null);
    }
    isConnectedRef.current = false;
    setStatus('disconnected');
    setCollaborators([]);
  }, []); // No dependencies

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, []);

  // Update awareness when user prop changes
  useEffect(() => {
    if (providerRef.current && user) {
       providerRef.current.setAwarenessField('user', {
          id: user.id,
          name: user.name,
          color: user.color || getUserColor(user.id),
          avatar: user.avatar,
       });
    }
  }, [user.id, user.name, user.avatar, user.color]);

  return {
    ydoc,
    provider,
    status,
    collaborators,
    connect,
    disconnect,
  };
}

export default useCollaboration;

