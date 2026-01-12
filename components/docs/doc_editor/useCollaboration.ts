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
    onStatusChangeRef.current = onStatusChange;
  });

  // Reactively update awareness when user details change or connection is established
  useEffect(() => {
    // Only update if connected and we have a provider
    if (provider && status === 'connected') {
      // Ensure we have at least a basic user object
      const safeUser = {
        id: user?.id || 'unknown',
        name: user?.name || 'Anonymous',
        color: user?.color || getUserColor(user?.id || 'unknown'),
        avatar: user?.avatar,
      };

      // console.log('[Collab] Updating awareness user:', safeUser);
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
        setCollaborators(prev => {
          if (JSON.stringify(prev) === JSON.stringify(users)) return prev;
          return users;
        });
      },
      onClose: (data: any) => {
        const event = data?.event;
        // Close code 4001 = Removed by owner
        if (event?.code === 4001) {
          console.log('[Collab] Removed by owner (Close Code):', event.reason);
          setWasRemovedByOwner(true);
        }
        // Close code 4002 = Left voluntarily
        if (event?.code === 4002) {
          console.log('[Collab] Left voluntarily (Close Code):', event.reason);
          setLeftVoluntarily(true);
        }
      },
      onStateless: ({ payload }: { payload: string }) => {
        try {
          const data = JSON.parse(payload);
          
          // COLLABORATOR_LEFT: User left voluntarily - owner should see toast + modal
          if (data.type === 'COLLABORATOR_LEFT') {
            console.log('[Collab] Collaborator left voluntarily:', data);
            if (data.userId !== userRef.current.id) {
               toast.info(`${data.name} left the document`);
               // Set the leave event for CollaborativeDocEditor to handle (for owner modal)
               setCollaboratorLeftEvent({
                 userId: data.userId,
                 name: data.name,
                 remainingCount: data.remainingCount
               });
            }
          }
          
          // COLLABORATOR_REMOVED: User was kicked by owner - kicked user sees "Access Revoked" modal
          if (data.type === 'COLLABORATOR_REMOVED') {
            const removedBy = data.removedBy;
            const currentUserId = userRef.current.id;
            
            console.log('[Collab] Collaborator was removed by owner:', data);
            
            if (data.userId === currentUserId) {
               // This user was kicked - show "Access Revoked" modal
               setWasRemovedByOwner(true);
            } else if (removedBy !== currentUserId) {
               // Show toast ONLY if I am NOT the one who initiated the removal
               // (The initiator already got a success toast from the API call)
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
    wasRemovedByOwner,
    leftVoluntarily,
    collaboratorLeftEvent,
  };
}

export default useCollaboration;

