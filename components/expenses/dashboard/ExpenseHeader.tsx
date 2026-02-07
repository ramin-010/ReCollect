'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

interface ExpenseHeaderProps {
  monthlyBudget: number;
  totalSpent: number;
}

const backgroundImages: string[] = [
  // Keep empty or add subtle financial texture if needed, mimicking TodoHeader
];

export function ExpenseHeader({ monthlyBudget, totalSpent }: ExpenseHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const raw_name = user?.name || "User";
  const name = raw_name.charAt(0).toUpperCase() + raw_name.slice(1).toLowerCase();

  const percentage = Math.min(100, Math.round((totalSpent / monthlyBudget) * 100));
  const remaining = monthlyBudget - totalSpent;
  const isOver = remaining < 0;

  return (
    <div className="relative w-full h-[35vh] min-h-[260px] -mt-16 pt-16">
        {/* Background Layer (Matches TodoHeader) */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-900`} />
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-violet-500/5 to-purple-500/5 opacity-30 blur-3xl" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        </div>

      <div className="relative z-10 w-full h-full max-w-[1400px] mx-auto px-12 flex items-end justify-between pb-3">
        
        {/* LEFT: Greeting */}
        <div className="flex flex-col justify-end space-y-1 mb-2">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-violet-500/80 font-medium tracking-widest uppercase text-[9px] mb-2"
            >
                <Wallet className="w-3 h-3" />
                <span>Financial Command</span>
            </motion.div>
            
            <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl lg:text-5xl font-light tracking-tight text-white/90 font-serif"
            >
                Overview for <br/>
                <span className="font-bold font-sans text-white">{name}.</span>
            </motion.h1>
            
            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/40 text-xs font-medium pl-1 mt-1 border-l-2 border-violet-500/30"
            >
                {isOver ? "Budget exceeded for this month." : "You are within your monthly budget."}
            </motion.p>
        </div>

        {/* CENTER: Big Metric (Replacing Clock) */}
        <div className="absolute left-1/2 bottom-10 -translate-x-1/2 flex flex-col items-center select-none z-20">
             <div className="text-center group cursor-pointer">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 group-hover:text-white/40 transition-colors">Balance Remaining</span>
                <div className={cn(
                    "text-6xl md:text-7xl font-bold tracking-tighter transition-colors mt-2",
                    isOver ? "text-rose-500" : "text-white"
                )}>
                    <span className="text-4xl align-top opacity-50 mr-1">₹</span>
                    {Math.abs(remaining).toLocaleString()}
                </div>
                {isOver && (
                     <div className="mt-2 text-rose-500/50 text-xs font-medium tracking-widest uppercase flex items-center justify-center gap-2">
                        <ArrowDownRight className="w-3 h-3" /> Over Budget
                     </div>
                )}
             </div>
        </div>

        {/* RIGHT: Stats */}
        <div className="flex flex-col items-end justify-end mb-2 z-10">
             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-5"
            >
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-bold tabular-nums text-white tracking-tighter drop-shadow-md">{percentage}%</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-violet-400 font-bold opacity-80">Used</span>
                </div>
                 {/* Radial Progress (Matches TodoHeader style) */}
                <div className="relative w-14 h-14">
                    <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
                    <motion.circle 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: percentage / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" 
                        strokeLinecap="round"
                        className="text-violet-500 drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                        strokeDasharray="1"
                        pathLength="1"
                    />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-violet-400 fill-violet-400/10" />
                    </div>
                </div>
            </motion.div>
        </div>

      </div>
    </div>
  );
}
