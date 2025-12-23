'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Zap, MessageCircle } from 'lucide-react';

export const AbstractFocus = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-8">
      {/* Distractions (Floating Elements) that fade out */}
      <AnimatePresence>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
               opacity: [0, 0.3, 0],
               x: Math.random() * 400 - 200,
               y: Math.random() * 400 - 200,
               scale: [0.5, 1, 0.5]
            }}
            transition={{ 
               duration: 3, 
               repeat: Infinity, 
               delay: i * 0.5,
               ease: "easeInOut"
            }}
            className="absolute"
          >
             <div className="w-2 h-2 rounded-full bg-zinc-500/20 blur-sm" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main Focus Orb */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
           {/* Ripple Effect */}
           {[...Array(3)].map((_, i) => (
              <motion.div
                key={`ripple-${i}`}
                className="absolute inset-0 rounded-full border border-blue-500/20"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ 
                   duration: 2, 
                   repeat: Infinity, 
                   delay: i * 0.6,
                   ease: "easeOut"
                }}
              />
           ))}
           
           <motion.div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)] z-20 relative"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           >
              <Brain className="w-10 h-10 text-white" />
           </motion.div>

           {/* Orbiting particles */}
           <motion.div 
             className="absolute inset-0 z-10"
             animate={{ rotate: 360 }}
             transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
           >
              <div className="absolute -top-4 left-1/2 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
           </motion.div>
        </div>

        <div className="text-center space-y-2">
            <motion.h3 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-blue-400"
            >
               Deep Focus Mode
            </motion.h3>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.4 }}
               className="flex items-center gap-2 justify-center text-sm text-blue-200/60"
            >
               <Zap className="w-4 h-4" />
               <span>Notifications Paused</span>
            </motion.div>
        </div>
      </div>
    </div>
  );
};
