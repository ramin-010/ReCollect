'use client';

import React, { useEffect, useState } from 'react';
import { 
  LiveKitRoom, 
  VideoConference,
  RoomAudioRenderer,
  useDataChannel,
  useRoomContext
} from '@livekit/components-react';
import '@livekit/components-styles';
import axiosInstance from '@/lib/utils/axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui-base/Button';

interface LiveRoomProps {
  deckId: string;
  onLeave: () => void;
  overrideToken?: string;
  isOwner?: boolean;
}

// ---------------------------------------------------------------------------
// Helper Component running INSIDE the LiveKit context
// ---------------------------------------------------------------------------
function PresenterControls({ deckId }: { deckId: string }) {
   const room = useRoomContext();
   const { send } = useDataChannel('admissions', (msg) => {
      try {
         const decoder = new TextDecoder();
         const data = JSON.parse(decoder.decode(msg.payload));

         if (data.type === 'KNOCK') {
            toast(
              <div className="flex flex-col gap-2">
                 <p className="font-medium text-sm">
                   <strong>{data.name}</strong> wants to join your live presentation.
                 </p>
                 <div className="flex gap-2 justify-end mt-1">
                   <Button size="sm" variant="ghost" onClick={() => toast.dismiss()}>Deny</Button>
                   <Button size="sm" variant="primary" onClick={async () => {
                      toast.dismiss();
                      try {
                         // 1. Tell backend to upgrade their token rights
                         await axiosInstance.post('/api/livekit/admit', {
                            room: deckId,
                            viewerIdentity: data.identity,
                            viewerName: data.name
                         });

                         // 2. Broadcast back down the channel that they are admitted
                         // Only the viewer matching `data.identity` will act on this payload.
                         const encoder = new TextEncoder();
                         const payload = encoder.encode(JSON.stringify({
                             type: 'ADMITTED',
                             identity: data.identity
                         }));
                         await send(payload, { reliable: true });

                         toast.success(`${data.name} admitted!`);
                      } catch (err) {
                         toast.error("Failed to admit viewer");
                      }
                   }}>Admit</Button>
                 </div>
              </div>,
              { duration: 30000, id: `knock_${data.identity}` } // Hold toast for 30 seconds
            );
         }
      } catch (e) {
         console.error("Failed to parse admissions data channel message", e);
      }
   });

   return null; // Purely logical component
}

export function LiveRoom({ deckId, onLeave, overrideToken, isOwner }: LiveRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (overrideToken) {
       setToken(overrideToken);
       return;
    }
    
    const fetchToken = async () => {
      try {
        const response = await axiosInstance.get(`/api/livekit/token?room=${deckId}`);
        if (mounted && response.data.success) {
          setToken(response.data.token);
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to fetch livekit token", err);
          setError("Failed to connect to presentation room");
          toast.error("Could not join live presentation");
          onLeave(); // Auto leave if we can't get token
        }
      }
    };

    fetchToken();

    return () => {
      mounted = false;
    };
  }, [deckId, onLeave, overrideToken]);

  if (error) {
    return <div className="p-4 text-red-500 bg-red-500/10 rounded-lg">{error}</div>;
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-white/50 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <p>Connecting to presentation...</p>
      </div>
    );
  }

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

  if (!livekitUrl) {
    return <div className="p-4 text-red-500 bg-red-500/10 rounded-lg">Missing LiveKit URL environment variable</div>;
  }

  return (
    <div className="w-full h-full bg-black flex flex-col relative rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={livekitUrl}
        // Use the default FastConnect mechanism
        connect={true}
        onDisconnected={onLeave}
        className="flex-1 w-full h-full flex flex-col"
      >
        {/* Render actual video grid */}
        <div className="flex-1 min-h-0 relative">
            <VideoConference />
        </div>
        
        {/* Render audio from other participants automatically */}
        <RoomAudioRenderer />

        {/* Bind Data Channels for Presenter Actions */}
        {isOwner && <PresenterControls deckId={deckId} />}
      </LiveKitRoom>
    </div>
  );
}
