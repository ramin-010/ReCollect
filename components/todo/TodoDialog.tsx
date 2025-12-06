'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import {
  Clock,
  Calendar,
  Check,
  Bell,
  CheckSquare,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface TodoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingTodo?: {
    id: string;
    text: string;
    reminderDate?: string;
  };
  onSave: (todoData: {
    text: string;
    reminderDate?: string;
  }) => Promise<void>;
}

const toLocalInputValue = (utcString: string) => {
  const date = new Date(utcString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    ' at ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
};

export const TodoDialog: React.FC<TodoDialogProps> = ({
  isOpen,
  onClose,
  existingTodo,
  onSave
}) => {
  const [text, setText] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(existingTodo?.text || '');
      setReminderDate(
        existingTodo?.reminderDate
          ? toLocalInputValue(existingTodo.reminderDate)
          : ''
      );
    } else {
      // Reset form on close after animation
      const timer = setTimeout(() => {
        setText('');
        setReminderDate('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, existingTodo]);

  const quickOptions = [
    { label: '1 hour', hours: 1 },
    { label: 'Tomorrow', hours: 24 },
    { label: '3 days', hours: 72 },
    { label: '1 week', hours: 168 }
  ];

  const handleQuickSelect = (hours: number) => {
    const now = new Date();
    now.setHours(now.getHours() + hours);

    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);

    setReminderDate(local);
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error('Please enter a todo');
      return;
    }

    let utcISO: string | undefined;

    if (reminderDate) {
      const localDate = new Date(reminderDate);
      utcISO = localDate.toISOString();

      if (new Date(utcISO) <= new Date()) {
        toast.error('Reminder date must be in the future');
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSave({
        text: text.trim(),
        reminderDate: utcISO
      });

      toast.success(existingTodo ? 'Todo updated' : 'Todo added');
      onClose();
    } catch (error) {
      console.error('Failed to save todo:', error);
      toast.error('Failed to save todo');
    } finally {
      setIsLoading(false);
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
              className="w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {existingTodo ? (
                    <>
                      <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      Edit Task
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      New Task
                    </>
                  )}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--muted-foreground))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Todo Text Input */}
                <div className="space-y-2">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full text-lg py-6 px-4 bg-[hsl(var(--muted))]/30 border-transparent focus:border-[hsl(var(--brand-primary))] focus:bg-[hsl(var(--background))] transition-all"
                    autoFocus
                  />
                </div>

                {/* Reminder Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Set Reminder
                    </label>
                    {reminderDate && (
                      <button 
                        onClick={() => setReminderDate('')}
                        className="text-xs text-[hsl(var(--destructive))] hover:underline"
                      >
                        Clear Reminder
                      </button>
                    )}
                  </div>

                  {/* Quick Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quickOptions.map((option) => {
                      const isActive = reminderDate && formatDate(reminderDate).includes(option.label);
                      return (
                        <button
                          key={option.label}
                          onClick={() => handleQuickSelect(option.hours)}
                          className={`
                            relative px-3 py-2 rounded-lg border text-xs font-medium transition-all
                            flex flex-col items-center justify-center gap-1
                            ${isActive
                              ? 'bg-[hsl(var(--brand-primary))]/10 border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))]'
                              : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--brand-primary))]/50 hover:bg-[hsl(var(--muted))]/30'
                            }
                          `}
                        >
                          <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-[hsl(var(--brand-primary))]' : 'opacity-50'}`} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Date Picker */}
                  <div className="relative">
                    <div className={`
                      flex items-center gap-3 p-3 rounded-lg border transition-all
                      ${reminderDate 
                        ? 'bg-[hsl(var(--brand-primary))]/5 border-[hsl(var(--brand-primary))]/30' 
                        : 'bg-[hsl(var(--muted))]/20 border-transparent hover:bg-[hsl(var(--muted))]/30'
                      }
                    `}>
                      <div className={`
                        p-2 rounded-md 
                        ${reminderDate ? 'bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}
                      `}>
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] mb-0.5">
                          Custom Date & Time
                        </p>
                        <input
                          type="datetime-local"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs text-[hsl(var(--muted-foreground))] focus:ring-0 cursor-pointer font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[hsl(var(--muted))]/20 border-t border-[hsl(var(--border))]">
                <Button 
                  variant="ghost" 
                  onClick={onClose} 
                  disabled={isLoading}
                  className="hover:bg-[hsl(var(--muted))]"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isLoading}
                  rightIcon={!isLoading && <Check className="w-4 h-4" />}
                  className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white min-w-[120px]"
                >
                  {existingTodo ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
