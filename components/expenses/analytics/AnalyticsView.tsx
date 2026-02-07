'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useExpenseStore } from '@/lib/store/expenseStore';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card } from '@/components/ui-base/Card';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react';

export function AnalyticsView() {
  const { transactions } = useExpenseStore();

  // --- 1. Spending Trend (Last 30 Days) ---
  const trendData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStr = format(date, 'MMM dd');
      const amount = transactions
        .filter(t => format(new Date(t.date), 'MMM dd') === dayStr)
        .reduce((acc, t) => acc + t.amount, 0);
      data.push({ date: dayStr, amount });
    }
    return data;
  }, [transactions]);

  // --- 2. Category DNA (Radar Chart) ---
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      fullMark: Math.max(...Object.values(map)) // Normalization
    })).slice(0, 6); // Top 6 only
  }, [transactions]);

  // --- 3. Monthly Comparison (Mock for now) ---
  const currentMonthTotal = transactions.reduce((acc, t) => acc + t.amount, 0); // Simplified
  const lastMonthTotal = currentMonthTotal * 0.85; // Mock: You spent 15% less last month
  const diff = currentMonthTotal - lastMonthTotal;
  const isUp = diff > 0;

  return (
    <div className="h-full overflow-y-auto px-6 md:px-8 max-w-[1000px] mx-auto custom-scrollbar pb-24">
      
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Total Spend</h3>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-light text-white font-mono">₹{currentMonthTotal.toLocaleString()}</span>
                <span className={cn("text-xs font-bold mb-1.5 flex items-center gap-1", isUp ? "text-rose-400" : "text-emerald-400")}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs((diff / lastMonthTotal) * 100).toFixed(0)}%
                </span>
            </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Trend Chart */}
        <Card className="lg:col-span-2 p-6 bg-white/5 border-white/10 backdrop-blur-sm min-h-[400px]">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">30-Day Velocity</h3>
            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#8b5cf6" 
                            fillOpacity={1} 
                            fill="url(#colorAmount)" 
                            strokeWidth={3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>

        {/* Category Radar */}
        <Card className="lg:col-span-1 p-6 bg-white/5 border-white/10 backdrop-blur-sm min-h-[400px]">
             <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">Spending DNA</h3>
             <div className="h-[320px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Radar
                            name="Spending"
                            dataKey="amount"
                            stroke="#ec4899"
                            strokeWidth={2}
                            fill="#ec4899"
                            fillOpacity={0.3}
                        />
                    </RadarChart>
                </ResponsiveContainer>
                {categoryData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                        Not enough data
                    </div>
                )}
             </div>
        </Card>

      </div>
    </div>
  );
}
