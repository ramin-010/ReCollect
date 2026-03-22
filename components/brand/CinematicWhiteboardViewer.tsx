'use client';

import React, { useRef } from 'react';

export function CinematicWhiteboardViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="w-full relative group perspective-1000">
      <div className="relative w-full rounded-xl overflow-hidden bg-[#0A0A0A] shadow-[0_0_10px_-0px_rgba(0,0,0,0.20)] dark:shadow-[0_0_60px_-10px_rgba(0,0,0,0.6)] transition-transform duration-700 ease-out">
        <video
          ref={videoRef}
          className="w-full h-auto block"
          // src="https://res.cloudinary.com/dsfb3jjqx/video/upload/v1770887573/Untitled_video_-_Made_with_Clipchamp_2_ulvucy.mp4"
          // src="https://res.cloudinary.com/dsfb3jjqx/video/upload/v1771578568/Untitled_video_-_Made_with_Clipchamp_5_lw9kls.mp4"
          // src="https://res.cloudinary.com/dsfb3jjqx/video/upload/v1771602492/Untitled_video_-_Made_with_Clipchamp_8_vd1o4f.mp4"
          src="https://res.cloudinary.com/dsfb3jjqx/video/upload/v1771646794/Untitled_video_-_Made_with_Clipchamp_9_dofpmk.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="none"
        />
      </div>

      {/* Ambient Floor Glow */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[90%] h-20 bg-white/5 rounded-[100%] blur-[100px] -z-10 pointer-events-none" />
    </div>
  );
}
