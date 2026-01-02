'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui-base/Button';
import { Card } from '@/components/ui-base/Card';
import {
  Plus,
  CheckSquare,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Bell,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui-base/DropdownMenu';
import { TodoDialog } from './TodoDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/lib/utils/axios';
import { useTodoStore, Todo } from '@/lib/store/todoStore';

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
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch todos from API (only if not initialized)
  const fetchTodos = useCallback(async () => {
    if (isInitialized) return;

    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/todos');
      if (response.data.success) {
        setTodos(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      toast.error('Failed to load tasks');
      setLoading(false);
    }
  }, [isInitialized, setTodos, setLoading]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Update current time every minute to refresh due status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveTodo = async (data: { text: string; reminderDate?: string }) => {
    try {
      if (editingTodo) {
        // Update existing todo
        const response = await axiosInstance.patch(`/api/todos/${editingTodo._id}`, {
          text: data.text,
          reminderDate: data.reminderDate || null
        });
        
        if (response.data.success) {
          // Use store action
          updateTodo(editingTodo._id, response.data.data);
          toast.success('Task updated');
        }
      } else {
        // Create new todo
        const response = await axiosInstance.post('/api/todos', {
          text: data.text,
          reminderDate: data.reminderDate
        });
        
        if (response.data.success) {
          // Use store action
          addTodo(response.data.data);
          toast.success('Task created');
        }
      }
      setEditingTodo(undefined);
    } catch (error: any) {
      console.error('Failed to save todo:', error);
      toast.error(error.response?.data?.message || 'Failed to save task');
      throw error; // Re-throw so dialog knows it failed
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const response = await axiosInstance.delete(`/api/todos/${id}`);
      
      if (response.data.success) {
        // Use store action
        removeTodo(id);
        toast.success('Task deleted');
      }
    } catch (error: any) {
      console.error('Failed to delete todo:', error);
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    // Optimistic update using store action
    updateTodo(id, { isCompleted: !currentStatus });

    try {
      const response = await axiosInstance.patch(`/api/todos/${id}`, {
        isCompleted: !currentStatus
      });
      
      if (!response.data.success) {
        // Revert on failure
        updateTodo(id, { isCompleted: currentStatus });
      }
    } catch (error) {
      // Revert on error
      updateTodo(id, { isCompleted: currentStatus });
      toast.error('Failed to update task');
    }
  };

  const openEditDialog = (todo: Todo) => {
    setEditingTodo(todo);
    setIsDialogOpen(true);
  };

  const getDueStatus = (reminderDate?: string) => {
    if (!reminderDate) return null;
    
    const due = new Date(reminderDate);
    const now = currentTime;
    const diff = due.getTime() - now.getTime();
    
    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);
    
    const minutes = Math.floor(absDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let text = '';
    if (days > 0) text = `${days}d`;
    else if (hours > 0) text = `${hours}h`;
    else text = `${minutes}m`;

    return {
      text: isOverdue ? `Overdue by ${text}` : `Due in ${text}`,
      isOverdue
    };
  };

  // Map for TodoDialog compatibility (uses 'id' instead of '_id')
  const editingTodoForDialog = editingTodo ? {
    id: editingTodo._id,
    text: editingTodo.text,
    reminderDate: editingTodo.reminderDate
  } : undefined;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-14 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-[hsl(var(--muted-foreground))]">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-14 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <CheckSquare className="h-8 w-8 text-emerald-600" />
              Tasks
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mt-2">
              Manage your tasks and reminders
            </p>
          </div>
          <Button 
            variant="primary"
            onClick={() => {
              setEditingTodo(undefined);
              setIsDialogOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Add Task
          </Button>
        </motion.div>

        {/* Todo List */}
        <div className="space-y-4">
          {todos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card variant="elevated" padding="lg" className="text-center py-12">
                <CheckSquare className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]/30" />
                <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Add a task to get started
                </p>
              </Card>
            </motion.div>
          ) : (
            todos.map((todo, index) => {
              const dueStatus = getDueStatus(todo.reminderDate);
              
              return (
                <motion.div
                  key={todo._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div
                    className={cn(
                      "group relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 transition-all hover:shadow-md",
                      todo.isCompleted && "opacity-60 bg-[hsl(var(--muted))]/30"
                    )}
                  >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(todo._id, todo.isCompleted)}
                      className={cn(
                        "mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        todo.isCompleted 
                          ? "bg-emerald-600 border-emerald-600 text-white" 
                          : "border-[hsl(var(--muted-foreground))] hover:border-emerald-600"
                      )}
                    >
                      {todo.isCompleted && <CheckSquare className="w-3.5 h-3.5" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-base font-medium transition-all",
                        todo.isCompleted && "line-through text-[hsl(var(--muted-foreground))]"
                      )}>
                        {todo.text}
                      </p>
                      
                      {/* Meta Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(todo.createdAt).toLocaleDateString()}
                        </span>
                        
                        {todo.reminderDate && (
                          <span className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]",
                            dueStatus?.isOverdue && !todo.isCompleted && "text-red-600 bg-red-50 dark:bg-red-950/30",
                            !dueStatus?.isOverdue && !todo.isCompleted && "text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                          )}>
                            <Bell className="w-3 h-3" />
                            {dueStatus?.text}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(todo)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          destructive 
                          onClick={() => handleDeleteTodo(todo._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <TodoDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        existingTodo={editingTodoForDialog}
        onSave={handleSaveTodo}
      />
    </div>
  );
}
