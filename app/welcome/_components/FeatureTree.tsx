import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  PenTool, 
  MousePointer2, 
  FileText, 
  StickyNote, 
  Hash,
  Calendar,
  MoreHorizontal,
  Globe,
  Link,
  Tag,
   Bold, 
    Italic, 
    List,
} from 'lucide-react';

export const FeatureTree = () => {
    // const [showCards, setShowCards] = useState(false);

    // // Sequence the animation
    // useEffect(() => {
    //     // After logo finishes drawing (1.5s) + pause (0.5s), show cards
    //     const timer = setTimeout(() => setShowCards(true), 2200);
    //     return () => clearTimeout(timer);
    // }, []);

    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            
            {/* <AnimatePresence mode='wait'>
               
                {!showCards && (
                    <motion.div 
                        key="logo-intro"
                        className="absolute inset-0 flex items-center justify-center"
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
                                transition={{ duration: 1.8, ease: "easeInOut" }}
                            />
                            
                           
                            <motion.circle cx="22" cy="16" r="1.5" fill="#a855f7" 
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} />
                            <motion.circle cx="34" cy="16" r="1.5" fill="#3b82f6" 
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />
                            <motion.circle cx="28" cy="24" r="2" fill="#ec4899" 
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1 }} />
                            <motion.circle cx="22" cy="32" r="1.5" fill="#a855f7" 
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4 }} />
                            <motion.circle cx="34" cy="32" r="1.5" fill="#3b82f6" 
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.7 }} />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence> */}

            {/* PHASE 2: CARDS EXPLOSION */}
            { (
            <div className="relative w-full max-w-7xl h-full flex items-center justify-center gap-6 perspective-1000 px-4">
      {/* 1. Finance Card (Left) */}
                <motion.div
                    className="w-72 h-80 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                    style={{ willChange: "transform, opacity" }}
                    initial={{ opacity: 0, scale: 0.5, x: 200, rotateY: 90 }} // Start mainly from center
                    animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.1 }}
                    whileHover={{ y: -10, transition: { duration: 0.3 } }}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                 <Wallet className="w-4 h-4 text-violet-400" />
                             </div>
                             <span className="text-sm font-semibold text-zinc-200">Finance</span>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-zinc-600" />
                    </div>
                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Spent</span>
                            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                                ₹24,500 <span className="text-xs text-emerald-500 font-medium">+12%</span>
                            </div>
                        </div>
                        {/* Mini Chart */}
                        <div className="flex items-end justify-between h-32 gap-2 mt-auto">
                            {[40, 60, 35, 70, 50, 80, 55].map((h, i) => (
                                <motion.div 
                                    key={i} 
                                    className="w-full bg-violet-500/20 rounded-t-sm hover:bg-violet-500/40 transition-colors"
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                />
                            ))}
                        </div>
                    </div>
                </motion.div>

             
                        {/* 2. Notes Card (Redesigned & Standardized) */}
              <motion.div
                    className="w-80 h-96 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto relative group"
                    style={{ willChange: "transform, opacity" }}
                    initial={{ opacity: 0, scale: 0.5, x: 100, rotateY: 45 }}
                    animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.2 }}
                    whileHover={{ y: -10 }}
                >
                    {/* TOP: Canvas Preview Area (60%) */}
                    <div className="h-[55%] w-full bg-gradient-to-br from-white/5 to-white/[0.02] relative overflow-hidden border-b border-white/5">
                        {/* Dot Pattern */}
                        <div 
                           className="absolute inset-0 opacity-10" 
                           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '12px 12px' }} 
                        />
                        
                        {/* Mock Content Blocks */}
                        <div className="absolute top-4 left-4 right-4 bottom-4">
                             {/* Text Block 1 */}
                             <div className="absolute top-2 left-0 right-4 p-2 bg-zinc-800/80 rounded border border-white/5 shadow-sm backdrop-blur-sm">
                                 <div className="h-1.5 w-3/4 bg-zinc-600/50 rounded" />
                                 <div className="h-1.5 w-1/2 bg-zinc-600/50 rounded mt-1.5" />
                             </div>
                             
                             {/* Image Card */}
                             <div className="absolute top-20 right-0 w-24 h-16 bg-zinc-800/80 rounded-lg border border-white/5 shadow-sm overflow-hidden flex items-center justify-center">
                                 <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                     <FileText className="w-4 h-4 text-indigo-400" />
                                 </div>
                             </div>

                             {/* Text Block 2 */}
                             <div className="absolute top-24 left-0 w-28 p-2 bg-zinc-800/80 rounded border border-white/5 shadow-sm backdrop-blur-sm">
                                  <div className="h-1.5 w-full bg-zinc-600/50 rounded" />
                             </div>
                             
                             {/* Item Count Badge (Bottom Right) */}
                             <div className="absolute bottom-0 right-0 px-2 py-0.5 bg-zinc-800/90 rounded-full border border-white/10 text-[9px] text-zinc-400 flex items-center gap-1 font-medium shadow-lg">
                                 <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                 3 ITEMS
                             </div>
                        </div>
                    </div>

                    {/* BOTTOM: Meta Info (40%) */}
                    <div className="h-[45%] p-4 flex flex-col gap-2 bg-zinc-900/40">
                        {/* Title */}
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-bold text-white leading-tight group-hover:text-indigo-400 transition-colors">
                                Project Phoenix Launch
                            </h3>
                            {/* Visibility Badge */}
                             <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                                 <Globe className="w-3 h-3" />
                             </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                            Key strategy points for Q3 rollout. Includes competitor analysis and asset links.
                        </p>

                        <div className="flex-1" />

                        {/* Footer: Date & Tags */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                             <span className="text-[10px] text-zinc-600 font-medium">Just now</span>
                             <div className="flex gap-1.5">
                                 <span className="px-1.5 py-0.5 roundedElement bg-zinc-800 text-[9px] text-zinc-400 font-medium border border-white/5">#strategy</span>
                                 <span className="px-1.5 py-0.5 roundedElement bg-zinc-800 text-[9px] text-zinc-400 font-medium border border-white/5">#work</span>
                             </div>
                        </div>
                    </div>
                </motion.div>
                {/* 3. Whiteboard Card (Center - Prominent) */}
                <motion.div
                    className="w-80 h-96 bg-[#121212] border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col pointer-events-auto relative z-10"
                    style={{ willChange: "transform, opacity" }}
                    initial={{ opacity: 0, scale: 0.5, x: -100, rotateY: -45 }}
                    animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.3 }}
                    whileHover={{ y: -10, transition: { duration: 0.3 } }}
                >
                     {/* Dot Grid Background */}
                     <div 
                        className="absolute inset-0 opacity-20" 
                        style={{ backgroundImage: 'radial-gradient(#555 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                     />
                     
                     {/* Tools */}
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-800/80 p-1.5 rounded-lg border border-zinc-700/50 backdrop-blur-sm z-20">
                         <div className="p-1.5 bg-indigo-500/20 rounded text-indigo-400"><MousePointer2 className="w-4 h-4" /></div>
                         <div className="p-1.5 text-zinc-400 hover:text-zinc-200"><PenTool className="w-4 h-4" /></div>
                         <div className="w-4 h-4 rounded-full border border-zinc-500 ml-1"></div>
                     </div>

                     {/* Content: Hand drawn shapes (SVG) */}
                     <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-zinc-400" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <motion.path 
                            d="M 60 100 Q 150 50 240 100" 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, delay: 1 }}
                            stroke="#818cf8"
                         />
                         <motion.rect
                            x="50" y="150" width="100" height="80" rx="4"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 1.2 }}
                         />
                         <motion.circle
                            cx="240" cy="190" r="40"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 1.4 }}
                         />
                         <motion.path
                            d="M 160 190 L 200 190"
                            strokeDasharray="4 4"
                            stroke="#555"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, delay: 1.8 }}
                         />
                     </svg>
                     
                     <div className="absolute bottom-4 left-4 flex gap-2">
                        <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] rounded border border-indigo-500/20">Canvas</span>
                     </div>
                </motion.div>

                {/* 3. Docs Card (Right) */}
                <motion.div
                    className="w-72 h-80 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                    style={{ willChange: "transform, opacity" }}
                    initial={{ opacity: 0, scale: 0.5, x: -200, rotateY: -90 }}
                    animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4, delay: 0.4 }}
                    whileHover={{ y: -10, transition: { duration: 0.3 } }}
                >
                     {/* Cover Image */}
                     <div className="h-20 w-full bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-b border-white/5 relative">
                         <div className="absolute -bottom-4 left-4 w-10 h-10 bg-zinc-800 rounded shadow-lg flex items-center justify-center border border-zinc-700">
                             <FileText className="w-5 h-5 text-blue-400" />
                         </div>
                     </div>
                     
                     {/* Editor Content */}
                     <div className="p-4 pt-6 flex flex-col gap-3">
                         <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
                         <div className="h-2 w-1/2 bg-zinc-800/50 rounded" />
                         
                         <div className="mt-2 flex gap-2 border-y border-white/5 py-2">
                             <Bold className="w-3 h-3 text-zinc-500" />
                             <Italic className="w-3 h-3 text-zinc-500" />
                             <List className="w-3 h-3 text-zinc-500" />
                         </div>

                         <div className="space-y-2 mt-1">
                             <div className="h-2 w-full bg-zinc-800/30 rounded" />
                             <div className="h-2 w-[90%] bg-zinc-800/30 rounded" />
                             <div className="h-2 w-[95%] bg-zinc-800/30 rounded" />
                         </div>
                     </div>
                </motion.div>
            </div>
            )}
        </div>
    );
};
