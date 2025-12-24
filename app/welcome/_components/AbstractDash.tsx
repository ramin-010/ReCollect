'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { AlertCircle, Bell, CheckSquare, CreditCard, FileText, Layout, Lightbulb, Link, PenTool, StickyNote } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { FeatureTree } from './FeatureTree';

const THOUGHTS = [
  { 
    text: "I have a solid idea… where do I write it?", 
    angle: 270, // Top
    radius: 190,
    icon: Lightbulb,
    color: "text-amber-400",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/20",
    size: "medium",
    layer: 1
  },
  { 
    text: "I need to draw this system flow — text won't work.", 
    angle: 335, // Top right
    radius: 220,
    icon: PenTool,
    color: "text-purple-400",
    bgColor: "bg-purple-500/5",
    borderColor: "border-purple-500/20",
    size: "medium",
    layer: 2
  },
  { 
    text: "I'll remember this later… or will I?", 
    angle: 205, // Top left
    radius: 200,
    icon: Bell,
    color: "text-orange-400",
    bgColor: "bg-orange-500/5",
    borderColor: "border-orange-500/20",
    size: "small",
    layer: 1
  },
  { 
    text: "How do I share this cleanly with just one link?", 
    angle: 0, // Right
    radius: 240,
    icon: Layout,
    color: "text-blue-400",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/20",
    size: "medium",
    layer: 2
  },
  { 
    text: "I should track my expenses, but I don't want another app.", 
    angle: 180, // Left
    radius: 230,
    icon: CreditCard,
    color: "text-rose-400",
    bgColor: "bg-rose-500/5",
    borderColor: "border-rose-500/20",
    size: "medium",
    layer: 2
  },
  { 
    text: "Why do I have 5 apps open for one project?", 
    angle: 70, // Bottom right (lower)
    radius: 80,
    icon: FileText,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/5",
    borderColor: "border-cyan-500/20",
    size: "small",
    layer: 1
  },
  {
    text: "My thoughts are everywhere, but my focus isn't.",
    angle: 148, // Bottom left
    radius: 265,
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/5",
    borderColor: "border-red-500/20",
    size: "medium",
    layer: 2
  },
  {
    text: "This note, this diagram, this task — they're all connected.",
    angle: 35, // Bottom
    radius: 250,
    icon: Link,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/5",
    borderColor: "border-emerald-500/20",
    size: "medium",
    layer: 1
  },
  {
    text: "There has to be one place for all of this…",
    angle: 300, // Upper right (near top)
    radius: 170,
    icon: CheckSquare,
    color: "text-green-400",
    bgColor: "bg-green-500/5",
    borderColor: "border-green-500/20",
    size: "small",
    layer: 1
  },
  { 
    text: "What if all of this lived in one place?", 
    angle: 0, 
    radius: 0, 
    icon: Layout,
    color: "text-white",
    bgColor: "bg-white/5",
    borderColor: "border-white/20",
    size: "large",
    layer: 0
  },
];



export const AbstractDash = () => {
  const [phase, setPhase] = useState<'idle' | 'intro' | 'accumulate' | 'pause' | 'processing' | 'brand' | 'branches'>('idle');
  const [visibleCount, setVisibleCount] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const [showlogo, setShowLogo] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timers = useRef<NodeJS.Timeout[]>([]);
  
  const schedule = (fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    timers.current.push(timer);
    return timer;
  };

  const clearAllTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const isInView = useInView(containerRef, { 
    once: true,
    amount: 0.2
  });

  const runSequence = () => {
     clearAllTimers();
     
     setPhase('intro');
     setShowIntro(true);
     setVisibleCount(0);

     schedule(() => setShowIntro(false), 3500);
     
     schedule(() => {
        setPhase('accumulate');
        setVisibleCount(1);
     }, 3800);

     // Thoughts appear at readable pace: 700-900ms intervals
     schedule(() => setVisibleCount(2), 4600); 
     schedule(() => setVisibleCount(3), 5300); 
     schedule(() => setVisibleCount(4), 6100); 
     schedule(() => setVisibleCount(5), 6800); 
     schedule(() => setVisibleCount(6), 7500); 
     schedule(() => setVisibleCount(7), 8300);
     schedule(() => setVisibleCount(8), 9000);
     schedule(() => setVisibleCount(9), 9800);
     
     // Pause - thoughts slow down and fade
     schedule(() => setPhase('pause'), 10600);
     
     // Final resolution question
     schedule(() => setVisibleCount(10), 10800);
     
     // Compression
     schedule(() => setPhase('processing'), 13500);
     
     // Brand Reveal
     schedule(() => setPhase('brand'), 14000);
     schedule(() => setShowLogo(true), 15000)
     // Branches
     schedule(() => setPhase('branches'), 18500);
     
     // Loop
     schedule(runSequence, 26000);
  };

  useEffect(() => {
    if (isInView && phase === 'idle') {
      runSequence();
    }
    
    return () => clearAllTimers();
  }, [isInView]);

  const getSizeClasses = (size: string) => {
    switch(size) {
      case 'large': return 'px-6 py-3.5 text-base';
      case 'medium': return 'px-4 py-2.5 text-sm';
      case 'small': return 'px-3 py-2 text-xs';
      default: return 'px-4 py-2.5 text-sm';
    }
  };

  const getPosition = (angle: number, radius: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radians) * radius,
      y: Math.sin(radians) * radius
    };
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[600px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      
      {/* Subtle ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div 
          className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]"
          animate={{ 
            x: [0, -50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="relative w-full max-w-7xl h-[550px] flex items-center justify-center">
        
        {/* INTRO */}
        <AnimatePresence>
          {showIntro && (
            <motion.div 
              key="intro"
              className="absolute z-30 text-center px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ 
                duration: 1.2,
                // exit: { duration: 1, ease: [0.22, 1, 0.36, 1] },
                ease: [0.22, 1, 0.36, 1] 
              }}
            >
              <motion.h2 
                className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.3 }}
              >
                Collect Everything.
              </motion.h2>
              <motion.p 
                className="text-zinc-400 text-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.8 }}
              >
                In one place.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {/* THOUGHT BUBBLES - Organic mind flow */}
          {!showIntro && (phase === 'accumulate' || phase === 'pause' || phase === 'processing') && (
            <motion.div 
               key="thoughts-cluster"
               className="absolute inset-0 z-20"
               initial={{ opacity: 1 }}
               animate={phase === 'processing' ? {
                 scale: 0.2,
                 opacity: 0,
                 filter: 'blur(25px)',
                //  rotate: -8
               } : phase === 'pause' ? {
                 scale: 0.96,
                 opacity: 0.8,
               } : {
                 opacity: 1,
               }}
               transition={{
                 duration: phase === 'processing' ? 0.9 : 1.2,
                 ease: phase === 'processing' ? [0.32, 0.72, 0, 1] : [0.16, 1, 0.3, 1],
               }}
            >
              {THOUGHTS.map((thought, index) => {
                 if (index >= visibleCount) return null;
                 const Icon = thought.icon;
                 const isResolution = index === 9;
                 const pos = getPosition(thought.angle, thought.radius);
                 
                 return (
                   <motion.div
                     key={`thought-${index}`}
                     className="absolute -translate-x-1/2 -translate-y-1/2 will-change-[transform,opacity,filter]"
                     style={{
                       left: `calc(50% + ${pos.x}px)`, 
                       top: `calc(50% + ${pos.y}px)`,
                       zIndex: isResolution ? 30 : 10 + thought.layer
                     }}
                     initial={{ 
                       opacity: 0, 
                       scale: 0.7, 
                       y: -20,
                       filter: 'blur(6px)' 
                     }}
                     animate={{ 
                        opacity: phase === 'pause' && !isResolution ? 0.3 : 1, 
                        scale: isResolution && phase === 'pause' ? 1.08 : 1, 
                        y: 0,
                        filter: phase === 'pause' && !isResolution ? 'blur(1.5px)' : 'blur(0px)',
                     }}
                     transition={{ 
                        opacity: { duration: 0.5, ease: "easeOut" },
                        scale: { 
                          duration: 0.6,
                          ease: [0.34, 1.56, 0.64, 1]
                        },
                        y: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                        filter: { duration: 0.6 }
                     }}
                   >
                     <motion.div
                       className={`flex items-center gap-2.5 ${getSizeClasses(thought.size)} rounded-xl bg-zinc-900/70 border ${thought.borderColor} backdrop-blur-md shadow-lg relative overflow-hidden will-change-transform`}
                       animate={{
                         y: isResolution ? 0 : [0, -3, 0],
                       }}
                       transition={{
                         y: {
                           duration: 3.5 + (index * 0.5),
                           repeat: Infinity,
                           ease: "easeInOut",
                           delay: index * 0.3
                         }
                       }}
                     >
                        {/* Subtle glow */}
                        <motion.div 
                          className={`absolute inset-0 ${thought.bgColor} opacity-0`}
                          animate={{ 
                            opacity: isResolution && phase === 'pause' ? [0.3, 0.5, 0.3] : [0.1, 0.2, 0.1]
                          }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: "easeInOut"
                          }}
                        />
                        
                        {/* Icon */}
                        <div className={`p-1.5 rounded-lg ${thought.bgColor} flex items-center justify-center relative z-10`}>
                           <Icon className={`${thought.size === 'large' ? 'w-4 h-4' : thought.size === 'small' ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'} ${thought.color}`} strokeWidth={2.5} />
                        </div>
                        
                        {/* Text */}
                        <span className={`font-medium ${isResolution ? 'text-white' : 'text-zinc-300'} whitespace-nowrap relative z-10`}>
                          {thought.text}
                        </span>
                     </motion.div>
                   </motion.div>
                 );
              })}
            </motion.div>
          )}

          {/* COMPRESSION FLASH */}
          {phase === 'processing' && (
            <motion.div
               className="absolute z-30 pointer-events-none flex items-center justify-center"
               initial={{ opacity: 0 }}
               animate={{ opacity: [0, 1, 0.7, 0] }}
               transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
               <motion.div 
                 className="w-32 h-1 bg-white/80 blur-xl rounded-full"
                 animate={{ 
                   scaleX: [1, 2.5, 3],
                   scaleY: [1, 1.5, 2]
                 }}
                 transition={{ duration: 0.8 }}
               />
               <motion.div 
                 className="absolute w-32 h-1 bg-indigo-400/60 blur-2xl rounded-full"
                 animate={{ 
                   scale: [1, 2, 3]
                 }}
                 transition={{ duration: 0.9 }}
               />
            </motion.div>
          )}

          {/* BRAND REVEAL */}
          {phase === 'brand' && (
            
            <motion.div 
               key="brand-reveal"
               className="absolute z-30 flex flex-col items-center justify-center text-center px-6"
               initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
               animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
               exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)', transition: { duration: 0.6 } }}
               transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            >
              
              <AnimatePresence mode='wait'>
                   
                    {showlogo && (
                        <motion.div 
                            key="logo-intro"
                            className="absolute bottom-25 flex items-center justify-center"
                            exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)', transition: { duration: 0.6 } }}
                        >
                            <svg width="200" height="200" viewBox="0 0 48 48" className="bg-transparent">
                             
                                <defs>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                        <feMerge>
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                    <linearGradient id="infinity-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#a855f7" />
                                        <stop offset="50%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#ec4899" />
                                    </linearGradient>
                                </defs>
    
                              
                                <motion.path
                                    d="M16 24C16 19 19 16 22 16C25 16 26.5 17.5 28 19.5M28 19.5C29.5 17.5 31 16 34 16C37 16 40 19 40 24C40 29 37 32 34 32C31 32 29.5 30.5 28 28.5M28 28.5C26.5 30.5 25 32 22 32C19 32 16 29 16 24M28 19.5V28.5"
                                    stroke="url(#infinity-grad)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                    filter="url(#glow)"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 2.8, ease: "easeInOut" }}
                                />
                                
                             
                                <motion.circle cx="22" cy="16" r="1.5" fill="#a855f7" 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, duration: 0.5, ease: "backOut" }} />
                                <motion.circle cx="34" cy="16" r="1.5" fill="#3b82f6" 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0, duration: 0.5, ease: "backOut" }} />
                                <motion.circle cx="28" cy="24" r="2" fill="#ec4899" 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4, duration: 0.5, ease: "backOut" }} />
                                <motion.circle cx="22" cy="32" r="1.5" fill="#a855f7" 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8, duration: 0.5, ease: "backOut" }} />
                                <motion.circle cx="34" cy="32" r="1.5" fill="#3b82f6" 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.2, duration: 0.5, ease: "backOut" }} />
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>
               {/* Glow */}
               <motion.div
                 className="absolute inset-0 -z-10 opacity-50"
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 0.5, scale: 1.4 }}
                 transition={{ duration: 2.4, ease: "easeOut" }}
               >
                 <div className="w-full h-full bg-gradient-radial from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl" />
               </motion.div>

                
               <motion.h1 
                 className="text-6xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 via-white to-purple-300 tracking-tighter mb-4"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
               >
                 ReCollect
               </motion.h1>
               
               <motion.p 
                 className="text-lg text-zinc-400 font-light tracking-wide max-w-md"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ duration: 0.8, delay: 0.7 }}
               >
                 Your personal dashboard for ideas, tasks, diagrams, and clarity.
               </motion.p>
            </motion.div>
          )}

          {/* BRANCHES - New FeatureTree */}
          {phase === 'branches' && (
             <FeatureTree />
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default AbstractDash;