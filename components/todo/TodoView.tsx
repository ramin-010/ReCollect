'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, ChevronDown, LayoutList, Table, Inbox, Calendar, FileText, StickyNote, ArrowUpDown } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'recent'>('priority');
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

    // Sort by Priority (High > Medium > Low)
    const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    
    if (sortBy === 'priority') {
      result.sort((a, b) => (pMap[b.priority || 'low'] || 1) - (pMap[a.priority || 'low'] || 1));
    } else if (sortBy === 'dueDate') {
      result.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    }

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

      <div className="max-w-[1000px] mx-auto px-6 md:px-8 w-full">
        {/* Unified Task Input */}
        <div className="mb-6">
            <TaskInput
                onSave={handleCreateTask}
                isExpanded={isInputExpanded}
                onExpandChange={setIsInputExpanded}
            />
        </div>

        {/* Filter Bar — left-aligned with count badges, View Switcher on right */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {/* Core Tasks */}
            {[
              { key: 'inbox', label: 'Inbox', icon: <Inbox className="w-3.5 h-3.5" /> },
              { key: 'today', label: 'Today', hideOnMobile: true, icon: <Calendar className="w-3.5 h-3.5" /> },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => useViewStore.getState().setTodoFilter(f.key as TodoFilterType)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap rounded-md flex items-center gap-2 leading-none",
                  f.hideOnMobile && "hidden sm:flex",
                  activeFilter === f.key
                    ? "text-white/80 bg-white/[0.06]"
                    : "text-white/30 hover:text-white/50"
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}

            <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0" />

            {/* App Integrations */}
            {[
              { key: 'docs', label: 'Docs', icon: <FileText className="w-3.5 h-3.5" /> },
              { key: 'notes', label: 'Notes', icon: <StickyNote className="w-3.5 h-3.5" /> },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => useViewStore.getState().setTodoFilter(f.key as TodoFilterType)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap rounded-md flex items-center gap-2 leading-none",
                  activeFilter === f.key
                    ? "text-amber-400 bg-amber-400/10"
                    : "text-amber-500/40 hover:text-amber-400/80"
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}

            <div className="w-[1px] h-4 bg-white/10 mx-1 shrink-0" />

            {/* Completed */}
            {[
              { key: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => useViewStore.getState().setTodoFilter(f.key as TodoFilterType)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap rounded-md flex items-center gap-2 leading-none",
                  activeFilter === f.key
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-white/30 hover:text-white/60"
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1.5 flex items-center gap-2 text-xs font-medium border border-white/5 text-white/40 rounded-md hover:text-white hover:bg-white/5 transition-colors">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {sortBy === 'priority' ? 'Priority' : sortBy === 'dueDate' ? 'Due Date' : 'Recent'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-white/10 min-w-[140px]">
                <DropdownMenuItem onClick={() => setSortBy('priority')}>Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('dueDate')}>Due Date</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('recent')}>Recent</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority filter */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <button className={cn(
                    "px-3 py-1.5 flex items-center gap-2 text-xs font-medium border rounded-md transition-colors",
                    priorityFilter 
                    ? "border-emerald-500/10 bg-emerald-500/10 text-emerald-500"
                    : "border-white/5 text-white/40 hover:text-white hover:bg-white/5"
                )}>
                    {priorityFilter ? (
                        <>
                            <div className={cn("w-2 h-2 rounded-full", 
                                priorityFilter === 'high' ? "bg-rose-500" :
                                priorityFilter === 'medium' ? "bg-amber-500" : "bg-blue-400"
                            )} />
                            {priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
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
