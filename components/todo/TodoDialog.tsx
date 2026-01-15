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
  X,
  Plus,
  Trash2,
  Flag,
  Layers,
  Repeat
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Subtask, TaskRecurrence } from '@/lib/store/todoStore';
import { v4 as uuidv4 } from 'uuid';

interface TodoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingTodo?: {
    id: string;
    text: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    reminderDate?: string;
    subtasks?: Subtask[];
    recurrence?: TaskRecurrence;
    estimatedMinutes?: number;
  };
  onSave: (todoData: {
    text: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    reminderDate?: string;
    subtasks?: Subtask[];
    recurrence?: TaskRecurrence;
    estimatedMinutes?: number;
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

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' }
];

export const TodoDialog: React.FC<TodoDialogProps> = ({
  isOpen,
  onClose,
  existingTodo,
  onSave
}) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [recurrence, setRecurrence] = useState<TaskRecurrence | undefined>(undefined);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(existingTodo?.text || '');
      setPriority(existingTodo?.priority || 'medium');
      setDueDate(existingTodo?.dueDate ? toLocalInputValue(existingTodo.dueDate) : '');
      setReminderDate(existingTodo?.reminderDate ? toLocalInputValue(existingTodo.reminderDate) : '');
      setSubtasks(existingTodo?.subtasks || []);
      setRecurrence(existingTodo?.recurrence);
      setEstimatedMinutes(existingTodo?.estimatedMinutes || '');
    } else {
      // Reset form on close after animation
      const timer = setTimeout(() => {
        setText('');
        setPriority('medium');
        setDueDate('');
        setReminderDate('');
        setReminderDate('');
        setSubtasks([]);
        setNewSubtaskText('');
        setRecurrence(undefined);
        setEstimatedMinutes('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, existingTodo]);

  const quickDueDateOptions = [
    { label: 'Today', days: 0 },
    { label: 'Tomorrow', days: 1 },
    { label: 'Next Week', days: 7 }
  ];

  const handleQuickDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(23, 59, 0, 0);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setDueDate(`${year}-${month}-${day}T23:59`);
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    
    setSubtasks([...subtasks, {
      id: uuidv4(),
      text: newSubtaskText.trim(),
      isCompleted: false
    }]);
    setNewSubtaskText('');
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    let dueDateISO: string | undefined;
    let reminderISO: string | undefined;

    if (dueDate) {
      dueDateISO = new Date(dueDate).toISOString();
    }

    if (reminderDate) {
      const localDate = new Date(reminderDate);
      reminderISO = localDate.toISOString();

      if (new Date(reminderISO) <= new Date()) {
        toast.error('Reminder date must be in the future');
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSave({
        text: text.trim(),
        priority,
        dueDate: dueDateISO,
        reminderDate: reminderISO,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        recurrence,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined
      });

      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
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
              className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col backdrop-blur-3xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                <h2 className="text-lg font-semibold flex items-center gap-3 text-white">
                  {existingTodo ? (
                    <>
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      Edit Task
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                         <div className="relative">
                           <div className="absolute inset-0 bg-emerald-500 blur-sm opacity-50" />
                           <Plus className="w-5 h-5 relative z-10" />
                         </div>
                      </div>
                      <span className="tracking-tight">New Quest</span>
                    </>
                  )}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body - Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
                {/* Task Title */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 pl-1">
                    Mission Objective
                  </label>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full text-lg py-6 px-4 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:bg-white/10 rounded-xl transition-all shadow-inner"
                    autoFocus
                  />
                </div>

                {/* Priority */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 pl-1 flex items-center gap-2">
                    <Flag className="w-3 h-3" />
                    Priority Level
                  </label>
                  <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    {priorityOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPriority(option.value as 'low' | 'medium' | 'high')}
                        className={cn(
                          "flex-1 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                          priority === option.value 
                            ? "bg-[#0A0A0A] text-white shadow-lg ring-1 ring-white/10" 
                            : "text-white/30 hover:text-white hover:bg-white/5"
                        )}
                      >
                         <span className={cn("mr-2 inline-block w-1.5 h-1.5 rounded-full", 
                            option.value === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' :
                            option.value === 'medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' :
                            'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                         )} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date & Reminder */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pl-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          Deadline
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:bg-white/10 transition-all [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-30 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                        />
                         <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
                      </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 pl-1 flex items-center gap-2">
                          <Repeat className="w-3 h-3" />
                          Recurrence
                       </label>
                       <select 
                          value={recurrence?.pattern || ''}
                          onChange={(e) => {
                             const val = e.target.value;
                             setRecurrence(val ? { pattern: val as any, interval: 1 } : undefined);
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-emerald-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                       >
                          <option value="" className="bg-[#0A0A0A]">Single Task</option>
                          <option value="daily" className="bg-[#0A0A0A]">Daily Quest</option>
                          <option value="weekly" className="bg-[#0A0A0A]">Weekly Routine</option>
                          <option value="monthly" className="bg-[#0A0A0A]">Monthly Goal</option>
                       </select>
                    </div>
                </div>

                {/* Subtasks */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 pl-1 flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Checkpoints
                  </label>
                  
                  <div className="space-y-2 bg-white/[0.02] rounded-xl p-2 border border-white/5">
                    {subtasks.map((subtask) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={subtask.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5 border border-white/5 group hover:border-emerald-500/30 transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="flex-1 text-sm text-white/80">{subtask.text}</span>
                        <button
                          onClick={() => removeSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-md transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                    
                    <div className="flex gap-2 relative">
                       <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        placeholder="Add a checkpoint..."
                        className="flex-1 bg-transparent border-0 text-white text-sm pl-9 pr-3 py-2.5 placeholder:text-white/20 focus:ring-0 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSubtask();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={addSubtask}
                        disabled={!newSubtaskText.trim()}
                        className="bg-white/10 hover:bg-white/20 text-white border-0 mr-1 my-1"
                      >
                         Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-5 bg-white/[0.02] border-t border-white/5">
                <Button 
                  variant="ghost" 
                  onClick={onClose} 
                  disabled={isLoading}
                  className="hover:bg-white/5 text-white/40 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] border-0"
                >
                  {existingTodo ? 'Update Mission' : 'Create Quest'}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
