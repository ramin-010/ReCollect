'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '@/lib/store/expenseStore';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Search, Filter, Trash2, Tag } from 'lucide-react';
import { Card } from '@/components/ui-base/Card';
import axiosInstance from '@/lib/utils/axios';
import { toast } from 'sonner';

export function LedgerView() {
  const { transactions, removeTransaction } = useExpenseStore();
  const [search, setSearch] = useState('');

  // 1. Filter Logic
  const filtered = useMemo(() => {
    return transactions.filter(t => 
        t.note?.toLowerCase().includes(search.toLowerCase()) || 
        t.category.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search]);

  // 2. Group by Date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    filtered.forEach(t => {
        const date = new Date(t.date);
        let key = format(date, 'MMM dd, yyyy');
        if (isToday(date)) key = 'Today';
        if (isYesterday(date)) key = 'Yesterday';
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
    });
    return groups;
  }, [filtered]);

  // Handlers
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        await axiosInstance.delete(`/api/expenses/${id}`);
        removeTransaction(id);
        toast.success("Transaction deleted");
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="h-full overflow-y-auto p-8 max-w-5xl mx-auto custom-scrollbar pb-24">
        
        {/* Search Header */}
        <div className="sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-xl py-4 mb-4 border-b border-white/5">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ledger..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all font-medium"
                />
            </div>
        </div>

        {/* The List Timeline */}
        <div className="space-y-8">
            {Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                    {/* Date Header (Sticky) */}
                    <div className="flex items-center gap-4 mb-4 sticky top-20 z-10">
                        <span className="text-white/40 text-xs font-bold uppercase tracking-widest bg-[#0a0a0a] px-2 py-1 rounded-md border border-white/5">
                            {date}
                        </span>
                        <div className="h-px bg-white/5 flex-1" />
                    </div>

                    <div className="space-y-2">
                        {items.map((t, i) => (
                            <motion.div
                                key={t._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group relative flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-default"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 group-hover:text-white/70 transition-colors">
                                        <Tag className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-sm">{t.note}</p>
                                        <p className="text-white/30 text-xs capitalize">{t.category}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-white/90">₹{t.amount.toLocaleString()}</span>
                                    <button 
                                        onClick={(e) => handleDelete(t._id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}

            {filtered.length === 0 && (
                <div className="text-center py-20 text-white/20">
                    <p>No transactions found</p>
                </div>
            )}
        </div>

    </div>
  );
}
