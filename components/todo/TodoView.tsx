'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Plus, ChevronDown, Briefcase } from 'lucide-react';
import { TaskInput } from './task_Input';
import { TodoHeader } from './TodoHeader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useTodoStore } from '@/lib/store/todoStore';
import { useViewStore } from '@/lib/store/viewStore';
import { isToday, isTomorrow, isPast, parseISO, format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui-base/DropdownMenu';
import { RichTaskItem } from './RichTaskItem';
import { TaskDetailView } from './TaskDetailView';

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

  // Get filter from viewStore (controlled by sidebar)
  const activeFilter = useViewStore((state) => state.todoFilter);

  // UI State
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'' | 'high' | 'medium' | 'low'>('');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

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

  // Stats
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.status === 'complete').length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : (completed / total) * 100;
    return { total, completed, pending, progress };
  }, [todos]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    let result = [...todos];
    
    switch (activeFilter) {
      case 'inbox':
        result = result.filter(t => t.status !== 'complete');
        break;
      case 'today':
        result = result.filter(t => {
          if (t.status === 'complete') return false;
          if (!t.dueDate) return false;
          return isToday(parseISO(t.dueDate));
        });
        break;
      case 'upcoming':
        result = result.filter(t => {
          if (t.status === 'complete') return false;
          if (!t.dueDate) return false;
          const date = parseISO(t.dueDate);
          return !isPast(date) || isToday(date);
        });
        break;
      case 'completed':
        result = result.filter(t => t.status === 'complete');
        break;
      case 'docs':
        result = result.filter(t => 
          t.status !== 'complete' && 
          t.references?.some(ref => ref.type === 'doc')
        );
        break;
      case 'notes':
        result = result.filter(t => 
          t.status !== 'complete' && 
          t.references?.some(ref => ref.type === 'content')
        );
        break;
    }

    // Sort by priority then date
    // High > Medium > Low
    const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
        const pDiff = (pMap[b.priority || 'medium'] || 1) - (pMap[a.priority || 'medium'] || 1);
        if (pDiff !== 0) return pDiff;
        // Secondary sort by date
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
    });

    // Filter by priority if selected
    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }

    return result;
  }, [todos, activeFilter, priorityFilter]);

  // Handlers
  const handleCreateTask = async (data: any) => {
    if (data._id) addTodo(data);
  };
    
  const handleDeleteTask = async (id: string) => {
    try {
      await axiosInstance.delete(`/api/todos/${id}`);
      removeTodo(id);
      if (selectedTask?._id === id) setSelectedTask(null);
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const toggleComplete = async (id: string, currentlyCompleted: boolean) => {
    const newStatus = currentlyCompleted ? 'pending' : 'complete';
    updateTodo(id, { status: newStatus as 'pending' | 'complete' });
    axiosInstance.patch(`/api/todos/${id}`, { status: newStatus }).catch(() => {
        updateTodo(id, { status: currentlyCompleted ? 'complete' : 'pending' });
        toast.error('Failed to update status');
    });
  };

  const handleUpdateTask = useCallback(async (id: string, updates: any) => {
      // Synchronize local store
      updateTodo(id, updates);
      
      // Update local selection if needed
      setSelectedTask((prev: any) => {
          if (prev && prev._id === id) {
              return { ...prev, ...updates };
          }
          return prev;
      });
  }, [updateTodo, setSelectedTask]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen  text-[hsl(var(--foreground))] font-sans pb-20 selection:bg-emerald-500/30">
      
      {/* Header Area - Always visible */}
      <AnimatePresence>
        {!isInputExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
             <div className="pb-2">
                <TodoHeader greeting={greeting} stats={stats} />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "max-w-[1000px] mx-auto px-6 md:px-8 relative z-20 transition-all duration-500",
        isInputExpanded ? "pt-12" : "mt-4"
      )}>
        
        {/* VIEW SWITCHER: List vs Detail */}
        <AnimatePresence mode="wait">
            {selectedTask ? (
                // DETAIL VIEW
                <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                >
                    <TaskDetailView 
                        task={selectedTask}
                        onBack={() => setSelectedTask(null)}
                        onUpdate={handleUpdateTask}
                        onDelete={(id) => {
                            handleDeleteTask(id);
                            setSelectedTask(null);
                        }}
                    />
                </motion.div>
            ) : (
                // LIST VIEW
                <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                     {/* Unified Task Input */}
                    <div className="max-w-[1000px] mx-auto mb-10">
                        <TaskInput
                        onSave={handleCreateTask}
                        isExpanded={isInputExpanded}
                        onExpandChange={setIsInputExpanded}
                        />
                    </div>

                    {/* Filters & Toggles */}
                    <div className="flex items-center gap-2 mt-4 mb-6 text-sm">
                        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                            <button
                                onClick={() => useViewStore.getState().setTodoFilter('inbox')}
                                className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                activeFilter === 'inbox' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                )}
                            >
                                Inbox
                            </button>

                            <button
                                onClick={() => useViewStore.getState().setTodoFilter('today')}
                                className={cn(
                                "hidden sm:block px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                activeFilter === 'today' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                )}
                            >
                                Today
                            </button>

                            <button
                                onClick={() => useViewStore.getState().setTodoFilter('docs')}
                                className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                activeFilter === 'docs' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                )}
                            >
                                Docs
                            </button>

                            <button
                                onClick={() => useViewStore.getState().setTodoFilter('notes')}
                                className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                activeFilter === 'notes' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                )}
                            >
                                Notes
                            </button>

                            <button
                                onClick={() => useViewStore.getState().setTodoFilter('completed')}
                                className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                activeFilter === 'completed' ? "bg-emerald-500/10 text-emerald-400 shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/5"
                                )}
                            >
                                Completed
                            </button>
                        </div>

                        <div className="flex-1" />

                        {/* Priority filter */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold transition-all uppercase tracking-wide",
                                priorityFilter 
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                            )}>
                                {priorityFilter ? (
                                    <>
                                        <div className={cn("w-2 h-2 rounded-full", 
                                            priorityFilter === 'high' ? "bg-rose-500" :
                                            priorityFilter === 'medium' ? "bg-amber-500" : "bg-blue-400"
                                        )} />
                                        {priorityFilter}
                                    </>
                                ) : (
                                    <>
                                        Priority
                                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                                    </>
                                )}
                            </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-white/10 min-w-[140px]">
                            <DropdownMenuItem onClick={() => setPriorityFilter('')}>All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPriorityFilter('high')} className="text-rose-400">High</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPriorityFilter('medium')} className="text-amber-400">Medium</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPriorityFilter('low')} className="text-blue-400">Low</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Task List or Workspace Placeholder */}
                    <div className="space-y-1">
                        {activeFilter === 'workspace' ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center py-20 text-center opacity-70"
                            >
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <Briefcase className="w-8 h-8 text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Workspace</h3>
                                <p className="text-sm text-white/50 max-w-md">
                                    This feature is coming soon. Manage your projects and team collaboration in one place.
                                </p>
                            </motion.div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                            {filteredTasks.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }}
                                    className="py-20 text-center opacity-30"
                                >
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                                    <p>No tasks here</p>
                                </motion.div>
                            ) : (
                                filteredTasks.map((task) => (
                                    <RichTaskItem 
                                        key={task._id}
                                        task={task}
                                        isComplete={task.status === 'complete'}
                                        onDelete={handleDeleteTask}
                                        onToggleComplete={toggleComplete}
                                        onSelect={(t) => setSelectedTask(t)}
                                    />
                                ))
                            )}
                            </AnimatePresence>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
}
