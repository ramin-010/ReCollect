'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { slideApi, ServerSlideDeck } from '@/lib/api/slideApi';
import axiosInstance from '@/lib/utils/axios';
import { Loader2, Radio, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { LiveRoom } from '@/components/slides/live/LiveRoom';
import { SlideCanvas } from '@/components/slides/core/SlideCanvas';
import { toast } from 'sonner';

export default function LiveBroadcastPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  
  const { user } = useAuthStore();
  const [deck, setDeck] = useState<ServerSlideDeck | null>(null);
  
  const [status, setStatus] = useState<'loading' | 'waiting' | 'admitted' | 'error'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch Deck Info & Request Token
  useEffect(() => {
    if (!roomId) return;

    const initConnection = async () => {
      try {
        // Fetch deck title for the lobby
        const deckData = await slideApi.fetchDeck(roomId);
        if (deckData) setDeck(deckData);

        // Request LiveKit Token
        const response = await axiosInstance.get(`/api/livekit/token?room=${roomId}`);
        
        if (response.data.success) {
          if (response.data.role === 'owner') {
             // If Owner somehow navigates here, just redirect back to Slide Editor where they belong
             router.replace(`/`);
             toast.info("Owners should broadcast directly from the Slide Editor");
          } else if (response.data.role === 'viewer') {
             // Viewer must wait for admit
             setStatus('waiting');
          } else if (response.data.token) {
             // Instantly admitted (e.g., public room or already approved)
             setToken(response.data.token);
             setStatus('admitted');
          }
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.response?.data?.error || "Failed to join broadcast");
      }
    };

    initConnection();
  }, [roomId, router]);

  // 2. Waiting Room Polling
  // Since we cannot use LiveKit DataChannels until we actually have a valid token
  // to join a room, we must poll our own backend to see if the presenter admitted us.
  useEffect(() => {
     if (status !== 'waiting') return;

     const intervalId = setInterval(async () => {
         try {
            const response = await axiosInstance.get(`/api/livekit/token?room=${roomId}`);
            if (response.data.success && response.data.token) {
                setToken(response.data.token);
                setStatus('admitted');
                toast.success("Host admitted you!");
                clearInterval(intervalId);
            }
         } catch(e) {
            // Ignore polling errors
         }
     }, 3000);

     return () => clearInterval(intervalId);
  }, [status, roomId]);

  const handleKnock = async () => {
     try {
        await axiosInstance.post('/api/livekit/knock', { room: roomId });
        toast.success("Host notified! Awaiting approval...");
     } catch (err) {
        toast.error("Failed to notify host");
     }
  };

  const hasKnocked = React.useRef(false);
  useEffect(() => {
     if (status === 'waiting' && !hasKnocked.current) {
        hasKnocked.current = true;
        axiosInstance.post('/api/livekit/knock', { room: roomId }).catch(() => {});
     }
  }, [status, roomId]);


  if (status === 'error') {
     return (
       <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
         <div className="max-w-md w-full text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">Cannot Join Broadcast</h1>
            <p className="text-[hsl(var(--muted-foreground))]">{errorMsg}</p>
            <Button variant="primary" onClick={() => router.push('/')}>Return Home</Button>
         </div>
       </div>
     )
  }

  if (status === 'loading') {
    return (
       <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center p-4 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <p className="text-[hsl(var(--muted-foreground))]">Connecting to presentation room...</p>
       </div>
    )
  }

  if (status === 'waiting') {
     return (
       <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
         <div className="max-w-md w-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 text-center shadow-xl space-y-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
               <Radio className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            
            <div>
               <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
                 Waiting Room
               </h1>
               <p className="text-[hsl(var(--muted-foreground))]">
                 You're waiting to join the broadcast for <strong>{deck?.name || 'Loading Presentation...'}</strong>
               </p>
            </div>

            <div className="bg-[hsl(var(--muted))]/50 rounded-lg p-4 text-sm text-[hsl(var(--muted-foreground))]">
               The presenter has been notified. The presentation will begin automatically once they admit you.
            </div>

            <Button variant="outline" className="w-full" onClick={handleKnock}>
               Notify Host Again
            </Button>
         </div>
       </div>
     )
  }

  // ADMITTED STATE: Render the presentation!
  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex flex-col">
       <div className="h-14 bg-black/80 border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-50">
          <div className="flex items-center gap-3 text-white">
             <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-bold tracking-wider">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
             </div>
             <span className="font-medium opacity-80">{deck?.name}</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white" onClick={() => router.push('/')}>
            Leave
          </Button>
       </div>

       <div className="flex-1 relative">
          {deck?.content && (
            <SlideCanvas 
              initialContent={deck.content}
              onChange={() => {}}
              onSelectionChange={() => {}}
              isPresenting={true}
              onClosePresentation={() => {}}
              deckId={roomId}
              readOnly={true}
            />
          )}

          {/* Floating Video Bubble for Presenter */}
          <div className="absolute top-4 right-4 w-64 h-48 z-[200] rounded-xl overflow-hidden shadow-2xl border border-white/10 pointer-events-none">
             {token && (
                <LiveRoom 
                  deckId={roomId} 
                  onLeave={() => router.push('/')}
                  overrideToken={token} 
                />
             )}
          </div>
       </div>
    </div>
  );
}
