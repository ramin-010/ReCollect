'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BudgetPulseProps {
  status: 'safe' | 'warning' | 'danger';
  velocity: number;
  monthlyBudget: number;
  spent: number;
}

export function BudgetPulse({ status, monthlyBudget, spent }: BudgetPulseProps) {
  
  const percentage = Math.min(100, Math.round((spent / monthlyBudget) * 100));
  const remaining = monthlyBudget - spent;
  
  const theme = {
    safe: { color: 'text-emerald-500', bg: 'bg-emerald-500', sub: 'text-emerald-400/80' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-500', sub: 'text-amber-400/80' },
    danger: { color: 'text-rose-500', bg: 'bg-rose-500', sub: 'text-rose-400/80' }
  }[status];

  return (
    <div className="w-full max-w-2xl px-6 py-8">
      
      {/* Main Status Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
           <h2 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Monthly Budget</h2>
           <div className="flex items-baseline gap-2">
              <span className="text-4xl font-light text-white tracking-tight">
                ₹{spent.toLocaleString()}
              </span>
              <span className="text-white/40 font-light text-xl">
                 / {monthlyBudget.toLocaleString()}
              </span>
           </div>
        </div>

        <div className="text-right">
             <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/5", theme.color)}>
                {status === 'safe' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {remaining > 0 ? `₹${remaining.toLocaleString()} left` : `₹${Math.abs(remaining).toLocaleString()} over`}
             </div>
        </div>
      </div>

      {/* Modern Progress Bar (No Glow, Clean Lines) */}
      <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn("h-full rounded-full opacity-90", theme.bg)}
        />
      </div>

      {/* Footer Stats (Clean Grid) */}
      <div className="grid grid-cols-3 gap-4 mt-8 border-t border-white/5 pt-6">
         <div>
            <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">Status</span>
            <span className={cn("text-sm font-medium", theme.color)}>
                {status === 'safe' ? 'Within Budget' : status === 'warning' ? 'Caution' : 'Over Limit'}
            </span>
         </div>
         <div>
            <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">Today's Spend</span>
            <span className="text-sm font-medium text-white/80">₹0</span>
         </div>
         <div className="text-right">
            <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">Utilization</span>
            <span className="text-sm font-medium text-white/80">{percentage}%</span>
         </div>
      </div>

    </div>
  );
}
