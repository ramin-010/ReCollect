// app/(app)/live/layout.tsx
import { requireFeature } from '@/lib/features';

// LiveKit live rooms are hidden: the livekit backend was removed on pg-migration (see lib/features.ts).
export default function LiveRoomLayout({ children }: { children: React.ReactNode }) {
  requireFeature('liveRooms');
  return <>{children}</>;
}
