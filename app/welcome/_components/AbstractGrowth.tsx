'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export const AbstractGrowth = () => {
   // Generate a smooth curve path
   const pathData = "M 0 100 Q 100 80 150 60 T 300 20 L 300 120 L 0 120 Z";
   const linePath = "M 0 100 Q 100 80 150 60 T 300 20";

   return (
      <div className="relative w-full h-full flex items-center justify-center p-8">
         <div className="relative w-full max-w-sm h-64 bg-zinc-900/50 rounded-2xl border border-white/5 p-6 shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 relative z-10">
               <div>
                  <h4 className="text-zinc-400 text-sm font-medium mb-1">Total Savings</h4>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-bold text-white">$12,450</span>
                     <span className="text-xs bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" /> 24%
                     </span>
                  </div>
               </div>
               <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-zinc-300" />
               </div>
            </div>

            {/* Chart Area */}
            <div className="absolute bottom-0 left-0 right-0 h-40 w-full">
               {/* Grid */}
               <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 border-t border-white/5">
                  {[...Array(16)].map((_, i) => (
                     <div key={i} className="border-r border-white/5 last:border-r-0" />
                  ))}
               </div>

               <svg className="absolute inset-0 w-full h-full preserve-3d" viewBox="0 0 300 120" preserveAspectRatio="none">
                  {/* Gradient Area Fill */}
                  <defs>
                     <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                     </linearGradient>
                  </defs>
                  
                  <motion.path
                     d={pathData}
                     fill="url(#growthGradient)"
                     initial={{ opacity: 0, scaleY: 0, originY: 1 }}
                     animate={{ opacity: 1, scaleY: 1 }}
                     transition={{ duration: 1.5, ease: "easeOut", repeat: Infinity, repeatDelay: 2.5 }}
                  />

                  {/* Line Draw */}
                  <motion.path
                     d={linePath}
                     fill="none"
                     stroke="#ec4899"
                     strokeWidth="3"
                     strokeLinecap="round"
                     initial={{ pathLength: 0 }}
                     animate={{ pathLength: 1 }}
                     transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
                  />
                  
                  {/* Floating Tooltip Point */}
                  <motion.circle 
                     cx="300" cy="20" r="4" fill="white" stroke="#ec4899" strokeWidth="2"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ delay: 2 }}
                  />
               </svg>
            </div>
         </div>

         {/* Backdrop Glow */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-500/20 blur-[60px] -z-10 rounded-full pointer-events-none" />
      </div>
   );
};
