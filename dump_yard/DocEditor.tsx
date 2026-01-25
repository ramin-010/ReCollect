'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Plus, ChevronDown } from 'lucide-react';
import { TaskInput } from '@/components/todo/TaskInput';
import { TodoHeader } from '@/components/todo/TodoHeader';
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
    }

    // Sort by priority
    const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => (pMap[b.priority || 'medium'] || 1) - (pMap[a.priority || 'medium'] || 1));

    // Filter by priority if selected
    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }

    return result;
  }, [todos, activeFilter, priorityFilter]);

  // Handlers
  // Note: TaskInput now handles the API call directly via todoApi.createTodo
  // This callback only receives the result to add to the local store
  const handleSaveTask = async (data: any) => {
    // If data has _id, it means it came from the API response - just add to store
    if (data._id) {
      addTodo(data);
    }
    // If no _id, the TaskInput handles the API call, we don't need to do anything
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
    updateTodo(id, { status: newStatus as 'pending' | 'complete' });
    axiosInstance.patch(`/api/todos/${id}`, { status: newStatus }).catch(() => {
      updateTodo(id, { status: currentlyCompleted ? 'complete' : 'pending' });
    });
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const formatDueDate = (dueDate: string) => {
    const date = parseISO(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] font-sans selection:bg-emerald-500/30 pb-8">
      
      {/* Header - Slides away when input is expanded */}
      <AnimatePresence>
        {!isInputExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <TodoHeader greeting={greeting} stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "max-w-[950px] mx-auto px-6 md:px-8 relative z-20 transition-all duration-300",
        isInputExpanded ? "pt-20" : "mt-6"
      )}>
        
        {/* Unified Task Input */}
        <TaskInput
          onSave={handleSaveTask}
          isExpanded={isInputExpanded}
          onExpandChange={setIsInputExpanded}
        />

        {/* Filters & Toggles */}
        <div className="flex items-center gap-2 mt-6 mb-8 text-sm">
           {/* View Modes */}
           <div className="flex items-center bg-[#1e1e1e] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => useViewStore.getState().setTodoFilter('inbox')}
            className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      activeFilter !== 'completed' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
            )}
          >
                   Inbox
          </button>
          <button
            onClick={() => useViewStore.getState().setTodoFilter('completed')}
            className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      activeFilter === 'completed' ? "bg-emerald-500/20 text-emerald-400" : "text-white/40 hover:text-white/60"
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
                "flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-all",
                priorityFilter 
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "bg-[#1e1e1e] border-white/5 text-white/60 hover:bg-white/5"
              )}>
                {priorityFilter === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                {priorityFilter === 'medium' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                {priorityFilter === 'low' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                {priorityFilter ? `${priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}` : 'Priority'}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-white/10">
              <DropdownMenuItem onClick={() => setPriorityFilter('')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter('high')} className="text-rose-400">High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter('medium')} className="text-amber-400">Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter('low')} className="text-blue-400">Low</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Task List - Flat rows like Linear/Todoist */}
        <div className="mt-4">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="py-16 text-center space-y-4"
              >
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                  <CheckCircle2 className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-lg font-medium text-white/50">No tasks here</h3>
                <p className="text-white/30 text-sm">
                  {activeFilter === 'completed' 
                    ? "You haven't completed any tasks yet." 
                    : "Create a task to get started."}
                </p>
              </motion.div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredTasks.map((task, idx) => {
                  const isComplete = task.status === 'complete';
                  return (
                    <motion.div 
                      key={task._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleComplete(task._id, isComplete)}
                        className={cn(
                          "w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-all shrink-0",
                          isComplete
                            ? "bg-emerald-500 border-emerald-500" 
                            : "border-white/30 hover:border-emerald-400 hover:bg-emerald-500/10"
                        )}
                      >
                        {isComplete && (
                          <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Task Text */}
                      <span className={cn(
                        "flex-1 text-[15px] transition-all",
                        isComplete ? "line-through text-white/30" : "text-white/90"
                      )}>
                        {task.title}
                      </span>
                      
                      {/* Priority Dot */}
                      {task.priority && task.priority !== 'medium' && (
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          task.priority === 'high' && "bg-rose-500",
                          task.priority === 'low' && "bg-blue-400"
                        )} />
                      )}
                      
                      {/* Due Date */}
                      {task.dueDate && (
                        <span className={cn(
                          "text-xs shrink-0",
                          isToday(parseISO(task.dueDate)) ? "text-emerald-400" : 
                          isPast(parseISO(task.dueDate)) ? "text-rose-400" : "text-white/40"
                        )}>
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                      
                      {/* Delete (show on hover) */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-rose-400 rounded transition-all shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
          
          {/* Quick Add Button at bottom */}
          {!isInputExpanded && filteredTasks.length > 0 && (
            <button 
              onClick={() => setIsInputExpanded(true)}
              className="flex items-center gap-2 py-3 px-2 -mx-2 text-white/30 hover:text-white/50 transition-colors w-full"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add task</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
