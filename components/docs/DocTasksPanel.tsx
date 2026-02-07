'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListTodo, Circle, CheckCircle2, Loader2, Maximize2 } from 'lucide-react';
import axiosInstance from '@/lib/utils/axios';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { FlipClock } from '@/components/ui-base/FlipClock';

interface LinkedTask {
  _id: string;
  title: string;
  description?: string;
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
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
                  {tasks.map(task => {
                    const isExpanded = expandedTaskId === task._id;
                    return (
                      <div
                        key={task._id}
                        onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
                        className="px-4 py-3 hover:bg-white/5 transition-all cursor-pointer group border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(task._id, task.status);
                            }}
                            className="mt-0.5 shrink-0"
                          >
                            {task.status === 'complete' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className={cn("w-4 h-4 transition-colors", getPriorityColor(task.priority))} />
                            )}
                          </button>
                          
                          {/* Task Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Title - wraps to 2 lines max when collapsed, full when expanded */}
                            <p className={cn(
                              "text-sm leading-snug",
                              !isExpanded && "line-clamp-2",
                              task.status === 'complete' 
                                ? "text-[hsl(var(--muted-foreground))] line-through" 
                                : "text-[hsl(var(--foreground))]"
                            )}>
                              {task.title}
                            </p>
                            
                            {/* Due Date Badge - Always visible */}
                            {task.dueDate && (
                              <span className={cn(
                                "inline-block text-[10px] px-1.5 py-0.5 rounded-full",
                                isPast(new Date(task.dueDate)) && task.status !== 'complete'
                                  ? "bg-rose-500/20 text-rose-400"
                                  : "bg-white/5 text-[hsl(var(--muted-foreground))]"
                              )}>
                                {formatDueDate(task.dueDate)}
                              </span>
                            )}
                            
                            {/* Description - Only when expanded, full text with HTML/images */}
                            <AnimatePresence>
                              {isExpanded && task.description && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Check if clicked on an image
                                    const target = e.target as HTMLElement;
                                    if (target.tagName === 'IMG') {
                                      const src = (target as HTMLImageElement).src;
                                      if (src) setLightboxImage(src);
                                    }
                                  }}
                                  className="text-xs text-[hsl(var(--muted-foreground))]/70 pt-2 border-t border-white/5 mt-2 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2 [&_img]:cursor-pointer [&_img]:hover:opacity-80 [&_img]:transition-opacity"
                                  dangerouslySetInnerHTML={{ __html: task.description }}
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Image Lightbox Modal */}
          <AnimatePresence>
            {lightboxImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightboxImage(null)}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
              >
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={lightboxImage}
                  alt="Full size preview"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
