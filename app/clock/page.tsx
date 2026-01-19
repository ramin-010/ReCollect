'use client';

import { FlipClock } from '@/components/ui-base/FlipClock';

export default function FlipClockPreviewPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative">
      {/* Horizontal line like flipclock.app */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-800 transform -translate-y-1/2 z-0" />
      
      {/* FlipClock Component */}
      <div className="relative z-10">
        <FlipClock />
      </div>
    </div>
  );
}
