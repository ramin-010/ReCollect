'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';

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
  onClose?: (code: number, reason: string) => void;
  onStateless?: (payload: any) => void;
}

export interface UseCollaborationReturn {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  status: 'connecting' | 'connected' | 'disconnected';
  collaborators: CollaboratorInfo[];
  connect: () => void;
  disconnect: () => void;
  wasRemovedByOwner: boolean;
  leftVoluntarily: boolean;
  collaboratorLeftEvent: { userId: string; name: string; remainingCount: number } | null;
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
  const [wasRemovedByOwner, setWasRemovedByOwner] = useState(false);
  const [leftVoluntarily, setLeftVoluntarily] = useState(false);
  const [collaboratorLeftEvent, setCollaboratorLeftEvent] = useState<{ userId: string; name: string; remainingCount: number } | null>(null);
  
    const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const isConnectedRef = useRef(false);
  
    const documentNameRef = useRef(documentName);
  const tokenRef = useRef(token);
  const userRef = useRef(user);
  const onStatusChangeRef = useRef(onStatusChange);
  
    useEffect(() => {
    documentNameRef.current = documentName;
    tokenRef.current = token;
    onStatusChangeRef.current = onStatusChange;
  });

    useEffect(() => {
        if (provider && status === 'connected') {
            const safeUser = {
        id: user?.id || 'unknown',
        name: user?.name || 'Anonymous',
        color: user?.color || getUserColor(user?.id || 'unknown'),
        avatar: user?.avatar,
      };

            provider.setAwarenessField('user', safeUser);
      userRef.current = user;
    }
  }, [user, provider, status]);

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
        const localClientId = providerRef.current?.awareness?.clientID;
        
                const uniqueUsers = new Map<string, CollaboratorInfo>();
        
        states.forEach((state: any, clientId: number) => {
          if (state.user && state.user.id) {
            const isMe = clientId === localClientId;
            const userId = state.user.id;
            
                        if (!uniqueUsers.has(userId)) {
              uniqueUsers.set(userId, {
                clientId,
                id: userId,
                name: isMe ? 'You' : (state.user.name || 'Anonymous'),
                color: state.user.color || getUserColor(userId),
                avatar: state.user.avatar,
                isCurrentUser: isMe,
              });
            } else if (isMe) {
                            const existing = uniqueUsers.get(userId)!;
              existing.clientId = clientId;
              existing.isCurrentUser = true;
              existing.name = 'You';
            }
          }
        });
        
        const users = Array.from(uniqueUsers.values());
        setCollaborators(prev => {
          if (JSON.stringify(prev) === JSON.stringify(users)) return prev;
          return users;
        });
      },
      onClose: (data: any) => {
        const event = data?.event;
                if (event?.code === 4001) {
          console.log('[Collab] Removed by owner (Close Code):', event.reason);
          setWasRemovedByOwner(true);
        }
                if (event?.code === 4002) {
          console.log('[Collab] Left voluntarily (Close Code):', event.reason);
          setLeftVoluntarily(true);
        }
      },
      onStateless: ({ payload }: { payload: string }) => {
        try {
          const data = JSON.parse(payload);
          
                    if (data.type === 'COLLABORATOR_LEFT') {
            console.log('[Collab] Collaborator left voluntarily:', data);
            if (data.userId !== userRef.current.id) {
               toast.info(`${data.name} left the document`);
                              setCollaboratorLeftEvent({
                 userId: data.userId,
                 name: data.name,
                 remainingCount: data.remainingCount
               });
            }
          }
          
                    if (data.type === 'COLLABORATOR_REMOVED') {
            const removedBy = data.removedBy;
            const currentUserId = userRef.current.id;
            
            console.log('[Collab] Collaborator was removed by owner:', data);
            
            if (data.userId === currentUserId) {
                              setWasRemovedByOwner(true);
            } else if (removedBy !== currentUserId) {
                                             toast.info(`${data.name} was removed by the owner`);
            }
          }
        } catch (e) {
          console.error('[Collab] Error parsing stateless msg:', e);
        }
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

  }, []); 
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
  }, []); 
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
    wasRemovedByOwner,
    leftVoluntarily,
    collaboratorLeftEvent,
  };
}

export default useCollaboration;

