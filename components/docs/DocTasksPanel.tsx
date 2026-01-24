'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListTodo, Circle, CheckCircle2, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/utils/axios';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { FlipClock } from '@/components/ui-base/FlipClock';

interface LinkedTask {
  _id: string;
  title: string;
  status: 'pending' | 'complete';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

interface DocTasksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  docTitle: string;
}

export function DocTasksPanel({ isOpen, onClose, docId, docTitle }: DocTasksPanelProps) {
  const [tasks, setTasks] = useState<LinkedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch linked tasks
  const fetchTasks = useCallback(async () => {
    if (!docId) return;
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/todos?refType=doc&refId=${docId}`);
      if (response.data.success) {
        setTasks(response.data.data || []);
      }
    } catch (error) {
      console.error('[DocTasksPanel] Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen, fetchTasks]);

  // Toggle task status
  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'complete' ? 'pending' : 'complete';
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t._id === taskId ? { ...t, status: newStatus } : t
    ));
    
    try {
      await axiosInstance.patch(`/api/todos/${taskId}`, { status: newStatus });
    } catch (error) {
      // Revert on error
      setTasks(prev => prev.map(t => 
        t._id === taskId ? { ...t, status: currentStatus as 'pending' | 'complete' } : t
      ));
    }
  };

  // Format due date display
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - no close on click, just dim background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40 pointer-events-none"
          />
          
          {/* Panel - List Only */}
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--divider))] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[hsl(var(--divider))]">
              {/* Title Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">Linked Tasks</span>
                  {tasks.length > 0 && (
                    <span className="text-xs text-[hsl(var(--muted-foreground))] bg-white/10 px-1.5 py-0.5 rounded">
                      {tasks.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>

              {/* FlipClock */}
              <div className="flex justify-center mb-1">
                <FlipClock scale={0.10} transparent showSeconds={true} />
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <ListTodo className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    No tasks linked yet
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]/60 mt-1">
                    Use the input above to add tasks
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {tasks.map(task => (
                    <div
                      key={task._id}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleStatus(task._id, task.status)}
                        className="mt-0.5 shrink-0"
                      >
                        {task.status === 'complete' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className={cn("w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors", getPriorityColor(task.priority))} />
                        )}
                      </button>
                      
                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          task.status === 'complete' 
                            ? "text-[hsl(var(--muted-foreground))] line-through" 
                            : "text-[hsl(var(--foreground))]"
                        )}>
                          {task.title}
                        </p>
                        
                        {task.dueDate && (
                          <p className={cn(
                            "text-xs mt-0.5",
                            isPast(new Date(task.dueDate)) && task.status !== 'complete'
                              ? "text-rose-400"
                              : "text-[hsl(var(--muted-foreground))]"
                          )}>
                            {formatDueDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export refetch function for external use
export function useDocTasksRefetch(docId: string) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  return { refreshKey, refresh };
}
