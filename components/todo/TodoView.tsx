'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui-base/Button';
import {
  Plus,
  Loader2,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  LayoutGrid,
  List,
  Search,
  ArrowRight
} from 'lucide-react';
import { TodoDialog } from './TodoDialog';
import { RichTaskCard } from './RichTaskCard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useTodoStore, Todo, Task } from '@/lib/store/todoStore';
import { isPast, isToday, parseISO, format } from 'date-fns';

export function TodoView() {
  const {
    todos,
    setTodos,
    isLoading,
    setLoading,
    isInitialized,
    addTodo,
    updateTodo,
    removeTodo
  } = useTodoStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    if (isInitialized) return;
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/todos');
      if (response.data.success) setTodos(response.data.data);
    } catch (error) {
      toast.error('Failed to load tasks');
      setLoading(false);
    }
  }, [isInitialized, setTodos, setLoading]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  // Derived State
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.status === 'complete' || t.isCompleted).length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : (completed / total) * 100;
    return { total, completed, pending, progress };
  }, [todos]);

  const activeTasks = useMemo(() => {
    return todos
      .filter(t => (t.status !== 'complete' && !t.isCompleted))
      .filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        // Priority sort
        const pMap = { high: 3, medium: 2, low: 1 };
        const pA = pMap[a.priority || 'medium'] || 1;
        const pB = pMap[b.priority || 'medium'] || 1;
        return pB - pA;
      });
  }, [todos, searchQuery]);

  // Handlers (standard)
  const handleSaveTask = async (data: any) => {
    try {
      if (editingTodo) {
        const response = await axiosInstance.patch(`/api/todos/${editingTodo._id}`, data);
        if (response.data.success) {
          updateTodo(editingTodo._id, response.data.data);
          toast.success('Task updated');
        }
      } else {
        const response = await axiosInstance.post('/api/todos', {
          ...data,
          status: 'pending',
          priority: data.priority || 'medium'
        });
        if (response.data.success) {
          addTodo(response.data.data);
          toast.success('Task created');
        }
      }
      setEditingTodo(undefined);
    } catch (error: any) {
      toast.error('Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await axiosInstance.delete(`/api/todos/${id}`);
      removeTodo(id);
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const toggleComplete = async (id: string, currentlyCompleted: boolean) => {
    const newStatus = currentlyCompleted ? 'pending' : 'complete';
    updateTodo(id, { status: newStatus as 'pending' | 'complete', isCompleted: !currentlyCompleted });
    axiosInstance.patch(`/api/todos/${id}`, { status: newStatus }).catch(() => {
       updateTodo(id, { status: currentlyCompleted ? 'complete' : 'pending', isCompleted: currentlyCompleted });
    });
  };

  const toggleSubtask = async (taskId: string, subtaskId: string, isCompleted: boolean) => {
    const task = todos.find(t => t._id === taskId);
    if (!task?.subtasks) return;
    const updatedSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, isCompleted } : st);
    updateTodo(taskId, { subtasks: updatedSubtasks });
    axiosInstance.patch(`/api/todos/${taskId}`, { subtasks: updatedSubtasks });
  };

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] p-6 md:p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HERO SECTION */}
        <div className="relative group rounded-3xl overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-3xl opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-1000" />
            
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            
            <div className="relative z-10 space-y-2">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-emerald-400 font-medium tracking-wide uppercase text-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Productivity Hub</span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/50"
              >
                {greeting}, User.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white/40 text-lg max-w-md leading-relaxed"
              >
                You have <span className="text-white font-semibold">{stats.pending} active tasks</span> awaiting your focus. 
                Keep the momentum flowing.
              </motion.p>
            </div>

            {/* Velocity Ring */}
            <div className="relative z-10 flex items-center gap-8">
              <div className="flex flex-col items-end gap-1">
                 <span className="text-3xl font-bold tabular-nums">{Math.round(stats.progress)}%</span>
                 <span className="text-xs uppercase tracking-widest text-white/40">Efficiency</span>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                  <motion.circle 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: stats.progress / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                    strokeLinecap="round"
                    className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    strokeDasharray="1"
                    pathLength="1"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK INPUT SECTION */}
        <div className="relative z-20 w-full max-w-4xl mx-auto">
           <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-blue-500/30 rounded-2xl blur opacity-10 group-hover:opacity-30 transition-opacity duration-500" />
              <div className="relative bg-[hsl(var(--task-input-bg))] border border-[hsl(var(--task-input-border))] rounded-2xl flex items-center p-3 shadow-lg">
                 <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
                    <Sparkles className="w-5 h-5" />
                 </div>
                 <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                         // Simple NLP Parsing Logic
                         const text = searchQuery;
                         let dueDate = new Date();
                         let hasDate = false;
                         let cleanText = text;

                         const lower = text.toLowerCase();
                         
                         // 1. "tomorrow"
                         if (lower.includes('tomorrow')) {
                            dueDate.setDate(dueDate.getDate() + 1);
                            hasDate = true;
                            cleanText = cleanText.replace(/tomorrow/gi, '');
                         }

                         // 2. "by [day of week]" (e.g. by friday)
                         const dayMatch = lower.match(/by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
                         if (dayMatch) {
                            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                            const targetDay = days.indexOf(dayMatch[1]);
                            const currentDay = new Date().getDay();
                            let daysUntil = targetDay - currentDay;
                            if (daysUntil <= 0) daysUntil += 7;
                            dueDate.setDate(dueDate.getDate() + daysUntil);
                            hasDate = true;
                            cleanText = cleanText.replace(dayMatch[0], '');
                         }

                         // 3. "at [time]" or "6pm"
                         // Matches: 5pm, 5:30pm, at 5pm, at 17:00
                         const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
                         if (timeMatch && (lower.includes('at') || timeMatch[3])) { // Require 'at' or 'am/pm' to avoid matching random numbers
                            let hours = parseInt(timeMatch[1]);
                            const minutes = parseInt(timeMatch[2] || '0');
                            const meridiem = timeMatch[3];

                            if (meridiem === 'pm' && hours < 12) hours += 12;
                            if (meridiem === 'am' && hours === 12) hours = 0;

                            dueDate.setHours(hours, minutes, 0, 0);
                            hasDate = true;
                            cleanText = cleanText.replace(timeMatch[0], '');
                         } else if (!hasDate) {
                            // Default to end of day if date set but no time
                            if (hasDate) dueDate.setHours(18, 0, 0, 0); 
                         }

                         // Default if no date found: Next status check usually doesn't apply dates
                         // But if we found *something*, use it.
                         
                         handleSaveTask({ 
                            text: cleanText.replace(/\s+/g, ' ').trim(), // Remove extra spaces left by regex
                            priority: 'medium',
                            dueDate: hasDate ? dueDate.toISOString() : undefined
                         });
                         setSearchQuery('');
                         toast.success("Mission initiated");
                      }
                    }}
                    placeholder="What is your next focus?"
                    className="flex-1 bg-transparent border-0 text-lg text-[hsl(var(--task-input-text))] placeholder:text-[hsl(var(--task-input-placeholder))] focus:ring-0 focus:outline-none px-4 font-medium"
                 />
                 <div className="flex items-center gap-2 pr-2">
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--task-key-bg))] rounded-lg border border-[hsl(var(--task-key-text))]/20 group-focus-within:border-emerald-500/50 transition-colors">
                       <span className="text-xs font-semibold text-[hsl(var(--task-key-text))] uppercase tracking-wider">Enter</span>
                       <ArrowRight className="w-3 h-3 text-[hsl(var(--task-key-text))]" />
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center justify-between">
           <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Active Tasks
           </h2>

          <div className="flex items-center gap-3">
             <div className="bg-[hsl(var(--muted))] rounded-lg p-1 flex items-center gap-1">
                <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]")}>
                   <List className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]")}>
                   <LayoutGrid className="w-4 h-4" />
                </button>
             </div>
          </div>
        </div>

        {/* TASKS GRID */}
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          <AnimatePresence mode="popLayout">
            {activeTasks.length === 0 ? (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }}
                 className="col-span-full py-20 text-center space-y-4"
               >
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                    <CheckCircle2 className="w-10 h-10 text-white/20" />
                  </div>
                  <h3 className="text-xl font-medium text-white/60">Balance restored</h3>
                  <p className="text-white/30">No active tasks found in your stream.</p>
               </motion.div>
            ) : (
              activeTasks.map((task, idx) => (
                <RichTaskCard 
                  key={task._id}
                  task={task}
                  layout={viewMode} // Pass layout prop
                  onToggleComplete={toggleComplete}
                  onEdit={(t) => { setEditingTodo(t); setIsDialogOpen(true); }}
                  onDelete={handleDeleteTask}
                  onToggleSubtask={toggleSubtask}
                  index={idx} // For staggered animation
                />
              ))
            )}
          </AnimatePresence>
        </div>

      </div>

      <TodoDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        existingTodo={editingTodo ? {
          id: editingTodo._id,
          text: editingTodo.text,
          description: editingTodo.description,
          priority: editingTodo.priority,
          dueDate: editingTodo.dueDate,
          reminderDate: editingTodo.reminderDate,
          subtasks: editingTodo.subtasks,
          recurrence: editingTodo.recurrence,
          estimatedMinutes: editingTodo.estimatedMinutes
        } : undefined}
        onSave={handleSaveTask}
      />
    </div>
  );
}
