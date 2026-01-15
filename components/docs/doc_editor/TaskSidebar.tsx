'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  X,
  Plus,
  Loader2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui-base/Button';
import { Input } from '@/components/ui-base/Input';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { Task, useTodoStore } from '@/lib/store/todoStore';
import { toast } from 'sonner';

interface TaskSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  docTitle: string;
  onMainSidebarClose?: () => void; // Close main app sidebar when this opens
}

export function TaskSidebar({ 
  isOpen, 
  onClose, 
  docId, 
  docTitle,
  onMainSidebarClose 
}: TaskSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const { addTodo, updateTodo } = useTodoStore();

  // Fetch tasks linked to this doc
  const fetchLinkedTasks = useCallback(async () => {
    if (!docId) return;
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/api/todos?refId=${docId}`);
      if (response.data.success) {
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch linked tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    if (isOpen) {
      fetchLinkedTasks();
      onMainSidebarClose?.();
    }
  }, [isOpen, fetchLinkedTasks, onMainSidebarClose]);

  // Create new task linked to this doc
  const createLinkedTask = async () => {
    if (!newTaskText.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await axiosInstance.post('/api/todos', {
        text: newTaskText.trim(),
        priority: 'medium',
        status: 'pending',
        references: [{
          type: 'doc',
          refId: docId,
          title: docTitle
        }]
      });
      
      if (response.data.success) {
        const newTask = response.data.data;
        setTasks(prev => [newTask, ...prev]);
        addTodo(newTask); // Also add to global store
        setNewTaskText('');
        toast.success('Task created and linked');
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle task completion
  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'complete' ? 'pending' : 'complete';
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t._id === task._id 
        ? { ...t, status: newStatus, isCompleted: newStatus === 'complete' } 
        : t
    ));
    updateTodo(task._id, { status: newStatus as 'pending' | 'complete', isCompleted: newStatus === 'complete' });
    
    try {
      await axiosInstance.patch(`/api/todos/${task._id}`, { status: newStatus });
    } catch (error) {
      // Revert
      setTasks(prev => prev.map(t => 
        t._id === task._id 
          ? { ...t, status: task.status, isCompleted: task.isCompleted } 
          : t
      ));
      updateTodo(task._id, { status: task.status, isCompleted: task.isCompleted });
      toast.error('Failed to update task');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed left-0 top-0 h-full w-80 bg-[hsl(var(--card))]",
              "border-r border-[hsl(var(--border))] shadow-xl z-50",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Linked Tasks</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[180px]">
                    {docTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Create */}
            <div className="p-3 border-b border-[hsl(var(--border))]">
              <div className="flex gap-2">
                <Input
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Quick add task..."
                  className="flex-1 text-sm h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreating) {
                      createLinkedTask();
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={createLinkedTask}
                  disabled={!newTaskText.trim() || isCreating}
                  className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--muted-foreground))]/30" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    No tasks linked to this document
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]/70 mt-1">
                    Use /task in the editor to create one
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task._id}
                      className={cn(
                        "group flex items-start gap-2 p-2 rounded-lg",
                        "hover:bg-[hsl(var(--muted))]/50 transition-colors cursor-pointer",
                        task.status === 'complete' && "opacity-60"
                      )}
                    >
                      <button
                        onClick={() => toggleTask(task)}
                        className={cn(
                          "mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                          task.status === 'complete'
                            ? "bg-emerald-600 border-emerald-600"
                            : "border-[hsl(var(--muted-foreground))]/50 hover:border-emerald-500"
                        )}
                      >
                        {task.status === 'complete' && (
                          <CheckSquare className="w-2.5 h-2.5 text-white" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm leading-snug",
                          task.status === 'complete' && "line-through text-[hsl(var(--muted-foreground))]"
                        )}>
                          {task.text}
                        </p>
                        
                        {/* Priority badge */}
                        {task.priority && (
                          <span className={cn(
                            "inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                            task.priority === 'high' && "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
                            task.priority === 'medium' && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                            task.priority === 'low' && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                      
                      {/* Open in Tasks view */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to Tasks view - could use router
                          window.location.href = '/tasks';
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[hsl(var(--muted))] rounded transition-all"
                        title="Open in Tasks"
                      >
                        <ExternalLink className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[hsl(var(--border))] text-center">
              <button
                onClick={() => window.location.href = '/tasks'}
                className="text-xs text-emerald-600 hover:underline flex items-center justify-center gap-1"
              >
                View All Tasks
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
