'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, ChevronDown, LayoutList, Table, Inbox, Calendar, FileText, StickyNote } from 'lucide-react';
import { TaskInput } from './task_Input';
import { BulkActionBar } from './workspace/modals/BulkActionBar';
import { TodoHeader } from './TodoHeader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useTodoStore } from '@/lib/store/todoStore';
import type { Todo } from '@/lib/store/todoStore';
import { useViewStore } from '@/lib/store/viewStore';
import type { TodoFilterType } from '@/lib/store/viewStore';
import { isToday, isPast, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui-base/DropdownMenu';
import { RichTaskItem } from './RichTaskItem';
import { PersonalTableView } from './PersonalTableView';
import type { TaskData } from './task_Input/types';
import { AssignedView } from './AssignedView';



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

  const activeFilter = useViewStore((state) => state.todoFilter);

  // UI State
  const isInputExpanded = useViewStore((state) => state.isTodoInputExpanded);
  const setIsInputExpanded = useViewStore((state) => state.setTodoInputExpanded);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'table'>('list');

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    if (isInitialized) return;
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/todos');
      if (response.data.success) setTodos(response.data.data);
    } catch {
      toast.error('Failed to load tasks');
      setLoading(false);
    }
  }, [isInitialized, setTodos, setLoading]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  // Stats (only used for inbox header)
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.status === 'complete').length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : (completed / total) * 100;
    return { total, completed, pending, progress };
  }, [todos]);

  // Filtered Tasks (only for inbox-type filters)
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
    const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
        const pDiff = (pMap[b.priority || 'medium'] || 1) - (pMap[a.priority || 'medium'] || 1);
        if (pDiff !== 0) return pDiff;
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
    });

    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }

    return result;
  }, [todos, activeFilter, priorityFilter]);

  // Handlers
  const handleCreateTask = async (data: TaskData & { _id?: string }) => {
    if (data._id) addTodo(data as unknown as Todo);
  };
    
  const handleDeleteTask = async (id: string) => {
    try {
      await axiosInstance.delete(`/api/todos/${id}`);
      removeTodo(id);
      if (selectedTask?._id === id) setSelectedTask(null);
      
      // Remove from selection if deleted
      setSelectedTasks(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        return next;
      });

      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleBulkDelete = async (taskIds: string[]) => {
    try {
      await Promise.all(taskIds.map(id => axiosInstance.delete(`/api/todos/${id}`)));
      taskIds.forEach(id => removeTodo(id));
      toast.success(`${taskIds.length} tasks deleted`);
    } catch {
      toast.error('Failed to delete some tasks');
    }
  };

  const handleBulkUpdate = async (taskIds: string[], updates: Partial<Todo>) => {
    try {
      await Promise.all(taskIds.map(id => axiosInstance.patch(`/api/todos/${id}`, updates)));
      taskIds.forEach(id => updateTodo(id, updates));
      toast.success(`${taskIds.length} tasks updated`);
    } catch {
      toast.error('Failed to update some tasks');
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

  const handleUpdateTask = useCallback(async (id: string, updates: Partial<Todo>) => {
      updateTodo(id, updates);
      setSelectedTask((prev) => {
          if (prev && prev._id === id) {
              return { ...prev, ...updates } as Todo;
          }
          return prev;
      });
      // Persist to backend
      axiosInstance.patch(`/api/todos/${id}`, updates).catch(() => {});
  }, [updateTodo, setSelectedTask]);

  // Adapter for workspace-style components (onStatusChange(id, newStatus))
  const handleStatusChange = useCallback((id: string, newStatus: string) => {
    updateTodo(id, { status: newStatus as 'pending' | 'complete' | 'in_progress' | 'review' | 'blocked' });
    axiosInstance.patch(`/api/todos/${id}`, { status: newStatus }).catch(() => {
      toast.error('Failed to update status');
    });
  }, [updateTodo]);

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

  // ── Route to dedicated views for Assigned ──
  if (activeFilter === 'assigned') {
    return (
      <AssignedView
        onSelectTask={(t) => setSelectedTask(t)}
        onDeleteTask={handleDeleteTask}
        onToggleComplete={toggleComplete}
      />
    );
  }

  // ── Inbox-type view (with header, filters, task list) ──
  return (
    <div className="min-h-screen text-[hsl(var(--foreground))] bg-[hsl(var(--background))] font-sans pb-20 selection:bg-emerald-500/30">
      
      {/* Header Area - Always visible like in workspace */}
      <div className="pb-8">
        <TodoHeader greeting={greeting} stats={stats} />
      </div>

      <div className={cn(
        "max-w-[1000px] mx-auto px-6 md:px-8 relative z-20 transition-all duration-500",
        "mt-0"
      )}>
        
        {/* Unified Task Input */}
        <div className="max-w-[1000px] mx-auto mb-10">
            <TaskInput
                onSave={handleCreateTask}
                isExpanded={isInputExpanded}
                onExpandChange={setIsInputExpanded}
            />
        </div>

                    {/* Filter bar & View Switcher */}
                    <div className="flex items-center gap-2 mt-4 mb-6 text-sm">
                        {/* Filter Tabs */}
                        <div className="flex items-center p-1 rounded-xl bg-[hsl(var(--background))] gap-1 overflow-x-auto no-scrollbar">
                            {/* Core Tasks */}
                            <div className="flex items-center gap-1 shrink-0">
                              {[
                                { key: 'inbox', label: 'Inbox', icon: <Inbox className="w-3.5 h-3.5" /> },
                                { key: 'today', label: 'Today', hideOnMobile: true, icon: <Calendar className="w-3.5 h-3.5" /> },
                              ].map(f => (
                                <button
                                  key={f.key}
                                  onClick={() => useViewStore.getState().setTodoFilter(f.key as TodoFilterType)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    f.hideOnMobile && "hidden sm:flex",
                                    activeFilter === f.key
                                      ? "bg-white/5 text-[hsl(var(--foreground))] shadow-sm"
                                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                                  )}
                                >
                                  {f.icon}
                                  {f.label}
                                </button>
                              ))}
                            </div>

                            <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0" />

                            {/* App Integrations */}
                            <div className="flex items-center gap-1 shrink-0" title="Tasks linked to your environment">
                              {[
                                { key: 'docs', label: 'Docs', icon: <FileText className="w-3.5 h-3.5" /> },
                                { key: 'notes', label: 'Notes', icon: <StickyNote className="w-3.5 h-3.5" /> },
                              ].map(f => (
                                <button
                                  key={f.key}
                                  onClick={() => useViewStore.getState().setTodoFilter(f.key as TodoFilterType)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    activeFilter === f.key
                                      ? "bg-white/5 text-amber-400 shadow-sm"
                                      : "text-amber-500/40 hover:text-amber-400/80 hover:bg-amber-500/10"
                                  )}
                                >
                                  {f.icon}
                                  {f.label}
                                </button>
                              ))}
                            </div>

                            <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0" />

                            {/* Completed */}
                            <div className="flex items-center gap-1 shrink-0">
                              {[
                                { key: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                              ].map(f => (
                                <button
                                  key={f.key}
                                  onClick={() => useViewStore.getState().setTodoFilter(f.key as TodoFilterType)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    activeFilter === f.key
                                      ? "bg-[hsl(var(--background))] text-emerald-400/80 shadow-sm"
                                      : "text-white/30 hover:text-white/60 hover:bg-white/5"
                                  )}
                                >
                                  {f.icon}
                                  {f.label}
                                </button>
                              ))}
                            </div>
                        </div>

                        <div className="flex-1 min-w-[1rem]" />

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

                        {/* View Switcher */}
                        <div className="flex items-center bg-white/[0.03] p-1 rounded-lg border border-white/5">
                          <button
                            onClick={() => setCurrentView('list')}
                            className={cn("p-1.5 rounded-md transition-colors", currentView === 'list' ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5")}
                            title="List View"
                          >
                            <LayoutList className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCurrentView('table')}
                            className={cn("p-1.5 rounded-md transition-colors", currentView === 'table' ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5")}
                            title="Table View"
                          >
                            <Table className="w-4 h-4" />
                          </button>
                        </div>
                    </div>

                    {/* Views */}
                    <AnimatePresence mode="wait">
                      {currentView === 'list' ? (
                        <motion.div
                          key="list"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-1"
                        >
                          <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_120px_100px] gap-4 pl-4 py-2 text-[12px] font-medium text-white/50 items-center select-none">
                            <div className="flex justify-center"></div>
                            <div className="flex items-center">Tasks</div>
                            <div className="flex items-center justify-start pl-2">Due date</div>
                            <div className="flex items-center justify-start pl-2.5">Status</div>
                            <div className="flex items-center justify-start pl-1">Priority</div>
                          </div>

                          <AnimatePresence mode="popLayout">
                            {filteredTasks.length === 0 ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center opacity-30">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                                <p>No tasks here</p>
                              </motion.div>
                            ) : (
                              filteredTasks.map((task) => (
                                <RichTaskItem
                                  key={task._id}
                                  task={task}
                                  isComplete={task.status === 'complete'}
                                  onSelect={(t) => setSelectedTask(t as unknown as Todo)}
                                  onStatusChange={handleStatusChange}
                                  onUpdateTask={handleUpdateTask}
                                  isSelected={selectedTasks.has(task._id)}
                                  onToggleSelect={(id) => setSelectedTasks(prev => {
                                    const next = new Set(prev);
                                    if (next.has(id)) next.delete(id);
                                    else next.add(id);
                                    return next;
                                  })}
                                />
                              ))
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="table"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <PersonalTableView
                            filteredTasks={filteredTasks}
                            onStatusChange={handleStatusChange}
                            onUpdateTask={handleUpdateTask}
                            onClick={(t) => setSelectedTask(t as unknown as Todo)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

      </div>

      <BulkActionBar 
        selectedTasks={selectedTasks}
        onClearSelection={() => setSelectedTasks(new Set())}
        onDelete={handleBulkDelete}
        onUpdate={handleBulkUpdate}
        workspaceMembers={[]}
        hideAssignees={true}
      />
    </div>
  );
}
