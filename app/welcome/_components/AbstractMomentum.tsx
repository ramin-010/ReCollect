'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const TASKS = [
  { id: 1, title: 'Review Q3 Goals', category: 'Strategy', color: 'bg-emerald-500' },
  { id: 2, title: 'Update Documentation', category: 'Dev', color: 'bg-blue-500' },
  { id: 3, title: 'Client Meeting', category: 'Sales', color: 'bg-purple-500' },
  { id: 4, title: 'Deploy Production', category: 'Dev', color: 'bg-orange-500' },
  { id: 5, title: 'Team Sync', category: 'General', color: 'bg-pink-500' },
];

export const AbstractMomentum = () => {
  const [complete, setComplete] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
       setComplete(prev => {
          if (prev.length >= TASKS.length) {
             // Wait a beat then reset
             setTimeout(() => setComplete([]), 2000);
             return prev;
          }
          return [...prev, TASKS[prev.length].id];
       });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
       <div className="relative w-full max-w-sm h-64">
         <AnimatePresence mode="popLayout">
           {TASKS.map((task, index) => {
             // If separate from complete list, it's visible. If in complete list, it flies away
             const isCompleted = complete.includes(task.id);
             
             // We only render cards that haven't been completed yet (or are just completing)
             if (complete.length > index + 1) return null; // Remove old completed tasks from DOM entirely
             
             // Calculate stack position (0 is front)
             const stackIndex = index - complete.length;
             if (stackIndex > 3) return null; // Only show top 3

             return (
               <motion.div
                 key={task.id}
                 layout
                 initial={{ scale: 0.9, y: 20, opacity: 0 }}
                 animate={{ 
                    scale: 1 - stackIndex * 0.05, 
                    y: stackIndex * 15, 
                    opacity: 1 - stackIndex * 0.2,
                    zIndex: 10 - stackIndex,
                    x: isCompleted ? 400 : 0,  // Fly right if completed
                    rotate: isCompleted ? 10 : 0
                 }}
                 transition={{ type: "spring", stiffness: 300, damping: 20 }}
                 className={`
                    absolute top-0 left-0 right-0 h-24 rounded-2xl border border-white/10 
                    bg-zinc-900/90 backdrop-blur-xl shadow-2xl flex items-center px-6 gap-4
                 `}
               >
                  <div className={`w-8 h-8 rounded-full ${task.color} bg-opacity-20 flex items-center justify-center border border-white/10`}>
                     {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : <div className={`w-3 h-3 rounded-full ${task.color}`} />}
                  </div>
                  <div className="flex-1">
                     <h4 className="text-white font-medium text-lg">{task.title}</h4>
                     <span className="text-xs text-zinc-500 uppercase tracking-wider">{task.category}</span>
                  </div>
                  {stackIndex === 0 && !isCompleted && (
                     <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        className="text-zinc-400"
                     >
                        <ArrowRight className="w-5 h-5" />
                     </motion.div>
                  )}
               </motion.div>
             );
           })}
         </AnimatePresence>
         
         {complete.length === TASKS.length && (
            <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="absolute inset-0 flex items-center justify-center flex-col text-center"
            >
               <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
               </div>
               <h3 className="text-2xl font-bold text-white">All Caught Up!</h3>
            </motion.div>
         )}
       </div>
    </div>
  );
};
