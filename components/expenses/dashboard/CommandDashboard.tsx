'use client';

import React from 'react';
import { ExpenseCommandBar } from './ExpenseCommandBar';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { Tag, Trash2, Calendar, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { useExpenseStore } from '@/lib/store/expenseStore';

interface CommandDashboardProps {
  onAddTransaction: (text: string) => void;
  monthlyBudget: number;
  totalSpent: number;
  recentTransactions: any[];
}

export function CommandDashboard({ 
  onAddTransaction, 
  monthlyBudget, 
  totalSpent,
  recentTransactions
}: CommandDashboardProps) {

  const { removeTransaction } = useExpenseStore();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        await axiosInstance.delete(`/api/expenses/${id}`);
        removeTransaction(id);
        toast.success("Transaction deleted");
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 md:px-8 pb-20">
        
        {/* 1. Action Area (Input) */}
        <div className="mb-12">
             <ExpenseCommandBar onAdd={onAddTransaction} />
        </div>

        {/* 2. Recent Transactions (List) */}
        <div className="space-y-6">
            <h3 className="px-1 text-[11px] font-bold text-white/30 uppercase tracking-widest">Recent Activity</h3>
            
            <div className="space-y-2">
                {recentTransactions.slice(0, 10).map((t, i) => (
                    <motion.div
                        key={t._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative flex items-center justify-between p-4 bg-[#121212] hover:bg-white/5 data-[new=true]:bg-violet-500/10 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-default"
                    >
                        <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner transition-colors",
                                "bg-white/5 text-white/40 group-hover:text-white/60"
                            )}>
                                {t.category.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Content */}
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-medium text-sm">{t.note}</p>
                                    {isToday(new Date(t.date)) && (
                                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Today</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-white/30 mt-0.5">
                                    <span className="capitalize flex items-center gap-1">
                                        <Tag className="w-3 h-3" /> {t.category}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(t.date), 'MMM dd')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center gap-5">
                            <span className="font-mono font-medium text-white/90">
                                -₹{t.amount.toLocaleString()}
                            </span>
                            <button 
                                onClick={(e) => handleDelete(t._id, e)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-all"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}

                {recentTransactions.length === 0 && (
                    <div className="text-center py-12 text-white/20 border border-dashed border-white/10 rounded-xl">
                        <p>No transactions yet.</p>
                        <p className="text-xs mt-1">Type above to add one!</p>
                    </div>
                )}
            </div>
        </div>

    </div>
  );
}
