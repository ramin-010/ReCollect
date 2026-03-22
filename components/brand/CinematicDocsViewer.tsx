'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AVATAR_COLLECTION } from './CommunityDoodles';

const slides = [
  {
    id: 'tasks',
    title: 'Integrated Tasks',
    desc: 'Tasks live right inside your docs. Assign, date, and track work without switching context.',
    image: 'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1770658873/of4_osyddh.png',
    icon: CheckSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  {
    id: 'collab',
    title: 'Real-Time Collaboration',
    desc: 'Work together with your team in real-time. See cursors, edits, and presence instantly.',
    image: 'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1770658866/02f5_gvfyh9.png',
    icon: Users,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  {
    id: 'slash',
    title: 'Power at Your Fingertips',
    desc: 'Type "/" to unlock a world of possibilities. Headers, lists, media, and more without lifting your hands.',
    image: 'https://res.cloudinary.com/dsfb3jjqx/image/upload/v1770658873/of3_a9xovn.png',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  }
];

export function CinematicDocsViewer() {
  const [activeTab, setActiveTab] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Preload all slide images on mount for instant display
  useEffect(() => {
    slides.forEach((slide) => {
      const img = new Image();
      img.src = slide.image;
    });
  }, []);

  // Auto-rotate slides
  useEffect(() => {
    // Keep hover pause for accessibility/usability
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % slides.length);
    }, 4000); // 4 seconds per slide to verify rotation quickly

    return () => clearInterval(interval);
  }, [isHovering]);


  // Contextual Comments for each slide - Lorelei avatars (#2, #3, #5)
  const slideComments = [
    { text: "Assigned to @design-team 🎨", user: AVATAR_COLLECTION[2] }, // #2 Lorelei/Felix
    { text: "I'm editing this live! ⚡", user: AVATAR_COLLECTION[24] },   // #3 Lorelei/Zack
    { text: "/generate limits", user: AVATAR_COLLECTION[51] },           // #5 Lorelei/Callie
  ];

  return (
    <div className="w-full max-w-[1350px] mx-auto px-4">
      {/* --- Main Display Window --- */}
      <div 
        className="relative aspect-[3/4] sm:aspect-video md:max-h-[95vh] w-full rounded-2xl border border-border/40 bg-[#111111] shadow-xl shadow-black/10 overflow-hidden group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
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
                <img 
                    src={slides[activeTab].image} 
                    alt={slides[activeTab].title} 
                    fetchPriority="high"
                    className="w-full h-full object-cover  sm:object-contain object-top"
                />
            </motion.div>
        </AnimatePresence>

        {/* Text Overlay (Bottom Left) */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-20 bg-gradient-to-t from-black via-black/70 to-transparent pt-32 sm:pt-48">
             <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
             >
             
                {/* Title */}
                <h3 className="text-2xl md:text-3xl lg:text-5xl font-bold tracking-tight text-white mb-2 md:mb-4 flex items-center gap-4 font-[family-name:var(--font-inter)] drop-shadow-lg">
                    <span>{slides[activeTab].title}</span>
                </h3>
                <p className="text-gray-300 md:text-gray-300 max-w-xl text-base md:text-lg leading-relaxed font-[family-name:var(--font-inter)] drop-shadow-md">{slides[activeTab].desc}</p>
             </motion.div>
        </div>
        
        {/* Simple Progress Indicators (Dots) */}
        <div className="absolute top-4 right-4 md:top-auto md:bottom-8 md:right-8 z-20 flex gap-2">
            {slides.map((_, i) => (
                <div 
                    key={i} 
                    className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300 shadow-sm", 
                        activeTab === i ? "bg-white w-6" : "bg-white/30"
                    )} 
                />
            ))}
        </div>
      </div>
    </div>
  );
}
