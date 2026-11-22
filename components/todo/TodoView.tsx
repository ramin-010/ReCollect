'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutList, Table, ArrowUpDown } from 'lucide-react';
import { TaskInput } from './task_Input';
import { BulkActionBar } from './workspace/modals/BulkActionBar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useTodoStore } from '@/lib/store/todoStore';
import type { Todo } from '@/lib/store/todoStore';
import { useViewStore } from '@/lib/store/viewStore';
import type { TodoFilterType } from '@/lib/store/viewStore';
import { isToday, isPast, parseISO } from 'date-fns';
import { rcScope, RcButton, RcIconButton, RcMenu, RcSegmented, RcSkel } from '@/components/rc-ui';
import { RichTaskItem } from './RichTaskItem';
import { PersonalTableView } from './PersonalTableView';
import type { TodoResponse } from '@/lib/api/todoApi';
import { PersonalTaskDetailModal } from './PersonalTaskDetailModal';
import { isReferenceTypeVisible } from '@/lib/features';
import { TASKS_CHANGED, tasksChanged } from '@/lib/tasksChanged';


export function TodoView() {
  const {
    todos,
    setTodos,
    isLoading,
    setLoading,
    addTodo,
    updateTodo,
    removeTodo
  } = useTodoStore();

  const activeFilter = useViewStore((state) => state.todoFilter);

  // UI State
  const isInputExpanded = useViewStore((state) => state.isTodoInputExpanded);
  const setIsInputExpanded = useViewStore((state) => state.setTodoInputExpanded);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'recent'>('priority');
  const [currentView, setCurrentView] = useState<'list' | 'table'>('list');

  // Fetch todos
  // Fetched on every visit, when the window comes back and when another part of the app changes a task
  // (the owner, 11-22: a tick on Home showed here only after a reload). The skeleton only on the first load.
  const fetchTodos = useCallback(async () => {
    const first = !useTodoStore.getState().isInitialized;
    try {
      if (first) setLoading(true);
      const response = await axiosInstance.get('/api/todos');
      if (response.data.success) setTodos(response.data.data);
    } catch {
      if (first) {
        toast.error('Failed to load tasks');
        setLoading(false);
      }
    }
  }, [setTodos, setLoading]);

  useEffect(() => {
    void fetchTodos();
    const onVisible = () => document.visibilityState === 'visible' && void fetchTodos();
    const onChanged = () => void fetchTodos();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(TASKS_CHANGED, onChanged);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(TASKS_CHANGED, onChanged);
    };
  }, [fetchTodos]);

  // The header's line and the views' counts, in plain numbers (no percentages).
  const counts = useMemo(() => {
    const open = todos.filter((t) => t.status !== 'complete');
    return {
      open: open.length,
      inbox: open.filter((t) => !t.references?.some((ref) => isReferenceTypeVisible(ref.type))).length,
      today: open.filter((t) => t.dueDate && isToday(parseISO(t.dueDate))).length,
      // Still to come today (the line counts a late one once, as late).
      laterToday: open.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)) && !isPast(parseISO(t.dueDate))).length,
      late: open.filter((t) => t.dueDate && isPast(parseISO(t.dueDate))).length,
      docs: open.filter((t) => t.references?.some((ref) => ref.type === 'doc')).length,
      completed: todos.length - open.length,
    };
  }, [todos]);
  const summary =
    counts.open === 0
      ? 'Nothing open. Add a task above, or press Ctrl K anywhere.'
      : [`${counts.open} open`, counts.laterToday ? `${counts.laterToday} due later today` : '', counts.late ? `${counts.late} late` : ''].filter(Boolean).join(' · ');

  // Filtered Tasks (only for inbox-type filters)
  const filteredTasks = useMemo(() => {
    let result = [...todos];
    
    switch (activeFilter) {
      case 'inbox':
        // Links to hidden features (slides / legacy content, see lib/features.ts) don't count,
        // so tasks linked only to those stay visible here instead of disappearing.
        result = result.filter(t => t.status !== 'complete' && !t.references?.some(ref => isReferenceTypeVisible(ref.type)));
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
      case 'slides':
        result = result.filter(t => 
          t.status !== 'complete' && 
          t.references?.some(ref => ref.type === 'slide')
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

    return result;
  }, [todos, activeFilter, sortBy]);

  // Handlers
  const handleCreateTask = async (data: TodoResponse) => {
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


  const handleUpdateTask = useCallback(async (id: string, updates: Partial<Todo>) => {
      updateTodo(id, updates);
      setSelectedTask((prev) => {
          if (prev && prev._id === id) {
              return { ...prev, ...updates } as Todo;
          }
          return prev;
      });
      // Persist to backend
      await axiosInstance.patch(`/api/todos/${id}`, updates).catch(() => {});
  }, [updateTodo, setSelectedTask]);

  // State-only sync (no API call) — used by PersonalTaskDetailModal
  // which saves via todoApi.updateTodo() internally to handle cloud image uploads
  const handleModalTaskSync = useCallback(async (id: string, updates: Partial<Todo>) => {
      updateTodo(id, updates);
      setSelectedTask((prev) => {
          if (prev && prev._id === id) {
              return { ...prev, ...updates } as Todo;
          }
          return prev;
      });
  }, [updateTodo, setSelectedTask]);

  // Adapter for workspace-style components (onStatusChange(id, newStatus))
  const handleStatusChange = useCallback((id: string, newStatus: string) => {
    updateTodo(id, { status: newStatus as 'pending' | 'complete' | 'in_progress' | 'review' | 'blocked' });
    axiosInstance
      .patch(`/api/todos/${id}`, { status: newStatus })
      .then(() => tasksChanged())
      .catch(() => {
        toast.error('Failed to update status');
      });
  }, [updateTodo]);

  const views = [
    { value: 'inbox' as const, label: 'Inbox', count: counts.inbox },
    { value: 'today' as const, label: 'Today', count: counts.today },
    { value: 'docs' as const, label: 'From docs', count: counts.docs },
    { value: 'completed' as const, label: 'Done', count: counts.completed },
  ];
  const view = views.some((v) => v.value === activeFilter) ? (activeFilter as (typeof views)[number]['value']) : 'inbox';
  const SORT_WORDS = { priority: 'Priority', dueDate: 'Due date', recent: 'Recently changed' } as const;
  const EMPTY: Record<string, string> = {
    inbox: 'Nothing in your inbox. Add a task above, or press Ctrl K anywhere.',
    today: 'Nothing is due today.',
    docs: 'No open tasks come from your docs.',
    completed: 'Finished tasks show here.',
  };

  if (isLoading) {
    return (
      <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)]')} aria-busy aria-label="Loading your tasks">
        <div className="mx-auto w-full max-w-[1000px] px-6 pt-10 md:px-8">
          <RcSkel className="h-9 w-40" />
          <RcSkel className="mt-3 h-4 w-56" />
          <RcSkel className="mt-8 h-14 w-full" />
          {[0, 1, 2, 3].map((i) => (
            <RcSkel key={i} className="mt-4 h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ── The page: its heading and line, the task box, the views, the list ──
  return (
    <div className={cn(rcScope, 'min-h-full bg-[var(--rc-ground)] pb-20')}>
      <div className="mx-auto w-full max-w-[1000px] px-6 md:px-8">
        <header className="pt-10 pb-6 max-md:pt-14">
          <h1 className="rc-h1">Tasks</h1>
          <p className="rc-meta mt-1.5 text-[15px] rc-num">{summary}</p>
        </header>

        <div className="mb-5">
          <TaskInput onSave={handleCreateTask} isExpanded={isInputExpanded} onExpandChange={setIsInputExpanded} />
        </div>

        {/* The views as the segmented row (the chosen one dark, with its count); sort and layout on its right. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none]">
            <RcSegmented label="Which tasks" value={view} onChange={(v) => useViewStore.getState().setTodoFilter(v as TodoFilterType)} options={views} />
          </div>
          <div className="flex items-center gap-1">
            <RcMenu
              label="Sort tasks"
              actions={(['priority', 'dueDate', 'recent'] as const).map((s) => ({ label: SORT_WORDS[s], onSelect: () => setSortBy(s) }))}
            >
              <RcButton size="sm" variant="quiet" icon={<ArrowUpDown className="h-3.5 w-3.5" aria-hidden />} aria-label={`Sort: ${SORT_WORDS[sortBy]}`}>
                {SORT_WORDS[sortBy]}
              </RcButton>
            </RcMenu>
            <RcIconButton label="List" size="sm" aria-pressed={currentView === 'list'} className={cn(currentView === 'list' && 'bg-[var(--rc-selected)] text-[var(--rc-ink-1)]')} onClick={() => setCurrentView('list')}>
              <LayoutList />
            </RcIconButton>
            <RcIconButton label="Table" size="sm" aria-pressed={currentView === 'table'} className={cn(currentView === 'table' && 'bg-[var(--rc-selected)] text-[var(--rc-ink-1)]')} onClick={() => setCurrentView('table')}>
              <Table />
            </RcIconButton>
          </div>
        </div>
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">
        {currentView === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="mx-auto flex w-full max-w-[1000px] flex-col gap-px px-4 md:px-6"
          >
            {filteredTasks.length === 0 ? (
              <p className="px-2 py-6 text-[15px] text-[var(--rc-ink-2)]">{EMPTY[view]}</p>
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
                  onToggleSelect={(id) =>
                    setSelectedTasks((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="mx-auto w-full max-w-[1000px] overflow-x-auto px-6 md:px-8"
          >
            <div className="min-w-[860px]">
              <PersonalTableView
                filteredTasks={filteredTasks}
                onStatusChange={handleStatusChange}
                onUpdateTask={handleUpdateTask}
                onClick={(t) => setSelectedTask(t as unknown as Todo)}
                selectedTasks={selectedTasks}
                onToggleSelect={(id) =>
                  setSelectedTasks((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BulkActionBar 
        selectedTasks={selectedTasks}
        onClearSelection={() => setSelectedTasks(new Set())}
        onDelete={handleBulkDelete}
        onUpdate={handleBulkUpdate}
        workspaceMembers={[]}
        hideAssignees={true}
      />

      {/* Personal Task Detail Modal */}
      <PersonalTaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleModalTaskSync}
      />
    </div>
  );
}
