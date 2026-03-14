'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { FlipClock } from '@/components/ui-base/FlipClock';

interface TodoHeaderProps {
  greeting: string;
  stats: {
    total: number;
    completed: number;
    pending: number;
    progress: number;
  };
}

const backgroundImages: string[] = [
  //  'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1765275333/Gemini_Generated_Image_fxnzpofxnzpofxnz_PhotoGrid_ic5rhc.webp',
];

export function TodoHeader({ greeting, stats }: TodoHeaderProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const user = useAuthStore((state) => state.user);
  const [clockMode, setClockMode] = useState<'clock' | 'stopwatch'>('clock');

  const raw_name = user?.name?.split(' ')[0] || "User";
  const name = raw_name.charAt(0).toUpperCase() + raw_name.slice(1).toLowerCase();

  useEffect(() => {
    if (backgroundImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const currentImage = backgroundImages.length > 0 ? backgroundImages[currentImageIndex] : null;

  return (
    <div className="relative w-full h-[20vh] min-h-[200px] -mt-16 pt-16">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Default Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-900`} />
            
             {/* Slider Images */}
            <AnimatePresence mode="wait">
                 {currentImage && (
                    <motion.img
                        key={currentImageIndex}
                        src={currentImage}
                        alt="Header background"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 0.4, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2 }}
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 mix-blend-overlay"
                    />
                )}
            </AnimatePresence>

             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 opacity-30 blur-3xl" />

             {/* Noise Texture */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20" />
        </div>


      <div className="relative z-10 w-full h-full max-w-[1400px] mx-auto px-12 flex items-end justify-between pb-3">
        
        {/* LEFT: Greeting (Elegant Serif) */}
        <div className="flex flex-col justify-end space-y-1 ">
           
            
            <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl lg:text-4xl font-light tracking-tight text-white/90 font-serif"
            >
                Good {greeting.split(' ')[1] || 'Day'}, <br/>
                <span className="font-bold font-sans text-white">{name}</span>
            </motion.h1>
            
            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/40 text-xs font-medium pl-2 mt-1 border-l-2 border-emerald-500/30"
            >
                {stats.pending} items needing attention. <br/>
                {/* <span className="opacity-70 text-[10px]">Managing personal tasks, docs, and app environments.</span> */}
            </motion.p>
        </div>

        {/* CENTER: The Prism Clock (Sophisticated Watermark) */}
        <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex flex-col items-center select-none z-20">
             {/* Main Clock - Watermark Style */}
              <div className="relative" style={{ opacity: 0.2}}>
            <FlipClock
              transparent
              scale={0.3}
              showSeconds={false}
              mode={clockMode}
              className="text-white"
            />
                
                 {/* Mode Toggle Button - Icon Only, Bottom Right of Clock */}
                 <button
                    onClick={() => setClockMode(prev => prev === 'clock' ? 'stopwatch' : 'clock')}
                    className="absolute -bottom-1 -right-6 p-2 rounded-full text-white/30 hover:text-white transition-all transform hover:scale-110 active:scale-95"
                    title={clockMode === 'clock' ? 'Switch to Stopwatch' : 'Return to Clock'}
                 >
                    {clockMode === 'clock' ? (
                        <Timer className="w-4 h-4" />
                    ) : (
                        <Clock className="w-4 h-4" />
                    )}
                 </button>
             </div>
        </div>
        {/* RIGHT: Stats Badge */}
        <div className="flex flex-col items-end justify-end mb-2 z-10 w-32">
             <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/40 text-xs font-medium pr-2 mt-1 border-r-2 border-emerald-500/30 text-right opacity-70"
            >
                {Math.round(stats.progress)}% efficiency. <br/>
                {/* <span className="opacity-70 text-[10px]">Your daily progress.</span> */}
            </motion.p>
        </div>

      </div>
    </div>
  );
}
