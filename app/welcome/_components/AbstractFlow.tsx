'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const AbstractFlow = () => {
   const steps = [
      { id: 1, label: 'Idea', type: 'circle', color: 'bg-indigo-500' },
      { id: 2, label: 'Research', type: 'rect', color: 'bg-purple-500' },
      { id: 3, label: 'Design', type: 'rect', color: 'bg-purple-500' },
      { id: 4, label: 'Launch', type: 'diamond', color: 'bg-pink-500' },
   ];

   return (
      <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden">
         <div className="flex flex-col items-center gap-0">
            {steps.map((step, i) => (
               <React.Fragment key={step.id}>
                  {/* Connection Line */}
                  {i > 0 && (
                     <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 40, opacity: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.4, repeat: Infinity, repeatDelay: 5 }}
                        className="w-0.5 bg-zinc-700/50"
                     />
                  )}
                  {/* Step Node */}
                  <motion.div
                     initial={{ opacity: 0, y: 20, scale: 0.8 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     transition={{ duration: 0.5, delay: i * 0.4 + 0.2, repeat: Infinity, repeatDelay: 5 }}
                     className={`
                        relative z-10 flex items-center justify-center p-4 min-w-[120px] text-center
                        backdrop-blur-md bg-white/5 border border-white/10 shadow-xl
                        ${step.type === 'circle' ? 'rounded-full' : ''}
                        ${step.type === 'rect' ? 'rounded-xl' : ''}
                        ${step.type === 'diamond' ? 'rotate-45 rounded-lg' : ''}
                     `}
                  >
                     <div className={step.type === 'diamond' ? '-rotate-45' : ''}>
                        <div className={`w-2 h-2 rounded-full ${step.color} mb-2 mx-auto`} />
                        <span className="text-white text-sm font-medium">{step.label}</span>
                     </div>
                     
                     {/* Active Indicator Pulse */}
                     {i === 1 && (
                        <span className="absolute -right-3 -top-1 flex h-3 w-3">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                        </span>
                     )}
                  </motion.div>
               </React.Fragment>
            ))}
         </div>
         
         {/* Animated Background Grid */}
         <div className="absolute inset-0 -z-10 opacity-10" 
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
         />
      </div>
   );
};
