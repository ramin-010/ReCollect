'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  Calendar as CalendarIcon,
  ArrowDownRight,
  Filter,
  Trash2,
  PiggyBank
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Card } from '@/components/ui-base/Card';
import { AddTransactionDialog } from './AddTransactionDialog';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format, subDays, isSameDay, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// Dummy Data (Expense-focused)
const INITIAL_TRANSACTIONS = [
  { id: '1', amount: 450, type: 'expense', category: 'food', date: new Date().toISOString(), note: 'Lunch' },
  { id: '2', amount: 250, type: 'expense', category: 'transport', date: subDays(new Date(), 1).toISOString(), note: 'Uber' },
  { id: '3', amount: 1500, type: 'expense', category: 'shopping', date: subDays(new Date(), 2).toISOString(), note: 'Groceries' },
  { id: '4', amount: 800, type: 'expense', category: 'entertainment', date: subDays(new Date(), 3).toISOString(), note: 'Movie Night' },
  { id: '5', amount: 1200, type: 'expense', category: 'bills', date: subDays(new Date(), 5).toISOString(), note: 'Internet Bill' },
  { id: '6', amount: 5000, type: 'expense', category: 'shopping', date: subDays(new Date(), 10).toISOString(), note: 'New Headphones' },
  { id: '7', amount: 2000, type: 'expense', category: 'food', date: subDays(new Date(), 15).toISOString(), note: 'Dinner Date' },
  { id: '8', amount: 1500, type: 'expense', category: 'transport', date: subDays(new Date(), 20).toISOString(), note: 'Fuel' },
  { id: '9', amount: 3500, type: 'expense', category: 'bills', date: subDays(new Date(), 35).toISOString(), note: 'Electricity' },
  { id: '10', amount: 8000, type: 'expense', category: 'shopping', date: subDays(new Date(), 45).toISOString(), note: 'Clothes' },
  { id: '11', amount: 2200, type: 'expense', category: 'food', date: subDays(new Date(), 60).toISOString(), note: 'Groceries' },
  { id: '12', amount: 4500, type: 'expense', category: 'entertainment', date: subDays(new Date(), 75).toISOString(), note: 'Concert' },
  { id: '13', amount: 6000, type: 'expense', category: 'travel', date: subDays(new Date(), 90).toISOString(), note: 'Weekend Trip' },
  { id: '14', amount: 3000, type: 'expense', category: 'health', date: subDays(new Date(), 110).toISOString(), note: 'Gym Membership' },
  { id: '15', amount: 7500, type: 'expense', category: 'bills', date: subDays(new Date(), 130).toISOString(), note: 'Insurance' },
] as const;

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note?: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  shopping: '#ec4899',
  entertainment: '#8b5cf6',
  bills: '#eab308',
  health: '#22c55e',
  travel: '#06b6d4',
  education: '#6366f1',
  other: '#64748b',
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  transport: 'Transport',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  bills: 'Bills & Utilities',
  health: 'Health',
  travel: 'Travel',
  education: 'Education',
  other: 'Other',
};

export function ExpenseView() {
  const [transactions, setTransactions] = useState<Transaction[]>([...INITIAL_TRANSACTIONS]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Calculate Summary (Expense-focused)
  const summary = useMemo(() => {
    const thisMonth = transactions
      .filter(t => {
        const txDate = new Date(t.date);
        const now = new Date();
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      })
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const total = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    return { thisMonth, total, count: transactions.length };
  }, [transactions]);

  // Weekly Spending Data (Last 7 days)
  const weeklyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    return last7Days.map(day => {
      const dayExpenses = transactions
        .filter(t => isSameDay(new Date(t.date), day))
        .reduce((acc, curr) => acc + curr.amount, 0);
      return { name: format(day, 'EEE'), amount: dayExpenses };
    });
  }, [transactions]);

  // Monthly Expenses (Last 5 months)
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 5 }, (_, i) => subMonths(new Date(), 4 - i));
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthExpenses = transactions
        .filter(t => isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd }))
        .reduce((acc, curr) => acc + curr.amount, 0);
      return { name: format(month, 'MMM'), amount: monthExpenses };
    });
  }, [transactions]);

  // Category Breakdown
  const categoryData = useMemo(() => {
    const categoryMap = transactions.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(categoryMap).reduce((a, b) => a + b, 0);

    return Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        amount,
        color: CATEGORY_COLORS[category] || '#64748b',
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const handleAddTransaction = (data: any) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      ...data,
      date: data.date.toISOString(),
    };
    setTransactions([newTransaction, ...transactions]);
    toast.success('Expense added');
  };

  const handleDelete = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
    toast.success('Expense deleted');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col p-8 overflow-hidden bg-[hsl(var(--background))] max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-violet-500" />
            Expense Tracker
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-0.5">
            Where is your money going?
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsAddDialogOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-violet-600 hover:bg-violet-700 text-white"
        >
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-5 shrink-0">
        <Card className="p-4 bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-none shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <PiggyBank className="w-14 h-14" />
          </div>
          <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">This Month</p>
          <h3 className="text-2xl font-bold mt-1">{formatCurrency(summary.thisMonth)}</h3>
        </Card>

        <Card className="p-4 border-[hsl(var(--border))]">
          <p className="text-[hsl(var(--muted-foreground))] text-xs font-medium uppercase tracking-wider">Total Spent</p>
          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {formatCurrency(summary.total)}
          </h3>
        </Card>

        <Card className="p-4 border-[hsl(var(--border))]">
          <p className="text-[hsl(var(--muted-foreground))] text-xs font-medium uppercase tracking-wider">Transactions</p>
          <h3 className="text-2xl font-bold mt-1">{summary.count}</h3>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0">
        
        {/* Left Column: Charts (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-5 min-h-0 overflow-y-auto pr-1">
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Weekly Spending */}
            <Card className="p-4 border-[hsl(var(--border))]">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                Weekly Spending
              </h3>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Monthly Expenses (Last 5 months) */}
            <Card className="p-4 border-[hsl(var(--border))]">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-violet-500" />
                Monthly Expenses
              </h3>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Spent']}
                    />
                    <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card className="p-4 border-[hsl(var(--border))] flex-1 min-h-[180px]">
            <h3 className="text-sm font-semibold mb-4">Spending by Category</h3>
            <div className="space-y-3 overflow-y-auto pr-1">
              {categoryData.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium">{cat.label}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="h-2 bg-[hsl(var(--surface-light))] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
              {categoryData.length === 0 && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">No expense data yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Transactions List (1/3 width) */}
        <Card className="lg:col-span-1 border-[hsl(var(--border))] flex flex-col h-full overflow-hidden bg-[hsl(var(--surface))] max-h-[100vh]">
          <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold">Recent Expenses</h3>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence mode="popLayout">
              {transactions.slice(0, 15).map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[hsl(var(--surface-light))] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${CATEGORY_COLORS[t.category] || '#64748b'}20` }}
                    >
                      <ArrowDownRight className="w-4 h-4" style={{ color: CATEGORY_COLORS[t.category] || '#64748b' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{t.category}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                        {format(new Date(t.date), 'MMM dd')} • {t.note || 'No note'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2 shrink-0">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(t.amount)}
                    </span>
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {transactions.length === 0 && (
              <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                <p className="text-sm">No expenses yet</p>
                <p className="text-xs mt-1">Add your first expense to get started</p>
              </div>
            )}
          </div>
        </Card>

      </div>

      <AddTransactionDialog 
        isOpen={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
        onSave={handleAddTransaction} 
      />
    </div>
  );
}
