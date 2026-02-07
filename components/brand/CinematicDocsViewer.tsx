'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, CheckSquare, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

const slides = [
  {
    id: 'tasks',
    title: 'Integrated Tasks',
    desc: 'Tasks live right inside your docs. Assign, date, and track work without switching context.',
    image: '/doc/of4.png',
    icon: CheckSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  {
    id: 'collab',
    title: 'Real-Time Collaboration',
    desc: 'Work together with your team in real-time. See cursors, edits, and presence instantly.',
    image: '/doc/02f5.png',
    icon: Users,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  {
    id: 'slash',
    title: 'Power at Your Fingertips',
    desc: 'Type "/" to unlock a world of possibilities. Headers, lists, media, and more without lifting your hands.',
    image: '/doc/of3.png',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  
  
];

export function CinematicDocsViewer() {
  const [activeTab, setActiveTab] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Auto-rotate slides
  useEffect(() => {
    // Keep hover pause for accessibility/usability
   
    
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % slides.length);
    }, 4000); // 6 seconds per slide

    return () => clearInterval(interval);
  }, [isHovering]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* --- Main Display Window --- */}
      <div 
        className="relative aspect-video w-full rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* macOS Window Controls */}
        {/* <div className="absolute top-4 left-4 z-20 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        
      
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-gray-500 font-mono backdrop-blur-sm">
            <Command className="w-3 h-3" />
            <span>recollect.app/docs/roadmap</span>
        </div> */}

        {/* Content Transition */}
        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }} 
                className="absolute inset-0 w-full h-full"
            >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10 opacity-60" />
                <img 
                    src={slides[activeTab].image} 
                    alt={slides[activeTab].title} 
                    className="w-full h-full object-contain object-top"
                />
            </motion.div>
        </AnimatePresence>

        {/* Text Overlay (Bottom Left) */}
        <div className="absolute bottom-0 left-0 w-full p-8 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-20">
             <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
             >
                <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border bg-black/50 backdrop-blur-md", slides[activeTab].color, slides[activeTab].border)}>
                    {React.createElement(slides[activeTab].icon, { size: 14 })}
                    <span>{slides[activeTab].title}</span>
                </div>
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-2">{slides[activeTab].title}</h3>
                <p className="text-gray-300 max-w-xl text-lg">{slides[activeTab].desc}</p>
             </motion.div>
        </div>
        
        {/* Simple Progress Indicators (Dots) */}
        <div className="absolute bottom-8 right-8 z-20 flex gap-2">
            {slides.map((_, i) => (
                <div 
                    key={i} 
                    className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300", 
                        activeTab === i ? "bg-white w-6" : "bg-white/30"
                    )} 
                />
            ))}
        </div>
      </div>
    </div>
  );
}
