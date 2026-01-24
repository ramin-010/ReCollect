'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command } from 'lucide-react';
import { TaskInput } from './TaskInput';
import { useTodoStore } from '@/lib/store/todoStore';

interface QuickTaskAddProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickTaskAdd({ isOpen, onClose }: QuickTaskAddProps) {
  const [mounted, setMounted] = useState(false);
  const { addTodo } = useTodoStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSave = useCallback((data: any) => {
    if (data._id) {
      addTodo(data);
    }
    onClose();
  }, [addTodo, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101]"
          >
            {/* Header hint */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Command className="w-3.5 h-3.5" />
                <span>Quick Add Task</span>
              </div>
              {/* <button
                onClick={onClose}
                className="p-1 text-white/40 hover:text-white/70 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button> */}
            </div>

            {/* Task Input */}
            <TaskInput
              onSave={handleSave}
              isExpanded={true}
              onExpandChange={() => {}}
              isQuickAdd={true}
              onClose={onClose}
            />

            {/* Keyboard hints */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/30">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">↵</kbd>
                Create
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Esc</kbd>
                Cancel
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
