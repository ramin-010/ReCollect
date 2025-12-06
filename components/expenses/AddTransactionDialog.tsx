'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar, IndianRupee, FileText, Wallet, Pencil } from 'lucide-react';
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

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍔' },
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'entertainment', label: 'Fun', icon: '🎬' },
  { id: 'bills', label: 'Bills', icon: '💡' },
  { id: 'health', label: 'Health', icon: '💪' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'education', label: 'Study', icon: '📚' },
  { id: 'other', label: 'Other', icon: '✏️', isCustom: true },
];

export const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('Others');
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  // Focus custom input when editing
  useEffect(() => {
    if (isEditingCustom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isEditingCustom]);

  // Reset when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setCategory('');
      setCustomCategory('Others');
      setIsEditingCustom(false);
      setNote('');
    }
  }, [isOpen]);

  const handleCategoryClick = (catId: string, isCustom?: boolean) => {
    setCategory(catId);
    if (isCustom) {
      setIsEditingCustom(true);
    } else {
      setIsEditingCustom(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) {
      toast.error('Please fill in amount and category');
      return;
    }

    // Use custom category name if "other" is selected and custom name is provided
    const finalCategory = category === 'other' && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    onSave({
      amount: parseFloat(amount),
      type: 'expense',
      category: finalCategory,
      date: new Date(date),
      note,
    });
    
    setAmount('');
    setCategory('');
    setCustomCategory('');
    setIsEditingCustom(false);
    setNote('');
    onClose();
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
                  <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-500">
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

              {/* Body - Two Column Layout */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Amount, Date, Note */}
                  <div className="space-y-4">
                    {/* Amount Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                        <IndianRupee className="w-3 h-3" />
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[hsl(var(--muted-foreground))]">₹</span>
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          className="w-full text-2xl font-bold py-3 pl-10 pr-4 bg-[hsl(var(--muted))] border-transparent focus:border-violet-500 focus:bg-[hsl(var(--background))] rounded-xl transition-all outline-none border"
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
                  </div>

                  {/* Right Column - Categories */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryClick(cat.id, cat.isCustom)}
                          className={cn(
                            "px-2 py-2.5 rounded-lg border text-sm font-medium transition-all flex flex-col items-center justify-center gap-1 relative",
                            category === cat.id
                              ? "bg-violet-500/10 border-violet-500 text-white"
                              : "bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-violet-500/50 hover:bg-[hsl(var(--muted))]"
                          )}
                        >
                          <span className="text-lg">{cat.icon}</span>
                          {/* Show editable input for "Other" when selected */}
                          {cat.isCustom && category === 'other' && isEditingCustom ? (
                            <input
                              ref={customInputRef}
                              type="text"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              placeholder="Type name..."
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-[11px] text-center bg-transparent border-none outline-none font-medium placeholder:text-violet-400/60 text-white"
                            />
                          ) : (
                            <span className="text-[11px] text-white">
                              {cat.isCustom && customCategory ? customCategory : cat.label}
                            </span>
                          )}
                          {/* Edit indicator for Other */}
                          {cat.isCustom && category === 'other' && (
                            <Pencil className="w-2.5 h-2.5 absolute top-1 right-1 text-violet-400" />
                          )}
                        </button>
                      ))}
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
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  rightIcon={<Check className="w-4 h-4" />}
                  className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
                >
                  Add Expense
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
