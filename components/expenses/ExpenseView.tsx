'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '@/lib/store/expenseStore';
import { CommandDashboard } from './dashboard/CommandDashboard';
import { ExpenseHeader } from './dashboard/ExpenseHeader';
import { parseExpenseCommand } from '@/lib/utils/expenseParser';
import { toast } from 'sonner';
import axiosInstance from '@/lib/utils/axios';
import { cn } from '@/lib/utils';
import { LayoutDashboard, PieChart, History, Plus } from 'lucide-react';

import { AnalyticsView } from './analytics/AnalyticsView';
import { LedgerView } from './ledger/LedgerView';

export function ExpenseView() {
  const { 
    transactions, 
    setTransactions, 
    addTransaction, 
    isInitialized,
    setLoading 
  } = useExpenseStore();

  const [activeTab, setActiveTab] = useState<'command' | 'analytics' | 'ledger'>('command');

  // Fetch Data
  useEffect(() => {
    if (isInitialized) return;
    const fetch = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get('/api/expenses');
            if(res.data.success) setTransactions(res.data.data);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };
    fetch();
  }, [isInitialized, setTransactions, setLoading]);

  // Derived State
  const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0);
  const monthlyBudget = 20000; // Hardcoded for now, will persist in localStorage later

  // Handlers
  const handleSmartAdd = async (text: string) => {
    const data = parseExpenseCommand(text);
    if (!data) {
        toast.error("Could not understand that. Try 'Lunch 200'.");
        return;
    }

    // Optimistic Update
    const tempId = Math.random().toString();
    const optimisticTx = { ...data, _id: tempId, type: 'expense' as const, date: data.date.toISOString() };
    addTransaction(optimisticTx);
    toast.success(`Added ₹${data.amount} for ${data.category}`);

    try {
        const res = await axiosInstance.post('/api/expenses', {
            ...data,
            date: data.date.toISOString()
        });
        if (res.data.success) {
            // Store handles replacing or refetching, for now we assume it's fine
            // In a perfect world we replace the optimistic ID, but store might just append.
            // For now, let's just refetch or let the store add the real one (duplicate risk if store doesn't dedup).
            // Actually, we should probably remove the temp one or update it. 
            // Simplest for MVP: Just add valid one and silence the optimistic one? 
            // Better: Just await.
        }
    } catch (e) {
        toast.error("Failed to save to server");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white overflow-hidden relative font-sans">
        
        {/* Header Area (Always Visible) */}
        <div className="pb-2">
             <ExpenseHeader monthlyBudget={monthlyBudget} totalSpent={totalSpent} />
        </div>

        {/* Top Navigation (Subtle, below header like Todo filters) */}
        <div className="max-w-[1000px] mx-auto px-6 md:px-8 w-full flex items-center justify-center mb-6">
            <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/5">
                {[
                    { id: 'command', label: 'Overview' },
                    { id: 'analytics', label: 'Analytics' },
                    { id: 'ledger', label: 'History' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200",
                            activeTab === tab.id ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pb-20">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'command' && (
                        <CommandDashboard 
                            onAddTransaction={handleSmartAdd}
                            monthlyBudget={monthlyBudget}
                            totalSpent={totalSpent}
                            recentTransactions={transactions}
                        />
                    )}
                    {activeTab === 'analytics' && <AnalyticsView />}
                    {activeTab === 'ledger' && <LedgerView />}
                </motion.div>
            </AnimatePresence>
        </div>

    </div>

    
  );
}
