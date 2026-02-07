'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CornerDownLeft, Sparkles, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExpenseCommandBarProps {
  onAdd: (text: string) => void;
  isProcessing?: boolean;
}

export function ExpenseCommandBar({ onAdd, isProcessing = false }: ExpenseCommandBarProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input);
    setInput('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 relative z-20">
      <form onSubmit={handleSubmit} className="relative">
        
        <div className={cn(
            "relative flex items-center bg-[#121212] border transition-all duration-200 rounded-xl overflow-hidden",
            isFocused ? "border-white/20 shadow-xl" : "border-white/10 hover:border-white/15"
        )}>
            
            {/* Minimal Icon */}
            <div className="pl-4 pr-3 text-white/20">
                <div className="w-2 h-2 rounded-full bg-current" />
            </div>

            {/* Clean Input */}
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type 'Lunch 250' to add expense..."
                className="flex-1 bg-transparent py-4 text-base text-white placeholder:text-white/20 focus:outline-none font-normal"
            />

            {/* Enter Indicator */}
            <AnimatePresence>
                {input.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="pr-2"
                    >
                        <button
                            type="submit"
                            className="p-2 rounded-lg bg-white text-black hover:bg-white/90 transition-colors flex items-center justify-center"
                        >
                            <CornerDownLeft className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Minimal Helper Text */}
        <div className="mt-3 flex justify-between px-1 text-[11px] text-white/20 uppercase tracking-widest font-medium">
            <span>Natural Language Enabled</span>
            <span className="opacity-50">Press Enter</span>
        </div>
      </form>
    </div>
  );
}
