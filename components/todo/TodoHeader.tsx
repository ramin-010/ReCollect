'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';

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
   'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1765275333/Gemini_Generated_Image_fxnzpofxnzpofxnz_PhotoGrid_ic5rhc.webp',

];

export function TodoHeader({ greeting, stats }: TodoHeaderProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const user = useAuthStore((state) => state.user);

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
    <div className=" relative w-full h-[30vh] min-h-[200px] overflow-hidden">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
            {/* Default Gradient Background (shown when no images or as base) */}
            <div className={`absolute inset-0 bg-gradient-to-r from-emerald-900/40 via-blue-900/40 to-purple-900/40 transition-opacity duration-1000 ${currentImage ? 'opacity-60' : 'opacity-100'}`} />
            
             {/* Slider Images */}
            <AnimatePresence mode="wait">
                 {currentImage && (
                    <motion.img
                        key={currentImageIndex}
                        src={currentImage}
                        alt="Header background"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2 }}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
            </AnimatePresence>

             {/* Overlay Gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--sidebar-bg))] via-black/40 to-transparent" />
            
            {/* Fade to Page Background */}
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[hsl(var(--background))] to-transparent z-0 pointer-events-none" />
            
             {/* Dynamic Ambient Glow */}
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 opacity-30 blur-3xl" />

             {/* Noise Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        </div>


      <div className="relative z-10 w-full h-full max-w-[1200px] mx-auto px-6 md:px-6  flex flex-col justify-end">
        
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-8">
            {/* Foreground Content (Static) */}
            <div className="space-y-4">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-emerald-400 font-medium tracking-wide uppercase text-xs"
            >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Productivity Hub</span>
            </motion.div>
            
            <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-sm leading-none"
            >
                {greeting}, {name}.
            </motion.h1>
            
            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/70 text-lg max-w-md leading-relaxed font-medium"
            >
                You have <span className="text-white font-semibold">{stats.pending} active tasks</span> awaiting your focus.
            </motion.p>
            </div>

            {/* Velocity Ring - Scaled */ }
            <div className="flex items-center gap-6 pb-2">
                <div className="flex flex-col items-end gap-1">
                    <span className="text-4xl font-bold tabular-nums text-white drop-shadow-md">{Math.round(stats.progress)}%</span>
                    <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Efficiency</span>
                </div>
                <div className="relative w-24 h-24">
                    <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
                    <motion.circle 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: stats.progress / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" 
                        strokeLinecap="round"
                        className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                        strokeDasharray="1"
                        pathLength="1"
                    />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
