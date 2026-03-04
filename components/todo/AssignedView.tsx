'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodoStore, Todo } from '@/lib/store/todoStore';
import { useAuthStore } from '@/lib/store/authStore';
import { RichTaskItem } from './RichTaskItem';
import { isToday, isPast, parseISO, formatDistanceToNow } from 'date-fns';

interface AssignedViewProps {
  onSelectTask: (task: Todo) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string, isComplete: boolean) => void;
}

export function AssignedView({ onSelectTask, onDeleteTask, onToggleComplete }: AssignedViewProps) {
  const todos = useTodoStore((s) => s.todos);
  const currentUser = useAuthStore((s) => s.user);

  const assignedTasks = useMemo(() => {
    return todos.filter((t) => {
      const assigneeId = typeof t.assignee === 'object' ? t.assignee?._id : t.assignee;
      // Show tasks where I'm the assignee but not the creator
      return !!assigneeId && assigneeId === currentUser?._id;
    });
  }, [todos, currentUser?._id]);

  const pendingTasks = useMemo(() => assignedTasks.filter(t => t.status !== 'complete'), [assignedTasks]);
  const completedTasks = useMemo(() => assignedTasks.filter(t => t.status === 'complete'), [assignedTasks]);

  const overdueTasks = useMemo(() => {
    return pendingTasks.filter(t => {
      if (!t.dueDate) return false;
      return isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate));
    });
  }, [pendingTasks]);

  const stats = {
    total: assignedTasks.length,
    pending: pendingTasks.length,
    completed: completedTasks.length,
    overdue: overdueTasks.length,
  };

  return (
    <div className="min-h-screen text-white bg-[#1A1A1A] pb-20">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8 pt-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Assigned to Me</h1>
              <p className="text-sm text-white/40">Tasks others have assigned to you</p>
            </div>
          </div>

          {/* Stats Row */}
          {stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mt-5"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white/60">
                  <span className="text-white">{stats.pending}</span> pending
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-white/60">
                  <span className="text-white">{stats.completed}</span> done
                </span>
              </div>
              {stats.overdue > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400/80">
                    <span className="text-red-400">{stats.overdue}</span> overdue
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Pending Tasks ── */}
        {pendingTasks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">
                Pending ({pendingTasks.length})
              </h2>
            </div>
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {pendingTasks.map((task) => (
                  <RichTaskItem
                    key={task._id}
                    task={task}
                    isComplete={false}
                    onDelete={onDeleteTask}
                    onToggleComplete={onToggleComplete}
                    onSelect={onSelectTask}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Completed Tasks ── */}
        {completedTasks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">
                Completed ({completedTasks.length})
              </h2>
            </div>
            <div className="space-y-1 opacity-60">
              <AnimatePresence mode="popLayout">
                {completedTasks.map((task) => (
                  <RichTaskItem
                    key={task._id}
                    task={task}
                    isComplete={true}
                    onDelete={onDeleteTask}
                    onToggleComplete={onToggleComplete}
                    onSelect={onSelectTask}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {assignedTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
              <UserCheck className="w-10 h-10 text-indigo-400/60" />
            </div>
            <h3 className="text-lg font-semibold text-white/70 mb-2">No assigned tasks</h3>
            <p className="text-sm text-white/35 max-w-sm leading-relaxed">
              When someone assigns a task to you, it'll appear here. You can also assign tasks to yourself from the inbox.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
