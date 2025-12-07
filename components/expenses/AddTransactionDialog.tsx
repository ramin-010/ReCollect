'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Calendar, IndianRupee, FileText, Wallet,
  Car, ShoppingBag, Zap, ShoppingCart, Dumbbell, Pill, 
  Cookie, Package, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: {
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: Date;
    note?: string;
  }) => void;
}

const DEFAULT_CATEGORIES = [
  { id: 'transport', label: 'Transport', Icon: Car, color: '#3b82f6' },
  { id: 'grocery', label: 'Grocery', Icon: ShoppingCart, color: '#22c55e' },
  { id: 'bills', label: 'Bills', Icon: Zap, color: '#eab308' },
  { id: 'shopping', label: 'Shopping', Icon: ShoppingBag, color: '#ec4899' },
  { id: 'gym_health', label: 'Gym/Health', Icon: Dumbbell, color: '#10b981' },
  { id: 'medicine', label: 'Medicine', Icon: Pill, color: '#ef4444' },
  { id: 'treats', label: 'Treats', Icon: Cookie, color: '#f97316' },
  { id: 'miscellaneous', label: 'Miscellaneous', Icon: Package, color: '#64748b' },
  { id: 'other', label: 'Other', Icon: MoreHorizontal, color: '#8b5cf6', isCustom: true },
];

export const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (category === 'other' && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [category]);

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setCategory('');
      setCustomCategory('');
      setNote('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) {
      toast.error('Please fill in amount and category');
      return;
    }

    if (category === 'other' && !customCategory.trim()) {
      toast.error('Please enter a custom category name');
      return;
    }

    setIsSubmitting(true);

    const finalCategory = category === 'other' && customCategory.trim() 
      ? customCategory.trim().toLowerCase()
      : category;

    try {
      await onSave({
        amount: parseFloat(amount),
        type: 'expense',
        category: finalCategory,
        date: new Date(date),
        note,
      });
      onClose();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="w-full max-w-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                    <Wallet className="w-4 h-4" />
                  </div>
                  Add Expense
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--muted-foreground))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body - Horizontal Two Column Layout */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column - Amount, Date, Note */}
                  <div className="space-y-4">
                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" />
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[hsl(var(--muted-foreground))]">₹</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          className="w-full text-2xl font-bold py-3 pl-10 pr-4 bg-[hsl(var(--muted))] border border-transparent focus:border-violet-500 focus:bg-[hsl(var(--background))] rounded-xl transition-all outline-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Date and Note - Side by Side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          Date
                        </label>
                        <div className="p-2.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))] transition-all">
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 cursor-pointer font-medium outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          Note
                        </label>
                        <div className="p-2.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))] transition-all">
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional"
                            className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 font-medium outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Category Input */}
                    <AnimatePresence>
                      {category === 'other' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                              Custom Category
                            </label>
                            <input
                              ref={customInputRef}
                              type="text"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              placeholder="e.g. Subscriptions, Rent..."
                              className="w-full px-4 py-2.5 rounded-lg bg-[hsl(var(--muted))] border border-violet-500/30 text-sm font-medium outline-none focus:border-violet-500 transition-colors placeholder:text-[hsl(var(--muted-foreground))]"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right Column - Categories */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DEFAULT_CATEGORIES.map((cat) => {
                        const IconComponent = cat.Icon;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={cn(
                              "px-2 py-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1.5",
                              category === cat.id
                                ? "bg-violet-500/10 border-violet-500"
                                : "bg-[hsl(var(--muted))] border-[hsl(var(--border))] hover:border-violet-500/50"
                            )}
                          >
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${cat.color}15` }}
                            >
                              <IconComponent 
                                className="w-4 h-4" 
                                style={{ color: cat.color }}
                              />
                            </div>
                            <span className="text-[11px] text-[hsl(var(--foreground))]">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[hsl(var(--muted))]/20 border-t border-[hsl(var(--border))]">
                <Button 
                  variant="ghost" 
                  onClick={onClose} 
                  className="hover:bg-[hsl(var(--muted))]"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  rightIcon={isSubmitting ? undefined : <Check className="w-4 h-4" />}
                  className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
                  disabled={isSubmitting || !amount || !category}
                >
                  {isSubmitting ? 'Adding...' : 'Add Expense'}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
