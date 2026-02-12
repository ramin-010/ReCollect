'use client';

import React, { useRef } from 'react';

export function CinematicWhiteboardViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="w-full relative group perspective-1000">
      {/* Container - Full Width */}
      <div className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-[#0A0A0A] shadow-2xl transition-transform duration-700 ease-out ">
        
        {/* Glow - Subtle Underscore */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-[5]" />

        {/* Video Element - Pure Preview, No Controls */}
        <video
          ref={videoRef}
          className="w-full h-auto block"
          src="https://res.cloudinary.com/dsfb3jjqx/video/upload/v1770887573/Untitled_video_-_Made_with_Clipchamp_2_ulvucy.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </div>

      {/* Ambient Floor Glow - Neutral */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-white/5 rounded-[100%] blur-[100px] -z-10 pointer-events-none" />
    </div>
  );
}
