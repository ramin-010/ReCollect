'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Timer, Clock } from 'lucide-react';
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

  const raw_name = user?.name || "User";
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
    <div className="relative w-full h-[35vh] min-h-[260px] -mt-16 pt-16">
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
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        </div>


      <div className="relative z-10 w-full h-full max-w-[1400px] mx-auto px-12 flex items-end justify-between pb-3">
        
        {/* LEFT: Greeting (Elegant Serif) */}
        <div className="flex flex-col justify-end space-y-1 mb-2">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-emerald-500/80 font-medium tracking-widest uppercase text-[9px] mb-2"
            >
                <Sparkles className="w-3 h-3" />
                <span>Productivity Hub</span>
            </motion.div>
            
            <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl lg:text-5xl font-light tracking-tight text-white/90 font-serif"
            >
                Good {greeting.split(' ')[1] || 'Day'}, <br/>
                <span className="font-bold font-sans text-white">{name}.</span>
            </motion.h1>
            
            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/40 text-xs font-medium pl-1 mt-1 border-l-2 border-emerald-500/30"
            >
                {stats.pending} tasks pending review.
            </motion.p>
        </div>

        {/* CENTER: The Prism Clock (Sophisticated Watermark) */}
        <div className="absolute left-1/2 bottom-4 -translate-x-1/2 flex flex-col items-center select-none z-20">
             {/* Main Clock - Watermark Style */}
             <div className="relative opacity-50 mix-blend-overlay scale-125 origin-bottom group">
                <FlipClock 
                  transparent 
                  scale={0.40} 
                  showSeconds={false} 
                  mode={clockMode}
                  className="text-white cursor-pointer" 
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

        {/* RIGHT: Floating Stats (Minimal) */}
        <div className="flex flex-col items-end justify-end mb-2 z-10">
             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-5"
            >
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-bold tabular-nums text-white tracking-tighter drop-shadow-md">{Math.round(stats.progress)}%</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-bold opacity-80">Efficiency</span>
                </div>
                <div className="relative w-14 h-14">
                    <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
                    <motion.circle 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: stats.progress / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" 
                        strokeLinecap="round"
                        className="text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        strokeDasharray="1"
                        pathLength="1"
                    />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/10" />
                    </div>
                </div>
            </motion.div>
        </div>

      </div>
    </div>
  );
}
